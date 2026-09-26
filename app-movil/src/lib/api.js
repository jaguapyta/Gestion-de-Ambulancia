import AsyncStorage from '@react-native-async-storage/async-storage';

// ⚠️ A qué backend apunta la app:
//   - Producción: 'https://ambulancia.columbiatcc.online'
//   - Tu PC en la red local (mismo WiFi que el celu): 'http://192.168.x.x:3001'
// Nota: los endpoints /api/geo, /api/ubicacion y /api/servicios/abiertos deben
// existir en ese backend (ya están en local; en prod requieren redeploy).
export const API_BASE = 'https://ambulancia.columbiatcc.online';

const leerToken = () => AsyncStorage.getItem('token');

export async function apiLogin(nro_documento, password) {
  const r = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nro_documento, password }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'No se pudo iniciar sesión');
  return d; // { token, usuario }
}

export async function apiGet(path) {
  const token = await leerToken();
  const r = await fetch(`${API_BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Error de conexión');
  return d;
}

export async function apiPost(path, body) {
  const token = await leerToken();
  const r = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Error de conexión');
  return d;
}
