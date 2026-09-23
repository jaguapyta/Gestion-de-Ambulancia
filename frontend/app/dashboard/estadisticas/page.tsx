'use client';

import { API_URL } from '@/app/lib/api';
import { useEffect, useState } from 'react';
import ProtectedRoute from '../../components/ProtectedRoute';
import { ACCESO } from '../../../lib/permisos';

const COLOR_PRIO: Record<string, string> = { ROJO: '#E24B4A', AMARILLO: '#EF9F27', VERDE: '#1D9E75', AZUL: '#378ADD' };
const n = (v: any) => Number(v ?? 0) || 0;

// Paneles disponibles (clave, título, y de dónde salen los datos)
const PANELES = [
  { key: 'serie', titulo: 'Servicios por día', src: 'serie', label: 'fecha', val: 'total', color: '#0a2540' },
  { key: 'tipo', titulo: 'Por tipo', src: 'porTipo', label: 'nombre', val: 'total', color: '#1d4ed8' },
  { key: 'prioridad', titulo: 'Por prioridad', src: 'porPrioridad', label: 'nombre', val: 'total', prio: true },
  { key: 'motivos', titulo: 'Top motivos', src: 'topMotivos', label: 'nombre', val: 'total', color: '#E24B4A' },
  { key: 'movil', titulo: 'Productividad por móvil', src: 'porMovil', label: 'movil', val: 'servicios', color: '#1D9E75', extra: 'km', extraSuf: ' km' },
  { key: 'base', titulo: 'Productividad por base', src: 'porBase', label: 'base', val: 'servicios', color: '#378ADD' },
  { key: 'persona', titulo: 'Productividad por persona', src: 'porPersona', label: 'persona', val: 'servicios', color: '#7c3aed' },
  { key: 'cierres', titulo: 'Cierres por condición', src: 'porCierre', label: 'nombre', val: 'total', color: '#0a2540' },
  { key: 'cancel', titulo: 'Cancelaciones', src: 'cancelaciones', label: 'tipo', val: 'total', color: '#dc2626' },
  { key: 'regulacion', titulo: 'Centro de Regulación (camas)', src: 'regulacion', label: 'nombre', val: 'total', color: '#0891b2' },
  { key: 'medicoReg', titulo: 'Camas por médico regulador', src: 'porMedicoReg', label: 'medico', val: 'camas', color: '#0891b2' },
];
const POR_DEFECTO = ['serie', 'tipo', 'movil', 'regulacion'];

