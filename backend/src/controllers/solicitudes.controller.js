const prisma = require('../config/db');

// Catálogos para los formularios de recepción
const getCatalogos = async (req, res) => {
  try {
    const [tipos_solicitud, tipos_servicio, canales, estados] = await Promise.all([
      prisma.tipo_solicitud.findMany({ where: { activo: true }, orderBy: { id: 'asc' } }),
      prisma.tipo_servicio.findMany({ where: { activo: true }, orderBy: { id: 'asc' } }),
      prisma.canal_ingreso.findMany({ where: { activo: true }, orderBy: { id: 'asc' } }),
      prisma.estado_solicitud.findMany({ where: { activo: true }, orderBy: { id: 'asc' } }),
    ]);
    res.json({ tipos_solicitud, tipos_servicio, canales, estados });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener catálogos' });
  }
};

// Listado con filtros (estado, tipo) y búsqueda por nombre/dirección
const getSolicitudes = async (req, res) => {
  const { estado_id, tipo_id, q } = req.query;
  try {
    const solicitudes = await prisma.solicitud.findMany({
      where: {
        ...(estado_id ? { estado_solicitud_id: parseInt(estado_id) } : {}),
        ...(tipo_id ? { tipo_solicitud_id: parseInt(tipo_id) } : {}),
        ...(q ? {
          OR: [
            { paciente_nombre: { contains: q } },
            { paciente_apellido: { contains: q } },
            { paciente_documento: { contains: q } },
            { denunciante_nombre: { contains: q } },
            { direccion: { contains: q } },
          ],
        } : {}),
      },
      include: {
        tipo_solicitud: true,
        tipo_servicio: true,
        canal_ingreso: true,
        estado_solicitud: true,
        usuario: { include: { persona: true } },
        solicitud_ref_cama: { select: { centro_solicitante: true } },
        ref_cama_reiteracion: { select: { created_at: true }, orderBy: { created_at: 'desc' }, take: 1 },
        _count: { select: { ref_cama_reiteracion: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 200,
    });
    res.json(solicitudes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener solicitudes' });
  }
};

// Detalle completo, incluida la bitácora de estados
const getSolicitudById = async (req, res) => {
  const { id } = req.params;
  try {
    const solicitud = await prisma.solicitud.findUnique({
      where: { id: parseInt(id) },
      include: {
        tipo_solicitud: true,
        tipo_servicio: true,
        canal_ingreso: true,
        estado_solicitud: true,
        persona: true,
        usuario: { include: { persona: true } },
        solicitud_ref_cama: true,
        solicitud_traslado: true,
        ref_cama_clinica: { include: { tipo_paciente: true, tipo_requerimiento_cama: true, condicion_paciente: true } },
        ref_cama_obstetrica: true,
        ref_cama_reiteracion: {
          include: { tipo_requerimiento_cama: true, condicion_paciente: true, usuario: { include: { persona: true } }, signos_vitales: { include: { tipo_oxigeno: true } } },
          orderBy: { created_at: 'asc' },
        },
        signos_vitales: { where: { ref_cama_reiteracion_id: null }, include: { tipo_oxigeno: true }, orderBy: { created_at: 'asc' } },
        inotripicos: { include: { tipo_inotripico: true } },
        historial_solicitud: {
          include: {
            usuario: { include: { persona: true } },
            estado_solicitud_historial_solicitud_estado_anterior_idToestado_solicitud: true,
            estado_solicitud_historial_solicitud_estado_nuevo_idToestado_solicitud: true,
          },
          orderBy: { created_at: 'asc' },
        },
      },
    });
    if (!solicitud) return res.status(404).json({ error: 'Solicitud no encontrada' });
    res.json(solicitud);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener la solicitud' });
  }
};

// Recepción — crea la cabecera común. El detalle por tipo se agrega en su módulo.
const crearSolicitud = async (req, res) => {
  const {
    tipo_solicitud_id, tipo_servicio_id, canal_ingreso_id,
    denunciante_nombre, denunciante_telefono,
    direccion, nro_casa, ciudad, barrio, latitud, longitud,
    persona_id, paciente_nombre, paciente_apellido, paciente_documento,
    paciente_edad, paciente_sexo, es_nn, observacion,
  } = req.body;

  try {
    if (!tipo_solicitud_id || !tipo_servicio_id || !canal_ingreso_id) {
      return res.status(400).json({ error: 'Faltan tipo de solicitud, servicio o canal de ingreso' });
    }
    if (!denunciante_telefono) {
      return res.status(400).json({ error: 'El teléfono del denunciante es obligatorio' });
    }

    // La solicitud y su primer asiento de historial se crean juntos o no se crean
    const solicitud = await prisma.$transaction(async (tx) => {
      const s = await tx.solicitud.create({
        data: {
          tipo_solicitud_id: parseInt(tipo_solicitud_id),
          tipo_servicio_id: parseInt(tipo_servicio_id),
          canal_ingreso_id: parseInt(canal_ingreso_id),
          estado_solicitud_id: 1, // PENDIENTE
          recepcionista_id: req.usuario.id,
          denunciante_nombre: denunciante_nombre ?? null,
          denunciante_telefono,
          direccion: direccion ?? null,
          nro_casa: nro_casa ?? null,
          ciudad: ciudad ?? null,
          barrio: barrio ?? null,
          latitud: latitud ? parseFloat(latitud) : null,
          longitud: longitud ? parseFloat(longitud) : null,
          persona_id: persona_id ? parseInt(persona_id) : null,
          paciente_nombre: paciente_nombre ?? null,
          paciente_apellido: paciente_apellido ?? null,
          paciente_documento: paciente_documento ?? null,
          paciente_edad: paciente_edad ?? null,
          paciente_sexo: paciente_sexo ?? null,
          es_nn: es_nn ?? false,
          observacion: observacion ?? null,
        },
      });
      await tx.historial_solicitud.create({
        data: {
          solicitud_id: s.id,
          estado_anterior_id: null,
          estado_nuevo_id: 1,
          usuario_id: req.usuario.id,
          observacion: 'Solicitud recepcionada',
        },
      });
      return s;
    });

    res.status(201).json(solicitud);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear la solicitud' });
  }
};

// Cambio de estado con asiento automático en el historial
const cambiarEstado = async (req, res) => {
  const { id } = req.params;
  const { estado_nuevo_id, observacion } = req.body;
  try {
    const solicitud = await prisma.solicitud.findUnique({ where: { id: parseInt(id) } });
    if (!solicitud) return res.status(404).json({ error: 'Solicitud no encontrada' });

    const nuevo = parseInt(estado_nuevo_id);
    if (!nuevo) return res.status(400).json({ error: 'Falta el estado nuevo' });
    if (nuevo === solicitud.estado_solicitud_id) {
      return res.status(400).json({ error: 'La solicitud ya está en ese estado' });
    }

    const actualizada = await prisma.$transaction(async (tx) => {
      const s = await tx.solicitud.update({
        where: { id: solicitud.id },
        data: { estado_solicitud_id: nuevo },
      });
      await tx.historial_solicitud.create({
        data: {
          solicitud_id: solicitud.id,
          estado_anterior_id: solicitud.estado_solicitud_id,
          estado_nuevo_id: nuevo,
          usuario_id: req.usuario.id,
          observacion: observacion ?? null,
        },
      });
      return s;
    });
    res.json(actualizada);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cambiar el estado' });
  }
};

module.exports = { getCatalogos, getSolicitudes, getSolicitudById, crearSolicitud, cambiarEstado };