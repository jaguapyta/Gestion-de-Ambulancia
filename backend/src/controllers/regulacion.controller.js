const prisma = require('../config/db');

const TIPO_REF_CAMA = 3;
const int = (v) => { const n = parseInt(v); return isNaN(n) ? null : n; };
const estadoId = async (nombre) => (await prisma.estado_solicitud.findFirst({ where: { nombre } }))?.id ?? null;

// Catálogos para la pantalla (filtro por tipo de paciente + motivos de cierre)
const getCatalogos = async (req, res) => {
  try {
    const [tipos_paciente, condiciones_cierre] = await Promise.all([
      prisma.tipo_paciente.findMany({ where: { activo: true }, orderBy: { id: 'asc' } }),
      prisma.condicion_cierre.findMany({ where: { activo: true }, orderBy: { id: 'asc' } }),
    ]);
    res.json({ tipos_paciente, condiciones_cierre });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error al obtener catálogos' }); }
};

// Lista de casos de cama. Por defecto pendientes+resueltos; con ?cerrados=1 los cerrados.
const getCamas = async (req, res) => {
  const { cerrados, tipos, q } = req.query;
  try {
    const CERRADA = await estadoId('CERRADA');
    const tiposArr = tipos ? String(tipos).split(',').map(Number).filter(Boolean) : [];
    const where = {
      tipo_solicitud_id: TIPO_REF_CAMA,
      ...(cerrados === '1' ? { estado_solicitud_id: CERRADA } : { estado_solicitud_id: { not: CERRADA } }),
      ...(tiposArr.length ? { ref_cama_clinica: { tipo_paciente_id: { in: tiposArr } } } : {}),
      ...(q ? {
        OR: [
          { paciente_nombre: { contains: q } },
          { paciente_apellido: { contains: q } },
          { paciente_documento: { contains: q } },
          { solicitud_ref_cama: { centro_solicitante: { contains: q } } },
        ],
      } : {}),
    };
    const casos = await prisma.solicitud.findMany({
      where,
      include: {
        estado_solicitud: true,
        solicitud_ref_cama: true,
        ref_cama_clinica: { include: { tipo_paciente: true, tipo_requerimiento_cama: true, condicion_paciente: true } },
        regulacion_cama: true,
        _count: { select: { ref_cama_reiteracion: true } },
      },
      orderBy: { created_at: 'asc' },
    });
    res.json(casos);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error al obtener casos' }); }
};

// Detalle completo de un caso (todo lo de recepción + reiteraciones + regulación)
const getCaso = async (req, res) => {
  const { id } = req.params;
  try {
    const caso = await prisma.solicitud.findUnique({
      where: { id: int(id) },
      include: {
        estado_solicitud: true, canal_ingreso: true, usuario: { include: { persona: true } },
        solicitud_ref_cama: true,
        ref_cama_clinica: { include: { tipo_paciente: true, tipo_requerimiento_cama: true, condicion_paciente: true } },
        ref_cama_obstetrica: true,
        ref_cama_reiteracion: { include: { tipo_requerimiento_cama: true, condicion_paciente: true, signos_vitales: { include: { tipo_oxigeno: true } } }, orderBy: { created_at: 'asc' } },
        signos_vitales: { where: { ref_cama_reiteracion_id: null }, include: { tipo_oxigeno: true }, orderBy: { created_at: 'asc' } },
        inotripicos: { include: { tipo_inotripico: true } },
        regulacion_cama: { include: { condicion_cierre: true, usuario: { include: { persona: true } } } },
        regulacion_llamada: { include: { usuario: { include: { persona: true } } }, orderBy: { created_at: 'desc' } },
      },
    });
    if (!caso) return res.status(404).json({ error: 'Caso no encontrado' });
    res.json(caso);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error al obtener el caso' }); }
};

// Guardar/actualizar la gestión del médico (upsert)
const guardarGestion = async (req, res) => {
  const { id } = req.params;
  const b = req.body;
  try {
    const data = {
      hospital_destino: b.hospital_destino ?? null,
      receptor_nombre: b.receptor_nombre ?? null,
      receptor_telefono: b.receptor_telefono?.trim() || null,
      observaciones: b.observaciones ?? null,
      quien_traslada: b.quien_traslada ?? null,
      contrarreferencia: b.contrarreferencia ?? false,
      enviado_despacho: b.enviado_despacho ?? false,
    };
    const reg = await prisma.regulacion_cama.upsert({
      where: { solicitud_id: int(id) },
      update: data,
      create: { solicitud_id: int(id), medico_id: req.usuario.id, ...data },
    });
    res.json(reg);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error al guardar la gestión' }); }
};

// Cambiar estado: RESUELTO o CERRADA (con historial)
const cambiarEstado = async (req, res) => {
  const { id } = req.params;
  const { estado, condicion_cierre_id, motivo_cierre } = req.body;
  try {
    const sid = int(id);
    const sol = await prisma.solicitud.findUnique({ where: { id: sid } });
    if (!sol) return res.status(404).json({ error: 'Caso no encontrado' });
    if (estado !== 'RESUELTO' && estado !== 'CERRADA') return res.status(400).json({ error: 'Estado inválido' });
    const nuevoId = await estadoId(estado);
    if (!nuevoId) return res.status(400).json({ error: `No existe el estado ${estado}` });

    await prisma.$transaction(async (tx) => {
      await tx.solicitud.update({ where: { id: sid }, data: { estado_solicitud_id: nuevoId } });
      const regData = {};
      if (estado === 'RESUELTO') regData.fecha_resolucion = new Date();
      if (estado === 'CERRADA') {
        regData.fecha_cierre = new Date();
        if (condicion_cierre_id) regData.condicion_cierre_id = int(condicion_cierre_id);
        if (motivo_cierre) regData.motivo_cierre = motivo_cierre;
      }
      await tx.regulacion_cama.upsert({
        where: { solicitud_id: sid },
        update: regData,
        create: { solicitud_id: sid, medico_id: req.usuario.id, ...regData },
      });
      await tx.historial_solicitud.create({
        data: { solicitud_id: sid, estado_anterior_id: sol.estado_solicitud_id, estado_nuevo_id: nuevoId, usuario_id: req.usuario.id, observacion: estado === 'RESUELTO' ? 'Cama conseguida (resuelto)' : (motivo_cierre || 'Caso cerrado') },
      });
    });
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error al cambiar el estado' }); }
};

// Registrar una llamada de gestión (a qué hospital/unidad se llamó y qué respondieron)
const agregarLlamada = async (req, res) => {
  const { id } = req.params;
  const { hospital_unidad, medico_contactado, telefono, respuesta } = req.body;
  try {
    if (!hospital_unidad || !hospital_unidad.trim()) return res.status(400).json({ error: 'Indicá el hospital / unidad al que se llamó' });
    const ll = await prisma.regulacion_llamada.create({
      data: {
        solicitud_id: int(id), usuario_id: req.usuario.id,
        hospital_unidad: hospital_unidad.trim(),
        medico_contactado: medico_contactado?.trim() || null,
        telefono: telefono?.trim() || null,
        respuesta: respuesta?.trim() || null,
      },
    });
    res.status(201).json(ll);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error al registrar la llamada' }); }
};

module.exports = { getCatalogos, getCamas, getCaso, guardarGestion, cambiarEstado, agregarLlamada };