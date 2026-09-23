const prisma = require('../config/db');
const { DEFAULTS } = require('../config/plantillas-default');

// Listar todas las plantillas (para el editor). Devuelve metadata + contenido.
const getPlantillas = async (req, res) => {
  try {
    const plantillas = await prisma.plantilla_documento.findMany({
      orderBy: { id: 'asc' }
    });
    res.json(plantillas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener plantillas' });
  }
};

// Obtener una plantilla por clave (la usa la impresión). Si no existe en la BD,
// devuelve el default en memoria para no romper la impresión.
const getPlantilla = async (req, res) => {
  const { clave } = req.params;
  try {
    let plantilla = await prisma.plantilla_documento.findUnique({ where: { clave } });
    if (!plantilla) {
      const def = DEFAULTS[clave];
      if (!def) return res.status(404).json({ error: 'Plantilla no encontrada' });
      plantilla = { clave, nombre: def.nombre, contenido_html: def.contenido_html, orientacion: def.orientacion, activo: true };
    }
    res.json(plantilla);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener plantilla' });
  }
};

// Guardar el contenido de una plantilla (solo ADMINISTRADOR).
const guardarPlantilla = async (req, res) => {
  const { clave } = req.params;
  const { contenido_html, orientacion } = req.body;
  if (!contenido_html) return res.status(400).json({ error: 'Falta el contenido HTML' });
  try {
    const plantilla = await prisma.plantilla_documento.upsert({
      where: { clave },
      update: {
        contenido_html,
        ...(orientacion && { orientacion }),
        updated_por: req.usuario.id,
        updated_at: new Date(),
      },
      create: {
        clave,
        nombre: DEFAULTS[clave]?.nombre ?? clave,
        contenido_html,
        orientacion: orientacion ?? DEFAULTS[clave]?.orientacion ?? 'portrait',
        updated_por: req.usuario.id,
      },
    });
    res.json(plantilla);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al guardar plantilla' });
  }
};

// Restaurar una plantilla a su versión por defecto (solo ADMINISTRADOR).
const restaurarPlantilla = async (req, res) => {
  const { clave } = req.params;
  const def = DEFAULTS[clave];
  if (!def) return res.status(404).json({ error: 'No existe un default para esta plantilla' });
  try {
    const plantilla = await prisma.plantilla_documento.upsert({
      where: { clave },
      update: {
        contenido_html: def.contenido_html,
        orientacion: def.orientacion,
        updated_por: req.usuario.id,
        updated_at: new Date(),
      },
      create: {
        clave,
        nombre: def.nombre,
        contenido_html: def.contenido_html,
        orientacion: def.orientacion,
        updated_por: req.usuario.id,
      },
    });
    res.json(plantilla);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al restaurar plantilla' });
  }
};

module.exports = { getPlantillas, getPlantilla, guardarPlantilla, restaurarPlantilla };
