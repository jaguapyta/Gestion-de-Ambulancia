'use client';

import { API_URL } from '@/app/lib/api';
import { useEffect, useState } from 'react';

interface Inc {
  id: number;
  direccion: string | null; barrio: string | null; ciudad: string | null;
  created_at: string;
  estado_solicitud: { nombre: string };
  solicitud_emergencia?: { motivo_consulta?: { nombre: string; codigo_radial: string | null } | null } | null;
  _count?: { llamada: number };
}

export default function IncidentesParecidos({ telefono, nombre, onSumada }: { telefono: string; nombre: string; onSumada: () => void }) {
  const [incidentes, setIncidentes] = useState<Inc[]>([]);
  const [sumando, setSumando] = useState<number | null>(null);

  const token = () => localStorage.getItem('token') ?? '';
  const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

  useEffect(() => {
    fetch(`${API_URL}/api/solicitudes/incidentes-parecidos`, { headers: headers() })
      .then(r => (r.ok ? r.json() : []))
      .then(d => { if (Array.isArray(d)) setIncidentes(d); })
      .catch(() => {});
  }, []);

  if (incidentes.length === 0) return null;

  const sumar = async (id: number) => {
    setSumando(id);
    try {
      const res = await fetch(`${API_URL}/api/solicitudes/${id}/llamada`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ denunciante_nombre: nombre || null, denunciante_telefono: telefono || null }),
      });
      if (res.ok) onSumada();
    } catch { /* ignore */ } finally { setSumando(null); }
  };

  const hace = (iso: string) => {
    const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    return min < 60 ? `hace ${min} min` : `hace ${Math.round(min / 60)} h`;
  };

  return (
    <div style={{ border: '1px solid #fde68a', background: '#fffbeb', borderRadius: '8px', padding: '10px 12px', marginBottom: '16px' }}>
      <div style={{ fontSize: '12px', fontWeight: 600, color: '#92400e', marginBottom: '8px' }}>
        ⚠️ Incidentes abiertos ahora — ¿la llamada es sobre alguno de estos?
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {incidentes.map(i => (
          <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'white', border: '0.5px solid #fde68a', borderRadius: '6px', padding: '8px 10px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '12px', color: '#0a2540' }}>
                <b>#{i.id}</b> {i.solicitud_emergencia?.motivo_consulta?.nombre ?? 'Emergencia'}
                {i.solicitud_emergencia?.motivo_consulta?.codigo_radial ? ` · ${i.solicitud_emergencia.motivo_consulta.codigo_radial}` : ''}
              </div>
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                {[i.direccion, i.barrio, i.ciudad].filter(Boolean).join(', ') || 's/ubicación'} · {hace(i.created_at)} · 📞 {i._count?.llamada ?? 1}
              </div>
            </div>
            <button onClick={() => sumar(i.id)} disabled={sumando === i.id} style={{ flexShrink: 0, padding: '5px 10px', borderRadius: '6px', border: 'none', background: '#b45309', color: 'white', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}>
              {sumando === i.id ? '...' : '➕ Sumar llamada'}
            </button>
          </div>
        ))}
      </div>
      <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '6px' }}>Si no corresponde a ninguno, elegí el tipo abajo y creá un incidente nuevo.</div>
    </div>
  );
}