'use client';

import { API_URL } from '@/app/lib/api';
import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import ProtectedRoute from '../../../components/ProtectedRoute';

const DESP = ['ADMINISTRADOR', 'COORDINADOR_OPERATIVO', 'COORDINADOR_TRANSPORTE', 'ASISTENTE_TRANSPORTE', 'SUPERVISOR_GUARDIA'];

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' });
const estadoMovilColor = (e: string) => e === 'DISPONIBLE' ? '#639922' : e === 'OCUPADO' ? '#BA7517' : '#888780';
const PRIO_HEX: Record<string, string> = { ROJO: '#E24B4A', AMARILLO: '#EF9F27', VERDE: '#1D9E75', AZUL: '#378ADD' };
const estLabel = (n: string): string => ({ PENDIENTE: 'Pendiente', EN_PROCESO: 'En proceso', DESPACHADA: 'Asignado', RECIBIDO: 'Recibido', EN_CAMINO: 'En camino', EN_ESCENA: 'En el lugar', EN_TRASLADO: 'Trasladando', EN_DESTINO: 'En destino', FINALIZADA: 'Finalizada' } as Record<string, string>)[n] ?? n;
const estChip = (n: string) => n === 'PENDIENTE' ? { bg: '#fff7ed', tx: '#c2410c' } : { bg: '#eff6ff', tx: '#1d4ed8' };

// Regla de reasignación: emergencia solo antes de "en el lugar" (estado_despacho 1);
// traslado/cama mientras el servicio no esté cerrado (no 4/5).
const puedeReasignar = (s: any): boolean => {
  const d = s.despacho?.[0]; if (!d) return false;
  if (s.tipo_solicitud_id === 1) return [1, 6, 7].includes(d.estado_despacho_id);
  return ![4, 5].includes(d.estado_despacho_id);
};
const movilAsignado = (s: any): string | null => s.despacho?.[0]?.rol_guardia_movil?.movil?.cod_movil ?? null;

// Tripulación ordenada (conductor primero) con etiqueta de función.
const tripLista = (m: any) => [...(m.tripulacion ?? [])]
  .sort((a: any, b: any) => (String(a.funcion).includes('COND') ? 0 : 1) - (String(b.funcion).includes('COND') ? 0 : 1))
  .map((t: any) => ({
    fx: String(t.funcion).includes('COND') ? '🚙 Conductor' : String(t.funcion).includes('PARAM') ? '⚕️ Paramédico' : (t.funcion ?? ''),
    nom: `${t.usuario?.persona?.primer_nombre ?? ''} ${t.usuario?.persona?.primer_apellido ?? ''}`.trim() || '—',
  }));

