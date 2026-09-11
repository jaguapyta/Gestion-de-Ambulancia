'use client';

import { API_URL } from '@/app/lib/api';
import { useEffect, useMemo, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';

const COLORES: Record<string, { hex: string; bg: string; tx: string }> = {
  ROJO: { hex: '#E24B4A', bg: '#FCEBEB', tx: '#791F1F' },
  AMARILLO: { hex: '#EF9F27', bg: '#FAEEDA', tx: '#633806' },
  VERDE: { hex: '#1D9E75', bg: '#E1F5EE', tx: '#04342C' },
  AZUL: { hex: '#378ADD', bg: '#E6F1FB', tx: '#0C447C' },
};
const RANK: Record<string, number> = { ROJO: 3, AMARILLO: 2, VERDE: 1, AZUL: 0 };

type Props = { telefono: string; nombre: string; onCerrar: () => void; onGuardado: () => void; onVolver?: () => void };

export default function ModalEmergencia({ telefono, nombre, onCerrar, onGuardado, onVolver }: Props) {
  const [motivos, setMotivos] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<any>(null);
  const [relato, setRelato] = useState('');
  const [resp, setResp] = useState<Record<number, string>>({});
  const [prioridad, setPrioridad] = useState('');
  const [manual, setManual] = useState(false);
  const [ubic, setUbic] = useState({ lat: null as number | null, lng: null as number | null, direccion: '', barrio: '', ciudad: '' });
  const [pac, setPac] = useState({ nombre: '', apellido: '', documento: '', edad: '', edad_unidad: 'AÑOS', sexo: '', es_nn: false });
  const [heridos, setHeridos] = useState('');
  const [addSyn, setAddSyn] = useState(false);
  const [synText, setSynText] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState('');
  const [exito, setExito] = useState<any>(null);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapObj = useRef<any>(null);
  const Lref = useRef<any>(null);
  const marker = useRef<any>(null);

  const token = () => localStorage.getItem('token') ?? '';
  const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

  const cargarCatalogo = () => fetch(`${API_URL}/api/emergencias/catalogos`, { headers: headers() })
    .then(r => r.json()).then(d => { if (d.motivos) setMotivos(d.motivos); }).catch(() => { });
  useEffect(() => { cargarCatalogo(); }, []);

  const sugerido = useMemo(() => {
    if (!sel) return '';
    let c = sel.color;
    for (const p of (sel.preguntas || [])) {
      const ans = resp[p.id];
      const col = ans === 'SI' ? p.color_si : ans === 'NO' ? p.color_no : null;
      if (col && (RANK[col] || 0) > (RANK[c] || 0)) c = col;
    }
    return c;
  }, [resp, sel]);
  const escalado = !!sel && sugerido !== sel.color;
  useEffect(() => { if (sel && !manual) setPrioridad(sugerido); }, [sugerido, sel, manual]);

  useEffect(() => {
    if (!sel) return;
    let cancel = false;
    (async () => {
      const L = (await import('leaflet')).default;
      if (cancel || mapObj.current || !mapRef.current) return;
      Lref.current = L;
      const map = L.map(mapRef.current).setView([-25.30, -57.58], 11);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 19 }).addTo(map);
      map.on('click', (e: any) => {
        const { lat, lng } = e.latlng;
        setUbic(u => ({ ...u, lat, lng }));
        if (marker.current) marker.current.setLatLng([lat, lng]);
        else marker.current = L.marker([lat, lng]).addTo(map);
      });
      mapObj.current = map;
    })();
    return () => { cancel = true; if (mapObj.current) { mapObj.current.remove(); mapObj.current = null; marker.current = null; } };
  }, [sel]);

  const elegirMotivo = (m: any) => { setSel(m); setManual(false); setResp({}); setMsg(''); };

  const agregarSinonimo = async () => {
    if (!sel || !synText.trim()) return;
    const res = await fetch(`${API_URL}/api/emergencias/sinonimos`, { method: 'POST', headers: headers(), body: JSON.stringify({ motivo_id: sel.id, texto: synText.trim(), origen: 'MANUAL' }) });
    if (res.ok) {
      setSel({ ...sel, sinonimos: [...(sel.sinonimos ?? []), { texto: synText.trim() }] });
      setMotivos(ms => ms.map(m => m.id === sel.id ? { ...m, sinonimos: [...(m.sinonimos ?? []), { texto: synText.trim() }] } : m));
      setSynText(''); setAddSyn(false); setMsg('Sinónimo agregado');
    }
  };

  const guardar = async () => {
    if (!sel) { setMsg('Elegí el motivo de consulta.'); return; }
    if (!pac.es_nn && !pac.nombre.trim() && !ubic.direccion.trim()) { setMsg('Cargá al menos la dirección o el paciente.'); return; }
    setGuardando(true); setMsg('');
    try {
      const respuestas = sel.preguntas.filter((p: any) => resp[p.id]).map((p: any) => ({ motivo_pregunta_id: p.id, respuesta: resp[p.id] }));
      const body = {
        canal_ingreso_id: 1, denunciante_nombre: nombre || null, denunciante_telefono: telefono || null,
        direccion: ubic.direccion || null, barrio: ubic.barrio || null, ciudad: ubic.ciudad || null,
        latitud: ubic.lat, longitud: ubic.lng,
        paciente_nombre: pac.es_nn ? null : pac.nombre || null, paciente_apellido: pac.es_nn ? null : pac.apellido || null,
        paciente_documento: pac.es_nn ? null : pac.documento || null, paciente_edad: pac.edad || null,
        paciente_edad_unidad: pac.edad ? pac.edad_unidad : null, paciente_sexo: pac.sexo || null, es_nn: pac.es_nn,
        motivo_consulta_id: sel.id, relato: relato || null, cantidad_heridos: heridos || null,
        respuestas, prioridad, origen: prioridad === sugerido ? 'ALGORITMO' : 'MANUAL',
      };
      const res = await fetch(`${API_URL}/api/emergencias`, { method: 'POST', headers: headers(), body: JSON.stringify(body) });
      const d = await res.json();
      if (res.ok) { setExito(d); onGuardado(); }
      else setMsg(d.error || 'No se pudo guardar');
    } catch { setMsg('Error de conexión'); } finally { setGuardando(false); }
  };

  const input = { width: '100%', padding: '9px 12px', borderRadius: '7px', border: '0.5px solid #e5e7eb', fontSize: '13px', boxSizing: 'border-box' as const };
  const label = { fontSize: '12px', color: '#6b7280', display: 'block' as const, marginBottom: '5px' };
  const seccion = { fontSize: '13px', fontWeight: 600, color: '#0a2540', margin: '18px 0 10px', paddingBottom: '6px', borderBottom: '0.5px solid #f0f0f0' } as const;

  const filtrados = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return motivos;
    return motivos.filter(m => m.nombre.toLowerCase().includes(s) || (m.sinonimos ?? []).some((x: any) => x.texto.toLowerCase().includes(s)));
  }, [q, motivos]);

  if (exito) {
    const c = COLORES[exito.prioridad] ?? COLORES.AZUL;
    return (
      <div style={ov}>
        <div style={{ ...card, width: '420px', textAlign: 'center', padding: '36px 28px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: c.bg, color: c.tx, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px', margin: '0 auto 16px' }}>🚑</div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0a2540', margin: '0 0 6px' }}>Emergencia registrada</h2>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 14px' }}>Pedido <b>#{exito.id}</b></p>
          <div style={{ display: 'inline-block', background: c.bg, color: c.tx, fontWeight: 600, fontSize: '14px', padding: '6px 18px', borderRadius: '20px', marginBottom: '20px' }}>Prioridad {exito.prioridad}</div>
          <div><button onClick={onCerrar} style={{ background: '#0a2540', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>Cerrar</button></div>
        </div>
      </div>
    );
  }

  return (
    <div style={ov}>
      <div style={{ ...card, width: sel ? '980px' : '680px', maxWidth: '95vw' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {onVolver && <button onClick={onVolver} title="Volver a elegir el tipo de solicitud (mantiene teléfono y nombre)" style={{ background: 'transparent', border: '0.5px solid #e5e7eb', borderRadius: '7px', padding: '5px 10px', fontSize: '12px', color: '#6b7280', cursor: 'pointer' }}>← Volver</button>}
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#0a2540', margin: 0 }}>🚑 Nueva emergencia / urgencia</h2>
          </div>
          <button onClick={onCerrar} style={{ background: 'transparent', border: 'none', fontSize: '20px', color: '#9ca3af', cursor: 'pointer' }}>×</button>
        </div>
        <p style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 8px' }}>Llamada de {nombre || 's/nombre'} · {telefono || 's/tel'}</p>

        {msg && <div style={{ background: '#eff6ff', color: '#1e40af', padding: '8px 12px', borderRadius: '7px', fontSize: '12px', marginBottom: '10px' }}>{msg}</div>}

        <div style={seccion}>1 · Motivo de consulta</div>
        {!sel ? (
          <>
            <input type="text" placeholder="Buscar… (ej: desmayo, no puede respirar, choque, dolor de panza)" value={q} onChange={e => setQ(e.target.value)} style={{ ...input, marginBottom: '10px' }} />
            <div style={{ maxHeight: '280px', overflowY: 'auto', border: '0.5px solid #f0f0f0', borderRadius: '8px' }}>
              {filtrados.map(m => {
                const c = COLORES[m.color] ?? COLORES.AZUL;
                const hit = q.trim() && !m.nombre.toLowerCase().includes(q.trim().toLowerCase());
                const syn = hit ? (m.sinonimos ?? []).find((x: any) => x.texto.toLowerCase().includes(q.trim().toLowerCase())) : null;
                return (
                  <div key={m.id} onClick={() => elegirMotivo(m)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderBottom: '0.5px solid #f5f5f5', cursor: 'pointer' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: c.hex, flexShrink: 0 }} />
                    <span style={{ fontSize: '13px', color: '#0a2540', flex: 1 }}>{m.nombre}{syn && <span style={{ color: '#9ca3af', fontStyle: 'italic' }}> · "{syn.texto}"</span>}</span>
                    <span style={{ fontSize: '10px', color: '#9ca3af' }}>{m.codigo}</span>
                  </div>
                );
              })}
              {filtrados.length === 0 && <div style={{ padding: '16px', textAlign: 'center', color: '#9ca3af', fontSize: '12px' }}>Sin resultados — elegí el motivo correcto de la lista y agregá el término como sinónimo desde el paso siguiente.</div>}
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
            {(() => { const c = COLORES[sel.color] ?? COLORES.AZUL; return (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
                <span style={{ background: c.bg, color: c.tx, fontSize: '12px', fontWeight: 600, padding: '4px 12px', borderRadius: '20px' }}>{sel.nombre}</span>
                <span style={{ fontSize: '11px', color: '#9ca3af' }}>base {sel.color} · {sel.codigo}{sel.codigo_radial ? ` · ${sel.codigo_radial}` : ''}</span>
                <button onClick={() => setAddSyn(v => !v)} style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', border: '0.5px solid #e5e7eb', background: 'white', cursor: 'pointer', color: '#1d4ed8' }}>+ sinónimo</button>
                <button onClick={() => { setSel(null); setManual(false); }} style={{ marginLeft: 'auto', fontSize: '11px', padding: '3px 10px', borderRadius: '6px', border: '0.5px solid #e5e7eb', background: 'white', cursor: 'pointer', color: '#6b7280' }}>Cambiar</button>
              </div>
            ); })()}

            {addSyn && (
              <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                <input value={synText} onChange={e => setSynText(e.target.value)} placeholder={`Nuevo sinónimo para "${sel.nombre}"`} style={{ ...input, flex: 1 }} />
                <button onClick={agregarSinonimo} style={{ padding: '0 14px', borderRadius: '7px', border: 'none', background: '#1d4ed8', color: 'white', cursor: 'pointer', fontSize: '12px' }}>Agregar</button>
              </div>
            )}

            {/* Preguntas clave contestables — el color sale de estas respuestas */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#0a2540' }}>Preguntas clave</span>
              <span style={{ fontSize: '10px', color: '#9ca3af' }}>⚠ = la respuesta define el color</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
              {sel.preguntas.map((p: any) => {
                const decide = !!(p.color_si || p.color_no);
                if (p.tipo_respuesta === 'TEXTO') {
                  return (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                      <span style={{ flex: 1, color: '#374151' }}>{p.texto}</span>
                      <input value={resp[p.id] ?? ''} onChange={e => setResp({ ...resp, [p.id]: e.target.value })} placeholder="Completar…" style={{ ...input, width: '210px', padding: '5px 8px', fontSize: '11px' }} />
                    </div>
                  );
                }
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                    <span style={{ flex: 1, color: '#374151' }}>{decide && <span title="La respuesta define el color" style={{ color: '#dc2626', marginRight: '4px' }}>⚠</span>}{p.texto}</span>
                    {['SI', 'NO', 'NO_SABE'].map(op => {
                      const on = resp[p.id] === op;
                      const colName = op === 'SI' ? p.color_si : op === 'NO' ? p.color_no : null;
                      const dc = colName ? (COLORES[colName] ?? null) : null;
                      return <button key={op} onClick={() => setResp({ ...resp, [p.id]: op })} style={{ padding: '3px 8px', fontSize: '11px', borderRadius: '6px', cursor: 'pointer', border: on ? (dc ? `1px solid ${dc.hex}` : '1px solid #0a2540') : '0.5px solid #e5e7eb', background: on ? (dc ? dc.hex : '#0a2540') : 'white', color: on ? 'white' : '#9ca3af' }}>{op === 'NO_SABE' ? 'No sé' : op === 'SI' ? 'Sí' : 'No'}</button>;
                    })}
                  </div>
                );
              })}
            </div>

            {/* Criterios de referencia */}
            <details style={{ marginBottom: '10px' }}>
              <summary style={{ fontSize: '11px', color: '#6b7280', cursor: 'pointer' }}>Ver criterios de color del protocolo</summary>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                {['ROJO', 'AMARILLO', 'VERDE'].map(col => {
                  const cr = sel.criterios.find((x: any) => x.color === col); if (!cr) return null; const c = COLORES[col];
                  return <div key={col} style={{ display: 'flex', gap: '8px', fontSize: '11px', color: '#374151' }}><span style={{ background: c.bg, color: c.tx, fontWeight: 600, padding: '1px 8px', borderRadius: '20px', flexShrink: 0, height: 'fit-content' }}>{col}</span><span>{cr.criterio}</span></div>;
                })}
              </div>
            </details>

            <div><label style={label}>Relato del llamante</label>
              <textarea value={relato} onChange={e => setRelato(e.target.value)} rows={2} placeholder="Lo que cuenta quien llama…" style={{ ...input, resize: 'vertical' }} />
            </div>

            {/* Color final */}
            <div style={{ margin: '12px 0' }}>
              <label style={label}>Prioridad — sugerida por el sistema: <b style={{ color: (COLORES[sugerido] ?? COLORES.AZUL).hex }}>{sugerido}</b>{escalado && <span style={{ color: (COLORES[sugerido] ?? COLORES.AZUL).hex }}> (escaló desde {sel.color} por las respuestas)</span>}</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['ROJO', 'AMARILLO', 'VERDE', 'AZUL'].map(col => {
                  const c = COLORES[col]; const on = prioridad === col;
                  return <button key={col} onClick={() => { setPrioridad(col); setManual(true); }} style={{ flex: 1, padding: '8px', borderRadius: '7px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, border: on ? `2px solid ${c.hex}` : '0.5px solid #e5e7eb', background: on ? c.bg : 'white', color: on ? c.tx : '#9ca3af' }}>{col}</button>;
                })}
              </div>
              {manual && prioridad !== sugerido && <p style={{ fontSize: '11px', color: '#c2410c', margin: '6px 0 0' }}>Ajuste manual — quedará registrado como decisión del operador.</p>}
            </div>

            {/* Ubicación */}
            <div style={seccion}>2 · Ubicación</div>
            <div ref={mapRef} style={{ height: '200px', borderRadius: '10px', border: '0.5px solid #e5e7eb', marginBottom: '8px', zIndex: 0 }} />
            <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 8px' }}>Clic en el mapa para marcar el lugar {ubic.lat != null && <b style={{ color: '#15803d' }}>· marcado ✓</b>}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '8px' }}>
              <input placeholder="Dirección" value={ubic.direccion} onChange={e => setUbic({ ...ubic, direccion: e.target.value })} style={input} />
              <input placeholder="Barrio" value={ubic.barrio} onChange={e => setUbic({ ...ubic, barrio: e.target.value })} style={input} />
              <input placeholder="Ciudad" value={ubic.ciudad} onChange={e => setUbic({ ...ubic, ciudad: e.target.value })} style={input} />
            </div>

            {/* Paciente */}
            <div style={seccion}>3 · Paciente</div>
            <label style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer', fontSize: '13px', color: '#374151', marginBottom: '10px' }}>
              <input type="checkbox" checked={pac.es_nn} onChange={e => setPac({ ...pac, es_nn: e.target.checked })} /> Paciente N/N (no identificado)
            </label>
            {!pac.es_nn && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                <input placeholder="Nombre" value={pac.nombre} onChange={e => setPac({ ...pac, nombre: e.target.value })} style={input} />
                <input placeholder="Apellido" value={pac.apellido} onChange={e => setPac({ ...pac, apellido: e.target.value })} style={input} />
                <input placeholder="Documento" value={pac.documento} onChange={e => setPac({ ...pac, documento: e.target.value })} style={input} />
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px' }}>
              <input placeholder="Edad" value={pac.edad} onChange={e => setPac({ ...pac, edad: e.target.value.replace(/\D/g, '').slice(0, 3) })} style={input} />
              <select value={pac.edad_unidad} onChange={e => setPac({ ...pac, edad_unidad: e.target.value })} style={input}>
                <option value="AÑOS">años</option><option value="MESES">meses</option><option value="DIAS">días</option>
              </select>
              <select value={pac.sexo} onChange={e => setPac({ ...pac, sexo: e.target.value })} style={input}>
                <option value="">Sexo</option><option value="M">M</option><option value="F">F</option>
              </select>
              <input placeholder="N° heridos" value={heridos} onChange={e => setHeridos(e.target.value.replace(/\D/g, '').slice(0, 3))} style={input} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px', borderTop: '0.5px solid #f0f0f0', paddingTop: '14px' }}>
              <button onClick={onCerrar} style={{ padding: '9px 18px', borderRadius: '7px', border: '0.5px solid #e5e7eb', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#6b7280' }}>Cancelar</button>
              <button onClick={guardar} disabled={guardando} style={{ padding: '9px 22px', borderRadius: '7px', border: 'none', background: '#dc2626', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>{guardando ? 'Guardando…' : 'Registrar emergencia'}</button>
            </div>
            </div>

            {/* Panel derecho fijo: seguridad + indicaciones pre-arribo (siempre visible) */}
            <aside style={{ width: '300px', flexShrink: 0, position: 'sticky', top: 0, alignSelf: 'flex-start', maxHeight: 'calc(100vh - 96px)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {sel.nota_seguridad && (
                <div style={{ background: '#fff7ed', border: '0.5px solid #fed7aa', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#9a3412', marginBottom: '4px' }}>🛡️ Seguridad de la escena / del personal</div>
                  <div style={{ fontSize: '12px', color: '#7c2d12', lineHeight: 1.5 }}>{sel.nota_seguridad}</div>
                </div>
              )}
              <div style={{ background: '#eff6ff', border: '0.5px solid #bfdbfe', borderRadius: '10px', padding: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#1e40af', marginBottom: '6px' }}>📞 Indicaciones para el llamante</div>
                <div style={{ fontSize: '10px', color: '#60a5fa', marginBottom: '6px' }}>Dictarlas mientras llega la ambulancia</div>
                {sel.instrucciones?.length > 0 ? (
                  <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#1e3a5f', lineHeight: 1.7 }}>
                    {sel.instrucciones.map((x: any) => <li key={x.id}>{x.texto}</li>)}
                  </ol>
                ) : <div style={{ fontSize: '12px', color: '#9ca3af' }}>Sin indicaciones específicas para este motivo.</div>}
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

const ov: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 300, padding: '24px', overflowY: 'auto' };
const card: React.CSSProperties = { background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' };