function Ranking({ titulo, datos, labelKey, valueKey, color, prio, extra, extraSuf }: any) {
  const top = (datos ?? []).slice(0, 8);
  const max = Math.max(1, ...top.map((d: any) => n(d[valueKey])));
  return (
    <div style={{ background: 'white', border: '0.5px solid #e5e7eb', borderRadius: '10px', padding: '16px' }}>
      <div style={{ fontSize: '13px', fontWeight: 600, color: '#0a2540', marginBottom: '12px' }}>{titulo}</div>
      {top.length === 0 ? <div style={{ fontSize: '12px', color: '#9ca3af' }}>Sin datos en el rango.</div> :
        <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
          {top.map((d: any, i: number) => {
            const val = n(d[valueKey]);
            const c = prio ? (COLOR_PRIO[d[labelKey]] ?? '#94a3b8') : color;
            return (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#374151', marginBottom: '3px' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>{d[labelKey]}{d.funcion ? <span style={{ color: '#9ca3af' }}> · {d.funcion}</span> : ''}</span>
                  <span style={{ fontWeight: 600, color: '#0a2540' }}>{val}{extra ? <span style={{ color: '#9ca3af', fontWeight: 400 }}> · {n(d[extra])}{extraSuf}</span> : ''}</span>
                </div>
                <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(val / max) * 100}%`, background: c, borderRadius: '3px' }} />
                </div>
              </div>
            );
          })}
        </div>}
    </div>
  );
}

export default function EstadisticasPage() {
  const [data, setData] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const hoy = new Date().toISOString().slice(0, 10);
  const [desde, setDesde] = useState(hoy);   // default: HOY (para tablero/monitor)
  const [hasta, setHasta] = useState(hoy);
  const [vistas, setVistas] = useState<string[]>(POR_DEFECTO);
  const [opcionesAbierto, setOpcionesAbierto] = useState(false);

  useEffect(() => {
    try { const g = JSON.parse(localStorage.getItem('estad_vistas') || 'null'); if (Array.isArray(g)) setVistas(g); } catch { }
  }, []);
  const toggleVista = (k: string) => setVistas(prev => {
    const next = prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k];
    try { localStorage.setItem('estad_vistas', JSON.stringify(next)); } catch { }
    return next;
  });

  const cargar = (d = desde, h = hasta) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setCargando(true);
    fetch(`${API_URL}/api/estadisticas?desde=${d}&hasta=${h}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(x => { if (!x.error) setData(x); }).catch(() => { }).finally(() => setCargando(false));
  };
  useEffect(() => { cargar(); }, []);
  // Rangos rápidos (para tablero): Hoy / Semana / Mes
  const preset = (dias: number) => {
    const h = new Date().toISOString().slice(0, 10);
    const dd = new Date(Date.now() - dias * 86400000).toISOString().slice(0, 10);
    setDesde(dd); setHasta(h); cargar(dd, h);
  };

  const inp = { padding: '8px 10px', borderRadius: '7px', border: '0.5px solid #e5e7eb', fontSize: '13px' };
  const t = data?.tiempos ?? {};
  const kpis = data ? [
    { label: 'Servicios', value: data.total, color: '#0a2540' },
    { label: 'Incidentes', value: data.incidentes, color: '#E24B4A' },
    { label: 'T. respuesta (min)', value: n(t.respuesta), color: '#1d4ed8' },
    { label: 'T. total (min)', value: n(t.total), color: '#1D9E75' },
  ] : [];
  const activos = PANELES.filter(p => vistas.includes(p.key));

  return (
    <ProtectedRoute rolesPermitidos={[...ACCESO.estadisticas]}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 500, color: '#0a2540', margin: 0 }}>Estadísticas</h1>
            <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>Indicadores operativos y de productividad</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {([['Hoy', 0], ['Semana', 7], ['Mes', 30]] as [string, number][]).map(([l, d]) => (
              <button key={l} onClick={() => preset(d)} style={{ background: 'white', color: '#0a2540', border: '0.5px solid #e5e7eb', padding: '8px 12px', borderRadius: '7px', cursor: 'pointer', fontSize: '12px' }}>{l}</button>
            ))}
            <input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={inp} />
            <span style={{ color: '#9ca3af' }}>—</span>
            <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={inp} />
            <button onClick={() => cargar()} style={{ background: '#0a2540', color: 'white', border: 'none', padding: '9px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>Aplicar</button>
            <button onClick={() => setOpcionesAbierto(v => !v)} style={{ background: 'white', color: '#0a2540', border: '0.5px solid #e5e7eb', padding: '9px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>⚙️ Vistas</button>
          </div>
        </div>

        {/* Opciones de visualización (checkboxes) */}
        {opcionesAbierto && (
          <div style={{ background: 'white', border: '0.5px solid #e5e7eb', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#0a2540', marginBottom: '10px' }}>Mostrar paneles</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 18px' }}>
              {PANELES.map(p => (
                <label key={p.key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#374151', cursor: 'pointer' }}>
                  <input type="checkbox" checked={vistas.includes(p.key)} onChange={() => toggleVista(p.key)} style={{ cursor: 'pointer' }} />
                  {p.titulo}
                </label>
              ))}
            </div>
          </div>
        )}

        {cargando ? <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Cargando…</div> : !data ? <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Sin datos.</div> : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '18px' }}>
              {kpis.map(c => (
                <div key={c.label} style={{ background: 'white', borderRadius: '10px', padding: '16px', border: '0.5px solid #e5e7eb', borderTop: `3px solid ${c.color}` }}>
                  <div style={{ fontSize: '26px', fontWeight: 600, color: c.color }}>{c.value}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{c.label}</div>
                </div>
              ))}
            </div>

            {activos.length === 0 ? (
              <div style={{ background: 'white', border: '0.5px dashed #e5e7eb', borderRadius: '10px', padding: '30px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
                No hay paneles seleccionados. Tocá <b>⚙️ Vistas</b> para elegir qué mostrar.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '14px' }}>
                {activos.map(p => (
                  <Ranking key={p.key} titulo={p.titulo} datos={data[p.src]} labelKey={p.label} valueKey={p.val} color={p.color} prio={p.prio} extra={p.extra} extraSuf={p.extraSuf} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}
