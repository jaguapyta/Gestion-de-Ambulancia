const prisma = require('../config/db');

// Generar código de móvil automáticamente
const generarCodMovil = async (tipo) => {
  const esAmbulancia = tipo === 'AMBULANCIA';
  const prefijo = esAmbulancia ? 'A' : 'M';

  // Obtener todos los códigos existentes con ese prefijo
  const moviles = await prisma.movil.findMany({
    select: { cod_movil: true }
  });

  // Extraer números usados globalmente
  const numerosUsados = moviles
    .map(m => {
      const match = m.cod_movil?.match(/^[AM]-(\d+)$/);
      return match ? parseInt(match[1]) : 0;
    })
    .filter(n => n > 0);

  // Encontrar el siguiente número disponible
  let siguiente = 1;
  while (numerosUsados.includes(siguiente)) {
    siguiente++;
  }

  return `${prefijo}-${siguiente}`;
};

// Obtener todos los móviles
const getMoviles = async (req, res) => {
  try {
    const moviles = await prisma.movil.findMany({
      orderBy: { id: 'asc' }
    });
    res.json(moviles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener móviles' });
  }
};

// Obtener móviles activos
const getMovilesActivos = async (req, res) => {
  try {
    const moviles = await prisma.movil.findMany({
      where: { activo: true },
      orderBy: { id: 'asc' }
    });
    res.json(moviles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener móviles activos' });
  }
};

// Crear móvil
const crearMovil = async (req, res) => {
  const { placa, tipo, marca, modelo, anio, nro_orden, rasp, funcion, consumo_l100km, nro_tarjeta_combustible, km_inicio, ultimo_km } = req.body;
  try {
    if (!placa || !tipo) return res.status(400).json({ error: 'Placa y tipo son obligatorios' });

    const existePlaca = await prisma.movil.findFirst({ where: { placa: placa.toUpperCase() } });
    if (existePlaca) return res.status(400).json({ error: 'Ya existe un móvil con esa placa' });

    const cod_movil = await generarCodMovil(tipo);

    const movil = await prisma.movil.create({
      data: {
        cod_movil,
        placa: placa.toUpperCase(),
        tipo: tipo.toUpperCase(),
        marca: marca?.toUpperCase() ?? null,
        modelo: modelo?.toUpperCase() ?? null,
        anio: anio ? parseInt(anio) : null,
        nro_orden: nro_orden ?? null,
        rasp: rasp ?? null,
        funcion: funcion ?? null,
        consumo_l100km: consumo_l100km ? parseFloat(consumo_l100km) : null,
        nro_tarjeta_combustible: nro_tarjeta_combustible ?? null,
        km_inicio: km_inicio ? parseInt(km_inicio) : null,
        ultimo_km: ultimo_km ? parseInt(ultimo_km) : null,
        activo: true
      }
    });
    res.status(201).json(movil);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear móvil' });
  }
};

// Actualizar móvil — NO permite cambiar cod_movil ni cambiar a AMBULANCIA si no lo era
const actualizarMovil = async (req, res) => {
  const { id } = req.params;
  const { placa, tipo, marca, modelo, anio, nro_orden, rasp, funcion, consumo_l100km, nro_tarjeta_combustible, km_inicio, ultimo_km, activo } = req.body;
  try {
    const movilActual = await prisma.movil.findUnique({ where: { id: parseInt(id) } });
    if (!movilActual) return res.status(404).json({ error: 'Móvil no encontrado' });

    // Validar que un M- no pueda cambiar a AMBULANCIA
    if (movilActual.cod_movil.startsWith('M-') && tipo === 'AMBULANCIA') {
      return res.status(400).json({ error: 'Un móvil no ambulancia no puede cambiar a AMBULANCIA' });
    }

    const movil = await prisma.movil.update({
      where: { id: parseInt(id) },
      data: {
        placa: placa?.toUpperCase() ?? movilActual.placa,
        tipo: tipo?.toUpperCase() ?? movilActual.tipo,
        marca: marca?.toUpperCase() ?? movilActual.marca,
        modelo: modelo?.toUpperCase() ?? movilActual.modelo,
        anio: anio ? parseInt(anio) : movilActual.anio,
        nro_orden: nro_orden ?? movilActual.nro_orden,
        rasp: rasp ?? movilActual.rasp,
        funcion: funcion ?? movilActual.funcion,
        consumo_l100km: consumo_l100km ? parseFloat(consumo_l100km) : movilActual.consumo_l100km,
        nro_tarjeta_combustible: nro_tarjeta_combustible ?? movilActual.nro_tarjeta_combustible,
        km_inicio: km_inicio ? parseInt(km_inicio) : movilActual.km_inicio,
        ultimo_km: ultimo_km ? parseInt(ultimo_km) : movilActual.ultimo_km,
        activo: activo !== undefined ? Boolean(activo) : movilActual.activo
      }
    });
    res.json(movil);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar móvil' });
  }
};

// Activar/desactivar móvil
const toggleActivoMovil = async (req, res) => {
  const { id } = req.params;
  const { activo } = req.body;
  try {
    const movil = await prisma.movil.update({
      where: { id: parseInt(id) },
      data: { activo: Boolean(activo) }
    });
    res.json(movil);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar móvil' });
  }
};

// Crear móviles masivamente
const crearMovilesMasivo = async (req, res) => {
  const { moviles } = req.body;
  if (!Array.isArray(moviles) || moviles.length === 0) {
    return res.status(400).json({ error: 'No se enviaron móviles' });
  }

  const resultados = { creados: 0, errores: [] };

  for (const m of moviles) {
    try {
      if (!m.placa || !m.tipo) {
        resultados.errores.push({ placa: m.placa ?? '?', motivo: 'Placa y tipo son obligatorios' });
        continue;
      }

      const existePlaca = await prisma.movil.findFirst({ where: { placa: String(m.placa).toUpperCase() } });
      if (existePlaca) {
        resultados.errores.push({ placa: m.placa, motivo: 'Ya existe un móvil con esa placa' });
        continue;
      }

      // Si viene cod_movil en el Excel lo usamos, sino lo generamos
      let cod_movil = m.cod_movil ? String(m.cod_movil) : await generarCodMovil(String(m.tipo));

      // Verificar que el cod_movil no esté duplicado
      const existeCod = await prisma.movil.findFirst({ where: { cod_movil } });
      if (existeCod) {
        cod_movil = await generarCodMovil(String(m.tipo));
      }

      await prisma.movil.create({
        data: {
          cod_movil,
          placa: String(m.placa).toUpperCase(),
          tipo: String(m.tipo).toUpperCase(),
          marca: m.marca ? String(m.marca).toUpperCase() : null,
          modelo: m.modelo ? String(m.modelo).toUpperCase() : null,
          anio: m.anio ? parseInt(m.anio) : null,
          nro_orden: m.nro_orden ? String(m.nro_orden) : null,
          rasp: m.rasp ? String(m.rasp) : null,
          funcion: m.funcion ? String(m.funcion) : null,
          consumo_l100km: m.consumo_l100km ? parseFloat(m.consumo_l100km) : null,
          nro_tarjeta_combustible: m.nro_tarjeta_combustible ? String(m.nro_tarjeta_combustible) : null,
          km_inicio: m.km_inicio ? parseInt(m.km_inicio) : null,
          ultimo_km: m.ultimo_km ? parseInt(m.ultimo_km) : null,
          activo: true
        }
      });
      resultados.creados++;
    } catch (err) {
      resultados.errores.push({ placa: m.placa, motivo: 'Error interno' });
    }
  }

  res.json(resultados);
};

module.exports = { getMoviles, getMovilesActivos, crearMovil, actualizarMovil, toggleActivoMovil, crearMovilesMasivo };