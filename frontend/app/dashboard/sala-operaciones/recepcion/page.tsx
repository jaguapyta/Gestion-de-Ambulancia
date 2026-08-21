'use client';

import { useEffect, useState } from 'react';
import ModalPedidoCama from '../../../components/ModalPedidoCama';
import ModalTraslado from '../../../components/ModalTraslado';

interface Cat { id: number; nombre?: string; descripcion?: string; codigo?: string; }
interface Catalogos { tipos_solicitud: Cat[]; tipos_servicio: Cat[]; canales: Cat[]; estados: Cat[]; }

interface Solicitud {
  id: number;
  denunciante_nombre: string | null;
  denunciante_telefono: string | null;
  direccion: string | null;
  ciudad: string | null;
  paciente_nombre: string | null;
  paciente_apellido: string | null;
  paciente_documento: string | null;
  paciente_edad: string | null;
  es_nn: boolean;
  observacion: string | null;
  created_at: string;
  tipo_solicitud: { nombre: string };
  tipo_servicio: { codigo: string; descripcion: string } | null;
  canal_ingreso: { nombre: string };
  solicitud_ref_cama: { centro_solicitante: string; profesional_nombre?: string; especialidad?: string } | null;
  estado_solicitud: { id: number; nombre: string };
  usuario: { persona: { primer_nombre: string; primer_apellido: string } };
  historial_solicitud?: any[];
}

const estadoColor = (nombre: string) => {
  if (['PENDIENTE'].includes(nombre)) return { bg: '#fff7ed', color: '#c2410c' };
  if (['FINALIZADA', 'CERRADA'].includes(nombre)) return { bg: '#f0fdf4', color: '#15803d' };
  if (['CANCELADA', 'FALSA_ALARMA', 'NO_CONFIRMADA'].includes(nombre)) return { bg: '#fef2f2', color: '#dc2626' };
  return { bg: '#eff6ff', color: '#1d4ed8' };
};

// Los tipos de pedido. Por ahora solo Camas está construido.
const TIPOS = [
  { key: 'emergencia', label: 'Emergencia / Urgencia', icon: '🚑', activo: false },
  { key: 'traslado', label: 'Traslado', icon: '🚐', activo: true },
  { key: 'camas', label: 'Solicitud de camas', icon: '🛏️', activo: true },
  { key: 'cobertura', label: 'Cobertura', icon: '🎪', activo: false },
  { key: 'dialisis', label: 'Diálisis', icon: '🩺', activo: false },
];

