const prisma = require('../config/db');
const int = v => { const n = parseInt(v); return isNaN(n) ? null : n; };
const MAP_SOL = { 1: 3, 2: 5, 3: 6, 4: 7, 5: 9 };
const H24 = 24 * 3600 * 1000;

const solInclude = {
  estado_solicitud: true, tipo_solicitud: true, canal_ingreso: true,
  solicitud_emergencia: { include: { motivo_consulta: true } },
  emergencia_respuesta: { include: { motivo_pregunta: true } },
  solicitud_traslado: true, solicitud_ref_cama: true, traslado_dialisis: true,
};
const solIncludeFull = {
  ...solInclude,
  tipo_servicio: true,
  usuario: { include: { persona: true } },
  prioridad_log: { orderBy: { created_at: 'asc' } },
  ref_cama_clinica: { include: { tipo_paciente: true, tipo_requerimiento_cama: true, condicion_paciente: true } },
  ref_cama_obstetrica: true,
  ref_cama_reiteracion: { include: { tipo_requerimiento_cama: true, condicion_paciente: true, signos_vitales: { include: { tipo_oxigeno: true } } }, orderBy: { created_at: 'asc' } },
  signos_vitales: { where: { ref_cama_reiteracion_id: null }, include: { tipo_oxigeno: true }, orderBy: { created_at: 'asc' } },
  inotripicos: { include: { tipo_inotripico: true } },
};
const editable = (d) => (Date.now() - new Date(d.hora_despacho).getTime()) < H24;

// Lista de MIS servicios (admin ve todos, para pruebas)
const getMisServicios = async (req, res) => {
  try {
    const where = req.usuario.rol === 'ADMINISTRADOR' ? {}
      : { rol_guardia_movil: { tripulacion: { some: { usuario_id: req.usuario.id, activo: true } } } };
    const desp = await prisma.despacho.findMany({
      where,
      include: {
        estado_despacho: true,
        rol_guardia_movil: { include: { movil: true, tipo_soporte: true } },
        solicitud: { include: solIncludeFull },
      },
      orderBy: { id: 'desc' }, take: 200,
    });
    res.json(desp.map(d => ({ ...d, editable: editable(d) })));
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error al obtener servicios' }); }
};

const getServicio = async (req, res) => {
  try {
    const id = int(req.params.id);
    const d = await prisma.despacho.findUnique({
      where: { id },
      include: {
        estado_despacho: true, condicion_cierre: true,
        rol_guardia_movil: { include: { movil: true, tipo_soporte: true, tripulacion: { include: { usuario: { include: { persona: true } } } } } },
                solicitud: { include: solIncludeFull },
      },
    });
    if (!d) return res.status(404).json({ error: 'Servicio no encontrado' });
    const enTrip = d.rol_guardia_movil?.tripulacion?.some(t => t.usuario_id === req.usuario.id && t.activo);
    if (!enTrip && req.usuario.rol !== 'ADMINISTRADOR') return res.status(403).json({ error: 'No pertenecés a la tripulación de este servicio' });
    res.json({ ...d, editable: editable(d) });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error al obtener el servicio' }); }
};

const cambiarEstado = async (req, res) => {
  try {
    const id = int(req.params.id);
    const { estado_despacho_id, condicion_cierre_id } = req.body;
    const d = await prisma.despacho.findUnique({ where: { id }, include: { rol_guardia_movil: { include: { tripulacion: true } } } });
    if (!d) return res.status(404).json({ error: 'Servicio no encontrado' });
    const enTrip = d.rol_guardia_movil?.tripulacion?.some(t => t.usuario_id === req.usuario.id && t.activo);
    if (!enTrip && req.usuario.rol !== 'ADMINISTRADOR') return res.status(403).json({ error: 'No pertenecés a la tripulación' });
    if (!editable(d)) return res.status(403).json({ error: 'El servicio ya no es editable (pasaron 24 h de la asignación)' });
    const nuevo = int(estado_despacho_id);
    if (!MAP_SOL[nuevo]) return res.status(400).json({ error: 'Estado inválido' });
    const cerrado = nuevo === 4 || nuevo === 5;
    await prisma.$transaction(async (tx) => {
      const dataD = { estado_despacho_id: nuevo };
      if (nuevo === 2) dataD.hora_en_escena = new Date();
      if (cerrado) { dataD.hora_fin = new Date(); if (condicion_cierre_id) dataD.condicion_cierre_id = int(condicion_cierre_id); }
      await tx.despacho.update({ where: { id }, data: dataD });
      const sol = await tx.solicitud.findUnique({ where: { id: d.solicitud_id } });
      await tx.solicitud.update({ where: { id: d.solicitud_id }, data: { estado_solicitud_id: MAP_SOL[nuevo] } });
      await tx.historial_solicitud.create({ data: { solicitud_id: d.solicitud_id, estado_anterior_id: sol.estado_solicitud_id, estado_nuevo_id: MAP_SOL[nuevo], usuario_id: req.usuario.id, observacion: 'Tripulación: estado ' + nuevo } });
      if (cerrado) await tx.rol_guardia_movil.update({ where: { id: d.rol_guardia_movil_id }, data: { estado: 'DISPONIBLE' } });
    });
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error al cambiar el estado' }); }
};

module.exports = { getMisServicios, getServicio, cambiarEstado };