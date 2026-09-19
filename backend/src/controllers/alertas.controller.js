const prisma = require('../config/db');

const TERMINALES = [7, 8, 9, 10, 11, 12];  // sacan una solicitud del tablero
const NO_DESPACHADA = [1, 2];              // PENDIENTE, EN_PROCESO

// Roles que ven cada alerta
const VE = {
  aprobaciones:   ['ADMINISTRADOR', 'COORDINADOR_REGULACION'],
  sinDespachar:   ['ADMINISTRADOR', 'COORDINADOR_OPERATIVO', 'COORDINADOR_TRANSPORTE'],
  traslados:      ['ADMINISTRADOR', 'COORDINADOR_REGULACION'],
  excepciones:    ['ADMINISTRADOR', 'COORDINADOR_REGULACION', 'SUPERVISOR_GUARDIA'],
  camas:          ['ADMINISTRADOR', 'COORDINADOR_REGULACION', 'SUPERVISOR_GUARDIA', 'MEDICO_REGULADOR'],
  movilDemorado:  ['ADMINISTRADOR', 'COORDINADOR_OPERATIVO', 'COORDINADOR_TRANSPORTE', 'SUPERVISOR_GUARDIA'],
};

const getAlertas = async (req, res) => {
  const rol = req.usuario.rol;
  const ve = (k) => VE[k].includes(rol);
  try {
    const cfg = await prisma.configuracion.findUnique({ where: { id: 1 } });
    const minSol  = cfg?.alerta_solicitud_min ?? 15;
    const diasHab = cfg?.alerta_habilitacion_dias ?? 30;
    const hsExc   = cfg?.alerta_excepcion_horas ?? 24;
    const hsCama  = cfg?.alerta_cama_horas ?? 6;
    const minDem  = cfg?.movil_demorado_min ?? 30;

    const ahora = new Date();
    const alertas = [];

    // #1 Sinónimos pendientes de aprobación
    if (ve('aprobaciones')) {
      const n = await prisma.motivo_sinonimo.count({ where: { estado: 'PENDIENTE' } });
      if (n > 0) alertas.push({ clave: 'aprobaciones', icono: '🔔', titulo: `${n} sinónimo(s) pendiente(s) de aprobación`, cantidad: n, link: '/dashboard/sala-operaciones/sinonimos' });
    }

    // #2 Habilitaciones por vencer (por área, según el rol)
    {
      const rango = { gte: ahora, lte: new Date(ahora.getTime() + diasHab * 86400000) };
      const esAdmin = rol === 'ADMINISTRADOR';
      const areas = [];
      if (esAdmin || rol === 'COORDINADOR_TRANSPORTE') areas.push(['conductor_habilitado', 'conductor(es)', '/dashboard/coordinacion-transporte/conductores']);
      if (esAdmin || rol === 'COORDINADOR_OPERATIVO')  areas.push(['paramedico_habilitado', 'paramédico(s)', '/dashboard/coordinacion-operativa/paramedicos']);
      if (esAdmin || rol === 'COORDINADOR_REGULACION' || rol === 'SUPERVISOR_GUARDIA') {
        areas.push(['medico_habilitado', 'médico(s)', '/dashboard/sala-operaciones/recursos-humanos/medicos']);
        areas.push(['arm_habilitado', 'ARM', '/dashboard/sala-operaciones/recursos-humanos/arm']);
      }
      for (const [tabla, label, link] of areas) {
        const n = await prisma[tabla].count({ where: { activo: true, fecha_vencimiento: rango } });
        if (n > 0) alertas.push({ clave: 'habilitaciones', icono: '📅', titulo: `${n} ${label} con habilitación por vencer (${diasHab} d)`, cantidad: n, link });
      }
    }

    // #3 Solicitudes sin despachar (+minSol minutos)
    if (ve('sinDespachar')) {
      const limite = new Date(ahora.getTime() - minSol * 60000);
      const n = await prisma.solicitud.count({ where: { tipo_solicitud_id: { in: [1, 2] }, estado_solicitud_id: { in: NO_DESPACHADA }, created_at: { lte: limite } } });
      if (n > 0) alertas.push({ clave: 'sinDespachar', icono: '🚑', titulo: `${n} solicitud(es) sin despachar (+${minSol} min)`, cantidad: n, link: '/dashboard/coordinacion-operativa/tablero' });
    }

    // #4 Traslados programados del día (incluye diálisis)
    if (ve('traslados')) {
      const desde = new Date(ahora); desde.setHours(0, 0, 0, 0);
      const hasta = new Date(ahora); hasta.setHours(23, 59, 59, 999);
      const [progHoy, dialHoy] = await Promise.all([
        prisma.solicitud.count({ where: { estado_solicitud_id: { notIn: TERMINALES }, solicitud_traslado: { fecha_hora_traslado: { gte: desde, lte: hasta } } } }),
        prisma.solicitud.count({ where: { estado_solicitud_id: { notIn: TERMINALES }, tipo_servicio_id: { not: null }, created_at: { gte: desde, lte: hasta }, AND: [{ id: { in: (await prisma.traslado_dialisis.findMany({ select: { solicitud_id: true } })).map(x => x.solicitud_id) } }] } }),
      ]);
      const n = progHoy + dialHoy;
      if (n > 0) alertas.push({ clave: 'traslados', icono: '🩸', titulo: `${n} traslado(s) programado(s) para hoy`, cantidad: n, link: '/dashboard/sala-operaciones/recepcion' });
    }

    // #5 Excepciones de acceso por vencer (+hsExc horas)
    if (ve('excepciones')) {
      const limite = new Date(ahora.getTime() + hsExc * 3600000);
      const n = await prisma.acceso_excepcional.count({ where: { activo: true, vigencia_fin: { gte: ahora, lte: limite } } });
      if (n > 0) alertas.push({ clave: 'excepciones', icono: '🔓', titulo: `${n} excepción(es) de acceso por vencer`, cantidad: n, link: '/dashboard/sala-operaciones/recursos-humanos/excepciones' });
    }

    // #6 Pedidos de cama sin evolucionar (sin llamada nueva en +hsCama horas)
    if (ve('camas')) {
      const limite = new Date(ahora.getTime() - hsCama * 3600000);
      const abiertas = await prisma.solicitud.findMany({
        where: { tipo_solicitud_id: 3, estado_solicitud_id: { notIn: TERMINALES } },
        select: { id: true, created_at: true, regulacion_llamada: { orderBy: { created_at: 'desc' }, take: 1, select: { created_at: true } } },
      });
      const n = abiertas.filter(s => (s.regulacion_llamada[0]?.created_at ?? s.created_at) <= limite).length;
      if (n > 0) alertas.push({ clave: 'camas', icono: '🛏️', titulo: `${n} pedido(s) de cama sin evolucionar (+${hsCama} h)`, cantidad: n, link: '/dashboard/sala-operaciones/regulacion' });
    }

    // #7 Móviles demorados (mucho tiempo en un estado sin avanzar)
    if (ve('movilDemorado')) {
      const limite = new Date(ahora.getTime() - minDem * 60000);
      const activos = await prisma.despacho.findMany({
        where: { estado_despacho_id: { in: [1, 6, 7, 2, 3, 8] } },
        select: { estado_despacho_id: true, hora_despacho: true, hora_recibido: true, hora_en_camino: true, hora_en_escena: true, hora_en_destino: true },
      });
      const entrada = (d) => ({ 6: d.hora_recibido, 7: d.hora_en_camino, 2: d.hora_en_escena, 3: d.hora_en_escena, 8: d.hora_en_destino }[d.estado_despacho_id]) || d.hora_despacho;
      const n = activos.filter(d => { const t = entrada(d); return t && new Date(t) <= limite; }).length;
      if (n > 0) alertas.push({ clave: 'movilDemorado', icono: '⏱️', titulo: `${n} móvil(es) demorado(s) (+${minDem} min en un estado)`, cantidad: n, link: '/dashboard/coordinacion-operativa/tablero' });
    }

    const total = alertas.reduce((a, x) => a + x.cantidad, 0);
    res.json({ total, alertas });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener alertas' });
  }
};

module.exports = { getAlertas };