// Rutas y geocodificación con OpenStreetMap (sin API key):
//  - OSRM (router.project-osrm.org) para ruta + ETA
//  - Nominatim (nominatim.openstreetmap.org) para dirección -> coordenadas
// Nominatim exige un User-Agent identificable.
const UA = 'SEME-System-TCC/1.0 (contacto: seme@mspsbs.gov.py)';

// GET /api/geo/ruta?o=lat,lng&d=lat,lng  -> { distancia_km, duracion_min, geometria:[{lat,lng}] }
const getRuta = async (req, res) => {
  try {
    const o = String(req.query.o || '').split(',').map(Number);
    const d = String(req.query.d || '').split(',').map(Number);
    if (o.length !== 2 || d.length !== 2 || o.concat(d).some(n => !Number.isFinite(n))) {
      return res.status(400).json({ error: 'Parámetros o/d inválidos (esperado lat,lng)' });
    }
    // OSRM usa el orden lng,lat
    const url = `https://router.project-osrm.org/route/v1/driving/${o[1]},${o[0]};${d[1]},${d[0]}?overview=full&geometries=geojson`;
    const r = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!r.ok) return res.status(502).json({ error: 'El servicio de rutas no respondió' });
    const data = await r.json();
    const ruta = data.routes?.[0];
    if (!ruta) return res.status(404).json({ error: 'No se encontró una ruta' });
    res.json({
      distancia_km: Math.round((ruta.distance / 1000) * 10) / 10,
      duracion_min: Math.round(ruta.duration / 60),
      geometria: (ruta.geometry?.coordinates ?? []).map(([lng, lat]) => ({ lat, lng })),
    });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error al calcular la ruta' }); }
};

// GET /api/geo/geocode?q=direccion  -> { lat, lng, display_name }
const geocode = async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.status(400).json({ error: 'Falta la dirección (q)' });
    // Sesga a Paraguay para mejores resultados.
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=py&q=${encodeURIComponent(q)}`;
    const r = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!r.ok) return res.status(502).json({ error: 'El servicio de geocodificación no respondió' });
    const arr = await r.json();
    if (!Array.isArray(arr) || arr.length === 0) return res.status(404).json({ error: 'No se encontró la dirección' });
    res.json({ lat: Number(arr[0].lat), lng: Number(arr[0].lon), display_name: arr[0].display_name });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error al geocodificar' }); }
};

module.exports = { getRuta, geocode };
