const prisma = require('../config/db');
const socket = require('../socket');
const { avanzarEstado } = require('../services/estados-despacho');

const int = v => { const n = parseInt(v); return isNaN(n) ? null : n; };

// estado_despacho -> estado_solicitud (ids reales del catálogo)
const MAP_SOL = { 1: 3, 6: 13, 7: 4, 2: 5, 3: 6, 8: 14, 4: 7, 5: 9 };
// Nombres para el historial
const NOMBRE_DESP = { 1: 'DESPACHADO', 6: 'RECIBIDO', 7: 'EN CAMINO', 2: 'EN ESCENA', 3: 'TRASLADANDO', 8: 'EN DESTINO', 4: 'FINALIZADO', 5: 'CANCELADO' };
// Transiciones permitidas: desde -> [estados a los que puede pasar]
const TRANSICIONES = { 1: [6, 5], 6: [7, 5], 7: [2, 5], 2: [3, 4, 5], 3: [8], 8: [4] };
// Hora que se sella al entrar a cada estado
const HORA_ESTADO = { 6: 'hora_recibido', 7: 'hora_en_camino', 2: 'hora_en_escena', 8: 'hora_en_destino' };
const FINALES = [4, 5];        // FINALIZADO, CANCELADO
const PRE_ESCENA = [1, 6, 7];  // antes de llegar al lugar: se puede reasignar / cambiar prioridad / cancelar asignación
// Estados de solicitud terminales (salen del tablero al histórico).
const TERMINALES = [7, 8, 9, 10, 11, 12];

// Móvil asignado activo (para las tarjetas del tablero). Activos = no terminales del despacho.
const despachoActivo = {
  where: { estado_despacho_id: { in: [1, 6, 7, 2, 3, 8] } },
  orderBy: { id: 'desc' }, take: 1,
  include: {
    estado_despacho: true,
    rol_guardia_movil: {
      include: {
        movil: true, tipo_soporte: true,
        tripulacion: { where: { activo: true }, include: { usuario: { include: { persona: true } } } },
      },
    },
  },
};

const despachoUltimo = {
  orderBy: { id: 'desc' }, take: 1,
  include: {
    estado_despacho: true, condicion_cierre: true,
    rol_guardia_movil: {
      include: {
        movil: true, tipo_soporte: true,
        tripulacion: { where: { activo: true }, include: { usuario: { include: { persona: true } } } },
      },
    },
  },
};

