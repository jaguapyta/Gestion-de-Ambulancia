'use client';

import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import ProtectedRoute from '../../../components/ProtectedRoute';

const DESP = ['ADMINISTRADOR', 'COORDINADOR_OPERATIVO', 'COORDINADOR_TRANSPORTE', 'ASISTENTE_TRANSPORTE', 'SUPERVISOR_GUARDIA'];

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' });
const estadoMovilColor = (e: string) => e === 'DISPONIBLE' ? '#639922' : e === 'OCUPADO' ? '#BA7517' : '#888780';
const PRIO_HEX: Record<string, string> = { ROJO: '#E24B4A', AMARILLO: '#EF9F27', VERDE: '#1D9E75', AZUL: '#378ADD' };
const estLabel = (n: string): string => ({ PENDIENTE: 'Pendiente', EN_PROCESO: 'En proceso', DESPACHADA: 'Asignado', EN_CAMINO: 'En camino', EN_ESCENA: 'En el lugar', EN_TRASLADO: 'Trasladando', FINALIZADA: 'Finalizada' } as Record<string, string>)[n] ?? n;
const estChip = (n: string) => n === 'PENDIENTE' ? { bg: '#fff7ed', tx: '#c2410c' } : { bg: '#eff6ff', tx: '#1d4ed8' };

