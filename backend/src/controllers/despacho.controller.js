const prisma = require('../config/db');
const socket = require('../socket');

const int = v => { const n = parseInt(v); return isNaN(n) ? null : n; };

const ABIERTOS = [1, 2]; // PENDIENTE, EN_PROCESO
// estado_despacho -> estado_solicitud
const MAP_SOL = { 1: 3, 2: 5, 3: 6, 4: 7, 5: 9 };
// Estados de solicitud terminales: salen del tablero operativo y pasan al histórico.
// 7 FINALIZADA · 8 CERRADA · 9 CANCELADA · 10 FALSA_ALARMA · 11 NO_CONFIRMADA · 12 RESUELTO
const TERMINALES = [7, 8, 9, 10, 11, 12];

// Móvil asignado activo (para las tarjetas del tablero).
const despachoActivo = {
  where: { estado_despacho_id: { in: [1, 2, 3] } },
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

// Último despacho sin filtrar por estado (para el histórico: el servicio ya está cerrado).
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
    // Emergencias (columna izquierda) — quedan a la vista hasta que terminan; pendientes primero.
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

    // Traslados (debajo del mapa) — por hora: TRASLADO + CAMA (SEME + enviado a despacho)
    const traslados = await prisma.solicitud.findMany({
      where: {
        estado_solicitud_id: { notIn: TERMINALES },   // salen del tablero al terminar
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

    // Móviles de guardia (columna derecha + mapa) — solo los VIGENTES por horario.
    // Ventana semiabierta [inicio, fin): inicio inclusivo, fin exclusivo.
    // Así el móvil deja de verse/despacharse fuera de su horario, sin activar/desactivar manual.
    const ahora = new Date();
    const moviles = await prisma.rol_guardia_movil.findMany({
      where: {
        activo: true,
        vigencia_inicio: { lte: ahora },
        vigencia_fin: { gt: ahora },
      },
      include: {
        base: true, tipo_soporte: true, movil: true,
        tripulacion: { where: { activo: true }, include: { usuario: { include: { persona: true } } } },
        despacho: {
          where: { estado_despacho_id: { in: [1, 2, 3] } },
          orderBy: { id: 'desc' }, take: 1,
          include: { estado_despacho: true, solicitud: true },
        },
      },
    });
    moviles.sort((a, b) => (a.estado === 'DISPONIBLE' ? 0 : 1) - (b.estado === 'DISPONIBLE' ? 0 : 1));
    res.json({ emergencias, traslados, moviles });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error al cargar el tablero' }); }
};

// Histórico de despacho: emergencias y traslados ya terminados (estados terminales).
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

// El despachante marca/corrige la ubicación del incidente en el mapa
const setUbicacion = async (req, res) => {
  const { id } = req.params;
  const { latitud, longitud, direccion } = req.body;
  try {
    const s = await prisma.solicitud.update({
      where: { id: int(id) },
      data: {
        latitud: latitud ?? null, longitud: longitud ?? null,
        ...(direccion !== undefined ? { direccion } : {}),
      },
    });
    socket.cambioEstadoSolicitud(s);
    res.json(s);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error al guardar la ubicación' }); }
};

// Asignar un móvil a una solicitud
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

// Reasignar el móvil de un despacho.
//  - EMERGENCIA: solo mientras el móvil no llegó al lugar (estado_despacho DESPACHADO=1).
//                Cuando la tripulación marca "en el lugar" (2) ya no se puede cambiar.
//  - TRASLADO / CAMA: se puede reasignar mientras el servicio no esté cerrado (4 FINALIZADO / 5 CANCELADO).
const reasignar = async (req, res) => {
  const { id } = req.params;                       // id del despacho
  const { rol_guardia_movil_id, observacion } = req.body;
  try {
    const did = int(id), nuevoMovil = int(rol_guardia_movil_id);
    if (!did || !nuevoMovil) return res.status(400).json({ error: 'Falta despacho o móvil nuevo' });

    const d = await prisma.despacho.findUnique({ where: { id: did }, include: { solicitud: true } });
    if (!d) return res.status(404).json({ error: 'Despacho no encontrado' });

    const esEmergencia = d.solicitud?.tipo_solicitud_id === 1;
    if (esEmergencia && d.estado_despacho_id !== 1) {
      return res.status(409).json({ error: 'La emergencia ya está en el lugar: no se puede reasignar el móvil' });
    }
    if (!esEmergencia && [4, 5].includes(d.estado_despacho_id)) {
      return res.status(409).json({ error: 'El servicio ya está cerrado: no se puede reasignar el móvil' });
    }
    if (d.rol_guardia_movil_id === nuevoMovil) {
      return res.status(400).json({ error: 'Es el mismo móvil' });
    }
    const movilNuevo = await prisma.rol_guardia_movil.findUnique({ where: { id: nuevoMovil } });
    if (!movilNuevo || !movilNuevo.activo) return res.status(404).json({ error: 'Móvil no disponible' });

    const upd = await prisma.$transaction(async (tx) => {
      const anterior = d.rol_guardia_movil_id;
      const r = await tx.despacho.update({ where: { id: did }, data: { rol_guardia_movil_id: nuevoMovil } });
      await tx.rol_guardia_movil.update({ where: { id: anterior }, data: { estado: 'DISPONIBLE' } });
      await tx.rol_guardia_movil.update({ where: { id: nuevoMovil }, data: { estado: 'OCUPADO' } });
      await tx.historial_solicitud.create({
        data: {
          solicitud_id: d.solicitud_id,
          estado_anterior_id: d.solicitud.estado_solicitud_id,
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

// Avanzar el estado del despacho (DESPACHADO→EN_ESCENA→TRASLADANDO→FINALIZADO/CANCELADO)
const cambiarEstado = async (req, res) => {
  const { id } = req.params;
  const { estado_despacho_id, condicion_cierre_id } = req.body;
  try {
    const did = int(id), nuevo = int(estado_despacho_id);
    const d = await prisma.despacho.findUnique({ where: { id: did } });
    if (!d) return res.status(404).json({ error: 'Despacho no encontrado' });
    if (!MAP_SOL[nuevo]) return res.status(400).json({ error: 'Estado inválido' });

    const cerrado = nuevo === 4 || nuevo === 5;
    const result = await prisma.$transaction(async (tx) => {
      const dataD = { estado_despacho_id: nuevo };
      if (nuevo === 2) dataD.hora_en_escena = new Date();
      if (cerrado) { dataD.hora_fin = new Date(); if (condicion_cierre_id) dataD.condicion_cierre_id = int(condicion_cierre_id); }
      const upd = await tx.despacho.update({ where: { id: did }, data: dataD });
      const sol = await tx.solicitud.findUnique({ where: { id: d.solicitud_id } });
      await tx.solicitud.update({ where: { id: d.solicitud_id }, data: { estado_solicitud_id: MAP_SOL[nuevo] } });
      await tx.historial_solicitud.create({ data: { solicitud_id: d.solicitud_id, estado_anterior_id: sol.estado_solicitud_id, estado_nuevo_id: MAP_SOL[nuevo], usuario_id: req.usuario.id, observacion: 'Despacho estado ' + nuevo } });
      if (cerrado) await tx.rol_guardia_movil.update({ where: { id: d.rol_guardia_movil_id }, data: { estado: 'DISPONIBLE' } });
      return upd;
    });
    socket.cambioEstadoSolicitud({ id: d.solicitud_id, estado_solicitud_id: MAP_SOL[nuevo] });
    if (cerrado) socket.cambioEstadoVehiculo({ rol_guardia_movil_id: d.rol_guardia_movil_id, estado: 'DISPONIBLE' });
    res.json(result);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error al cambiar el estado' }); }
};

module.exports = { getCatalogos, getTablero, getHistorial, setUbicacion, asignar, reasignar, cambiarEstado };