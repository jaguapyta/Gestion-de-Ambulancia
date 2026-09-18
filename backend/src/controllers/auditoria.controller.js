const prisma = require('../config/db');

// Lista los intentos de acceso (login) para el módulo de auditoría.
// Filtros opcionales: ?desde=YYYY-MM-DD & hasta=YYYY-MM-DD & resultado=EXITO|FALLIDO & q=texto
const listarAccesos = async (req, res) => {
  const { desde, hasta, resultado, q } = req.query;
  try {
    const where = { modulo: 'AUTENTICACION' };
    if (resultado === 'EXITO' || resultado === 'FALLIDO') where.resultado = resultado;
    if (desde || hasta) {
      where.fecha_hora = {};
      if (desde) where.fecha_hora.gte = new Date(`${desde}T00:00:00`);
      if (hasta) where.fecha_hora.lte = new Date(`${hasta}T23:59:59`);
    }
    if (q) {
      where.OR = [
        { usuario_nombre: { contains: q } },
        { descripcion: { contains: q } },
        { detalle_error: { contains: q } },
        { ip: { contains: q } },
      ];
    }

    const registros = await prisma.auditoria.findMany({
      where,
      orderBy: { fecha_hora: 'desc' },
      take: 300,
    });

    res.json(registros.map((r) => ({
      id: r.id.toString(),
      fecha_hora: r.fecha_hora,
      usuario_id: r.usuario_id,
      usuario_nombre: r.usuario_nombre,
      rol_nombre: r.rol_nombre,
      ip: r.ip,
      dispositivo: r.dispositivo,
      resultado: r.resultado,
      detalle_error: r.detalle_error,
      descripcion: r.descripcion,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener la auditoría de accesos' });
  }
};

module.exports = { listarAccesos };