'use client';

import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';

const COLORES: Record<string, { hex: string; bg: string; tx: string }> = {
  ROJO: { hex: '#E24B4A', bg: '#FCEBEB', tx: '#791F1F' },
  AMARILLO: { hex: '#EF9F27', bg: '#FAEEDA', tx: '#633806' },
  VERDE: { hex: '#1D9E75', bg: '#E1F5EE', tx: '#04342C' },
  AZUL: { hex: '#378ADD', bg: '#E6F1FB', tx: '#0C447C' },
};

type Props = { telefono: string; nombre: string; onCerrar: () => void; onGuardado: () => void };

export default function ModalEmergencia({ telefono, nombre, onCerrar, onGuardado }: Props) {
  const [motivos, setMotivos] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<any>(null);
  const [relato, setRelato] = useState('');
  const [prioridad, setPrioridad] = useState('');
  const [ubic, setUbic] = useState({ lat: null as number | null, lng: null as number | null, direccion: '', barrio: '', ciudad: '' });
  const [pac, setPac] = useState({ nombre: '', apellido: '', documento: '', edad: '', edad_unidad: 'AÑOS', sexo: '', es_nn: false });
  const [heridos, setHeridos] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState('');
  const [exito, setExito] = useState<any>(null);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapObj = useRef<any>(null);
  const Lref = useRef<any>(null);
  const marker = useRef<any>(null);

  const token = () => localStorage.getItem('token') ?? '';
  const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

  useEffect(() => {
    fetch('http://localhost:3001/api/emergencias/catalogos', { headers: headers() })
      .then(r => r.json()).then(d => { if (d.motivos) setMotivos(d.motivos); }).catch(() => { });
  }, []);

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

  const elegirMotivo = (m: any) => { setSel(m); setPrioridad(m.color); setMsg(''); };

  const guardar = async () => {
    if (!sel) { setMsg('Elegí el motivo de consulta.'); return; }
    if (!pac.es_nn && !pac.nombre.trim() && !ubic.direccion.trim()) { setMsg('Cargá al menos la dirección o el paciente.'); return; }
    setGuardando(true); setMsg('');
    try {
      const body = {
        canal_ingreso_id: 1,
        denunciante_nombre: nombre || null, denunciante_telefono: telefono || null,
        direccion: ubic.direccion || null, barrio: ubic.barrio || null, ciudad: ubic.ciudad || null,
        latitud: ubic.lat, longitud: ubic.lng,
        paciente_nombre: pac.es_nn ? null : pac.nombre || null, paciente_apellido: pac.es_nn ? null : pac.apellido || null,
        paciente_documento: pac.es_nn ? null : pac.documento || null, paciente_edad: pac.edad || null,
        paciente_edad_unidad: pac.edad ? pac.edad_unidad : null, paciente_sexo: pac.sexo || null, es_nn: pac.es_nn,
        motivo_consulta_id: sel.id, relato: relato || null, cantidad_heridos: heridos || null,
        prioridad, origen: prioridad === sel.color ? 'REGLAS' : 'MANUAL',
      };
      const res = await fetch('http://localhost:3001/api/emergencias', { method: 'POST', headers: headers(), body: JSON.stringify(body) });
      const d = await res.json();
      if (res.ok) { setExito(d); onGuardado(); }
      else setMsg(d.error || 'No se pudo guardar');
    } catch { setMsg('Error de conexión'); } finally { setGuardando(false); }
  };

  const input = { width: '100%', padding: '9px 12px', borderRadius: '7px', border: '0.5px solid #e5e7eb', fontSize: '13px', boxSizing: 'border-box' as const };
  const label = { fontSize: '12px', color: '#6b7280', display: 'block' as const, marginBottom: '5px' };
  const seccion = { fontSize: '13px', fontWeight: 600, color: '#0a2540', margin: '18px 0 10px', paddingBottom: '6px', borderBottom: '0.5px solid #f0f0f0' } as const;

  const filtrados = q.trim()
    ? motivos.filter(m => m.nombre.toLowerCase().includes(q.toLowerCase()))
    : motivos;

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
      <div style={{ ...card, width: '720px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#0a2540', margin: 0 }}>🚑 Nueva emergencia / urgencia</h2>
          <button onClick={onCerrar} style={{ background: 'transparent', border: 'none', fontSize: '20px', color: '#9ca3af', cursor: 'pointer' }}>×</button>
        </div>
        <p style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 8px' }}>Llamada de {nombre || 's/nombre'} · {telefono || 's/tel'}</p>

        {msg && <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '8px 12px', borderRadius: '7px', fontSize: '12px', marginBottom: '10px' }}>{msg}</div>}

        {/* Paso 1: motivo */}
        <div style={seccion}>1 · Motivo de consulta</div>
        {!sel ? (
          <>
            <input type="text" placeholder="Buscar motivo… (ej: dolor de pecho, convulsión, caída)" value={q} onChange={e => setQ(e.target.value)} style={{ ...input, marginBottom: '10px' }} />
            <div style={{ maxHeight: '260px', overflowY: 'auto', border: '0.5px solid #f0f0f0', borderRadius: '8px' }}>
              {filtrados.map(m => {
                const c = COLORES[m.color] ?? COLORES.AZUL;
                return (
                  <div key={m.id} onClick={() => elegirMotivo(m)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderBottom: '0.5px solid #f5f5f5', cursor: 'pointer' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: c.hex, flexShrink: 0 }} />
                    <span style={{ fontSize: '13px', color: '#0a2540', flex: 1 }}>{m.nombre}</span>
                    <span style={{ fontSize: '10px', color: '#9ca3af' }}>{m.codigo}</span>
                  </div>
                );
              })}
              {filtrados.length === 0 && <div style={{ padding: '16px', textAlign: 'center', color: '#9ca3af', fontSize: '12px' }}>Sin resultados</div>}
            </div>
          </>
        ) : (
          <div>
            {(() => { const c = COLORES[sel.color] ?? COLORES.AZUL; return (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <span style={{ background: c.bg, color: c.tx, fontSize: '12px', fontWeight: 600, padding: '4px 12px', borderRadius: '20px' }}>{sel.nombre}</span>
                <span style={{ fontSize: '11px', color: '#9ca3af' }}>base {sel.color} · {sel.codigo}{sel.codigo_radial ? ` · ${sel.codigo_radial}` : ''}</span>
                <button onClick={() => { setSel(null); setPrioridad(''); }} style={{ marginLeft: 'auto', fontSize: '11px', padding: '3px 10px', borderRadius: '6px', border: '0.5px solid #e5e7eb', background: 'white', cursor: 'pointer', color: '#6b7280' }}>Cambiar</button>
              </div>
            ); })()}

            {/* Árbol: preguntas / instrucciones / criterios */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div style={{ background: '#f8f9fb', borderRadius: '8px', padding: '10px 12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#0a2540', marginBottom: '6px' }}>Preguntas clave</div>
                <ol style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#374151', lineHeight: 1.6 }}>
                  {sel.preguntas.map((p: any) => <li key={p.id}>{p.texto}</li>)}
                </ol>
              </div>
              <div style={{ background: '#f8f9fb', borderRadius: '8px', padding: '10px 12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#0a2540', marginBottom: '6px' }}>Instrucciones pre-arribo</div>
                <ol style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#374151', lineHeight: 1.6, listStyleType: 'upper-alpha' }}>
                  {sel.instrucciones.map((i: any) => <li key={i.id}>{i.texto}</li>)}
                </ol>
              </div>
            </div>

            {/* Criterios de color */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
              {['ROJO', 'AMARILLO', 'VERDE'].map(col => {
                const cr = sel.criterios.find((x: any) => x.color === col);
                if (!cr) return null;
                const c = COLORES[col];
                return (
                  <div key={col} style={{ display: 'flex', gap: '8px', fontSize: '12px', color: '#374151' }}>
                    <span style={{ background: c.bg, color: c.tx, fontWeight: 600, padding: '1px 8px', borderRadius: '20px', flexShrink: 0, height: 'fit-content' }}>{col}</span>
                    <span>{cr.criterio}</span>
                  </div>
                );
              })}
            </div>

            <div><label style={label}>Relato del llamante</label>
              <textarea value={relato} onChange={e => setRelato(e.target.value)} rows={2} placeholder="Lo que cuenta quien llama…" style={{ ...input, resize: 'vertical' }} />
            </div>

            {/* Color final */}
            <div style={{ margin: '12px 0' }}>
              <label style={label}>Prioridad (color) — sugerida: <b style={{ color: (COLORES[sel.color] ?? COLORES.AZUL).hex }}>{sel.color}</b></label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['ROJO', 'AMARILLO', 'VERDE', 'AZUL'].map(col => {
                  const c = COLORES[col]; const on = prioridad === col;
                  return <button key={col} onClick={() => setPrioridad(col)} style={{ flex: 1, padding: '8px', borderRadius: '7px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, border: on ? `2px solid ${c.hex}` : '0.5px solid #e5e7eb', background: on ? c.bg : 'white', color: on ? c.tx : '#9ca3af' }}>{col}</button>;
                })}
              </div>
              {prioridad !== sel.color && <p style={{ fontSize: '11px', color: '#c2410c', margin: '6px 0 0' }}>Estás cambiando el color sugerido — quedará registrado como ajuste manual.</p>}
            </div>

            {/* Ubicación */}
            <div style={seccion}>2 · Ubicación</div>
            <div ref={mapRef} style={{ height: '200px', borderRadius: '10px', border: '0.5px solid #e5e7eb', marginBottom: '8px', zIndex: 0 }} />
            <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 8px' }}>Hacé clic en el mapa para marcar el lugar {ubic.lat != null && <b style={{ color: '#15803d' }}>· marcado ✓</b>}</p>
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
        )}
      </div>
    </div>
  );
}

const ov: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 300, padding: '24px', overflowY: 'auto' };
const card: React.CSSProperties = { background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' };
