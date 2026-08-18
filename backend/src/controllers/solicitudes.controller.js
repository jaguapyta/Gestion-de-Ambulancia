const prisma = require('../config/db');

// Obtener todas las solicitudes
const getSolicitudes = async (req, res) => {
  try {
    const solicitudes = await prisma.solicitud.findMany({
      include: {
        persona: true,
        usuario: { include: { persona: true } }
      },
      orderBy: { created_at: 'desc' }
    });
    res.json(solicitudes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener solicitudes' });
  }
};

// Obtener solicitud por ID
const getSolicitudById = async (req, res) => {
  const { id } = req.params;
  try {
    const solicitud = await prisma.solicitud.findUnique({
      where: { id: parseInt(id) },
      include: {
        persona: true,
        usuario: { include: { persona: true } }
      }
    });
    if (!solicitud) return res.status(404).json({ error: 'Solicitud no encontrada' });
    res.json(solicitud);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener solicitud' });
  }
};

// Crear solicitud
const crearSolicitud = async (req, res) => {
  const {
    tipo_solicitud, canal_ingreso, nombre_solicitante,
    telefono, direccion, descripcion, prioridad
  } = req.body;

  try {
    const solicitud = await prisma.solicitud.create({
      data: {
        tipo_solicitud,
        canal_ingreso,
        nombre_solicitante,
        telefono,
        direccion,
        descripcion,
        prioridad,
        estado: 'PENDIENTE',
        usuario_id: req.usuario.id
      }
    });
    res.status(201).json(solicitud);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear solicitud' });
  }
};

// Actualizar estado de solicitud
const updateEstado = async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;
  try {
    const solicitud = await prisma.solicitud.update({
      where: { id: parseInt(id) },
      data: { estado }
    });
    res.json(solicitud);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar estado' });
  }
};

module.exports = { getSolicitudes, getSolicitudById, crearSolicitud, updateEstado };