const getCatalogos = async (req, res) => {
  try {
    const [estados_despacho, condiciones_cierre] = await Promise.all([
      prisma.estado_despacho.findMany({ where: { activo: true }, orderBy: { id: 'asc' } }),
      prisma.condicion_cierre.findMany({ orderBy: { id: 'asc' } }),
    ]);
    res.json({ estados_despacho, condiciones_cierre });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error al obtener catálogos' }); }
};

const getTablero = async (req, res) => {
  try {
    const emergencias = await prisma.solicitud.findMany({
      where: { tipo_solicitud_id: 1, estado_solicitud_id: { notIn: TERMINALES } },
      include: {
        estado_solicitud: true,
        solicitud_emergencia: { include: { motivo_consulta: { select: { nombre: true, codigo_radial: true } } } },
        despacho: despachoActivo,
      },
      orderBy: { created_at: 'asc' },
    });
    emergencias.sort((a, b) => (a.estado_solicitud.nombre === 'PENDIENTE' ? 0 : 1) - (b.estado_solicitud.nombre === 'PENDIENTE' ? 0 : 1));

    const traslados = await prisma.solicitud.findMany({
      where: {
        estado_solicitud_id: { notIn: TERMINALES },
        OR: [
          { tipo_solicitud_id: 2 },
          { tipo_solicitud_id: 3, regulacion_cama: { enviado_despacho: true, quien_traslada: 'SEME' } },
        ],
      },
      include: {
        estado_solicitud: true, tipo_solicitud: true,
        solicitud_traslado: true, solicitud_ref_cama: true, regulacion_cama: true,
        despacho: despachoActivo,
      },
    });
    traslados.sort((a, b) => {
      const ha = a.solicitud_traslado?.fecha_hora_traslado || a.created_at;
      const hb = b.solicitud_traslado?.fecha_hora_traslado || b.created_at;
      return new Date(ha) - new Date(hb);
    });

    const ahora = new Date();
    const moviles = await prisma.rol_guardia_movil.findMany({
      where: { activo: true, vigencia_inicio: { lte: ahora }, vigencia_fin: { gt: ahora } },
      include: {
        base: true, tipo_soporte: true, movil: true,
        tripulacion: { where: { activo: true }, include: { usuario: { include: { persona: true } } } },
        despacho: {
          where: { estado_despacho_id: { in: [1, 6, 7, 2, 3, 8] } },
          orderBy: { id: 'desc' }, take: 1,
          include: { estado_despacho: true, solicitud: true },
        },
      },
    });
    moviles.sort((a, b) => (a.estado === 'DISPONIBLE' ? 0 : 1) - (b.estado === 'DISPONIBLE' ? 0 : 1));
    res.json({ emergencias, traslados, moviles });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error al cargar el tablero' }); }
};

const getHistorial = async (req, res) => {
  try {
    const solicitudes = await prisma.solicitud.findMany({
      where: {
        estado_solicitud_id: { in: TERMINALES },
        OR: [
          { tipo_solicitud_id: 1 },
          { tipo_solicitud_id: 2 },
          { tipo_solicitud_id: 3, regulacion_cama: { enviado_despacho: true, quien_traslada: 'SEME' } },
        ],
      },
      include: {
        estado_solicitud: true, tipo_solicitud: true,
        solicitud_emergencia: { include: { motivo_consulta: { select: { nombre: true, codigo_radial: true } } } },
        solicitud_traslado: true, solicitud_ref_cama: true, regulacion_cama: true,
        despacho: despachoUltimo,
      },
      orderBy: { created_at: 'desc' },
      take: 100,
    });
    res.json(solicitudes);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error al cargar el histórico' }); }
};

const setUbicacion = async (req, res) => {
  const { id } = req.params;
  const { latitud, longitud, direccion } = req.body;
  try {
    const s = await prisma.solicitud.update({
      where: { id: int(id) },
      data: { latitud: latitud ?? null, longitud: longitud ?? null, ...(direccion !== undefined ? { direccion } : {}) },
    });
    socket.cambioEstadoSolicitud(s);
    res.json(s);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error al guardar la ubicación' }); }
};

const asignar = async (req, res) => {
  const { solicitud_id, rol_guardia_movil_id, prioridad, observacion } = req.body;
  try {
    const sid = int(solicitud_id), mid = int(rol_guardia_movil_id);
    if (!sid || !mid) return res.status(400).json({ error: 'Falta solicitud o móvil' });
    const sol = await prisma.solicitud.findUnique({ where: { id: sid } });
    if (!sol) return res.status(404).json({ error: 'Solicitud no encontrada' });

    const despacho = await prisma.$transaction(async (tx) => {
      const d = await tx.despacho.create({
        data: {
          solicitud_id: sid, rol_guardia_movil_id: mid, despachante_id: req.usuario.id,
          estado_despacho_id: 1, prioridad: prioridad || sol.prioridad || 'VERDE',
          observacion: observacion || null,
        },
      });
      await tx.solicitud.update({ where: { id: sid }, data: { estado_solicitud_id: 3 } });
      await tx.rol_guardia_movil.update({ where: { id: mid }, data: { estado: 'OCUPADO' } });
      await tx.historial_solicitud.create({ data: { solicitud_id: sid, estado_anterior_id: sol.estado_solicitud_id, estado_nuevo_id: 3, usuario_id: req.usuario.id, observacion: 'Despachado' } });
      return d;
    });
    socket.ambulanciaAsignada(despacho);
    socket.cambioEstadoVehiculo({ rol_guardia_movil_id: mid, estado: 'OCUPADO' });
    res.status(201).json(despacho);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error al asignar el móvil' }); }
};

// Reasignar el móvil.
//  - EMERGENCIA: solo antes de llegar al lugar (estados 1/6/7).
//  - TRASLADO / CAMA: mientras no esté cerrado (4 FINALIZADO / 5 CANCELADO).
const reasignar = async (req, res) => {
  const { id } = req.params;
  const { rol_guardia_movil_id, observacion } = req.body;
  try {
    const did = int(id), nuevoMovil = int(rol_guardia_movil_id);
    if (!did || !nuevoMovil) return res.status(400).json({ error: 'Falta despacho o móvil nuevo' });

    const d = await prisma.despacho.findUnique({ where: { id: did }, include: { solicitud: true } });
    if (!d) return res.status(404).json({ error: 'Despacho no encontrado' });

    const esEmergencia = d.solicitud?.tipo_solicitud_id === 1;
    if (esEmergencia && !PRE_ESCENA.includes(d.estado_despacho_id)) {
      return res.status(409).json({ error: 'La emergencia ya está en el lugar: no se puede reasignar el móvil' });
    }
    if (!esEmergencia && FINALES.includes(d.estado_despacho_id)) {
      return res.status(409).json({ error: 'El servicio ya está cerrado: no se puede reasignar el móvil' });
    }
    if (d.rol_guardia_movil_id === nuevoMovil) return res.status(400).json({ error: 'Es el mismo móvil' });
    const movilNuevo = await prisma.rol_guardia_movil.findUnique({ where: { id: nuevoMovil } });
    if (!movilNuevo || !movilNuevo.activo) return res.status(404).json({ error: 'Móvil no disponible' });

    const upd = await prisma.$transaction(async (tx) => {
      const anterior = d.rol_guardia_movil_id;
      const r = await tx.despacho.update({ where: { id: did }, data: { rol_guardia_movil_id: nuevoMovil } });
      await tx.rol_guardia_movil.update({ where: { id: anterior }, data: { estado: 'DISPONIBLE' } });
      await tx.rol_guardia_movil.update({ where: { id: nuevoMovil }, data: { estado: 'OCUPADO' } });
      await tx.historial_solicitud.create({
        data: {
          solicitud_id: d.solicitud_id, estado_anterior_id: d.solicitud.estado_solicitud_id,
          estado_nuevo_id: d.solicitud.estado_solicitud_id,
          usuario_id: req.usuario.id, observacion: observacion || 'Reasignación de móvil',
        },
      });
      return r;
    });
    socket.ambulanciaAsignada(upd);
    socket.cambioEstadoVehiculo({ rol_guardia_movil_id: d.rol_guardia_movil_id, estado: 'DISPONIBLE' });
    socket.cambioEstadoVehiculo({ rol_guardia_movil_id: nuevoMovil, estado: 'OCUPADO' });
    res.json(upd);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error al reasignar el móvil' }); }
};

// Avanzar el estado del despacho (usa la máquina de estados compartida).
const cambiarEstado = async (req, res) => {
  const { estado_despacho_id, condicion_cierre_id, km_inicio, km_fin, motivo } = req.body;
  const r = await avanzarEstado({
    despachoId: int(req.params.id), nuevo: int(estado_despacho_id), usuarioId: req.usuario.id,
    condicion_cierre_id, km_inicio, km_fin, motivo,
  });
  if (!r.ok) return res.status(r.status || 500).json({ error: r.error });
  res.json(r.despacho);
};

// Cancelar la ASIGNACIÓN (≠ cancelar servicio): la solicitud vuelve a PENDIENTE para re-despachar
// y el móvil queda libre. Solo antes de llegar al lugar (estados 1/6/7).
const cancelarAsignacion = async (req, res) => {
  const { id } = req.params;
  const { motivo } = req.body;
  try {
    const did = int(id);
    const d = await prisma.despacho.findUnique({ where: { id: did } });
    if (!d) return res.status(404).json({ error: 'Despacho no encontrado' });
    if (!PRE_ESCENA.includes(d.estado_despacho_id)) {
      return res.status(409).json({ error: 'El móvil ya está en el lugar: usá cancelar servicio, no cancelar asignación' });
    }
    if (!motivo || !motivo.trim()) return res.status(400).json({ error: 'Indicá el motivo de la cancelación de asignación' });

    const result = await prisma.$transaction(async (tx) => {
      const sol = await tx.solicitud.findUnique({ where: { id: d.solicitud_id } });
      const upd = await tx.despacho.update({
        where: { id: did },
        data: { estado_despacho_id: 5, cancelacion_tipo: 'ASIGNACION', motivo_cambio: motivo.trim(), hora_fin: new Date() },
      });
      await tx.solicitud.update({ where: { id: d.solicitud_id }, data: { estado_solicitud_id: 1 } }); // vuelve a PENDIENTE
      await tx.rol_guardia_movil.update({ where: { id: d.rol_guardia_movil_id }, data: { estado: 'DISPONIBLE' } });
      await tx.historial_solicitud.create({ data: { solicitud_id: d.solicitud_id, estado_anterior_id: sol.estado_solicitud_id, estado_nuevo_id: 1, usuario_id: req.usuario.id, observacion: 'Cancelación de asignación: ' + motivo.trim() } });
      return upd;
    });
    socket.cambioEstadoSolicitud({ id: d.solicitud_id, estado_solicitud_id: 1 });
    socket.cambioEstadoVehiculo({ rol_guardia_movil_id: d.rol_guardia_movil_id, estado: 'DISPONIBLE' });
    res.json(result);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error al cancelar la asignación' }); }
};

// Cambiar la prioridad del servicio (solo antes de llegar al lugar), con motivo.
const cambiarPrioridad = async (req, res) => {
  const { id } = req.params;
  const { prioridad, motivo } = req.body;
  try {
    const did = int(id);
    const d = await prisma.despacho.findUnique({ where: { id: did } });
    if (!d) return res.status(404).json({ error: 'Despacho no encontrado' });
    if (!PRE_ESCENA.includes(d.estado_despacho_id)) {
      return res.status(409).json({ error: 'Ya no se puede cambiar la prioridad (el móvil está en el lugar o el servicio cerró)' });
    }
    if (!prioridad) return res.status(400).json({ error: 'Elegí la prioridad' });

    const result = await prisma.$transaction(async (tx) => {
      const upd = await tx.despacho.update({ where: { id: did }, data: { prioridad, motivo_cambio: motivo || null } });
      await tx.solicitud.update({ where: { id: d.solicitud_id }, data: { prioridad } });
      await tx.historial_solicitud.create({ data: { solicitud_id: d.solicitud_id, estado_anterior_id: null, estado_nuevo_id: null, usuario_id: req.usuario.id, observacion: `Cambio de prioridad a ${prioridad}${motivo ? ': ' + motivo : ''}` } });
      return upd;
    });
    socket.cambioEstadoSolicitud({ id: d.solicitud_id });
    res.json(result);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error al cambiar la prioridad' }); }
};

module.exports = { getCatalogos, getTablero, getHistorial, setUbicacion, asignar, reasignar, cambiarEstado, cancelarAsignacion, cambiarPrioridad };