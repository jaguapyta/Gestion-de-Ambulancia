'use client';

import { API_URL } from '@/app/lib/api';
import { useEffect, useMemo, useState } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';

const COLORES: Record<string, string> = { ROJO: '#E24B4A', AMARILLO: '#EF9F27', VERDE: '#1D9E75', AZUL: '#378ADD' };
const ORIGEN: Record<string, { bg: string; tx: string }> = {
  SEED: { bg: '#f1f5f9', tx: '#64748b' }, MANUAL: { bg: '#eff6ff', tx: '#1d4ed8' }, IA: { bg: '#f5f3ff', tx: '#7c3aed' },
};

export default function SinonimosPage() {
  const [motivos, setMotivos] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [nuevo, setNuevo] = useState<Record<number, string>>({});
  const [cargando, setCargando] = useState(true);

  const token = () => localStorage.getItem('token') ?? '';
  const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

  const cargar = () => {
    setCargando(true);
    fetch(`${API_URL}/api/emergencias/sinonimos`, { headers: headers() })
      .then(r => r.json()).then(d => { if (d.motivos) setMotivos(d.motivos); }).catch(() => { }).finally(() => setCargando(false));
  };
  useEffect(() => { cargar(); }, []);

  const agregar = async (motivoId: number) => {
    const texto = (nuevo[motivoId] ?? '').trim();
    if (!texto) return;
    const res = await fetch(`${API_URL}/api/emergencias/sinonimos`, { method: 'POST', headers: headers(), body: JSON.stringify({ motivo_id: motivoId, texto, origen: 'MANUAL' }) });
    if (res.ok) { setNuevo({ ...nuevo, [motivoId]: '' }); cargar(); }
  };
  const toggle = async (id: number) => { await fetch(`${API_URL}/api/emergencias/sinonimos/${id}`, { method: 'PATCH', headers: headers() }); cargar(); };
  const borrar = async (id: number) => { if (!confirm('¿Borrar este sinónimo?')) return; await fetch(`${API_URL}/api/emergencias/sinonimos/${id}`, { method: 'DELETE', headers: headers() }); cargar(); };

  const filtrados = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return motivos;
    return motivos.filter(m => m.nombre.toLowerCase().includes(s) || (m.sinonimos ?? []).some((x: any) => x.texto.toLowerCase().includes(s)));
  }, [q, motivos]);

  const input = { padding: '8px 11px', borderRadius: '7px', border: '0.5px solid #e5e7eb', fontSize: '13px', boxSizing: 'border-box' as const };

  return (
    <ProtectedRoute rolesPermitidos={['ADMINISTRADOR', 'COORDINADOR_REGULACION']}>
      <div>
        <h1 style={{ fontSize: '20px', fontWeight: 500, color: '#0a2540', margin: 0 }}>Sinónimos de emergencias</h1>
        <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>Términos coloquiales que el buscador reconoce para cada motivo. Se enriquece con el uso.</p>

        <input type="text" placeholder="Buscar motivo o sinónimo…" value={q} onChange={e => setQ(e.target.value)} style={{ ...input, width: '100%', margin: '16px 0', padding: '10px 14px' }} />

        {cargando ? <p style={{ color: '#9ca3af', fontSize: '13px' }}>Cargando…</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filtrados.map(m => (
              <div key={m.id} style={{ background: 'white', border: '0.5px solid #e5e7eb', borderRadius: '10px', padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: COLORES[m.color] ?? '#94a3b8' }} />
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#0a2540' }}>{m.nombre}</span>
                  <span style={{ fontSize: '11px', color: '#9ca3af' }}>{m.codigo}</span>
                  <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#9ca3af' }}>{(m.sinonimos ?? []).length} sinónimos</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                  {(m.sinonimos ?? []).map((s: any) => {
                    const o = ORIGEN[s.origen] ?? ORIGEN.MANUAL;
                    return (
                      <span key={s.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: s.activo ? o.bg : '#f9fafb', color: s.activo ? o.tx : '#c0c4cc', border: '0.5px solid #f0f0f0', padding: '3px 8px', borderRadius: '20px', fontSize: '12px', textDecoration: s.activo ? 'none' : 'line-through' }}>
                        {s.texto}
                        <span style={{ fontSize: '9px', opacity: 0.7 }}>{s.origen}</span>
                        <button onClick={() => toggle(s.id)} title={s.activo ? 'Desactivar' : 'Activar'} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '11px', padding: 0 }}>{s.activo ? '�‑' : '＋'}</button>
                        <button onClick={() => borrar(s.id)} title="Borrar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: '12px', padding: 0 }}>×</button>
                      </span>
                    );
                  })}
                  {(m.sinonimos ?? []).length === 0 && <span style={{ fontSize: '12px', color: '#c0c4cc' }}>Sin sinónimos</span>}
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input value={nuevo[m.id] ?? ''} onChange={e => setNuevo({ ...nuevo, [m.id]: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') agregar(m.id); }} placeholder="Agregar sinónimo…" style={{ ...input, flex: 1 }} />
                  <button onClick={() => agregar(m.id)} style={{ padding: '0 14px', borderRadius: '7px', border: 'none', background: '#0a2540', color: 'white', cursor: 'pointer', fontSize: '12px' }}>Agregar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