export default function RecepcionPage() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [catalogos, setCatalogos] = useState<Catalogos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [busqueda, setBusqueda] = useState('');

  const [modalTipo, setModalTipo] = useState(false);
  const [modalCamas, setModalCamas] = useState(false);
  const [modalTraslado, setModalTraslado] = useState(false);
  const [callTel, setCallTel] = useState('');
  const [callNombre, setCallNombre] = useState('');

  const [detalle, setDetalle] = useState<Solicitud | null>(null);
  const [histCamas, setHistCamas] = useState<any>(null);

  const token = () => localStorage.getItem('token') ?? '';
  const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

  const cargarCatalogos = () => {
    fetch('http://localhost:3001/api/solicitudes/catalogos', { headers: headers() })
      .then(r => r.json()).then(setCatalogos).catch(() => { });
  };

  const cargar = () => {
    setCargando(true);
    const p = new URLSearchParams();
    if (filtroEstado) p.set('estado_id', filtroEstado);
    if (filtroTipo) p.set('tipo_id', filtroTipo);
    if (busqueda) p.set('q', busqueda);
    fetch(`http://localhost:3001/api/solicitudes?${p.toString()}`, { headers: headers() })
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setSolicitudes(d); })
      .catch(() => { })
      .finally(() => setCargando(false));
  };

  useEffect(() => { cargarCatalogos(); }, []);
  useEffect(() => { const t = setTimeout(cargar, 250); return () => clearTimeout(t); }, [filtroEstado, filtroTipo, busqueda]);

  const elegirTipo = (key: string, activo: boolean) => {
    if (!activo || !callTel.trim()) return;
    setModalTipo(false);
    if (key === 'camas') setModalCamas(true);
    if (key === 'traslado') setModalTraslado(true);
  };

  const verDetalle = async (id: number) => {
    const res = await fetch(`http://localhost:3001/api/solicitudes/${id}`, { headers: headers() });
    if (!res.ok) return;
    const d = await res.json();
    setDetalle(d); setHistCamas(null);
    // Para pedidos de cama, traer toda la línea de tiempo del paciente (por cédula)
    if (String(d.tipo_solicitud?.nombre ?? '').includes('CAMA') && d.paciente_documento) {
      const rh = await fetch(`http://localhost:3001/api/camas/paciente/${encodeURIComponent(d.paciente_documento)}`, { headers: headers() });
      if (rh.ok) setHistCamas(await rh.json());
    }
  };

  const nombrePaciente = (s: Solicitud) =>
    s.es_nn ? 'N/N' : `${s.paciente_nombre ?? ''} ${s.paciente_apellido ?? ''}`.trim() || '—';
  const fmt = (iso: string) => new Date(iso).toLocaleString('es-PY', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  const input = { width: '100%', padding: '9px 12px', borderRadius: '7px', border: '0.5px solid #e5e7eb', fontSize: '13px', boxSizing: 'border-box' as const };
  const conteo = (nombres: string[]) => solicitudes.filter(s => nombres.includes(s.estado_solicitud.nombre)).length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 500, color: '#0a2540', margin: 0 }}>Recepción de solicitudes</h1>
          <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>Centro de Regulación · ingreso y seguimiento de pedidos</p>
        </div>
        <button onClick={() => { setCallTel(''); setCallNombre(''); setModalTipo(true); }}
          style={{ background: '#0a2540', color: 'white', border: 'none', padding: '9px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
          + Nueva solicitud
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Total', value: solicitudes.length, color: '#0a2540' },
          { label: 'Pendientes', value: conteo(['PENDIENTE']), color: '#c2410c' },
          { label: 'En proceso', value: conteo(['EN_PROCESO', 'DESPACHADA', 'EN_CAMINO', 'EN_ESCENA', 'EN_TRASLADO']), color: '#1d4ed8' },
          { label: 'Cerradas', value: conteo(['FINALIZADA', 'CERRADA']), color: '#15803d' },
        ].map(c => (
          <div key={c.label} style={{ background: 'white', borderRadius: '10px', padding: '16px', border: '0.5px solid #e5e7eb', borderTop: `3px solid ${c.color}` }}>
            <div style={{ fontSize: '24px', fontWeight: 500, color: c.color }}>{c.value}</div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{c.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <input type="text" placeholder="Buscar paciente, denunciante o dirección..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
          style={{ ...input, flex: 1, minWidth: '220px', padding: '10px 14px' }} />
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} style={{ ...input, width: 'auto' }}>
          <option value="">Todos los tipos</option>
          {catalogos?.tipos_solicitud.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
        </select>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={{ ...input, width: 'auto' }}>
          <option value="">Todos los estados</option>
          {catalogos?.estados.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
        </select>
      </div>

      <div style={{ background: 'white', borderRadius: '10px', border: '0.5px solid #e5e7eb', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
          <thead>
            <tr style={{ background: '#f8f9fb', borderBottom: '0.5px solid #e5e7eb' }}>
              {['N° Pedido', 'Ingreso', 'Tipo', 'Servicio', 'Origen', 'Canal', 'Paciente', 'Estado', 'Recepcionista', ''].map(col => (
                <th key={col} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', color: '#6b7280', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Cargando...</td></tr>
            ) : solicitudes.length === 0 ? (
              <tr><td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>No hay solicitudes</td></tr>
            ) : solicitudes.map((s) => {
              const ec = estadoColor(s.estado_solicitud.nombre);
              return (
                <tr key={s.id} style={{ borderBottom: '0.5px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: '#0a2540' }}>#{s.id}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280', whiteSpace: 'nowrap' }}>{fmt(s.created_at)}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 500, color: '#0a2540' }}>{s.tipo_solicitud.nombre}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>{s.tipo_servicio?.codigo ?? '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>{s.solicitud_ref_cama?.centro_solicitante ?? ([s.direccion, s.ciudad].filter(Boolean).join(', ') || '—')}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>{s.canal_ingreso.nombre}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#0a2540' }}>{nombrePaciente(s)}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ background: ec.bg, color: ec.color, padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 500 }}>{s.estado_solicitud.nombre}</span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>{s.usuario.persona.primer_nombre} {s.usuario.persona.primer_apellido}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <button onClick={() => verDetalle(s.id)} style={{ background: 'transparent', border: '0.5px solid #e5e7eb', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: '#0a2540' }}>Ver</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Selector de tipo de pedido */}
      {modalTipo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '28px', width: '520px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#0a2540', margin: '0 0 6px' }}>Nueva solicitud</h2>
            <p style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 16px' }}>Registrá quién llama y elegí el tipo de pedido.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div><label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '6px' }}>Teléfono *</label>
                <input value={callTel} onChange={e => setCallTel(e.target.value)} style={input} /></div>
              <div><label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '6px' }}>Nombre del solicitante</label>
                <input value={callNombre} onChange={e => setCallNombre(e.target.value)} style={input} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {TIPOS.map(t => {
                const habil = t.activo && !!callTel.trim();
                return (
                  <button key={t.key} onClick={() => elegirTipo(t.key, t.activo)} disabled={!habil}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderRadius: '10px',
                      border: '0.5px solid #e5e7eb', background: habil ? 'white' : '#f8f9fb',
                      cursor: habil ? 'pointer' : 'not-allowed', opacity: habil ? 1 : 0.55, textAlign: 'left',
                    }}>
                    <span style={{ fontSize: '26px' }}>{t.icon}</span>
                    <span>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: '#0a2540' }}>{t.label}</div>
                      <div style={{ fontSize: '11px', color: '#9ca3af' }}>{t.activo ? 'Disponible' : 'Próximamente'}</div>
                    </span>
                  </button>
                );
              })}
            </div>
            {!callTel.trim() && <div style={{ fontSize: '12px', color: '#c2410c', marginTop: '10px' }}>Ingresá el teléfono para elegir el tipo.</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '18px' }}>
              <button onClick={() => setModalTipo(false)} style={{ padding: '9px 18px', borderRadius: '7px', border: '0.5px solid #e5e7eb', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#6b7280' }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Formulario de camas */}
      {modalCamas && (
        <ModalPedidoCama telefono={callTel} nombre={callNombre} onCerrar={() => setModalCamas(false)} onGuardado={cargar} />
      )}

      {/* Formulario de traslado */}
      {modalTraslado && (
        <ModalTraslado telefono={callTel} nombre={callNombre} onCerrar={() => setModalTraslado(false)} onGuardado={cargar} />
      )}

      {/* Detalle + cambio de estado */}
      {detalle && catalogos && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '28px', width: '600px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#0a2540', margin: 0 }}>Solicitud #{detalle.id}</h2>
              <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 500, background: estadoColor(detalle.estado_solicitud.nombre).bg, color: estadoColor(detalle.estado_solicitud.nombre).color }}>{detalle.estado_solicitud.nombre}</span>
            </div>

            <div style={{ background: '#f8f9fb', borderRadius: '8px', padding: '14px', marginBottom: '16px', fontSize: '13px', color: '#374151', lineHeight: 1.7 }}>
              <div><strong>Tipo:</strong> {detalle.tipo_solicitud.nombre}{detalle.tipo_servicio ? ` · Servicio: ${detalle.tipo_servicio.codigo} — ${detalle.tipo_servicio.descripcion}` : ''}</div>
              <div><strong>Canal:</strong> {detalle.canal_ingreso.nombre}</div>
              {detalle.solicitud_ref_cama && (
                <div><strong>Centro solicitante:</strong> {detalle.solicitud_ref_cama.centro_solicitante}
                  {detalle.solicitud_ref_cama.profesional_nombre ? ` · ${detalle.solicitud_ref_cama.profesional_nombre}` : ''}
                  {detalle.solicitud_ref_cama.especialidad ? ` (${detalle.solicitud_ref_cama.especialidad})` : ''}</div>
              )}
              <div><strong>Contacto:</strong> {detalle.denunciante_nombre ?? '—'} · {detalle.denunciante_telefono ?? '—'}</div>
              <div><strong>Ubicación:</strong> {[detalle.direccion, detalle.ciudad].filter(Boolean).join(', ') || '—'}</div>
              <div><strong>Paciente:</strong> {nombrePaciente(detalle)} {detalle.paciente_edad ? `· ${detalle.paciente_edad}` : ''} {detalle.paciente_documento ? `· CI ${detalle.paciente_documento}` : ''}</div>
              {detalle.observacion && <div><strong>Obs.:</strong> {detalle.observacion}</div>}
            </div>

            {histCamas && histCamas.pedidos?.length > 0 && (
              <div style={{ border: '0.5px solid #e5e7eb', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#0a2540', marginBottom: '10px' }}>🛏️ Pedidos de cama de este paciente ({histCamas.pedidos.length})</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {histCamas.pedidos.map((p: any) => {
                    const tipo = p.solicitud_ref_cama?.tipo_pedido ?? '—';
                    const reit = p.ref_cama_reiteracion?.[0];
                    const clin = p.ref_cama_clinica;
                    const sv = p.signos_vitales?.[p.signos_vitales.length - 1];
                    return (
                      <div key={p.id} style={{ borderLeft: `3px solid ${tipo === 'NUEVO' ? '#c2410c' : '#1d4ed8'}`, paddingLeft: '12px' }}>
                        <div style={{ fontSize: '12px', color: '#0a2540' }}><strong>#{p.id} · {tipo}</strong> <span style={{ color: '#9ca3af' }}>{fmt(p.created_at)}</span></div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          {tipo === 'NUEVO'
                            ? <>Dx: {clin?.diagnostico ?? '—'} · Req: {clin?.tipo_requerimiento_cama?.nombre ?? '—'} · {clin?.condicion_paciente?.nombre ?? '—'}{clin?.en_uti ? ' · UTI' : ''}</>
                            : <>Req: {reit?.tipo_requerimiento_cama?.nombre ?? '—'} · {reit?.condicion_paciente?.nombre ?? '—'}{reit?.en_uti ? ' · UTI' : ''}</>}
                          {sv ? ` · Signos: PA ${sv.presion_arterial ?? '-'} FC ${sv.frecuencia_cardiaca ?? '-'} Sat ${sv.saturacion ?? '-'}` : ''}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}


            <div style={{ fontSize: '13px', fontWeight: 500, color: '#0a2540', marginBottom: '10px' }}>Historial</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {detalle.historial_solicitud?.map((h: any) => (
                <div key={h.id} style={{ display: 'flex', gap: '10px', fontSize: '12px', color: '#6b7280', borderLeft: '2px solid #e5e7eb', paddingLeft: '12px' }}>
                  <span style={{ color: '#9ca3af', whiteSpace: 'nowrap' }}>{fmt(h.created_at)}</span>
                  <span>
                    <strong style={{ color: '#0a2540' }}>{h.estado_solicitud_historial_solicitud_estado_nuevo_idToestado_solicitud?.nombre}</strong>
                    {h.observacion ? ` — ${h.observacion}` : ''} · {h.usuario?.persona?.primer_nombre} {h.usuario?.persona?.primer_apellido}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => { setDetalle(null); setHistCamas(null); }} style={{ padding: '9px 18px', borderRadius: '7px', border: '0.5px solid #e5e7eb', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#6b7280' }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
