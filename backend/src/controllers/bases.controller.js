const prisma = require('../config/db');

const getBases = async (req, res) => {
  try {
    const bases = await prisma.base.findMany({
      orderBy: { nombre: 'asc' }
    });
    res.json(bases);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener bases' });
  }
};

const crearBase = async (req, res) => {
  const { nombre, calle, nro, barrio, ciudad, referencia, latitud, longitud } = req.body;
  try {
    if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });
    const existe = await prisma.base.findFirst({ where: { nombre: nombre.toUpperCase() } });
    if (existe) return res.status(400).json({ error: 'Ya existe una base con ese nombre' });
    const base = await prisma.base.create({
      data: {
        nombre: nombre.toUpperCase(),
        calle: calle?.toUpperCase() ?? null,
        nro: nro ?? null,
        barrio: barrio?.toUpperCase() ?? null,
        ciudad: ciudad?.toUpperCase() ?? null,
        referencia: referencia?.toUpperCase() ?? null,
        latitud: latitud ? parseFloat(latitud) : null,
        longitud: longitud ? parseFloat(longitud) : null,
        activa: true
      }
    });
    res.status(201).json(base);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear base' });
  }
};

const actualizarBase = async (req, res) => {
  const { id } = req.params;
  const { nombre, calle, nro, barrio, ciudad, referencia, latitud, longitud, activa } = req.body;
  try {
    const base = await prisma.base.update({
      where: { id: parseInt(id) },
      data: {
        nombre: nombre?.toUpperCase(),
        calle: calle?.toUpperCase() ?? null,
        nro: nro ?? null,
        barrio: barrio?.toUpperCase() ?? null,
        ciudad: ciudad?.toUpperCase() ?? null,
        referencia: referencia?.toUpperCase() ?? null,
        latitud: latitud ? parseFloat(latitud) : null,
        longitud: longitud ? parseFloat(longitud) : null,
        activa: activa !== undefined ? Boolean(activa) : undefined
      }
    });
    res.json(base);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar base' });
  }
};

const toggleActiva = async (req, res) => {
  const { id } = req.params;
  const { activa } = req.body;
  try {
    const base = await prisma.base.update({
      where: { id: parseInt(id) },
      data: { activa: Boolean(activa) }
    });
    res.json(base);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar base' });
  }
};

const crearBasesMasivo = async (req, res) => {
  const { bases } = req.body;
  if (!Array.isArray(bases) || bases.length === 0) {
    return res.status(400).json({ error: 'No se enviaron bases' });
  }
  const resultados = { creados: 0, errores: [] };
  for (const b of bases) {
    try {
      if (!b.nombre) { resultados.errores.push({ nombre: '?', motivo: 'Nombre obligatorio' }); continue; }
      const existe = await prisma.base.findFirst({ where: { nombre: String(b.nombre).toUpperCase() } });
      if (existe) { resultados.errores.push({ nombre: b.nombre, motivo: 'Ya existe una base con ese nombre' }); continue; }
      await prisma.base.create({
        data: {
          nombre: String(b.nombre).toUpperCase(),
          calle: b.calle ? String(b.calle).toUpperCase() : null,
          nro: b.nro ? String(b.nro) : null,
          barrio: b.barrio ? String(b.barrio).toUpperCase() : null,
          ciudad: b.ciudad ? String(b.ciudad).toUpperCase() : null,
          referencia: b.referencia ? String(b.referencia).toUpperCase() : null,
          latitud: b.latitud ? parseFloat(b.latitud) : null,
          longitud: b.longitud ? parseFloat(b.longitud) : null,
          activa: true
        }
      });
      resultados.creados++;
    } catch (err) {
      resultados.errores.push({ nombre: b.nombre, motivo: 'Error interno' });
    }
  }
  res.json(resultados);
};

module.exports = { getBases, crearBase, actualizarBase, toggleActiva, crearBasesMasivo };