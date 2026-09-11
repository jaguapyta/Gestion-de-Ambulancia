'use client';

import { API_URL } from '@/app/lib/api';
import { useState } from 'react';

interface TurnoSel { dia_semana: number; turno: 'DIURNO' | 'NOCTURNO'; }

interface Props {
  habilitadoId: number;
  nombre: string;
  turnosActuales: { dia_semana: number; turno: string }[];
  onCerrar: () => void;
  onGuardado: () => void;
}

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function ModalTurnosMedico({ habilitadoId, nombre, turnosActuales, onCerrar, onGuardado }: Props) {
  const [turnos, setTurnos] = useState<TurnoSel[]>(
    turnosActuales.map(t => ({ dia_semana: t.dia_semana, turno: t.turno as 'DIURNO' | 'NOCTURNO' }))
  );
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const token = () => localStorage.getItem('token') ?? '';
  const tiene = (d: number, t: 'DIURNO' | 'NOCTURNO') => turnos.some(x => x.dia_semana === d && x.turno === t);

  // El médico puede encadenar turnos (24h): no hay regla de "no consecutivos".
  const toggle = (d: number, t: 'DIURNO' | 'NOCTURNO') => {
    setError('');
    if (tiene(d, t)) setTurnos(turnos.filter(x => !(x.dia_semana === d && x.turno === t)));
    else setTurnos([...turnos, { dia_semana: d, turno: t }]);
  };

  const guardar = async () => {
    setGuardando(true); setError('');
    try {
      const res = await fetch(`${API_URL}/api/medicos/${habilitadoId}/turnos`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ turnos })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Error al guardar los turnos'); return; }
      onGuardado();
      onCerrar();
    } catch { setError('Error de conexión'); }
    finally { setGuardando(false); }
  };

  const chip = (activo: boolean): React.CSSProperties => ({
    flex: 1, padding: '7px 0', borderRadius: '7px', border: 'none', cursor: 'pointer',
    fontSize: '12px', fontWeight: 500,
    background: activo ? '#0a2540' : '#f0f4f8', color: activo ? 'white' : '#6b7280'
  });

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
      <div style={{ background: 'white', borderRadius: '12px', padding: '28px', width: '460px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#0a2540', margin: '0 0 16px' }}>Turnos de 12 horas</h2>
        <div style={{ background: '#f8f9fb', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '13px', color: '#0a2540', fontWeight: 500 }}>
          {nombre}
        </div>

        {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 14px', borderRadius: '7px', fontSize: '13px', marginBottom: '16px' }}>{error}</div>}

        <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '10px' }}>
          Elegí los turnos. ☀️ mañana = 07–19 · 🌙 noche = 19–07. Puede encadenar dos seguidos (24h).
        </label>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '18px' }}>
          {DIAS.map((dia, i) => {
            const n = i + 1;
            return (
              <div key={n} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '78px', fontSize: '12px', color: '#6b7280' }}>{dia}</span>
                <button type="button" onClick={() => toggle(n, 'DIURNO')} style={chip(tiene(n, 'DIURNO'))}>☀️ Mañana</button>
                <button type="button" onClick={() => toggle(n, 'NOCTURNO')} style={chip(tiene(n, 'NOCTURNO'))}>🌙 Noche</button>
              </div>
            );
          })}
        </div>

        <div style={{ background: '#f8f9fb', borderRadius: '8px', padding: '12px 14px', marginBottom: '20px', fontSize: '13px', color: '#6b7280' }}>
          {turnos.length === 0
            ? '⚠️ Sin turnos asignados.'
            : <>Queda con <strong style={{ color: '#0a2540' }}>{turnos.length}</strong> turno(s) de 12h = {turnos.length * 12}h semanales.</>}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button onClick={onCerrar} style={{ padding: '9px 18px', borderRadius: '7px', border: '0.5px solid #e5e7eb', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#6b7280' }}>Cancelar</button>
          <button onClick={guardar} disabled={guardando} style={{ padding: '9px 18px', borderRadius: '7px', border: 'none', background: '#0a2540', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
            {guardando ? 'Guardando...' : 'Guardar turnos'}
          </button>
        </div>
      </div>
    </div>
  );
}