export default function DespachoPage() {
  const [tab, setTab] = useState<any>({ emergencias: [], traslados: [], moviles: [] });
  const [cat, setCat] = useState<any>({ estados_despacho: [], condiciones_cierre: [] });
  const [sel, setSel] = useState<any>(null);
  const [cerrando, setCerrando] = useState<any>(null);
  const [cond, setCond] = useState('');
  const [km, setKm] = useState('');
  const [motivo, setMotivo] = useState('');
  const [prio, setPrio] = useState('');
  const [msg, setMsg] = useState('');
  const [detalle, setDetalle] = useState<any>(null);
  const [verHist, setVerHist] = useState(false);
  const [hist, setHist] = useState<any[]>([]);
  const [verRol, setVerRol] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapObj = useRef<any>(null);
  const Lref = useRef<any>(null);
  const layer = useRef<any>(null);
  const markersMov = useRef<Record<number, any>>({});
  const selRef = useRef<any>(null);
  useEffect(() => { selRef.current = sel; }, [sel]);

  const token = () => localStorage.getItem('token') ?? '';
  const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

  const cargar = () => {
    fetch(`${API_URL}/api/despacho/tablero`, { headers: headers() })
      .then(r => r.json()).then(d => { if (d && d.moviles) setTab(d); }).catch(() => { });
  };
  useEffect(() => {
    fetch(`${API_URL}/api/despacho/catalogos`, { headers: headers() }).then(r => r.json()).then(setCat).catch(() => { });
    cargar();
    const t = setInterval(cargar, 15000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const L = (await import('leaflet')).default;
      if (cancel || mapObj.current || !mapRef.current) return;
      Lref.current = L;
      const map = L.map(mapRef.current).setView([-25.30, -57.58], 11);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 19 }).addTo(map);
      layer.current = L.layerGroup().addTo(map);
      map.on('click', (e: any) => {
        const s = selRef.current;
        if (s && !s.despachoId) guardarUbicacion(s.id, e.latlng.lat, e.latlng.lng);
      });
      mapObj.current = map;
      pintar();
    })();
    return () => { cancel = true; if (mapObj.current) { mapObj.current.remove(); mapObj.current = null; } };
  }, []);

  useEffect(() => { pintar(); }, [tab]);

  const pintar = () => {
    const L = Lref.current; if (!L || !layer.current) return;
    layer.current.clearLayers();
    const movilIcon = (color: string, cod: string) => L.divIcon({ className: '', iconSize: [30, 18], iconAnchor: [15, 9], html: `<div style="background:${color};color:#fff;font-size:9px;font-weight:600;border:2px solid #fff;border-radius:4px;padding:1px 3px;box-shadow:0 1px 3px rgba(0,0,0,.4);text-align:center;">${cod}</div>` });
    const pinIcon = (color: string) => L.divIcon({ className: '', iconSize: [20, 20], iconAnchor: [10, 20], html: `<div style="background:${color};width:18px;height:18px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.4);"></div>` });

    // Lista de tripulación para el popup del mapa: conductor primero, luego paramédico/s.
    const tripHtml = (m: any) => {
      const lista = tripLista(m);
      if (lista.length === 0) return '<i>sin tripulación asignada</i>';
      return lista.map(t => `${t.fx}: ${t.nom}`).join('<br>');
    };

    markersMov.current = {};
    tab.moviles.forEach((m: any) => {
      const lat = m.latitud ?? m.base?.latitud, lng = m.longitud ?? m.base?.longitud;
      if (lat == null || lng == null) return;
      const mk = L.marker([Number(lat), Number(lng)], { icon: movilIcon(estadoMovilColor(m.estado), m.movil?.cod_movil ?? '?') })
        .bindPopup(`<b>${m.movil?.cod_movil ?? ''}</b> · ${m.tipo_soporte?.nombre ?? ''}<br>${m.estado} · ${m.base?.nombre ?? ''}<br><b>Tripulación (${m.tripulacion?.length ?? 0}):</b><br>${tripHtml(m)}`)
        .addTo(layer.current);
      markersMov.current[m.id] = mk;
    });
    [...tab.emergencias, ...tab.traslados].forEach((s: any) => {
      if (s.latitud == null || s.longitud == null) return;
      const color = s.tipo_solicitud_id === 1 ? '#E24B4A' : '#378ADD';
      const mot = s.solicitud_emergencia?.motivo_consulta?.nombre;
      L.marker([Number(s.latitud), Number(s.longitud)], { icon: pinIcon(color) })
        .bindPopup(`#${s.id}${mot ? ' · ' + mot : ''}<br>${[s.direccion, s.barrio].filter(Boolean).join(', ')}`)
        .addTo(layer.current);
    });
  };

  const guardarUbicacion = async (id: number, lat: number, lng: number) => {
    await fetch(`${API_URL}/api/despacho/solicitud/${id}/ubicacion`, { method: 'PUT', headers: headers(), body: JSON.stringify({ latitud: lat, longitud: lng }) });
    setMsg(`Ubicación marcada para #${id}`); cargar();
  };

  const verDetalle = async (id: number) => {
    const r = await fetch(`${API_URL}/api/solicitudes/${id}`, { headers: headers() });
    if (r.ok) setDetalle(await r.json());
  };

  const localizar = (m: any) => {
    const map = mapObj.current; const lat = m.latitud ?? m.base?.latitud; const lng = m.longitud ?? m.base?.longitud;
    if (map && lat != null && lng != null) { map.setView([Number(lat), Number(lng)], 14); markersMov.current[m.id]?.openPopup(); }
  };

  // Al elegir un móvil: si estamos reasignando (sel.despachoId) va por PATCH; si no, crea el despacho.
  const asignar = async (rgmId: number) => {
    if (!sel) return;
    if (sel.despachoId) {
      const res = await fetch(`${API_URL}/api/despacho/${sel.despachoId}/reasignar`, { method: 'PATCH', headers: headers(), body: JSON.stringify({ rol_guardia_movil_id: rgmId }) });
      if (res.ok) { setMsg(`Pedido #${sel.id} reasignado`); setSel(null); cargar(); }
      else { const e = await res.json().catch(() => ({})); setMsg(e.error || 'No se pudo reasignar'); }
      return;
    }
    const res = await fetch(`${API_URL}/api/despacho/asignar`, { method: 'POST', headers: headers(), body: JSON.stringify({ solicitud_id: sel.id, rol_guardia_movil_id: rgmId, prioridad: sel.prioridad || 'VERDE' }) });
    if (res.ok) { setMsg(`Móvil asignado al pedido #${sel.id}`); setSel(null); cargar(); }
    else setMsg('No se pudo asignar');
  };

  const avanzar = async (despachoId: number, estado: number, extra: any = {}) => {
    const res = await fetch(`${API_URL}/api/despacho/${despachoId}/estado`, { method: 'PATCH', headers: headers(), body: JSON.stringify({ estado_despacho_id: estado, ...extra }) });
    if (res.ok) { setCerrando(null); setCond(''); setKm(''); setMotivo(''); cargar(); }
    else { const e = await res.json().catch(() => ({})); setMsg(e.error || 'No se pudo cambiar el estado'); }
  };

  const cancelarAsignacion = async (despachoId: number) => {
    if (!motivo.trim()) { setMsg('Indicá el motivo'); return; }
    const res = await fetch(`${API_URL}/api/despacho/${despachoId}/cancelar-asignacion`, { method: 'PATCH', headers: headers(), body: JSON.stringify({ motivo: motivo.trim() }) });
    if (res.ok) { setCerrando(null); setMotivo(''); setMsg('Asignación cancelada — el servicio volvió a pendiente'); cargar(); }
    else { const e = await res.json().catch(() => ({})); setMsg(e.error || 'No se pudo cancelar la asignación'); }
  };

  const cambiarPrioridad = async (despachoId: number) => {
    if (!prio) { setMsg('Elegí la prioridad'); return; }
    const res = await fetch(`${API_URL}/api/despacho/${despachoId}/prioridad`, { method: 'PATCH', headers: headers(), body: JSON.stringify({ prioridad: prio, motivo: motivo.trim() || undefined }) });
    if (res.ok) { setCerrando(null); setPrio(''); setMotivo(''); cargar(); }
    else { const e = await res.json().catch(() => ({})); setMsg(e.error || 'No se pudo cambiar la prioridad'); }
  };
  const abrirHistorial = async () => {
    const r = await fetch(`${API_URL}/api/despacho/historial`, { headers: headers() });
    if (r.ok) { setHist(await r.json()); setVerHist(true); }
  };

  const box = { background: 'var(--surface-2, #fff)', border: '0.5px solid #e5e7eb', borderRadius: '10px' } as const;
  const badge = (bg: string, c: string): React.CSSProperties => ({ background: bg, color: c, fontSize: '10px', fontWeight: 500, padding: '1px 7px', borderRadius: '20px' });

  const rutaTraslado = (s: any) => s.tipo_solicitud_id === 3
    ? `${s.solicitud_ref_cama?.centro_solicitante ?? '—'} → ${s.regulacion_cama?.hospital_destino ?? '—'}`
    : `${s.solicitud_traslado?.origen ?? '—'} → ${s.solicitud_traslado?.destino ?? '—'}`;

  // Controles de avance de estado del servicio en curso (según el estado del despacho).
  const controlesEstado = (d: any) => {
    if (!d) return null;
    const est = d.estado_despacho_id;
    const abierto = cerrando?.despachoId === d.id ? cerrando.tipo : null;
    const btn = { fontSize: '10px', padding: '3px 7px', borderRadius: '5px', cursor: 'pointer', border: '0.5px solid #e5e7eb', background: '#fff' } as const;
    const stop = (e: any) => e.stopPropagation();
    const open = (tipo: string, estado?: number) => { setCerrando({ despachoId: d.id, tipo, estado }); setCond(''); setKm(''); setMotivo(''); setPrio(''); };

    if (abierto === 'km_camino') return (
      <div style={{ marginTop: '4px', display: 'flex', gap: '4px' }} onClick={stop}>
        <input value={km} onChange={e => setKm(e.target.value.replace(/\D/g, ''))} placeholder="Km de inicio" style={{ flex: 1, fontSize: '11px', padding: '3px 6px' }} />
        <button onClick={() => km && avanzar(d.id, 7, { km_inicio: km })} style={btn}>En camino ✓</button>
        <button onClick={() => setCerrando(null)} style={btn}>✕</button>
      </div>
    );
    if (abierto === 'cerrar') {
      const finaliza = cerrando.estado === 4;
      return (
        <div style={{ marginTop: '4px', display: 'flex', gap: '4px', flexWrap: 'wrap' }} onClick={stop}>
          <select value={cond} onChange={e => setCond(e.target.value)} style={{ flex: 1, minWidth: '120px', fontSize: '11px', padding: '3px' }}>
            <option value="">Condición…</option>{cat.condiciones_cierre.map((c: any) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          {finaliza && <input value={km} onChange={e => setKm(e.target.value.replace(/\D/g, ''))} placeholder="Km final" style={{ width: '80px', fontSize: '11px', padding: '3px 6px' }} />}
          <button onClick={() => cond && avanzar(d.id, cerrando.estado, { condicion_cierre_id: cond, ...(finaliza && km ? { km_fin: km } : {}) })} style={btn}>OK</button>
          <button onClick={() => setCerrando(null)} style={btn}>✕</button>
        </div>
      );
    }
    if (abierto === 'cancelAsig') return (
      <div style={{ marginTop: '4px', display: 'flex', gap: '4px' }} onClick={stop}>
        <input value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Motivo" style={{ flex: 1, fontSize: '11px', padding: '3px 6px' }} />
        <button onClick={() => cancelarAsignacion(d.id)} style={btn}>Cancelar asig. ✓</button>
        <button onClick={() => setCerrando(null)} style={btn}>✕</button>
      </div>
    );
    if (abierto === 'prioridad') return (
      <div style={{ marginTop: '4px', display: 'flex', gap: '4px', flexWrap: 'wrap' }} onClick={stop}>
        <select value={prio} onChange={e => setPrio(e.target.value)} style={{ fontSize: '11px', padding: '3px' }}>
          <option value="">Prioridad…</option>{['ROJO', 'AMARILLO', 'VERDE', 'AZUL'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <input value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Motivo" style={{ flex: 1, minWidth: '90px', fontSize: '11px', padding: '3px 6px' }} />
        <button onClick={() => cambiarPrioridad(d.id)} style={btn}>OK</button>
        <button onClick={() => setCerrando(null)} style={btn}>✕</button>
      </div>
    );

    const pre = [1, 6, 7].includes(est);
    return (
      <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }} onClick={stop}>        {est === 6 && <button onClick={() => open('km_camino')} style={btn}>En camino</button>}
        {est === 7 && <button onClick={() => avanzar(d.id, 2)} style={btn}>En el lugar</button>}
        {est === 2 && <>
          <button onClick={() => avanzar(d.id, 3)} style={btn}>Paciente a bordo</button>
          <button onClick={() => open('cerrar', 4)} style={btn}>Asistido en el lugar</button>
        </>}
        {est === 3 && <button onClick={() => avanzar(d.id, 8)} style={btn}>En destino</button>}
        {est === 8 && <button onClick={() => open('cerrar', 4)} style={{ ...btn, background: '#15803d', color: '#fff', border: 'none' }}>Disponible</button>}        {pre && <button onClick={() => open('cancelAsig')} style={{ ...btn, color: '#6b7280' }}>Cancelar asig.</button>}
        {est === 2 && <button onClick={() => open('cerrar', 5)} style={{ ...btn, color: '#b91c1c' }}>Cancelar servicio</button>}
      </div>
    );
  };
  const disponibles = tab.moviles.filter((m: any) => m.estado === 'DISPONIBLE');

  return (
    <ProtectedRoute rolesPermitidos={DESP}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 500, color: '#0a2540', margin: 0 }}>Despacho</h1>
          <div style={{ fontSize: '12px', color: '#6b7280', display: 'flex', gap: '14px', alignItems: 'center' }}>
            <span>{tab.emergencias.length + tab.traslados.length} en cola</span>
            <span style={{ color: '#15803d' }}>{disponibles.length} libres</span>
            <button onClick={() => setVerRol(true)} style={{ fontSize: '12px', padding: '5px 12px', borderRadius: '7px', border: '0.5px solid #e5e7eb', background: 'transparent', cursor: 'pointer', color: '#0a2540' }}>🚑 Rol de guardia</button>
            <button onClick={abrirHistorial} style={{ fontSize: '12px', padding: '5px 12px', borderRadius: '7px', border: '0.5px solid #e5e7eb', background: 'transparent', cursor: 'pointer', color: '#0a2540' }}>🗂️ Históricos</button>
          </div>
        </div>
        {sel && <div style={{ background: '#eff6ff', color: '#1e40af', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', margin: '8px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{sel.despachoId ? 'Reasignando' : 'Asignando'} pedido <b>#{sel.id}</b> — elegí un móvil disponible{sel.despachoId ? '.' : ', o hacé clic en el mapa para marcar su ubicación.'}</span>
          <button onClick={() => setSel(null)} style={{ fontSize: '11px', padding: '3px 8px' }}>Cancelar</button>
        </div>}
        {msg && <div style={{ background: '#f0fdf4', color: '#15803d', padding: '7px 12px', borderRadius: '8px', fontSize: '12px', margin: '8px 0' }}>{msg}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '0.85fr 1.6fr 0.9fr', gap: '12px', alignItems: 'start' }}>

          <div>
            <div style={{ fontSize: '12px', fontWeight: 500, color: '#6b7280', marginBottom: '6px' }}>Servicios · prioridad</div>
            {tab.emergencias.length === 0 && <div style={{ ...box, padding: '14px', fontSize: '12px', color: '#9ca3af', textAlign: 'center' }}>Sin emergencias</div>}
            {tab.emergencias.map((s: any) => {
              const pr = s.prioridad || 'ROJO';
              const mot = s.solicitud_emergencia?.motivo_consulta;
              const est = s.estado_solicitud?.nombre; const ch = estChip(est);
              const asignado = movilAsignado(s);
              return (
                <div key={s.id} onClick={() => { if (!s.despacho?.[0]) setSel({ tipo: 'emergencia', id: s.id, prioridad: s.prioridad }); }} onDoubleClick={() => verDetalle(s.id)} title="Clic: asignar · Doble clic: ver toda la info" style={{ ...box, borderLeft: `3px solid ${PRIO_HEX[pr] ?? '#E24B4A'}`, borderRadius: '0 10px 10px 0', padding: '9px 10px', marginBottom: '8px', cursor: 'pointer', outline: sel?.id === s.id ? '2px solid #1d4ed8' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#0a2540' }}>#{s.id}{mot?.codigo_radial ? ` · ${mot.codigo_radial}` : ''}</span>
                    {est && <span style={badge(ch.bg, ch.tx)}>{estLabel(est)}</span>}
                  </div>
                  <div style={{ fontSize: '12px', color: '#374151', marginTop: '2px' }}>{mot?.nombre ?? '—'}</div>
                  <div style={{ fontSize: '11px', color: '#6b7280' }}>{[s.direccion, s.barrio].filter(Boolean).join(', ') || 'sin ubicación'}</div>
                  {asignado && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px' }}>
                      <span style={{ fontSize: '11px', color: '#1d4ed8', fontWeight: 500 }}>🚑 {asignado}</span>
                      {puedeReasignar(s)
                        ? <button onClick={(e) => { e.stopPropagation(); setSel({ tipo: 'emergencia', id: s.id, prioridad: s.prioridad, despachoId: s.despacho[0].id }); }} style={{ fontSize: '10px', padding: '2px 7px' }}>Reasignar</button>
                        : <span style={{ fontSize: '10px', color: '#9ca3af' }}>en el lugar · fijo</span>}
                    </div>
                  )}
                  {controlesEstado(s.despacho?.[0])}
                </div>
              );
            })}
          </div>

          <div>
            <div ref={mapRef} style={{ height: '340px', borderRadius: '12px', border: '0.5px solid #e5e7eb', zIndex: 0 }} />
            <div style={{ display: 'flex', gap: '14px', padding: '6px 2px', fontSize: '10px', color: '#6b7280', flexWrap: 'wrap' }}>
              <span>🟩 disponible</span><span>🟧 ocupado</span><span>🔴 emergencia</span><span>🔵 traslado</span>
            </div>

            <div style={{ fontSize: '12px', fontWeight: 500, color: '#6b7280', margin: '4px 0 6px' }}>Traslados · por hora</div>
            <div style={{ ...box, overflow: 'hidden' }}>
              {tab.traslados.length === 0 && <div style={{ padding: '14px', fontSize: '12px', color: '#9ca3af', textAlign: 'center' }}>Sin traslados en cola</div>}
              {tab.traslados.map((s: any) => {
                const est = s.estado_solicitud?.nombre; const ch = estChip(est);
                const asignado = movilAsignado(s);
                return (
                  <div key={s.id} onDoubleClick={() => verDetalle(s.id)} title="Doble clic: ver toda la info · Asignar: elegir móvil" style={{ padding: '8px 11px', borderBottom: '0.5px solid #f3f4f6', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 500, minWidth: '38px' }}>{hhmm(s.solicitud_traslado?.fecha_hora_traslado ?? s.created_at)}</span>
                      <span style={badge(s.tipo_solicitud_id === 3 ? '#FAEEDA' : '#E6F1FB', s.tipo_solicitud_id === 3 ? '#633806' : '#0C447C')}>{s.tipo_solicitud_id === 3 ? 'Cama·SEME' : 'Traslado'}</span>
                      <span style={{ fontSize: '12px', color: '#374151', flex: 1 }}>{s.paciente_nombre} {s.paciente_apellido} · {rutaTraslado(s)}</span>
                      {est && <span style={badge(ch.bg, ch.tx)}>{estLabel(est)}</span>}
                      {asignado
                        ? <>
                            <span style={{ fontSize: '11px', color: '#1d4ed8', fontWeight: 500 }}>🚑 {asignado}</span>
                            {puedeReasignar(s) && <button onClick={() => setSel({ tipo: 'traslado', id: s.id, prioridad: 'VERDE', despachoId: s.despacho[0].id })} style={{ fontSize: '11px', padding: '4px 9px', outline: sel?.id === s.id ? '2px solid #1d4ed8' : 'none' }}>Reasignar</button>}
                          </>
                        : <button onClick={() => setSel({ tipo: 'traslado', id: s.id, prioridad: 'VERDE' })} style={{ fontSize: '11px', padding: '4px 9px', outline: sel?.id === s.id ? '2px solid #1d4ed8' : 'none' }}>Asignar</button>}
                    </div>
                    {s.despacho?.[0] && controlesEstado(s.despacho[0])}
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '12px', fontWeight: 500, color: '#6b7280', marginBottom: '6px' }}>Móviles disponibles</div>
            <div style={{ ...box, overflow: 'hidden' }}>
              {disponibles.length === 0 && <div style={{ padding: '14px', fontSize: '12px', color: '#9ca3af', textAlign: 'center' }}>Sin móviles disponibles</div>}
              {disponibles.map((m: any) => (
                <div key={m.id} onClick={() => localizar(m)} title="Clic: ver su ubicación en el mapa" style={{ padding: '9px 10px', borderBottom: '0.5px solid #f3f4f6', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#0a2540' }}>📍 {m.movil?.cod_movil} · {m.tipo_soporte?.nombre}</span>
                    <span style={badge('#EAF3DE', '#173404')}>Libre</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#9ca3af' }}>{m.base?.nombre} · {m.tripulacion?.length ?? 0} tripulante(s)</div>
                  {sel && (
                    <button onClick={(e) => { e.stopPropagation(); asignar(m.id); }} style={{ marginTop: '6px', width: '100%', fontSize: '11px', padding: '5px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>{sel.despachoId ? 'Reasignar aquí' : 'Asignar aquí'}</button>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

        {verRol && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: '24px' }}>
            <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '760px', maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,.15)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#0a2540', margin: 0 }}>🚑 Rol de guardia</h2>
                <button onClick={() => setVerRol(false)} style={{ background: 'transparent', border: 'none', fontSize: '20px', color: '#9ca3af', cursor: 'pointer' }}>×</button>
              </div>
              <p style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 12px' }}>
                Móviles de guardia: {tab.moviles.length} · <span style={{ color: '#15803d' }}>{disponibles.length} libres</span> · <span style={{ color: '#BA7517' }}>{tab.moviles.filter((m: any) => m.estado === 'OCUPADO').length} ocupados</span>
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {tab.moviles.length === 0 && <div style={{ fontSize: '12px', color: '#9ca3af' }}>Sin móviles de guardia</div>}
                {tab.moviles.map((m: any) => {
                  const trip = tripLista(m);
                  const bg = m.estado === 'DISPONIBLE' ? '#EAF3DE' : m.estado === 'OCUPADO' ? '#FAEEDA' : '#eef0f2';
                  const tx = m.estado === 'DISPONIBLE' ? '#173404' : m.estado === 'OCUPADO' ? '#633806' : '#555';
                  return (
                    <div key={m.id} style={{ ...box, padding: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#0a2540' }}>{m.movil?.cod_movil ?? '—'} · {m.tipo_soporte?.nombre ?? ''}</span>
                        <span style={badge(bg, tx)}>{m.estado}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '6px' }}>🏠 {m.base?.nombre ?? 'sin base'}</div>
                      <div style={{ fontSize: '12px', color: '#374151' }}>
                        {trip.length ? trip.map((t, i) => <div key={i}>{t.fx}: {t.nom}</div>) : <span style={{ color: '#9ca3af' }}>sin tripulación asignada</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', borderTop: '0.5px solid #f0f0f0', paddingTop: '12px' }}>
                <button onClick={() => setVerRol(false)} style={{ padding: '8px 18px', borderRadius: '7px', border: '0.5px solid #e5e7eb', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#6b7280' }}>Cerrar</button>
              </div>
            </div>
          </div>
        )}

        {verHist && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: '24px' }}>
            <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '720px', maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,.15)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#0a2540', margin: 0 }}>🗂️ Históricos de despacho</h2>
                <button onClick={() => setVerHist(false)} style={{ background: 'transparent', border: 'none', fontSize: '20px', color: '#9ca3af', cursor: 'pointer' }}>×</button>
              </div>
              <p style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 12px' }}>Servicios finalizados, cancelados o cerrados. Doble clic para ver toda la info.</p>
              <div style={{ ...box, overflow: 'hidden' }}>
                {hist.length === 0 && <div style={{ padding: '16px', fontSize: '12px', color: '#9ca3af', textAlign: 'center' }}>Sin registros históricos</div>}
                {hist.map((s: any) => {
                  const esEmg = s.tipo_solicitud_id === 1;
                  const mot = s.solicitud_emergencia?.motivo_consulta;
                  const asignado = s.despacho?.[0]?.rol_guardia_movil?.movil?.cod_movil;
                  const est = s.estado_solicitud?.nombre;
                  return (
                    <div key={s.id} onDoubleClick={() => verDetalle(s.id)} title="Doble clic: ver toda la info" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 11px', borderBottom: '0.5px solid #f3f4f6', cursor: 'pointer' }}>
                      <span style={{ fontSize: '11px', color: '#6b7280', minWidth: '86px' }}>{new Date(s.created_at).toLocaleString('es-PY', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                      <span style={badge(esEmg ? '#FDECEC' : '#E6F1FB', esEmg ? '#8B1A1A' : '#0C447C')}>{esEmg ? 'Emergencia' : (s.tipo_solicitud_id === 3 ? 'Cama·SEME' : 'Traslado')}</span>
                      <span style={{ fontSize: '12px', color: '#374151', flex: 1 }}>#{s.id} · {esEmg ? (mot?.nombre ?? '—') : rutaTraslado(s)}</span>
                      <span style={{ fontSize: '11px', color: asignado ? '#1d4ed8' : '#9ca3af', minWidth: '52px' }}>{asignado ? `🚑 ${asignado}` : 'sin móvil'}</span>
                      <span style={badge('#f1f5f9', '#475569')}>{estLabel(est)}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', borderTop: '0.5px solid #f0f0f0', paddingTop: '12px' }}>
                <button onClick={() => setVerHist(false)} style={{ padding: '8px 18px', borderRadius: '7px', border: '0.5px solid #e5e7eb', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#6b7280' }}>Cerrar</button>
              </div>
            </div>
          </div>
        )}

        {detalle && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: '24px' }}>
            <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '620px', maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,.15)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#0a2540', margin: 0 }}>Pedido #{detalle.id} — datos de recepción</h2>
                <button onClick={() => setDetalle(null)} style={{ background: 'transparent', border: 'none', fontSize: '20px', color: '#9ca3af', cursor: 'pointer' }}>×</button>
              </div>
              {(() => {
                const d: any = detalle; const se = d.solicitud_emergencia; const mot = se?.motivo_consulta;
                const resp = d.emergencia_respuesta ?? []; const pl = d.prioridad_log ?? []; const res = pl[pl.length - 1];
                const rgm = d.despacho?.[0]?.rol_guardia_movil;
                return (
                  <div style={{ fontSize: '13px', color: '#374151', lineHeight: 1.7 }}>
                    <div style={{ background: '#f8f9fb', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                      <div><b>Tipo:</b> {d.tipo_solicitud?.nombre} · <b>Estado:</b> {estLabel(d.estado_solicitud?.nombre)}</div>
                      {mot && <div><b>Motivo:</b> {mot.nombre}{mot.codigo_radial ? ` · radial ${mot.codigo_radial}` : ''}</div>}
                      {res && <div><b>Prioridad:</b> sugerida {res.prioridad_antes} → asignada {res.prioridad_nueva} ({res.origen})</div>}
                      <div><b>Ubicación:</b> {[d.direccion, d.barrio, d.ciudad].filter(Boolean).join(', ') || '—'}</div>
                      <div><b>Paciente:</b> {d.es_nn ? 'N/N' : `${d.paciente_nombre ?? ''} ${d.paciente_apellido ?? ''}`.trim() || '—'} {d.paciente_documento ? `· CI ${d.paciente_documento}` : ''} {d.paciente_edad ? `· ${d.paciente_edad} ${d.paciente_edad_unidad ?? ''}` : ''}</div>
                      <div><b>Contacto (denunciante):</b> {d.denunciante_nombre ?? '—'} · {d.denunciante_telefono ?? '—'}</div>
                      {se?.relato && <div><b>Relato:</b> {se.relato}</div>}
                      {d.observacion && <div><b>Obs.:</b> {d.observacion}</div>}
                    </div>
                    {rgm && (
                      <div style={{ background: '#eff6ff', border: '0.5px solid #bfdbfe', borderRadius: '8px', padding: '10px 12px', marginBottom: '10px', fontSize: '12px', color: '#1e40af' }}>
                        <b>🚑 Asignado a:</b> {rgm.movil?.cod_movil ?? '—'}{rgm.tipo_soporte?.nombre ? ` · ${rgm.tipo_soporte.nombre}` : ''}
                        {rgm.tripulacion?.length ? <div><b>Tripulación:</b> {rgm.tripulacion.map((t: any) => `${t.usuario?.persona?.primer_nombre ?? ''} ${t.usuario?.persona?.primer_apellido ?? ''}`.trim() + (t.funcion ? ` (${t.funcion})` : '')).join(', ')}</div> : null}
                      </div>
                    )}
                    {mot?.nota_seguridad && <div style={{ background: '#fff7ed', border: '0.5px solid #fed7aa', borderRadius: '8px', padding: '10px 12px', marginBottom: '10px', fontSize: '12px', color: '#7c2d12' }}><b>🛡️ Seguridad:</b> {mot.nota_seguridad}</div>}
                    {resp.length > 0 && (<div style={{ marginBottom: '10px' }}><div style={{ fontWeight: 600, color: '#0a2540', marginBottom: '4px' }}>Respuestas de recepción</div>{resp.map((r: any) => (<div key={r.id} style={{ fontSize: '12px', color: '#6b7280' }}>{r.motivo_pregunta?.texto} → <b>{r.respuesta === 'NO_SABE' ? 'No sé' : r.respuesta === 'SI' ? 'Sí' : r.respuesta === 'NO' ? 'No' : r.respuesta}</b></div>))}</div>)}
                    {d.solicitud_traslado && <div style={{ fontSize: '12px' }}><b>Traslado:</b> {d.solicitud_traslado.origen ?? '—'} → {d.solicitud_traslado.destino ?? '—'}{d.solicitud_traslado.receptor_nombre ? ` · recibe ${d.solicitud_traslado.receptor_nombre}` : ''}</div>}
                  </div>
                );
              })()}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', borderTop: '0.5px solid #f0f0f0', paddingTop: '12px' }}>
                <button onClick={() => setDetalle(null)} style={{ padding: '8px 18px', borderRadius: '7px', border: '0.5px solid #e5e7eb', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#6b7280' }}>Cerrar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}