const prisma = require('../config/db');
const socket = require('../socket');

// Obtener todos los despachos
const getDespachos = async (req, res) => {
  try {
    const despachos = await prisma.inotripicos.findMany({
      include: {
        solicitud: {
          include: {
            estado_solicitud: true,
            tipo_servicio: true,
            persona: true
          }
        },
        usuario: { include: { persona: true } },
        tipo_inotripico: true
      },
      orderBy: { created_at: 'desc' }
    });
    res.json(despachos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener despachos' });
  }
};

// Asignar ambulancia a solicitud
const asignarAmbulancia = async (req, res) => {
  const { solicitud_id, observacion } = req.body;
  try {
    const despacho = await prisma.inotripicos.create({
      data: {
        solicitud_id: parseInt(solicitud_id),
        usuario_id: req.usuario.id,
        observacion
      },
      include: {
        solicitud: true,
        usuario: { include: { persona: true } }
      }
    });

    // Actualizar estado de solicitud
    await prisma.solicitud.update({
      where: { id: parseInt(solicitud_id) },
      data: { estado_solicitud_id: 2 }
    });

    // Emitir evento en tiempo real
    socket.ambulanciaAsignada(despacho);

    res.status(201).json(despacho);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al asignar ambulancia' });
  }
};

module.exports = { getDespachos, asignarAmbulancia };