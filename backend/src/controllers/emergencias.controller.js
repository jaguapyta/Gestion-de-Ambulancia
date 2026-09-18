const prisma = require('../config/db');
const socket = require('../socket');
const { sugerirMotivos } = require('../services/ia-gemini');

const int = v => { const n = parseInt(v); return isNaN(n) ? null : n; };
const ORDEN_COLOR = { ROJO: 0, AMARILLO: 1, VERDE: 2, AZUL: 3 };
const RANK = { ROJO: 3, AMARILLO: 2, VERDE: 1, AZUL: 0 };   // gravedad: mayor = peor
const ROLES_JEFE = ['ADMINISTRADOR', 'COORDINADOR_REGULACION'];

// Algoritmo SEME (sin IA): cualquier bandera roja -> ROJO; si no, color base del motivo.
const colorPorAlgoritmo = (colorBase, bnd = {}) => {
  const anyRed = !!(bnd.sin_conciencia || bnd.sin_respiracion || bnd.sin_pulso || bnd.sangrado_masivo || bnd.convulsionando || bnd.dificultad_resp);
  return anyRed ? 'ROJO' : colorBase;
};

// Catálogo de motivos con su árbol (preguntas, instrucciones, criterios) + sinónimos aprobados
const getCatalogos = async (req, res) => {
  try {
    const motivos = await prisma.motivo_consulta.findMany({
      where: { activo: true },
      include: {
        preguntas: { orderBy: { orden: 'asc' } },
        instrucciones: { orderBy: { orden: 'asc' } },
        criterios: true,
        sinonimos: { where: { activo: true, estado: 'APROBADO' }, select: { texto: true } },
      },
    });
    motivos.sort((a, b) => (ORDEN_COLOR[a.color] ?? 9) - (ORDEN_COLOR[b.color] ?? 9) || a.nombre.localeCompare(b.nombre));
    res.json({ motivos });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error al obtener catálogos' }); }
};

// Crear una emergencia (clasificación por motivo + algoritmo de banderas rojas)
const crearEmergencia = async (req, res) => {
  const b = req.body;
  try {
    const motivoId = int(b.motivo_consulta_id);
    if (!motivoId) return res.status(400).json({ error: 'Elegí el motivo de consulta' });
    const motivo = await prisma.motivo_consulta.findUnique({ where: { id: motivoId } });
    if (!motivo) return res.status(404).json({ error: 'Motivo no encontrado' });

    const preg = await prisma.motivo_pregunta.findMany({ where: { motivo_id: motivoId }, select: { id: true, color_si: true, color_no: true } });
    const mapa = {}; preg.forEach(q => { mapa[q.id] = q; });
    const respuestas = Array.isArray(b.respuestas) ? b.respuestas : [];
    let algoritmo = motivo.color;
    for (const r of respuestas) {
      const q = mapa[int(r.motivo_pregunta_id)]; if (!q) continue;
      const ans = String(r.respuesta).toUpperCase();
      const color = ans === 'SI' ? q.color_si : ans === 'NO' ? q.color_no : null;
      if (color && (RANK[color] || 0) > (RANK[algoritmo] || 0)) algoritmo = color;
    }
    const prioridad = (b.prioridad || algoritmo).toUpperCase();
    const origen = prioridad === algoritmo ? 'ALGORITMO' : (b.origen || 'MANUAL');

    const nueva = await prisma.$transaction(async (tx) => {
      const sol = await tx.solicitud.create({
        data: {
          tipo_solicitud_id: 1, estado_solicitud_id: 1,
          canal_ingreso_id: int(b.canal_ingreso_id) || 1, recepcionista_id: req.usuario.id,
          denunciante_nombre: b.denunciante_nombre || null, denunciante_telefono: b.denunciante_telefono || null,
          direccion: b.direccion || null, barrio: b.barrio || null, ciudad: b.ciudad || null,
          latitud: b.latitud ?? null, longitud: b.longitud ?? null,
          paciente_nombre: b.paciente_nombre || null, paciente_apellido: b.paciente_apellido || null,
          paciente_documento: b.paciente_documento || null, paciente_edad: b.paciente_edad || null,
          paciente_edad_unidad: b.paciente_edad_unidad || null, paciente_sexo: b.paciente_sexo || null,
          es_nn: !!b.es_nn, prioridad, observacion: b.observacion || null,
        },
      });
      await tx.solicitud_emergencia.create({
        data: {
          solicitud_id: sol.id, motivo_consulta_id: motivoId, relato: b.relato || null,
          cantidad_heridos: int(b.cantidad_heridos) || null,
          prioridad_sugerida: algoritmo, prioridad_asignada: prioridad,
        },
      });
      if (Array.isArray(b.respuestas) && b.respuestas.length) {
        await tx.emergencia_respuesta.createMany({
          data: b.respuestas.filter(r => r.motivo_pregunta_id && r.respuesta)
            .map(r => ({ solicitud_id: sol.id, motivo_pregunta_id: int(r.motivo_pregunta_id), respuesta: String(r.respuesta).toUpperCase() })),
        });
      }
      await tx.prioridad_log.create({
        data: {
          solicitud_id: sol.id, prioridad_antes: algoritmo, prioridad_nueva: prioridad,
          origen, usuario_id: req.usuario.id,
          motivo: origen === 'ALGORITMO' ? 'Clasificación automática (algoritmo SEME)' : 'Ajuste del recepcionista',
        },
      });
      return sol;
    });

    socket.nuevaSolicitud(nueva);
    res.status(201).json({ id: nueva.id, prioridad: nueva.prioridad, sugerido: algoritmo });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error al crear la emergencia' }); }
};

// ---- Sugerencia de motivo por IA (a partir del texto del llamante) ----

const sugerirMotivo = async (req, res) => {
  const { texto } = req.body;
  try {
    if (!texto || !texto.trim()) return res.status(400).json({ error: 'Escribí el relato del llamante' });
    const motivos = await prisma.motivo_consulta.findMany({
      where: { activo: true },
      select: {
        id: true, codigo: true, nombre: true, color: true,
        sinonimos: { where: { estado: 'APROBADO', activo: true }, select: { texto: true } },
      },
    });
    const r = await sugerirMotivos(texto.trim(), motivos, 5);
    res.json(r);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error al sugerir motivo' }); }
};

// ---- ABM de sinónimos (con circuito de aprobación) ----

const getSinonimos = async (req, res) => {
  try {
    const motivos = await prisma.motivo_consulta.findMany({
      where: { activo: true },
      orderBy: [{ color: 'asc' }, { nombre: 'asc' }],
      select: {
        id: true, codigo: true, nombre: true, color: true,
        sinonimos: { where: { estado: 'APROBADO' }, orderBy: { id: 'asc' } },
      },
    });
    res.json({ motivos });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error al obtener sinónimos' }); }
};

// Lista los sinónimos propuestos pendientes de visto bueno (para las jefaturas)
const getSinonimosPendientes = async (req, res) => {
  try {
    const pendientes = await prisma.motivo_sinonimo.findMany({
      where: { estado: 'PENDIENTE' },
      orderBy: { created_at: 'desc' },
      include: { motivo: { select: { id: true, codigo: true, nombre: true, color: true } } },
    });
    res.json({ pendientes });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error al obtener pendientes' }); }
};

// Crea un sinónimo. Si lo crea una jefatura -> APROBADO al instante; si lo propone
// un recepcionista -> PENDIENTE (necesita visto bueno).
const crearSinonimo = async (req, res) => {
  const { motivo_id, texto, origen, contexto } = req.body;
  try {
    if (!motivo_id || !texto || !texto.trim()) return res.status(400).json({ error: 'Falta motivo o texto' });
    const esJefe = ROLES_JEFE.includes(req.usuario.rol);
    const data = {
      motivo_id: int(motivo_id),
      texto: texto.trim(),
      origen: origen || 'MANUAL',
      creado_por: req.usuario.id,
      contexto: contexto ? String(contexto).slice(0, 255) : null,
      estado: esJefe ? 'APROBADO' : 'PENDIENTE',
      activo: esJefe,
    };
    if (esJefe) { data.aprobado_por = req.usuario.id; data.fecha_aprobacion = new Date(); }
    const s = await prisma.motivo_sinonimo.create({ data });
    res.status(201).json(s);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error al crear el sinónimo' }); }
};

const aprobarSinonimo = async (req, res) => {
  const { id } = req.params;
  try {
    const s = await prisma.motivo_sinonimo.update({
      where: { id: int(id) },
      data: { estado: 'APROBADO', activo: true, aprobado_por: req.usuario.id, fecha_aprobacion: new Date() },
    });
    res.json(s);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error al aprobar el sinónimo' }); }
};

const rechazarSinonimo = async (req, res) => {
  const { id } = req.params;
  try {
    const s = await prisma.motivo_sinonimo.update({
      where: { id: int(id) },
      data: { estado: 'RECHAZADO', activo: false, aprobado_por: req.usuario.id, fecha_aprobacion: new Date() },
    });
    res.json(s);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error al rechazar el sinónimo' }); }
};

const toggleSinonimo = async (req, res) => {
  const { id } = req.params;
  try {
    const s = await prisma.motivo_sinonimo.findUnique({ where: { id: int(id) } });
    if (!s) return res.status(404).json({ error: 'No encontrado' });
    const upd = await prisma.motivo_sinonimo.update({ where: { id: int(id) }, data: { activo: !s.activo } });
    res.json(upd);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error al actualizar' }); }
};

const borrarSinonimo = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.motivo_sinonimo.delete({ where: { id: int(id) } });
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error al borrar' }); }
};

// ---- Editor del protocolo (motivos y preguntas de alarma) ----

const getMotivosEditor = async (req, res) => {
  try {
    const motivos = await prisma.motivo_consulta.findMany({
      orderBy: { codigo: 'asc' },
      include: { preguntas: { orderBy: { orden: 'asc' } }, criterios: true },
    });
    res.json({ motivos });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error al obtener el protocolo' }); }
};

const updatePregunta = async (req, res) => {
  const { id } = req.params;
  const { es_bandera, resp_alarma, color_alarma } = req.body;
  try {
    const data = {};
    if (es_bandera !== undefined) data.es_bandera = !!es_bandera;
    if (resp_alarma !== undefined) data.resp_alarma = resp_alarma || null;
    if (color_alarma !== undefined) data.color_alarma = color_alarma || 'ROJO';
    if (data.es_bandera === false) data.resp_alarma = null;
    const q = await prisma.motivo_pregunta.update({ where: { id: int(id) }, data });
    res.json(q);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error al actualizar la pregunta' }); }
};

const updateMotivo = async (req, res) => {
  const { id } = req.params;
  const { color } = req.body;
  try {
    const m = await prisma.motivo_consulta.update({ where: { id: int(id) }, data: { color } });
    res.json(m);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error al actualizar el motivo' }); }
};

module.exports = {
  getCatalogos, crearEmergencia, sugerirMotivo,
  getSinonimos, getSinonimosPendientes, crearSinonimo, aprobarSinonimo, rechazarSinonimo, toggleSinonimo, borrarSinonimo,
  getMotivosEditor, updatePregunta, updateMotivo,
};