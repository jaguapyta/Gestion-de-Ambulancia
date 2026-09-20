const prisma = require('../config/db');

// Convierte BigInt (que devuelve MySQL en COUNT/SUM) a Number para poder serializar a JSON.
const fix = (rows) => rows.map(r => {
  const o = {};
  for (const k in r) o[k] = typeof r[k] === 'bigint' ? Number(r[k]) : r[k];
  return o;
});

const TIPOS = { 1: 'Emergencia', 2: 'Traslado', 3: 'Pedido de cama', 4: 'Cobertura' };

const getEstadisticas = async (req, res) => {
  try {
    const hoy = new Date();
    const desde = req.query.desde ? new Date(`${req.query.desde}T00:00:00`) : new Date(hoy.getTime() - 30 * 86400000);
    const hasta = req.query.hasta ? new Date(`${req.query.hasta}T23:59:59`) : hoy;
    const rango = { gte: desde, lte: hasta };

    // ---- Volumen ----
    const [total, gTipo, gPrioridad] = await Promise.all([
      prisma.solicitud.count({ where: { created_at: rango } }),
      prisma.solicitud.groupBy({ by: ['tipo_solicitud_id'], where: { created_at: rango }, _count: { _all: true } }),
      prisma.solicitud.groupBy({ by: ['prioridad'], where: { created_at: rango }, _count: { _all: true } }),
    ]);
    const porTipo = gTipo.map(x => ({ nombre: TIPOS[x.tipo_solicitud_id] || `Tipo ${x.tipo_solicitud_id}`, total: x._count._all }))
      .sort((a, b) => b.total - a.total);
    const porPrioridad = gPrioridad.map(x => ({ nombre: x.prioridad || 'S/D', total: x._count._all }))
      .sort((a, b) => b.total - a.total);

    // Serie diaria
    const serie = fix(await prisma.$queryRaw`
      SELECT DATE(created_at) fecha, COUNT(*) total
      FROM solicitud WHERE created_at BETWEEN ${desde} AND ${hasta}
      GROUP BY DATE(created_at) ORDER BY fecha`);

    // Top motivos (emergencias)
    const topMotivos = fix(await prisma.$queryRaw`
      SELECT mc.nombre, COUNT(*) total
      FROM solicitud_emergencia se
      JOIN solicitud s ON s.id = se.solicitud_id
      JOIN motivo_consulta mc ON mc.id = se.motivo_consulta_id
      WHERE s.created_at BETWEEN ${desde} AND ${hasta}
      GROUP BY mc.id ORDER BY total DESC LIMIT 10`);

    // ---- Tiempos promedio (minutos) ----
    const tiempos = fix(await prisma.$queryRaw`
      SELECT
        ROUND(AVG(TIMESTAMPDIFF(MINUTE, s.created_at, d.hora_despacho))) respuesta,
        ROUND(AVG(TIMESTAMPDIFF(MINUTE, d.hora_en_escena, d.hora_fin))) atencion,
        ROUND(AVG(TIMESTAMPDIFF(MINUTE, d.hora_despacho, d.hora_fin))) total
      FROM despacho d JOIN solicitud s ON s.id = d.solicitud_id
      WHERE d.hora_despacho BETWEEN ${desde} AND ${hasta}`)[0] || {};

    // ---- Productividad ----
    const porMovil = fix(await prisma.$queryRaw`
      SELECT m.cod_movil AS movil, COUNT(*) servicios,
        SUM(GREATEST(COALESCE(d.km_fin,0) - COALESCE(d.km_inicio,0), 0)) km
      FROM despacho d
      JOIN rol_guardia_movil rgm ON rgm.id = d.rol_guardia_movil_id
      JOIN movil m ON m.id = rgm.vehiculo_id
      WHERE d.hora_despacho BETWEEN ${desde} AND ${hasta}
      GROUP BY m.id ORDER BY servicios DESC`);

    const porBase = fix(await prisma.$queryRaw`
      SELECT b.nombre AS base, COUNT(*) servicios
      FROM despacho d
      JOIN rol_guardia_movil rgm ON rgm.id = d.rol_guardia_movil_id
      JOIN base b ON b.id = rgm.base_id
      WHERE d.hora_despacho BETWEEN ${desde} AND ${hasta}
      GROUP BY b.id ORDER BY servicios DESC`);

    const porPersona = fix(await prisma.$queryRaw`
      SELECT CONCAT(pe.primer_nombre, ' ', pe.primer_apellido) AS persona, t.funcion, COUNT(*) servicios
      FROM despacho d
      JOIN tripulacion t ON t.rol_guardia_movil_id = d.rol_guardia_movil_id AND t.activo = 1
      JOIN usuario u ON u.id = t.usuario_id
      JOIN persona pe ON pe.id = u.persona_id
      WHERE d.hora_despacho BETWEEN ${desde} AND ${hasta}
      GROUP BY u.id, t.funcion ORDER BY servicios DESC LIMIT 30`);

    // ---- Llamadas vs incidentes ----
    const [llamadas, incidentes] = await Promise.all([
      prisma.llamada.count({ where: { created_at: rango } }),
      prisma.solicitud.count({ where: { tipo_solicitud_id: 1, created_at: rango } }),
    ]);

    // ---- Cierres por condición ----
    const porCierre = fix(await prisma.$queryRaw`
      SELECT cc.nombre, COUNT(*) total
      FROM despacho d JOIN condicion_cierre cc ON cc.id = d.condicion_cierre_id
      WHERE d.hora_fin BETWEEN ${desde} AND ${hasta}
      GROUP BY cc.id ORDER BY total DESC`);

    // ---- Cancelaciones (servicio vs asignación) ----
    const cancelaciones = fix(await prisma.$queryRaw`
      SELECT COALESCE(cancelacion_tipo, 'SIN_DATO') tipo, COUNT(*) total
      FROM despacho WHERE estado_despacho_id = 5 AND hora_fin BETWEEN ${desde} AND ${hasta}
      GROUP BY cancelacion_tipo`);

    // ---- Centro de Regulación (camas) ----
    const [pedidosCama, camasResueltas, camasCerradas, llamadasReg] = await Promise.all([
      prisma.solicitud.count({ where: { tipo_solicitud_id: 3, created_at: rango } }),
      prisma.solicitud.count({ where: { tipo_solicitud_id: 3, estado_solicitud_id: 12, created_at: rango } }), // RESUELTO
      prisma.solicitud.count({ where: { tipo_solicitud_id: 3, estado_solicitud_id: 8, created_at: rango } }),  // CERRADA
      prisma.regulacion_llamada.count({ where: { created_at: rango } }),
    ]);
    const tCama = (fix(await prisma.$queryRaw`
      SELECT ROUND(AVG(TIMESTAMPDIFF(MINUTE, rc.created_at, rc.fecha_resolucion))) min
      FROM regulacion_cama rc
      WHERE rc.fecha_resolucion IS NOT NULL AND rc.created_at BETWEEN ${desde} AND ${hasta}`)[0]) || {};
    const regulacion = [
      { nombre: 'Pedidos de cama', total: pedidosCama },
      { nombre: 'Camas resueltas', total: camasResueltas },
      { nombre: 'Cerradas sin cama', total: camasCerradas },
      { nombre: 'Llamadas de regulación', total: llamadasReg },
      { nombre: 'T. prom. conseguir cama (min)', total: Number(tCama.min) || 0 },
    ];
    const porMedicoReg = fix(await prisma.$queryRaw`
      SELECT CONCAT(pe.primer_nombre, ' ', pe.primer_apellido) medico, COUNT(*) camas
      FROM regulacion_cama rc
      JOIN usuario u ON u.id = rc.medico_id
      JOIN persona pe ON pe.id = u.persona_id
      WHERE rc.created_at BETWEEN ${desde} AND ${hasta}
      GROUP BY u.id ORDER BY camas DESC LIMIT 15`);

    res.json({
      desde, hasta, total,
      porTipo, porPrioridad, serie, topMotivos,
      tiempos, porMovil, porBase, porPersona,
      llamadas, incidentes, porCierre, cancelaciones,
      regulacion, porMedicoReg,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al calcular las estadísticas' });
  }
};

module.exports = { getEstadisticas };
