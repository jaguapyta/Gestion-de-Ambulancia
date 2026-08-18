const prisma = require('../config/db');

// Generar número de orden automático
const generarNroOrden = async () => {
  const ultima = await prisma.orden_trabajo_transporte.findFirst({
    orderBy: { id: 'desc' }
  });
  if (!ultima) return '001.001';
  const partes = ultima.nro_orden.split('.');
  const num = parseInt(partes[1]) + 1;
  return `${partes[0]}.${String(num).padStart(3, '0')}`;
};

// Obtener todas las órdenes
const getOrdenes = async (req, res) => {
  try {
    const ordenes = await prisma.orden_trabajo_transporte.findMany({
      include: {
        movil: true,
        conductor: { include: { persona: true } },
        creador: { include: { persona: true } }
      },
      orderBy: { created_at: 'desc' }
    });
    res.json(ordenes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener órdenes' });
  }
};

// Obtener orden por ID
const getOrdenById = async (req, res) => {
  const { id } = req.params;
  try {
    const orden = await prisma.orden_trabajo_transporte.findUnique({
      where: { id: parseInt(id) },
      include: {
        movil: true,
        conductor: { include: { persona: true } },
        creador: { include: { persona: true } }
      }
    });
    if (!orden) return res.status(404).json({ error: 'Orden no encontrada' });
    res.json(orden);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener orden' });
  }
};

// Crear orden
const crearOrden = async (req, res) => {
  const {
    tipo, movil_id, conductor_id, area_asignada,
    fecha_inicio, fecha_fin, hora_inicio, hora_fin,
    km_salida, km_estimado
  } = req.body;

  try {
    // Verificar que el móvil no tenga una orden activa
    const ordenActiva = await prisma.orden_trabajo_transporte.findFirst({
      where: {
        movil_id: parseInt(movil_id),
        estado: 'ACTIVA'
      }
    });
    if (ordenActiva) {
      return res.status(400).json({
        error: `El móvil ya tiene una orden activa (${ordenActiva.nro_orden}). Cerrala antes de crear una nueva.`
      });
    }

    const nro_orden = await generarNroOrden();

    // Obtener función del móvil
    const movil = await prisma.movil.findUnique({ where: { id: parseInt(movil_id) } });
    if (!movil) return res.status(404).json({ error: 'Móvil no encontrado' });

    const orden = await prisma.orden_trabajo_transporte.create({
      data: {
        nro_orden,
        tipo: tipo ?? 'ORDINARIO',
        movil_id: parseInt(movil_id),
        conductor_id: parseInt(conductor_id),
        area_asignada: area_asignada ?? 'Dpto. de Transporte',
        fecha_inicio: new Date(fecha_inicio),
        fecha_fin: new Date(fecha_fin),
        hora_inicio: hora_inicio,
        hora_fin: hora_fin,
        km_salida: km_salida ? parseInt(km_salida) : null,
        km_estimado: km_estimado ? parseInt(km_estimado) : null,
        trabajos: movil.funcion ?? 'URGENCIAS-EMERGENCIAS-TRASLADOS EN CAPITAL E INTERIOR',
        creado_por: req.usuario.id,
        estado: 'ACTIVA'
      },
      include: {
        movil: true,
        conductor: { include: { persona: true } },
        creador: { include: { persona: true } }
      }
    });
    res.status(201).json(orden);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear orden' });
  }
};

// Cerrar orden (cargar km llegada)
const cerrarOrden = async (req, res) => {
  const { id } = req.params;
  const { km_llegada } = req.body;
  try {
    const orden = await prisma.orden_trabajo_transporte.update({
      where: { id: parseInt(id) },
      data: {
        km_llegada: km_llegada ? parseInt(km_llegada) : null,
        estado: 'CERRADA'
      },
      include: {
        movil: true,
        conductor: { include: { persona: true } },
        creador: { include: { persona: true } }
      }
    });

    // Actualizar último km del móvil
    if (km_llegada) {
      await prisma.movil.update({
        where: { id: orden.movil_id },
        data: { ultimo_km: parseInt(km_llegada) }
      });
    }

    res.json(orden);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cerrar orden' });
  }
};

// Obtener datos del rol de guardia activo para estirar
const getDatosGuardiaActiva = async (req, res) => {
  try {
    const guardia = await prisma.rol_guardia.findFirst({
      where: { estado: 'ACTIVO' },
      include: {
        rol_guardia_movil: {
          include: {
            movil: true,
            tripulacion: {
              where: { funcion: 'CONDUCTOR' },
              include: {
                usuario: {
                  include: {
                    persona: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!guardia) return res.status(404).json({ error: 'No hay guardia activa' });

    // Filtrar móviles que tienen conductor asignado
    const movilesConConductor = guardia.rol_guardia_movil
      .filter(m => m.tripulacion.length > 0)
      .map(m => ({
        rol_guardia_movil_id: m.id,
        movil: m.movil,
        conductor: m.tripulacion[0].usuario,
        fecha_inicio: guardia.fecha_inicio,
        fecha_fin: guardia.fecha_fin
      }));

    res.json({
      guardia_id: guardia.id,
      codigo: guardia.codigo,
      fecha_inicio: guardia.fecha_inicio,
      fecha_fin: guardia.fecha_fin,
      moviles: movilesConConductor
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener datos de guardia' });
  }
};

module.exports = { getOrdenes, getOrdenById, crearOrden, cerrarOrden, getDatosGuardiaActiva };