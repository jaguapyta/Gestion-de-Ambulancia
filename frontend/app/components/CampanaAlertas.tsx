'use client';

import { API_URL } from '@/app/lib/api';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Alerta { clave: string; icono: string; titulo: string; cantidad: number; link: string; }

export default function CampanaAlertas() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [total, setTotal] = useState(0);
  const [abierto, setAbierto] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  const cargar = () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${API_URL}/api/alertas`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d) { setAlertas(d.alertas || []); setTotal(d.total || 0); } })
      .catch(() => {});
  };

  useEffect(() => {
    cargar();
    const id = setInterval(cargar, 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const ir = (link: string) => { setAbierto(false); router.push(link); };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setAbierto(v => !v)} title="Alertas y recordatorios" style={{ position: 'relative', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '20px', lineHeight: 1, padding: '4px' }}>
        🔔
        {total > 0 && (
          <span style={{ position: 'absolute', top: '-2px', right: '-4px', background: '#dc2626', color: 'white', fontSize: '10px', fontWeight: 700, minWidth: '16px', height: '16px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
            {total > 99 ? '99+' : total}
          </span>
        )}
      </button>

      {abierto && (
        <div style={{ position: 'absolute', right: 0, top: '38px', background: 'white', borderRadius: '10px', width: '320px', maxHeight: '70vh', overflowY: 'auto', boxShadow: '0 8px 28px rgba(0,0,0,0.18)', border: '0.5px solid #e5e7eb', zIndex: 250 }}>
          <div style={{ padding: '12px 16px', borderBottom: '0.5px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#0a2540' }}>Alertas y recordatorios</span>
            <span style={{ fontSize: '11px', color: '#9ca3af' }}>{total} pendiente(s)</span>
          </div>
          {alertas.length === 0 ? (
            <div style={{ padding: '28px 16px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>Todo al día ✅<br />No hay alertas.</div>
          ) : (
            alertas.map((a, i) => (
              <div key={a.clave + i} onClick={() => ir(a.link)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 16px', borderBottom: '0.5px solid #f3f4f6', cursor: 'pointer' }}>
                <span style={{ fontSize: '18px', flexShrink: 0 }}>{a.icono}</span>
                <span style={{ fontSize: '13px', color: '#374151', flex: 1, lineHeight: 1.35 }}>{a.titulo}</span>
                <span style={{ background: '#eff6ff', color: '#1d4ed8', fontSize: '11px', fontWeight: 700, borderRadius: '20px', padding: '2px 8px', flexShrink: 0 }}>{a.cantidad}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}