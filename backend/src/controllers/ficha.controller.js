const prisma = require('../config/db');

const int = v => { const n = parseInt(v); return isNaN(n) ? null : n; };
const CERRADA = 8;
const hhmm = x => x ? new Date(x).toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' }) : '';
const nombreDe = t => `${t.usuario?.persona?.primer_nombre ?? ''} ${t.usuario?.persona?.primer_apellido ?? ''}`.trim();
const parseDatos = f => { try { return JSON.parse(f.datos || '{}'); } catch (e) { return {}; } };

// Include para armar la precarga (datos del servicio comunes a todas las fichas).
const incServicio = {
  tipo_servicio: true,
  solicitud_emergencia: { include: { motivo_consulta: true } },
  signos_vitales: { orderBy: { created_at: 'asc' }, take: 1 },
  despacho: {
    orderBy: { id: 'desc' }, take: 1,
    include: {
      rol_guardia_movil: {
        include: {
          movil: true, base: true, rol_guardia: true,
          tripulacion: { where: { activo: true }, include: { usuario: { include: { persona: true } } } },
        },
      },
    },
  },
};

// Datos del SERVICIO (comunes a todas las víctimas del mismo despacho).
const camposServicio = (s) => {
  const sv = (s.signos_vitales && s.signos_vitales[0]) || null;
  const mot = s.solicitud_emergencia?.motivo_consulta || null;
  const d = (s.despacho && s.despacho[0]) || null;
  const rgm = d?.rol_guardia_movil || null;
  const trip = rgm?.tripulacion || [];
  const conductor = trip.find(t => String(t.funcion).includes('COND'));
  const paramedicos = trip.filter(t => String(t.funcion).includes('PARAM'));
  const ubic = [s.direccion, s.barrio, s.ciudad].filter(Boolean).join(', ');
  const relato = s.solicitud_emergencia?.relato || '';
  return {
    dg_fecha: s.created_at ? new Date(s.created_at).toLocaleDateString('es-PY') : '',
    dg_servicio: String(s.id),
    dg_h_despacho: hhmm(d?.hora_despacho),
    dg_h_llegada: hhmm(d?.hora_en_escena),
    dg_h_llegada_dest: hhmm(d?.hora_fin),
    p1_movil: rgm?.movil?.cod_movil ?? '',
    p1_base: rgm?.base?.nombre ?? '',
    p1_guardia_dia: rgm?.rol_guardia?.codigo ?? '',
    p1_conductor: conductor ? nombreDe(conductor) : '',
    p1_paramedico1: paramedicos[0] ? nombreDe(paramedicos[0]) : '',
    p1_paramedico2: paramedicos[1] ? nombreDe(paramedicos[1]) : '',
    p2_direccion: ubic,
    p2_barrio: s.barrio ?? '',
    p2_ciudad: s.ciudad ?? '',
    p4_detalles: [mot?.nombre, relato].filter(Boolean).join(' — '),
    p5_pa: sv?.presion_arterial ?? '', p5_fc: sv?.frecuencia_cardiaca ?? '', p5_fr: sv?.frecuencia_respiratoria ?? '',
    p5_spo2: sv?.saturacion ?? '', p5_temp: sv?.temperatura ?? '', p5_glucemia: '',
  };
};

// Datos del PACIENTE de recepción (solo para la 1ª víctima).
const camposPaciente = (s) => ({
  dg_ci: s.paciente_documento ?? '',
  p3_nombre: s.es_nn ? 'N/N' : `${s.paciente_nombre ?? ''} ${s.paciente_apellido ?? ''}`.trim(),
  p3_edad: s.paciente_edad ?? '',
  p3_sexo_m: s.paciente_sexo === 'M' || s.paciente_sexo === 'MASCULINO',
  p3_sexo_f: s.paciente_sexo === 'F' || s.paciente_sexo === 'FEMENINO',
  p3_telefono: s.denunciante_telefono ?? '',
  p3_residencia: [s.direccion, s.barrio, s.ciudad].filter(Boolean).join(', '),
});

const precargaCompleta = (s) => ({ ...camposServicio(s), ...camposPaciente(s), p5_gcs_tipo: 'adulto' });

// Verifica que el usuario pertenezca a la tripulación del servicio (o sea admin).
const autorizado = (req, s) => {
  if (req.usuario.rol === 'ADMINISTRADOR') return true;
  const trip = s.despacho?.[0]?.rol_guardia_movil?.tripulacion ?? [];
  return trip.some(t => t.usuario_id === req.usuario.id && t.activo);
};