export default function DespachoPage() {
  const [tab, setTab] = useState<any>({ emergencias: [], traslados: [], moviles: [] });
  const [cat, setCat] = useState<any>({ estados_despacho: [], condiciones_cierre: [] });
  const [sel, setSel] = useState<any>(null);
  const [cerrando, setCerrando] = useState<any>(null);
  const [cond, setCond] = useState('');
  const [msg, setMsg] = useState('');
  const [detalle, setDetalle] = useState<any>(null);

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
    fetch('http://localhost:3001/api/despacho/tablero', { headers: headers() })
      .then(r => r.json()).then(d => { if (d && d.moviles) setTab(d); }).catch(() => { });
  };
  useEffect(() => {
    fetch('http://localhost:3001/api/despacho/catalogos', { headers: headers() }).then(r => r.json()).then(setCat).catch(() => { });
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
        if (s) guardarUbicacion(s.id, e.latlng.lat, e.latlng.lng);
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

    markersMov.current = {};
    tab.moviles.forEach((m: any) => {
      const lat = m.latitud ?? m.base?.latitud, lng = m.longitud ?? m.base?.longitud;
      if (lat == null || lng == null) return;
      const mk = L.marker([Number(lat), Number(lng)], { icon: movilIcon(estadoMovilColor(m.estado), m.movil?.cod_movil ?? '?') })
        .bindPopup(`<b>${m.movil?.cod_movil ?? ''}</b> · ${m.tipo_soporte?.nombre ?? ''}<br>${m.estado} · ${m.base?.nombre ?? ''}<br>Tripulación: ${m.tripulacion?.length ?? 0}`)
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
    await fetch(`http://localhost:3001/api/despacho/solicitud/${id}/ubicacion`, { method: 'PUT', headers: headers(), body: JSON.stringify({ latitud: lat, longitud: lng }) });
    setMsg(`Ubicación marcada para #${id}`); cargar();
  };

  const verDetalle = async (id: number) => {
    const r = await fetch(`http://localhost:3001/api/solicitudes/${id}`, { headers: headers() });
    if (r.ok) setDetalle(await r.json());
  };

  const localizar = (m: any) => {
    const map = mapObj.current; const lat = m.latitud ?? m.base?.latitud; const lng = m.longitud ?? m.base?.longitud;
    if (map && lat != null && lng != null) { map.setView([Number(lat), Number(lng)], 14); markersMov.current[m.id]?.openPopup(); }
  };

  const asignar = async (rgmId: number) => {
    if (!sel) return;
    const res = await fetch('http://localhost:3001/api/despacho/asignar', { method: 'POST', headers: headers(), body: JSON.stringify({ solicitud_id: sel.id, rol_guardia_movil_id: rgmId, prioridad: sel.prioridad || 'VERDE' }) });
    if (res.ok) { setMsg(`Móvil asignado al pedido #${sel.id}`); setSel(null); cargar(); }
    else setMsg('No se pudo asignar');
  };

  const avanzar = async (despachoId: number, estado: number, condicion?: string) => {
    const res = await fetch(`http://localhost:3001/api/despacho/${despachoId}/estado`, { method: 'PATCH', headers: headers(), body: JSON.stringify({ estado_despacho_id: estado, condicion_cierre_id: condicion || undefined }) });
    if (res.ok) { setCerrando(null); setCond(''); cargar(); }
  };

  const box = { background: 'var(--surface-2, #fff)', border: '0.5px solid #e5e7eb', borderRadius: '10px' } as const;
  const badge = (bg: string, c: string): React.CSSProperties => ({ background: bg, color: c, fontSize: '10px', fontWeight: 500, padding: '1px 7px', borderRadius: '20px' });

  const rutaTraslado = (s: any) => s.tipo_solicitud_id === 3
    ? `${s.solicitud_ref_cama?.centro_solicitante ?? '—'} → ${s.regulacion_cama?.hospital_destino ?? '—'}`
    : `${s.solicitud_traslado?.origen ?? '—'} → ${s.solicitud_traslado?.destino ?? '—'}`;

  return (
    <ProtectedRoute rolesPermitidos={DESP}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 500, color: '#0a2540', margin: 0 }}>Despacho</h1>
          <div style={{ fontSize: '12px', color: '#6b7280', display: 'flex', gap: '14px' }}>
            <span>{tab.emergencias.length + tab.traslados.length} en cola</span>
            <span style={{ color: '#15803d' }}>{tab.moviles.filter((m: any) => m.estado === 'DISPONIBLE').length} libres</span>
          </div>
        </div>
        {sel && <div style={{ background: '#eff6ff', color: '#1e40af', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', margin: '8px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Asignando pedido <b>#{sel.id}</b> — elegí un móvil disponible, o hacé clic en el mapa para marcar su ubicación.</span>
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
              return (
                <div key={s.id} onClick={() => setSel({ tipo: 'emergencia', id: s.id, prioridad: s.prioridad })} onDoubleClick={() => verDetalle(s.id)} title="Clic: asignar · Doble clic: ver toda la info" style={{ ...box, borderLeft: `3px solid ${PRIO_HEX[pr] ?? '#E24B4A'}`, borderRadius: '0 10px 10px 0', padding: '9px 10px', marginBottom: '8px', cursor: 'pointer', outline: sel?.id === s.id ? '2px solid #1d4ed8' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#0a2540' }}>#{s.id}{mot?.codigo_radial ? ` · ${mot.codigo_radial}` : ''}</span>
                    {est && <span style={badge(ch.bg, ch.tx)}>{estLabel(est)}</span>}
                  </div>
                  <div style={{ fontSize: '12px', color: '#374151', marginTop: '2px' }}>{mot?.nombre ?? '—'}</div>
                  <div style={{ fontSize: '11px', color: '#6b7280' }}>{[s.direccion, s.barrio].filter(Boolean).join(', ') || 'sin ubicación'}</div>
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
                return (
                  <div key={s.id} onDoubleClick={() => verDetalle(s.id)} title="Doble clic: ver toda la info · Asignar: elegir móvil" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 11px', borderBottom: '0.5px solid #f3f4f6', cursor: 'pointer' }}>
                    <span style={{ fontSize: '12px', fontWeight: 500, minWidth: '38px' }}>{hhmm(s.solicitud_traslado?.fecha_hora_traslado ?? s.created_at)}</span>
                    <span style={badge(s.tipo_solicitud_id === 3 ? '#FAEEDA' : '#E6F1FB', s.tipo_solicitud_id === 3 ? '#633806' : '#0C447C')}>{s.tipo_solicitud_id === 3 ? 'Cama·SEME' : 'Traslado'}</span>
                    <span style={{ fontSize: '12px', color: '#374151', flex: 1 }}>{s.paciente_nombre} {s.paciente_apellido} · {rutaTraslado(s)}</span>
                    {est && <span style={badge(ch.bg, ch.tx)}>{estLabel(est)}</span>}
                    <button onClick={() => setSel({ tipo: 'traslado', id: s.id, prioridad: 'VERDE' })} style={{ fontSize: '11px', padding: '4px 9px', outline: sel?.id === s.id ? '2px solid #1d4ed8' : 'none' }}>Asignar</button>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '12px', fontWeight: 500, color: '#6b7280', marginBottom: '6px' }}>Móviles</div>
            <div style={{ ...box, overflow: 'hidden' }}>
              {tab.moviles.map((m: any) => {
                const d = m.despacho?.[0];
                return (
                  <div key={m.id} onClick={() => localizar(m)} title="Clic: ver su ubicación en el mapa" style={{ padding: '9px 10px', borderBottom: '0.5px solid #f3f4f6', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', fontWeight: 500, color: m.estado === 'DISPONIBLE' ? '#0a2540' : '#6b7280' }}>📍 {m.movil?.cod_movil} · {m.tipo_soporte?.nombre}</span>
                      <span style={badge(m.estado === 'DISPONIBLE' ? '#EAF3DE' : '#FAEEDA', m.estado === 'DISPONIBLE' ? '#173404' : '#633806')}>{m.estado === 'DISPONIBLE' ? 'Libre' : 'Ocupado'}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>{m.base?.nombre}</div>

                    {sel && m.estado === 'DISPONIBLE' && (
                      <button onClick={() => asignar(m.id)} style={{ marginTop: '6px', width: '100%', fontSize: '11px', padding: '5px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Asignar aquí</button>
                    )}

                    {d && (
                      <div style={{ marginTop: '6px' }}>
                        <div style={{ fontSize: '11px', color: '#6b7280' }}>Viaje #{d.solicitud_id} · {d.estado_despacho?.nombre}</div>
                        {cerrando?.despachoId === d.id ? (
                          <div style={{ marginTop: '4px', display: 'flex', gap: '4px' }}>
                            <select value={cond} onChange={e => setCond(e.target.value)} style={{ flex: 1, fontSize: '11px', padding: '3px' }}>
                              <option value="">Motivo…</option>{cat.condiciones_cierre.map((c: any) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                            </select>
                            <button onClick={() => cond && avanzar(d.id, cerrando.estado, cond)} style={{ fontSize: '11px', padding: '3px 7px' }}>OK</button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                            {d.estado_despacho_id === 1 && <button onClick={() => avanzar(d.id, 2)} style={{ fontSize: '10px', padding: '3px 7px' }}>En escena</button>}
                            {d.estado_despacho_id === 2 && <button onClick={() => avanzar(d.id, 3)} style={{ fontSize: '10px', padding: '3px 7px' }}>Trasladando</button>}
                            {d.estado_despacho_id === 3 && <button onClick={() => setCerrando({ despachoId: d.id, estado: 4 })} style={{ fontSize: '10px', padding: '3px 7px', background: '#15803d', color: '#fff', border: 'none', borderRadius: '5px' }}>Finalizar</button>}
                            <button onClick={() => setCerrando({ despachoId: d.id, estado: 5 })} style={{ fontSize: '10px', padding: '3px 7px', color: '#b91c1c' }}>Cancelar</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

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