'use client';

import { API_URL } from '@/app/lib/api';
import { useEffect, useState } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';
import { esSoloLectura } from '@/lib/permisos';

const REG = ['ADMINISTRADOR', 'COORDINADOR_REGULACION', 'SUPERVISOR_GUARDIA', 'MEDICO_REGULADOR', 'DIRECCION'];

const estadoColor = (n: string) => {
  if (n === 'PENDIENTE') return { bg: '#fff7ed', color: '#c2410c' };
  if (n === 'RESUELTO') return { bg: '#eff6ff', color: '#1d4ed8' };
  if (n === 'CERRADA') return { bg: '#f0fdf4', color: '#15803d' };
  return { bg: '#f1f5f9', color: '#64748b' };
};
const fmt = (iso: string) => new Date(iso).toLocaleString('es-PY', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export default function RegulacionPage() {
  const [casos, setCasos] = useState<any[]>([]);
  const [cat, setCat] = useState<any>({ tipos_paciente: [], condiciones_cierre: [] });
  const [cargando, setCargando] = useState(true);
  const [tiposSel, setTiposSel] = useState<number[]>([]);
  const [q, setQ] = useState('');
  const [verCerrados, setVerCerrados] = useState(false);

  const [caso, setCaso] = useState<any>(null);
  const [ll, setLl] = useState({ hospital_unidad: '', medico_contactado: '', telefono: '', respuesta: '' });
  const [g, setG] = useState({ hospital_destino: '', receptor_nombre: '', receptor_telefono: '', observaciones: '', quien_traslada: '', contrarreferencia: false, enviado_despacho: false });
  const [cierre, setCierre] = useState({ condicion_cierre_id: '', motivo_cierre: '' });
  const [mostrarResolver, setMostrarResolver] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState('');
  const [soloLectura, setSoloLectura] = useState(false);
  useEffect(() => { try { setSoloLectura(esSoloLectura(JSON.parse(localStorage.getItem('usuario') || '{}').rol)); } catch {} }, []);

  const token = () => localStorage.getItem('token') ?? '';
  const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

  useEffect(() => {
    fetch(`${API_URL}/api/regulacion/camas/catalogos`, { headers: headers() }).then(r => r.json()).then(setCat).catch(() => { });
  }, []);

  const cargar = () => {
    setCargando(true);
    const p = new URLSearchParams();
    if (verCerrados) p.set('cerrados', '1');
    if (tiposSel.length) p.set('tipos', tiposSel.join(','));
    if (q) p.set('q', q);
    fetch(`${API_URL}/api/regulacion/camas?${p.toString()}`, { headers: headers() })
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setCasos(d); }).catch(() => { }).finally(() => setCargando(false));
  };
  useEffect(() => { const t = setTimeout(cargar, 250); return () => clearTimeout(t); }, [tiposSel, q, verCerrados]);

  const toggleTipo = (id: number) => setTiposSel(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const abrir = async (id: number) => {
    setMsg(''); setMostrarResolver(false);
    setLl({ hospital_unidad: '', medico_contactado: '', telefono: '', respuesta: '' });
    const res = await fetch(`${API_URL}/api/regulacion/camas/${id}`, { headers: headers() });
    if (!res.ok) return;
    const d = await res.json();
    setCaso(d);
    const r = d.regulacion_cama;
    setG({ hospital_destino: r?.hospital_destino ?? '', receptor_nombre: r?.receptor_nombre ?? '', receptor_telefono: r?.receptor_telefono ?? '', observaciones: r?.observaciones ?? '', quien_traslada: r?.quien_traslada ?? '', contrarreferencia: !!r?.contrarreferencia, enviado_despacho: !!r?.enviado_despacho });
    setCierre({ condicion_cierre_id: '', motivo_cierre: '' });
  };

  const guardarLlamada = async () => {
    if (soloLectura) return;
    if (!caso || !ll.hospital_unidad.trim()) { setMsg('Indicá el hospital / unidad al que llamaste.'); return; }
    setGuardando(true); setMsg('');
    try {
      const res = await fetch(`${API_URL}/api/regulacion/camas/${caso.id}/llamada`, { method: 'POST', headers: headers(), body: JSON.stringify(ll) });
      if (res.ok) { setLl({ hospital_unidad: '', medico_contactado: '', telefono: '', respuesta: '' }); setMsg('Llamada registrada'); await abrir(caso.id); }
    } catch { } finally { setGuardando(false); }
  };

  const guardarGestion = async (extra?: Partial<typeof g>) => {
    if (soloLectura) return false;
    if (!caso) return true;
    const body = { ...g, ...extra };
    const res = await fetch(`${API_URL}/api/regulacion/camas/${caso.id}/gestion`, { method: 'PUT', headers: headers(), body: JSON.stringify(body) });
    return res.ok;
  };

  const enviarDespacho = async () => {
    setGuardando(true); setMsg('');
    try { if (await guardarGestion({ enviado_despacho: true })) { setG({ ...g, enviado_despacho: true }); await abrir(caso.id); } }
    catch { } finally { setGuardando(false); }
  };

  const confirmarResuelto = async () => {
    if (soloLectura) return;
    if (!g.hospital_destino.trim()) { setMsg('Cargá dónde se consiguió la cama.'); return; }
    setGuardando(true); setMsg('');
    try {
      if (!(await guardarGestion())) return;
      const res = await fetch(`${API_URL}/api/regulacion/camas/${caso.id}/estado`, { method: 'PATCH', headers: headers(), body: JSON.stringify({ estado: 'RESUELTO' }) });
      if (res.ok) { setMostrarResolver(false); await abrir(caso.id); cargar(); }
    } catch { } finally { setGuardando(false); }
  };

  const cerrar = async () => {
    if (soloLectura) return;
    if (!cierre.condicion_cierre_id) { setMsg('Elegí el motivo de cierre.'); return; }
    setGuardando(true); setMsg('');
    try {
      await guardarGestion();
      const res = await fetch(`${API_URL}/api/regulacion/camas/${caso.id}/estado`, { method: 'PATCH', headers: headers(), body: JSON.stringify({ estado: 'CERRADA', ...cierre }) });
      if (res.ok) { setCaso(null); cargar(); }
    } catch { } finally { setGuardando(false); }
  };

  const input = { width: '100%', padding: '9px 12px', borderRadius: '7px', border: '0.5px solid #e5e7eb', fontSize: '13px', boxSizing: 'border-box' as const };
  const label = { fontSize: '12px', color: '#6b7280', display: 'block' as const, marginBottom: '6px' };
  const seccion = { fontSize: '13px', fontWeight: 600, color: '#0a2540', margin: '18px 0 10px', paddingBottom: '6px', borderBottom: '0.5px solid #f0f0f0' } as const;
  const chk = (on: boolean): React.CSSProperties => ({ padding: '7px 14px', borderRadius: '7px', border: `0.5px solid ${on ? '#0a2540' : '#e5e7eb'}`, cursor: 'pointer', fontSize: '12px', fontWeight: 500, background: on ? '#0a2540' : 'white', color: on ? 'white' : '#6b7280' });
  const fs = (sv: any) => sv ? `PA ${sv.presion_arterial ?? '-'} · FC ${sv.frecuencia_cardiaca ?? '-'} · FR ${sv.frecuencia_respiratoria ?? '-'} · T ${sv.temperatura ?? '-'} · Glasgow ${sv.glasgow ?? '-'} · Sat ${sv.saturacion ?? '-'}` : '—';

  return (
    <ProtectedRoute rolesPermitidos={REG}>
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 500, color: '#0a2540', margin: 0 }}>Regulación médica — Camas</h1>
        <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>Referencia y contrarreferencia · gestión de pedidos de cama</p>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', margin: '18px 0 16px' }}>
          <input type="text" placeholder="Buscar por cédula, nombre o centro..." value={q} onChange={e => setQ(e.target.value)} style={{ ...input, flex: 1, minWidth: '240px', padding: '10px 14px' }} />
          {cat.tipos_paciente.map((t: any) => <button key={t.id} onClick={() => toggleTipo(t.id)} style={chk(tiposSel.includes(t.id))}>{t.nombre}</button>)}
          <button onClick={() => setVerCerrados(v => !v)} style={{ ...chk(verCerrados), borderColor: verCerrados ? '#15803d' : '#e5e7eb', background: verCerrados ? '#15803d' : 'white' }}>Ver cerrados</button>
        </div>

        <div style={{ background: 'white', borderRadius: '10px', border: '0.5px solid #e5e7eb', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '820px' }}>
            <thead><tr style={{ background: '#f8f9fb', borderBottom: '0.5px solid #e5e7eb' }}>
              {['N°', 'Ingreso', 'Paciente', 'CI', 'Tipo', 'Centro solicitante', 'Estado', ''].map(c => <th key={c} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', color: '#6b7280', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{c}</th>)}
            </tr></thead>
            <tbody>
              {cargando ? <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Cargando…</td></tr>
                : casos.length === 0 ? <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Sin casos {verCerrados ? 'cerrados' : 'pendientes'}</td></tr>
                : casos.map(c => { const ec = estadoColor(c.estado_solicitud.nombre); return (
                  <tr key={c.id} style={{ borderBottom: '0.5px solid #f3f4f6' }}>
                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: '#0a2540' }}>#{c.id}{c._count?.ref_cama_reiteracion ? <span style={{ marginLeft: '6px', background: '#eff6ff', color: '#1d4ed8', padding: '1px 7px', borderRadius: '20px', fontSize: '10px', fontWeight: 600 }}>🔁 {c._count.ref_cama_reiteracion}</span> : null}</td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap' }}>{fmt(c.created_at)}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#0a2540' }}>{c.paciente_nombre} {c.paciente_apellido}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>{c.paciente_documento ?? '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: '#6b7280' }}>{c.ref_cama_clinica?.tipo_paciente?.nombre ?? '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: '#6b7280' }}>{c.solicitud_ref_cama?.centro_solicitante ?? '—'}</td>
                    <td style={{ padding: '12px 16px' }}><span style={{ background: ec.bg, color: ec.color, padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 500 }}>{c.estado_solicitud.nombre}</span></td>
                    <td style={{ padding: '12px 16px' }}><button onClick={() => abrir(c.id)} style={{ background: '#0a2540', border: 'none', color: 'white', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}>Gestionar</button></td>
                  </tr>
                ); })}
            </tbody>
          </table>
        </div>

        {/* Modal de gestión */}
        {caso && (() => {
          const clin = caso.ref_cama_clinica ?? {};
          const reits = caso.ref_cama_reiteracion ?? [];
          const svN = caso.signos_vitales ?? [];
          const llamadas = caso.regulacion_llamada ?? [];
          const nombre = caso.estado_solicitud.nombre;
          const cerrado = nombre === 'CERRADA';
          const resuelto = nombre === 'RESUELTO';
          return (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 300, padding: '24px', overflowY: 'auto' }}>
              <div style={{ background: 'white', borderRadius: '12px', padding: '28px', width: '680px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#0a2540', margin: 0 }}>Pedido de cama #{caso.id}</h2>
                  <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 500, ...estadoColor(nombre) }}>{nombre}</span>
                </div>

                {/* Datos de recepción */}
                <div style={{ background: '#f8f9fb', borderRadius: '8px', padding: '14px', fontSize: '13px', color: '#374151', lineHeight: 1.7 }}>
                  <div><strong>Paciente:</strong> {caso.paciente_nombre} {caso.paciente_apellido} · CI {caso.paciente_documento ?? '—'} · {caso.paciente_edad ?? '—'} {caso.paciente_edad_unidad ?? ''} · {clin.tipo_paciente?.nombre ?? '—'}</div>
                  <div><strong>Solicitante:</strong> {caso.solicitud_ref_cama?.centro_solicitante} · {caso.solicitud_ref_cama?.profesional_nombre} ({caso.solicitud_ref_cama?.especialidad}) · Tel {caso.solicitud_ref_cama?.telefono_contacto}</div>
                </div>

                {/* Cuestionarios */}
                <div style={seccion}>Cuestionarios {reits.length ? `· 1 inicial + ${reits.length} reiteración(es)` : ''}</div>
                <div style={{ borderLeft: '3px solid #c2410c', paddingLeft: '12px', marginBottom: '10px', fontSize: '12px', color: '#6b7280' }}>
                  <div style={{ fontWeight: 600, color: '#0a2540' }}>Pedido inicial</div>
                  <div>Dx: {clin.diagnostico ?? '—'} · {clin.tipo_requerimiento_cama?.nombre ?? '—'} · {clin.condicion_paciente?.nombre ?? '—'}{clin.en_uti ? ' · UTI' : ''}</div>
                  {clin.antecedentes ? <div>Antec.: {clin.antecedentes}</div> : null}
                  <div>Signos: {fs(svN[svN.length - 1])}</div>
                  {caso.inotripicos?.length ? <div>Inotrópicos: {caso.inotripicos.map((x: any) => x.tipo_inotripico.nombre + (x.dosis ? ` (${x.dosis})` : '')).join(', ')}</div> : null}
                </div>
                {reits.map((r: any) => { const sv = (r.signos_vitales ?? [])[(r.signos_vitales ?? []).length - 1]; return (
                  <div key={r.id} style={{ borderLeft: '3px solid #1d4ed8', paddingLeft: '12px', marginBottom: '10px', fontSize: '12px', color: '#6b7280' }}>
                    <div style={{ fontWeight: 600, color: '#0a2540' }}>Reiteración #{r.nro_reiteracion} <span style={{ color: '#9ca3af', fontWeight: 400 }}>{fmt(r.created_at)}</span></div>
                    <div>{r.tipo_requerimiento_cama?.nombre ?? '—'} · {r.condicion_paciente?.nombre ?? '—'}{r.en_uti ? ' · UTI' : ''}{r.tratamiento ? ` · Trat: ${r.tratamiento}` : ''}</div>
                    <div>Signos: {fs(sv)}</div>
                  </div>
                ); })}

                {msg && <div style={{ background: '#eff6ff', color: '#1e40af', padding: '8px 12px', borderRadius: '7px', fontSize: '12px', margin: '12px 0' }}>{msg}</div>}

                {/* GESTIÓN: registro de llamadas */}
                {!cerrado && !soloLectura && <>
                  <div style={seccion}>Gestión — llamadas realizadas</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div><label style={label}>Hospital / unidad donde se llamó</label><input value={ll.hospital_unidad} onChange={e => setLl({ ...ll, hospital_unidad: e.target.value })} placeholder="Ej: Hospital Nacional - UTI" style={input} /></div>
                    <div><label style={label}>Médico con quien se comunicó</label><input value={ll.medico_contactado} onChange={e => setLl({ ...ll, medico_contactado: e.target.value })} placeholder="Nombre del médico" style={input} /></div>
                    <div><label style={label}>Teléfono</label><input value={ll.telefono} onChange={e => setLl({ ...ll, telefono: e.target.value.replace(/\D/g, '').slice(0, 11) })} placeholder="0000000000" style={input} /></div>
                    <div><label style={label}>Respuesta</label><input value={ll.respuesta} onChange={e => setLl({ ...ll, respuesta: e.target.value })} placeholder="Ej: no hay cama / acepta / rechaza" style={input} /></div>
                  </div>
                  <div style={{ marginTop: '10px' }}>
                    <button onClick={guardarLlamada} disabled={guardando} style={{ padding: '9px 16px', borderRadius: '7px', border: 'none', background: '#0a2540', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>Guardar gestión</button>
                  </div>
                </>}

                {/* Historial de llamadas */}
                {llamadas.length > 0 && (
                  <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {llamadas.map((x: any) => (
                      <div key={x.id} style={{ background: '#fbfbfc', border: '0.5px solid #f0f0f0', borderRadius: '7px', padding: '8px 12px', fontSize: '12px', color: '#374151' }}>
                        <span style={{ fontWeight: 600, color: '#0a2540' }}>{x.hospital_unidad}</span>
                        {x.medico_contactado ? ` · ${x.medico_contactado}` : ''}{x.telefono ? ` · ${x.telefono}` : ''}
                        {x.respuesta ? <span style={{ color: '#6b7280' }}> — {x.respuesta}</span> : ''}
                        <span style={{ float: 'right', color: '#9ca3af' }}>{fmt(x.created_at)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Botón marcar resuelto → abre formulario de cama conseguida */}
                {!soloLectura && nombre === 'PENDIENTE' && !mostrarResolver && (
                  <div style={{ marginTop: '18px' }}>
                    <button onClick={() => { setMsg(''); setMostrarResolver(true); }} style={{ padding: '10px 18px', borderRadius: '7px', border: 'none', background: '#1d4ed8', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>Marcar RESUELTO (cama conseguida)</button>
                  </div>
                )}

                {/* Formulario de resolución (cama conseguida + quién traslada) */}
                {!cerrado && !soloLectura && (mostrarResolver || resuelto) && (
                  <div style={{ marginTop: '16px', background: '#eff6ff', border: '0.5px solid #bfdbfe', borderRadius: '10px', padding: '16px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#1d4ed8', marginBottom: '12px' }}>Cama conseguida</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div><label style={label}>¿Dónde se consiguió la cama?</label><input value={g.hospital_destino} onChange={e => setG({ ...g, hospital_destino: e.target.value })} placeholder="Hospital / unidad" style={input} /></div>
                      <div><label style={label}>¿Quién recibe?</label><input value={g.receptor_nombre} onChange={e => setG({ ...g, receptor_nombre: e.target.value })} placeholder="Médico / servicio receptor" style={input} /></div>
                      <div><label style={label}>Teléfono de quien recibe</label><input value={g.receptor_telefono} onChange={e => setG({ ...g, receptor_telefono: e.target.value.replace(/\D/g, '').slice(0, 11) })} placeholder="0000000000" style={input} /></div>
                      <div style={{ gridColumn: '1 / -1' }}><label style={label}>Observaciones y datos de valor</label><textarea value={g.observaciones} onChange={e => setG({ ...g, observaciones: e.target.value })} rows={2} placeholder="Ej: cama 12, pieza 4, traer kit de parto…" style={{ ...input, resize: 'vertical' }} /></div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginTop: '12px' }}>
                      <span style={{ fontSize: '13px', color: '#0a2540', fontWeight: 500 }}>¿Quién traslada?</span>
                      <button onClick={() => setG({ ...g, quien_traslada: 'REFERENTE' })} style={chk(g.quien_traslada === 'REFERENTE')}>Hospital que refiere</button>
                      <button onClick={() => setG({ ...g, quien_traslada: 'SEME' })} style={chk(g.quien_traslada === 'SEME')}>SEME</button>
                      {g.quien_traslada === 'SEME' && <button onClick={enviarDespacho} disabled={guardando} style={{ padding: '7px 14px', borderRadius: '7px', border: 'none', background: g.enviado_despacho ? '#15803d' : '#1d4ed8', color: 'white', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}>{g.enviado_despacho ? '✓ Enviado a despacho' : '🔗 Enviar a despacho'}</button>}
                    </div>
                    <label style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer', fontSize: '13px', color: '#374151', marginTop: '10px' }}>
                      <input type="checkbox" checked={g.contrarreferencia} onChange={e => setG({ ...g, contrarreferencia: e.target.checked })} /> Contrarreferencia enviada (avisado al hospital que refirió)
                    </label>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
                      {mostrarResolver && nombre === 'PENDIENTE' && <>
                        <button onClick={confirmarResuelto} disabled={guardando} style={{ padding: '9px 16px', borderRadius: '7px', border: 'none', background: '#1d4ed8', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>Confirmar resuelto</button>
                        <button onClick={() => setMostrarResolver(false)} style={{ padding: '9px 16px', borderRadius: '7px', border: '0.5px solid #e5e7eb', background: 'white', cursor: 'pointer', fontSize: '13px', color: '#6b7280' }}>Cancelar</button>
                      </>}
                      {resuelto && <button onClick={() => guardarGestion().then(() => { setMsg('Datos actualizados'); abrir(caso.id); })} disabled={guardando} style={{ padding: '9px 16px', borderRadius: '7px', border: '0.5px solid #e5e7eb', background: 'white', cursor: 'pointer', fontSize: '13px', color: '#0a2540' }}>Actualizar datos</button>}
                    </div>
                  </div>
                )}

                {/* Cierre */}
                {!cerrado && !soloLectura && <>
                  <div style={seccion}>Cerrar caso</div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'end', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '180px' }}><label style={label}>Motivo de cierre</label>
                      <select value={cierre.condicion_cierre_id} onChange={e => setCierre({ ...cierre, condicion_cierre_id: e.target.value })} style={input}>
                        <option value="">—</option>{cat.condiciones_cierre.map((c: any) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                      </select>
                    </div>
                    <div style={{ flex: 2, minWidth: '200px' }}><label style={label}>Detalle (opcional)</label><input value={cierre.motivo_cierre} onChange={e => setCierre({ ...cierre, motivo_cierre: e.target.value })} placeholder="Ej: llegó a destino / óbito / derivado por otros medios" style={input} /></div>
                    <button onClick={cerrar} disabled={guardando} style={{ padding: '9px 16px', borderRadius: '7px', border: 'none', background: '#15803d', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap' }}>Cerrar caso</button>
                  </div>
                </>}

                {cerrado && caso.regulacion_cama && (
                  <div style={seccion}>Resolución
                    <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 400, marginTop: '6px', lineHeight: 1.7 }}>
                      <div>Cama en: {caso.regulacion_cama.hospital_destino ?? '—'} · Recibe: {caso.regulacion_cama.receptor_nombre ?? '—'}{caso.regulacion_cama.receptor_telefono ? ` (${caso.regulacion_cama.receptor_telefono})` : ''}</div>
                      <div>Traslada: {caso.regulacion_cama.quien_traslada ?? '—'} · Motivo de cierre: {caso.regulacion_cama.condicion_cierre?.nombre ?? '—'} {caso.regulacion_cama.motivo_cierre ? `· ${caso.regulacion_cama.motivo_cierre}` : ''}</div>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', borderTop: '0.5px solid #f0f0f0', paddingTop: '14px' }}>
                  <button onClick={() => setCaso(null)} style={{ padding: '9px 18px', borderRadius: '7px', border: '0.5px solid #e5e7eb', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#6b7280' }}>Cerrar</button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </ProtectedRoute>
  );
}