// GET /servicio/:solicitud_id -> lista de fichas del servicio + precarga base.
const getServicioFichas = async (req, res) => {
  try {
    const sid = int(req.params.solicitud_id);
    const s = await prisma.solicitud.findUnique({
      where: { id: sid },
      include: { ...incServicio, ficha_prehospitalaria: { orderBy: { nro_victima: 'asc' } } },
    });
    if (!s) return res.status(404).json({ error: 'Solicitud no encontrada' });
    const fichas = s.ficha_prehospitalaria.map(f => {
      const d = parseDatos(f);
      return { id: f.id, nro_victima: f.nro_victima, cerrada: f.cerrada, paciente_documento: f.paciente_documento, nombre: d.p3_nombre || `Víctima ${f.nro_victima}` };
    });
    res.json({ servicio: { id: s.id, estado_solicitud_id: s.estado_solicitud_id }, fichas, precarga: precargaCompleta(s) });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error al obtener las fichas del servicio' }); }
};

// GET /:ficha_id -> una ficha completa + precarga (para refrescar datos del servicio).
const getFicha = async (req, res) => {
  try {
    const id = int(req.params.ficha_id);
    const f = await prisma.ficha_prehospitalaria.findUnique({
      where: { id },
      include: { solicitud: { include: incServicio } },
    });
    if (!f) return res.status(404).json({ error: 'Ficha no encontrada' });
    res.json({
      ficha: { id: f.id, nro_victima: f.nro_victima, cerrada: f.cerrada, datos: parseDatos(f), firma_entrega: f.firma_entrega, firma_prestador: f.firma_prestador },
      precarga: precargaCompleta(f.solicitud),
    });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error al obtener la ficha' }); }
};

// POST /servicio/:solicitud_id -> crea una ficha nueva (víctima siguiente).
const crearFicha = async (req, res) => {
  try {
    const sid = int(req.params.solicitud_id);
    const s = await prisma.solicitud.findUnique({
      where: { id: sid },
      include: { ...incServicio, ficha_prehospitalaria: true },
    });
    if (!s) return res.status(404).json({ error: 'Solicitud no encontrada' });
    if (!autorizado(req, s)) return res.status(403).json({ error: 'Solo la tripulación asignada puede crear la ficha' });

    const nro = (s.ficha_prehospitalaria.reduce((m, f) => Math.max(m, f.nro_victima), 0) || 0) + 1;
    const datos = nro === 1 ? { ...camposServicio(s), ...camposPaciente(s), p5_gcs_tipo: 'adulto' } : { ...camposServicio(s), p5_gcs_tipo: 'adulto' };

    const f = await prisma.ficha_prehospitalaria.create({
      data: {
        solicitud_id: sid, nro_victima: nro, datos: JSON.stringify(datos),
        paciente_documento: nro === 1 ? (s.paciente_documento || null) : null,
        creado_por: req.usuario.id,
      },
    });
    res.status(201).json({ id: f.id, nro_victima: f.nro_victima });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error al crear la ficha' }); }
};

// PUT /:ficha_id -> guarda/cierra una ficha. Cierra el servicio cuando TODAS están cerradas.
const guardarFicha = async (req, res) => {
  try {
    const id = int(req.params.ficha_id);
    const { datos, firma_entrega, firma_prestador, cerrar } = req.body;

    const f = await prisma.ficha_prehospitalaria.findUnique({
      where: { id },
      include: {
        solicitud: {
          include: {
            despacho: {
              where: { estado_despacho_id: { in: [1, 2, 3] } }, orderBy: { id: 'desc' }, take: 1,
              include: { rol_guardia_movil: { include: { tripulacion: true } } },
            },
          },
        },
      },
    });
    if (!f) return res.status(404).json({ error: 'Ficha no encontrada' });
    if (!autorizado(req, f.solicitud)) return res.status(403).json({ error: 'Solo la tripulación asignada puede completar la ficha' });
    if (cerrar && !firma_prestador) return res.status(400).json({ error: 'Falta la firma del paramédico para cerrar' });

    const ci = (datos && datos.dg_ci) || f.paciente_documento || null;
    await prisma.ficha_prehospitalaria.update({
      where: { id },
      data: {
        datos: JSON.stringify(datos ?? {}),
        firma_entrega: firma_entrega ?? null, firma_prestador: firma_prestador ?? null,
        paciente_documento: ci, cerrada: cerrar ? true : f.cerrada,
      },
    });

    let servicioCerrado = false;
    if (cerrar) {
      const abiertas = await prisma.ficha_prehospitalaria.count({ where: { solicitud_id: f.solicitud_id, cerrada: false } });
      if (abiertas === 0) {
        servicioCerrado = true;
        await prisma.$transaction(async (tx) => {
          const d = f.solicitud.despacho?.[0];
          if (d && d.estado_despacho_id !== 4 && d.estado_despacho_id !== 5) {
            await tx.despacho.update({ where: { id: d.id }, data: { estado_despacho_id: 4, hora_fin: new Date() } });
            await tx.rol_guardia_movil.update({ where: { id: d.rol_guardia_movil_id }, data: { estado: 'DISPONIBLE' } });
          }
          await tx.solicitud.update({ where: { id: f.solicitud_id }, data: { estado_solicitud_id: CERRADA } });
          await tx.historial_solicitud.create({
            data: { solicitud_id: f.solicitud_id, estado_anterior_id: f.solicitud.estado_solicitud_id, estado_nuevo_id: CERRADA, usuario_id: req.usuario.id, observacion: 'Servicio cerrado (todas las fichas completadas)' },
          });
        });
      }
    }
    res.json({ ok: true, cerrada: !!cerrar, servicio_cerrado: servicioCerrado });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error al guardar la ficha' }); }
};

// GET /antecedentes/:ci -> fichas cerradas anteriores de esa cédula.
const getAntecedentes = async (req, res) => {
  try {
    const ci = req.params.ci;
    const excluir = req.query.excluir ? int(req.query.excluir) : null;
    const fichas = await prisma.ficha_prehospitalaria.findMany({
      where: { paciente_documento: ci, cerrada: true, ...(excluir ? { id: { not: excluir } } : {}) },
      orderBy: { created_at: 'desc' }, take: 50,
    });
    const out = fichas.map(f => {
      const d = parseDatos(f);
      return { id: f.id, servicio_id: f.solicitud_id, fecha: f.created_at, nombre: d.p3_nombre || '', motivo: d.p4_detalles || '', evolucion: d.p9_evolucion || '', destino: d.p9_entrega || '' };
    });
    res.json(out);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error al obtener antecedentes' }); }
};

module.exports = { getServicioFichas, getFicha, crearFicha, guardarFicha, getAntecedentes };