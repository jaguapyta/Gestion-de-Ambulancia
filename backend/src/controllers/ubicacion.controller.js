const prisma = require('../config/db');

// Resuelve el rol_guardia_movil ACTIVO del usuario logueado (por su tripulación
// en una guardia ACTIVA). Es el "móvil" cuya posición reporta la app.
const getRgmActivo = async (usuarioId) => {
  return prisma.rol_guardia_movil.findFirst({
    where: {
      activo: true,
      rol_guardia: { estado: 'ACTIVO' },
      tripulacion: { some: { usuario_id: usuarioId, activo: true } },
    },
    include: { movil: true, rol_guardia: true },
    orderBy: { id: 'desc' },
  });
};

// GET /api/ubicacion/mi-movil → qué móvil está reportando este usuario.
const getMiMovil = async (req, res) => {
  try {
    const rgm = await getRgmActivo(req.usuario.id);
    if (!rgm) return res.status(404).json({ error: 'No estás asignado a un móvil en una guardia activa.' });
    res.json({
      rol_guardia_movil_id: rgm.id,
      cod_movil: rgm.movil?.cod_movil ?? null,
      guardia_codigo: rgm.rol_guardia?.codigo ?? null,
      latitud: rgm.latitud, longitud: rgm.longitud, updated_at: rgm.updated_at,
    });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error al obtener el móvil' }); }
};

// POST /api/ubicacion  { latitud, longitud }  → actualiza la posición del móvil del usuario.
const reportarUbicacion = async (req, res) => {
  try {
    const lat = Number(req.body.latitud);
    const lng = Number(req.body.longitud);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: 'latitud/longitud inválidas' });
    }
    const rgm = await getRgmActivo(req.usuario.id);
    if (!rgm) return res.status(404).json({ error: 'No estás asignado a un móvil en una guardia activa.' });

    await prisma.rol_guardia_movil.update({
      where: { id: rgm.id },
      data: { latitud: lat, longitud: lng, updated_at: new Date() },
    });
    res.json({ ok: true, cod_movil: rgm.movil?.cod_movil ?? null });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error al reportar la ubicación' }); }
};

module.exports = { getMiMovil, reportarUbicacion };
