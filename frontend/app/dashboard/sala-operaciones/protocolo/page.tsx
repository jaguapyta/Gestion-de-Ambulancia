'use client';

import { API_URL } from '@/app/lib/api';
import { useEffect, useMemo, useState } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { esSoloLectura } from '@/lib/permisos';

const COLORES: Record<string, { hex: string; bg: string; tx: string }> = {
  ROJO: { hex: '#E24B4A', bg: '#FCEBEB', tx: '#791F1F' },
  AMARILLO: { hex: '#EF9F27', bg: '#FAEEDA', tx: '#633806' },
  VERDE: { hex: '#1D9E75', bg: '#E1F5EE', tx: '#04342C' },
  AZUL: { hex: '#378ADD', bg: '#E6F1FB', tx: '#0C447C' },
};

export default function ProtocoloPage() {
  const [motivos, setMotivos] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [filtroColor, setFiltroColor] = useState('');
  const [abierto, setAbierto] = useState<number | null>(null);
  const [cargando, setCargando] = useState(true);
  const [soloLectura, setSoloLectura] = useState(false);

  const token = () => localStorage.getItem('token') ?? '';
  const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

  const cargar = () => {
    setCargando(true);
    fetch(`${API_URL}/api/emergencias/motivos-editor`, { headers: headers() })
      .then(r => r.json()).then(d => { if (d.motivos) setMotivos(d.motivos); }).catch(() => { }).finally(() => setCargando(false));
  };
  useEffect(() => {
    try { setSoloLectura(esSoloLectura(JSON.parse(localStorage.getItem('usuario') || '{}').rol)); } catch {}
    cargar();
  }, []);

  const patchPregunta = async (motivoId: number, preg: any, campos: any) => {
    if (soloLectura) return; // Dirección: solo lectura
    setMotivos(ms => ms.map(m => m.id !== motivoId ? m : { ...m, preguntas: m.preguntas.map((p: any) => p.id === preg.id ? { ...p, ...campos } : p) }));
    await fetch(`${API_URL}/api/emergencias/pregunta/${preg.id}`, { method: 'PATCH', headers: headers(), body: JSON.stringify(campos) });
  };
  const patchMotivo = async (motivoId: number, color: string) => {
    if (soloLectura) return; // Dirección: solo lectura
    setMotivos(ms => ms.map(m => m.id === motivoId ? { ...m, color } : m));
    await fetch(`${API_URL}/api/emergencias/motivo/${motivoId}`, { method: 'PATCH', headers: headers(), body: JSON.stringify({ color }) });
  };

  const filtrados = useMemo(() => {
    const s = q.trim().toLowerCase();
    return motivos.filter(m =>
      (!filtroColor || m.color === filtroColor) &&
      (!s || m.nombre.toLowerCase().includes(s) || m.codigo.includes(s)));
  }, [q, filtroColor, motivos]);

  const input = { padding: '9px 12px', borderRadius: '7px', border: '0.5px solid #e5e7eb', fontSize: '13px', boxSizing: 'border-box' as const };
  const chip = (col: string, on: boolean, oc: any): React.CSSProperties => ({ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', border: on ? `1px solid ${oc.hex}` : '0.5px solid #e5e7eb', background: on ? oc.bg : 'white', color: on ? oc.tx : '#9ca3af' });

  return (
    <ProtectedRoute rolesPermitidos={['ADMINISTRADOR', 'COORDINADOR_REGULACION', 'DIRECCION']}>
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 500, color: '#0a2540', margin: 0 }}>Protocolo de emergencias</h1>
        <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>Color base de cada motivo y qué preguntas escalan la prioridad (según la respuesta). El sistema sugiere; el operador decide.</p>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', margin: '16px 0' }}>
          <input type="text" placeholder="Buscar por código o nombre…" value={q} onChange={e => setQ(e.target.value)} style={{ ...input, flex: 1, minWidth: '220px', padding: '10px 14px' }} />
          {['', 'ROJO', 'AMARILLO', 'VERDE', 'AZUL'].map(c => {
            const oc = COLORES[c] ?? { hex: '#0a2540', bg: '#f0f4f8', tx: '#0a2540' };
            return <button key={c || 'todos'} onClick={() => setFiltroColor(c)} style={chip(c, filtroColor === c, oc)}>{c || 'Todos'}</button>;
          })}
        </div>

        {cargando ? <p style={{ color: '#9ca3af', fontSize: '13px' }}>Cargando…</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filtrados.map(m => {
              const oc = COLORES[m.color] ?? COLORES.AZUL;
              const nBand = m.preguntas.filter((p: any) => p.es_bandera).length;
              const open = abierto === m.id;
              return (
                <div key={m.id} style={{ background: 'white', border: '0.5px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>
                  <div onClick={() => setAbierto(open ? null : m.id)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', cursor: 'pointer' }}>
                    <span style={{ width: '11px', height: '11px', borderRadius: '50%', background: oc.hex, flexShrink: 0 }} />
                    <span style={{ fontSize: '11px', color: '#9ca3af', width: '42px' }}>{m.codigo}</span>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#0a2540', flex: 1 }}>{m.nombre}</span>
                    <span style={{ fontSize: '11px', color: '#9ca3af' }}>{nBand} alarma{nBand === 1 ? '' : 's'}</span>
                    <span style={{ color: '#c0c4cc', fontSize: '12px' }}>{open ? '▲' : '▼'}</span>
                  </div>

                  {open && (
                    <div style={{ padding: '0 14px 14px', borderTop: '0.5px solid #f3f4f6' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '12px 0' }}>
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>Color base:</span>
                        {['ROJO', 'AMARILLO', 'VERDE', 'AZUL'].map(c => <button key={c} onClick={() => patchMotivo(m.id, c)} style={chip(c, m.color === c, COLORES[c])}>{c}</button>)}
                      </div>

                      {m.criterios?.length > 0 && (
                        <details style={{ marginBottom: '10px' }}>
                          <summary style={{ fontSize: '11px', color: '#6b7280', cursor: 'pointer' }}>Criterios del protocolo (referencia)</summary>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                            {['ROJO', 'AMARILLO', 'VERDE'].map(col => {
                              const cr = m.criterios.find((x: any) => x.color === col); if (!cr) return null; const c = COLORES[col];
                              return <div key={col} style={{ display: 'flex', gap: '8px', fontSize: '11px', color: '#374151' }}><span style={{ background: c.bg, color: c.tx, fontWeight: 600, padding: '1px 8px', borderRadius: '20px', flexShrink: 0, height: 'fit-content' }}>{col}</span><span>{cr.criterio}</span></div>;
                            })}
                          </div>
                        </details>
                      )}

                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#0a2540', marginBottom: '6px' }}>Preguntas — marcá cuáles deciden el color</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {m.preguntas.map((p: any) => {
                          const ac = COLORES[p.color_alarma] ?? COLORES.ROJO;
                          return (
                            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', padding: '6px 0', borderBottom: '0.5px solid #f7f7f7' }}>
                              <label style={{ display: 'flex', gap: '6px', alignItems: 'center', flex: 1, minWidth: '200px', fontSize: '12px', color: '#374151', cursor: 'pointer' }}>
                                <input type="checkbox" disabled={soloLectura} checked={p.es_bandera} onChange={e => patchPregunta(m.id, p, { es_bandera: e.target.checked, ...(e.target.checked ? { resp_alarma: p.resp_alarma || 'SI' } : {}) })} />
                                {p.es_bandera && <span style={{ color: ac.hex }}>⚠</span>} {p.texto}
                              </label>
                              {p.es_bandera && (
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                  <span style={{ fontSize: '10px', color: '#9ca3af' }}>peligro si</span>
                                  {['SI', 'NO'].map(r => { const on = p.resp_alarma === r; return <button key={r} onClick={() => patchPregunta(m.id, p, { resp_alarma: r })} style={{ padding: '3px 9px', fontSize: '11px', borderRadius: '6px', cursor: 'pointer', border: on ? '1px solid #0a2540' : '0.5px solid #e5e7eb', background: on ? '#0a2540' : 'white', color: on ? 'white' : '#9ca3af' }}>{r === 'SI' ? 'Sí' : 'No'}</button>; })}
                                  <span style={{ fontSize: '10px', color: '#9ca3af', marginLeft: '4px' }}>→</span>
                                  {['ROJO', 'AMARILLO'].map(c => <button key={c} onClick={() => patchPregunta(m.id, p, { color_alarma: c })} style={chip(c, p.color_alarma === c, COLORES[c])}>{c}</button>)}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
