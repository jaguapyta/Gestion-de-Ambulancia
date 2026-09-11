'use client';

import { API_URL } from '@/app/lib/api';
import { useEffect, useState } from 'react';
import ProtectedRoute from '../../components/ProtectedRoute';
import FichaPrehospitalaria from '../../components/FichaPrehospitalaria';

const EST: Record<number, { l: string; c: string; bg: string }> = {
  1: { l: 'Asignado / en camino', c: '#1d4ed8', bg: '#eff6ff' },
  2: { l: 'En el lugar', c: '#c2410c', bg: '#fff7ed' },
  3: { l: 'Trasladando', c: '#7c3aed', bg: '#f5f3ff' },
  4: { l: 'Finalizado', c: '#15803d', bg: '#f0fdf4' },
  5: { l: 'Cancelado', c: '#dc2626', bg: '#fef2f2' },
};
const fmt = (iso: string) => iso ? new Date(iso).toLocaleString('es-PY', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

export default function ServiciosPage() {
  const [rol, setRol] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [tab, setTab] = useState<'asignados' | 'historial'>('asignados');
  const [sel, setSel] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const [msg, setMsg] = useState('');
  const [fichas, setFichas] = useState<any[]>([]);
  const [fichaId, setFichaId] = useState<number | null>(null);

  const token = () => localStorage.getItem('token') ?? '';
  const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });
  const esParamedico = rol === 'PARAMEDICO' || rol === 'ADMINISTRADOR';

  const cargar = () => {
    setCargando(true);
    fetch(`${API_URL}/api/servicios/mios`, { headers: headers() })
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setItems(d); }).catch(() => { }).finally(() => setCargando(false));
  };
  useEffect(() => {
    try { setRol(JSON.parse(localStorage.getItem('usuario') ?? '{}').rol ?? ''); } catch { }
    cargar();
    const open = new URLSearchParams(window.location.search).get('open');
    if (open) abrir(Number(open));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarFichas = async (solId: number) => {
    if (!esParamedico) return;
    const r = await fetch(`${API_URL}/api/fichas/servicio/${solId}`, { headers: headers() });
    if (r.ok) { const d = await r.json(); setFichas(Array.isArray(d.fichas) ? d.fichas : []); }
  };

  const abrir = async (id: number) => {
    const r = await fetch(`${API_URL}/api/servicios/${id}`, { headers: headers() });
    if (r.ok) { const s = await r.json(); setSel(s); cargarFichas(s.solicitud?.id); } else setMsg('No se pudo abrir el servicio');
  };
  const avanzar = async (nuevo: number) => {
    if (!sel) return;
    const r = await fetch(`${API_URL}/api/servicios/${sel.id}/estado`, { method: 'PATCH', headers: headers(), body: JSON.stringify({ estado_despacho_id: nuevo }) });
    const d = await r.json();
    if (r.ok) { await abrir(sel.id); cargar(); } else setMsg(d.error || 'No se pudo cambiar el estado');
  };
  const nuevaFicha = async () => {
    if (!sel) return;
    const r = await fetch(`${API_URL}/api/fichas/servicio/${sel.solicitud?.id}`, { method: 'POST', headers: headers() });
    const d = await r.json();
    if (r.ok) { setFichaId(d.id); } else setMsg(d.error || 'No se pudo crear la ficha');
  };

  const activos = items.filter(x => x.estado_despacho_id <= 3);
  const historial = items;
  const lista = tab === 'asignados' ? activos : historial;

  const card = { background: 'white', border: '0.5px solid #e5e7eb', borderRadius: '10px', padding: '12px 14px' } as const;
  const chip = (bg: string, c: string): React.CSSProperties => ({ background: bg, color: c, fontSize: '11px', fontWeight: 500, padding: '2px 9px', borderRadius: '20px' });

  const datosServicio = (d: any) => {
    const s = d.solicitud; if (!s) return null;
    const mot = s.solicitud_emergencia?.motivo_consulta;
    const resp = s.emergencia_respuesta ?? [];
    const pl = s.prioridad_log ?? []; const res = pl[pl.length - 1];
    const t = s.solicitud_traslado;
    const rgm = d.rol_guardia_movil;
    return (
      <div style={{ fontSize: '13px', color: '#374151', lineHeight: 1.7 }}>
        {rgm && <div style={{ background: '#f0f4f8', borderRadius: '8px', padding: '8px 10px', marginBottom: '8px' }}>
          <div><b>🚑 Móvil:</b> {rgm.movil?.cod_movil} · {rgm.tipo_soporte?.nombre}</div>
          <div><b>Tripulación:</b> {(rgm.tripulacion ?? []).map((tr: any) => `${tr.usuario?.persona?.primer_nombre ?? ''} ${tr.usuario?.persona?.primer_apellido ?? ''} (${tr.funcion})`).join(' · ') || '—'}</div>
        </div>}
        <div><b>Tipo:</b> {s.tipo_solicitud?.nombre}{mot ? ` · ${mot.nombre}${mot.codigo_radial ? ` (radial ${mot.codigo_radial})` : ''}` : (s.tipo_servicio ? ` · ${s.tipo_servicio.codigo}` : '')}</div>
        {res && <div><b>Prioridad:</b> {res.prioridad_nueva} (sugerida {res.prioridad_antes} · {res.origen})</div>}
        <div><b>Canal:</b> {s.canal_ingreso?.nombre ?? '—'}</div>
        <div><b>Contacto (denunciante):</b> {s.denunciante_nombre ?? '—'} · {s.denunciante_telefono ?? '—'}</div>
        <div><b>Dirección:</b> {[s.direccion, s.barrio, s.ciudad].filter(Boolean).join(', ') || '—'}</div>
        {s.solicitud_ref_cama && <div><b>Centro solicitante:</b> {s.solicitud_ref_cama.centro_solicitante}{s.solicitud_ref_cama.profesional_nombre ? ` · ${s.solicitud_ref_cama.profesional_nombre}` : ''}</div>}
        {t && <div><b>Ruta:</b> {t.origen ?? '—'} → {t.destino ?? '—'}{t.receptor_nombre ? ` · recibe ${t.receptor_nombre}${t.receptor_telefono ? ` (${t.receptor_telefono})` : ''}` : ''}{t.estudio_procedimiento ? ` · ${t.estudio_procedimiento}` : ''}</div>}
        <div><b>Paciente:</b> {s.es_nn ? 'N/N' : `${s.paciente_nombre ?? ''} ${s.paciente_apellido ?? ''}`.trim() || '—'} {s.paciente_documento ? `· CI ${s.paciente_documento}` : ''} {s.paciente_edad ? `· ${s.paciente_edad} ${s.paciente_edad_unidad ?? ''}` : ''} {s.paciente_sexo ? `· ${s.paciente_sexo}` : ''}</div>
        {s.solicitud_emergencia?.relato && <div><b>Relato:</b> {s.solicitud_emergencia.relato}</div>}
        {s.observacion && <div><b>Obs.:</b> {s.observacion}</div>}
        {mot?.nota_seguridad && <div style={{ background: '#fff7ed', border: '0.5px solid #fed7aa', borderRadius: '8px', padding: '8px 10px', marginTop: '8px', color: '#7c2d12', fontSize: '12px' }}><b>🛡️ Seguridad:</b> {mot.nota_seguridad}</div>}
        {resp.length > 0 && (
          <div style={{ marginTop: '8px' }}>
            <div style={{ fontWeight: 600, color: '#0a2540' }}>Respuestas de recepción</div>
            {resp.map((r: any) => <div key={r.id} style={{ fontSize: '12px', color: '#6b7280' }}>{r.motivo_pregunta?.texto} → <b>{r.respuesta === 'NO_SABE' ? 'No sé' : r.respuesta === 'SI' ? 'Sí' : r.respuesta === 'NO' ? 'No' : r.respuesta}</b></div>)}
          </div>
        )}
      </div>
    );
  };

  return (
    <ProtectedRoute rolesPermitidos={['ADMINISTRADOR', 'PARAMEDICO', 'CONDUCTOR']}>
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 500, color: '#0a2540', margin: 0 }}>Mis servicios</h1>
        <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>Servicios asignados a tu tripulación. Editable hasta 24 h de la asignación.</p>

        {msg && <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', margin: '10px 0' }}>{msg}</div>}

        <div style={{ display: 'flex', gap: '8px', margin: '16px 0' }}>
          {(['asignados', 'historial'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '7px 16px', borderRadius: '8px', border: tab === t ? '0.5px solid #0a2540' : '0.5px solid #e5e7eb', background: tab === t ? '#0a2540' : 'white', color: tab === t ? 'white' : '#6b7280', cursor: 'pointer', fontSize: '13px' }}>{t === 'asignados' ? `Asignados (${activos.length})` : `Historial (${historial.length})`}</button>
          ))}
        </div>

        {cargando ? <p style={{ color: '#9ca3af', fontSize: '13px' }}>Cargando…</p> : lista.length === 0 ? <p style={{ color: '#9ca3af', fontSize: '13px' }}>Sin servicios.</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {lista.map(d => {
              const s = d.solicitud; const e = EST[d.estado_despacho_id] ?? EST[1]; const mot = s?.solicitud_emergencia?.motivo_consulta;
              return (
                <div key={d.id} onClick={() => abrir(d.id)} style={{ ...card, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: '#0a2540' }}>Servicio #{s?.id} · {d.rol_guardia_movil?.movil?.cod_movil ?? ''} {mot ? `· ${mot.nombre}` : `· ${s?.tipo_solicitud?.nombre ?? ''}`}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>{[s?.direccion, s?.barrio].filter(Boolean).join(', ') || '—'} · {fmt(d.hora_despacho)}</div>
                  </div>
                  <span style={chip(e.bg, e.c)}>{e.l}</span>
                  {!d.editable && <span style={chip('#f1f5f9', '#64748b')}>Cerrado a edición</span>}
                </div>
              );
            })}
          </div>
        )}

        {sel && (() => {
          const e = EST[sel.estado_despacho_id] ?? EST[1];
          return (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 300, padding: '24px', overflowY: 'auto' }}>
              <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '600px', maxWidth: '95vw', boxShadow: '0 8px 32px rgba(0,0,0,.15)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#0a2540', margin: 0 }}>Servicio #{sel.solicitud?.id}</h2>
                  <span style={chip(e.bg, e.c)}>{e.l}</span>
                </div>

                <div style={{ background: '#f8f9fb', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>{datosServicio(sel)}</div>

                {sel.editable ? (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>Cambiar estado</div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {sel.estado_despacho_id === 1 && <button onClick={() => avanzar(2)} style={btn}>Llegué (en el lugar)</button>}
                      {sel.estado_despacho_id === 2 && <button onClick={() => avanzar(3)} style={btn}>Trasladando</button>}
                      {sel.estado_despacho_id === 3 && <button onClick={() => avanzar(4)} style={{ ...btn, background: '#15803d', color: 'white', border: 'none' }}>Finalizar</button>}
                      {sel.estado_despacho_id <= 3 && <button onClick={() => avanzar(5)} style={{ ...btn, color: '#b91c1c' }}>Cancelar</button>}
                    </div>
                  </div>
                ) : <p style={{ fontSize: '12px', color: '#c2410c' }}>Pasaron 24 h de la asignación: el servicio quedó en solo lectura.</p>}

                {esParamedico && (
                  <div style={{ border: '0.5px dashed #cbd5e1', borderRadius: '10px', padding: '14px', marginBottom: '12px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#0a2540', marginBottom: '6px' }}>🩺 Fichas prehospitalarias {fichas.length ? `(${fichas.length})` : ''}</div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '8px' }}>Una ficha por paciente. En incidentes con varias víctimas, agregá una ficha por cada una.</div>
                    {fichas.length === 0 && <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>Todavía no hay fichas para este servicio.</div>}
                    {fichas.map((f: any) => (
                      <div key={f.id} onClick={() => setFichaId(f.id)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', border: '0.5px solid #e5e7eb', borderRadius: '8px', marginBottom: '6px', cursor: 'pointer' }}>
                        <span style={{ fontSize: '13px', color: '#0a2540' }}><b>Víctima {f.nro_victima}</b> · {f.nombre}</span>
                        <span style={chip(f.cerrada ? '#f0fdf4' : '#fff7ed', f.cerrada ? '#15803d' : '#c2410c')}>{f.cerrada ? 'Cerrada' : 'En proceso'}</span>
                      </div>
                    ))}
                    <button onClick={nuevaFicha} style={{ marginTop: '4px', padding: '8px 16px', borderRadius: '7px', border: 'none', background: '#0a2540', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
                      ➕ Nueva ficha / víctima
                    </button>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px', borderTop: '0.5px solid #f0f0f0', paddingTop: '12px' }}>
                  <button onClick={() => { setSel(null); setFichas([]); }} style={{ padding: '8px 18px', borderRadius: '7px', border: '0.5px solid #e5e7eb', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#6b7280' }}>Cerrar</button>
                </div>
              </div>
            </div>
          );
        })()}

        {fichaId && (
          <FichaPrehospitalaria
            fichaId={fichaId}
            onCerrar={() => setFichaId(null)}
            onGuardado={() => { setFichaId(null); if (sel?.solicitud?.id) cargarFichas(sel.solicitud.id); cargar(); }}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}

const btn: React.CSSProperties = { padding: '7px 12px', borderRadius: '7px', border: '0.5px solid #e5e7eb', background: 'white', cursor: 'pointer', fontSize: '12px', color: '#0a2540' };