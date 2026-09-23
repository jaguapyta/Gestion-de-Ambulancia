const prisma = require('../config/db');

const generarNroRecibo = async () => {
  const ultima = await prisma.recibo_combustible.findFirst({ orderBy: { id: 'desc' } });
  const num = ultima ? (parseInt(ultima.nro_recibo) || 0) + 1 : 1;
  return String(num);
};

const getRecibos = async (req, res) => {
  try {
    const recibos = await prisma.recibo_combustible.findMany({
      orderBy: { id: 'desc' },
      include: { orden_trabajo: { include: { movil: true, conductor: { include: { persona: true } } } } },
    });
    res.json(recibos);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error al obtener recibos' }); }
};

const crearRecibo = async (req, res) => {
  const { orden_trabajo_id, fecha, litros, monto_gs, nro_tickets, codigo_autorizacion } = req.body;
  try {
    if (!orden_trabajo_id || !litros) return res.status(400).json({ error: 'Falta la orden o los litros' });
    const orden = await prisma.orden_trabajo_transporte.findUnique({
      where: { id: parseInt(orden_trabajo_id) },
      include: { movil: true },
    });
    if (!orden) return res.status(404).json({ error: 'Orden de trabajo no encontrada' });

    const recibo = await prisma.recibo_combustible.create({
      data: {
        nro_recibo: await generarNroRecibo(),
        fecha: fecha ? new Date(fecha) : new Date(),
        orden_trabajo_id: orden.id,
        litros: parseFloat(litros),
        monto_gs: monto_gs ? parseInt(monto_gs) : null,
        nro_tickets: nro_tickets || null,
        codigo_autorizacion: codigo_autorizacion || null,
        nro_tarjeta: orden.movil?.nro_tarjeta_combustible ?? null,   // snapshot de la tarjeta
        creado_por: req.usuario.id,
      },
      include: { orden_trabajo: { include: { movil: true, conductor: { include: { persona: true } } } } },
    });
    res.status(201).json(recibo);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error al crear el recibo' }); }
};

module.exports = { getRecibos, crearRecibo };