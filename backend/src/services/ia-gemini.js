// Adaptador de IA para sugerir motivos de consulta a partir del texto del
// llamante. Con GEMINI_API_KEY usa Gemini; sin ella, modo SIMULADO (coincidencia
// normalizada contra el catálogo). La IA solo acerca motivos EXISTENTES.

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_KEY = process.env.GEMINI_API_KEY || '';

const int = (v) => { const n = parseInt(v); return isNaN(n) ? null : n; };
// minúsculas + sin acentos
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

// Modo simulado: puntúa cada motivo por palabras compartidas con el texto,
// mirando el nombre y sus sinónimos aprobados.
function sugerirSimulado(texto, motivos, limite = 5) {
  const palabras = norm(texto).split(/\s+/).filter((w) => w.length >= 3);
  if (palabras.length === 0) return [];
  return motivos
    .map((m) => {
      const base = norm(m.nombre);
      const sins = (m.sinonimos || []).map((s) => norm(s.texto || s));
      let score = 0;
      for (const w of palabras) {
        if (base.includes(w)) score += 2;
        if (sins.some((sx) => sx.includes(w))) score += 3;
      }
      return { m, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limite)
    .map(({ m }) => ({ id: m.id, nombre: m.nombre, codigo: m.codigo, color: m.color, razon: 'Coincidencia de términos (modo simulado)' }));
}

async function sugerirConGemini(texto, motivos, limite = 5) {
  const catalogo = motivos.map((m) => ({ id: m.id, nombre: m.nombre })).slice(0, 200);
  const prompt = [
    'Sos un asistente de un centro de regulación de emergencias médicas en Paraguay.',
    'Un recepcionista escribió lo que dijo quien llama. Elegí, del catálogo de motivos,',
    `los ${limite} más probables. Respondé SOLO un JSON array de objetos {id, razon},`,
    'ordenados del más probable al menos probable. No inventes ids fuera del catálogo.',
    '',
    `Texto del llamante: "${texto}"`,
    '',
    `Catálogo (id - nombre): ${JSON.stringify(catalogo)}`,
  ].join('\n');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
    }),
  });
  if (!resp.ok) throw new Error(`Gemini HTTP ${resp.status}`);
  const data = await resp.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
  let arr;
  try { arr = JSON.parse(raw); } catch { arr = JSON.parse((raw.match(/\[[\s\S]*\]/) || ['[]'])[0]); }
  const porId = new Map(motivos.map((m) => [m.id, m]));
  return (Array.isArray(arr) ? arr : [])
    .map((x) => ({ base: porId.get(int(x.id)), razon: x.razon }))
    .filter((x) => x.base)
    .slice(0, limite)
    .map(({ base, razon }) => ({ id: base.id, nombre: base.nombre, codigo: base.codigo, color: base.color, razon: razon || 'Sugerido por IA' }));
}

// Devuelve { modo: 'ia'|'simulado'|'vacio', sugerencias: [{id,nombre,codigo,color,razon}] }
async function sugerirMotivos(texto, motivos, limite = 5) {
  if (!texto || !String(texto).trim()) return { modo: 'vacio', sugerencias: [] };
  if (!GEMINI_KEY) return { modo: 'simulado', sugerencias: sugerirSimulado(texto, motivos, limite) };
  try {
    return { modo: 'ia', sugerencias: await sugerirConGemini(texto, motivos, limite) };
  } catch (e) {
    console.error('Gemini falló, usando modo simulado:', e.message);
    return { modo: 'simulado', sugerencias: sugerirSimulado(texto, motivos, limite) };
  }
}

module.exports = { sugerirMotivos };