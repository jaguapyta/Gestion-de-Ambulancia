'use client';

import { API_URL } from '@/app/lib/api';
import { useEffect, useState } from 'react';

interface Acceso {
  id: string;
  fecha_hora: string;
  usuario_id: number | null;
  usuario_nombre: string | null;
  rol_nombre: string | null;
  ip: string | null;
  dispositivo: string | null;
  resultado: string;
  detalle_error: string | null;
  descripcion: string | null;
}

export default function AuditoriaPage() {
  const [accesos, setAccesos] = useState<Acceso[]>([]);
  const [cargando, setCargando] = useState(true);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [resultado, setResultado] = useState('');
  const [q, setQ] = useState('');

  const cargar = () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setCargando(true);
    const params = new URLSearchParams();
    if (desde) params.set('desde', desde);
    if (hasta) params.set('hasta', hasta);
    if (resultado) params.set('resultado', resultado);
    if (q) params.set('q', q);
    fetch(`${API_URL}/api/auditoria/accesos?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setAccesos(data); })
      .catch((err) => console.error(err))
      .finally(() => setCargando(false));
  };

  useEffect(() => { cargar(); }, []);

  const fmtFecha = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('es-PY', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return iso; }
  };

  const exitosos = accesos.filter((a) => a.resultado === 'EXITO').length;
  const fallidos = accesos.filter((a) => a.resultado === 'FALLIDO').length;

  const selStyle = { padding: '10px 14px', borderRadius: '8px', border: '0.5px solid #e5e7eb', fontSize: '14px', boxSizing: 'border-box' as const, outline: 'none', background: 'white' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '500', color: '#0a2540', margin: 0 }}>Auditoría de accesos</h1>
          <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>Intentos de ingreso al sistema — exitosos y fallidos</p>
        </div>
        <button onClick={cargar} style={{ background: '#0a2540', color: 'white', border: 'none', padding: '9px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
          🔄 Actualizar
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Registros', value: accesos.length, color: '#0a2540' },
          { label: 'Exitosos', value: exitosos, color: '#15803d' },
          { label: 'Fallidos', value: fallidos, color: '#dc2626' },
        ].map((card) => (
          <div key={card.label} style={{ background: 'white', borderRadius: '10px', padding: '16px', border: '0.5px solid #e5e7eb', borderTop: `3px solid ${card.color}` }}>
            <div style={{ fontSize: '24px', fontWeight: '500', color: card.color }}>{card.value}</div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{card.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px', alignItems: 'center' }}>
        <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} style={selStyle} title="Desde" />
        <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} style={selStyle} title="Hasta" />
        <select value={resultado} onChange={(e) => setResultado(e.target.value)} style={selStyle}>
          <option value="">Todos los resultados</option>
          <option value="EXITO">Exitosos</option>
          <option value="FALLIDO">Fallidos</option>
        </select>
        <input type="text" placeholder="Buscar usuario, documento, IP o motivo..." value={q} onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') cargar(); }}
          style={{ ...selStyle, flex: 1, minWidth: '220px' }} />
        <button onClick={cargar} style={{ background: 'white', color: '#0a2540', border: '0.5px solid #e5e7eb', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
          Filtrar
        </button>
      </div>

      <div style={{ background: 'white', borderRadius: '10px', border: '0.5px solid #e5e7eb', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
          <thead>
            <tr style={{ background: '#f8f9fb', borderBottom: '0.5px solid #e5e7eb' }}>
              {['Fecha y hora', 'Usuario', 'Rol', 'Resultado', 'Motivo', 'IP', 'Dispositivo'].map((col) => (
                <th key={col} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', color: '#6b7280', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>Cargando accesos...</td></tr>
            ) : accesos.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>No hay registros de acceso</td></tr>
            ) : accesos.map((a) => {
              const ok = a.resultado === 'EXITO';
              return (
                <tr key={a.id} style={{ borderBottom: '0.5px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151', whiteSpace: 'nowrap' }}>{fmtFecha(a.fecha_hora)}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#0a2540', fontWeight: '500' }}>
                    {a.usuario_nombre ?? '—'}
                    {a.descripcion && <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 400 }}>{a.descripcion}</div>}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>{a.rol_nombre ?? '—'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ background: ok ? '#f0fdf4' : '#fef2f2', color: ok ? '#15803d' : '#dc2626', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '500' }}>
                      {ok ? 'Ingresó' : 'No ingresó'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: ok ? '#9ca3af' : '#b91c1c' }}>{a.detalle_error ?? (ok ? '—' : '')}</td>
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap' }}>{a.ip ?? '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: '#9ca3af', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={a.dispositivo ?? ''}>{a.dispositivo ?? '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}