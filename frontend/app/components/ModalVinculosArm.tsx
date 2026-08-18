'use client';

import { useState } from 'react';

interface Turno { dia_semana: number; turno: 'DIURNO' | 'NOCTURNO'; }
interface Vinculo { a: Turno; b: Turno; }

interface Props {
  habilitadoId: number;
  nombre: string;
  vinculosActuales: { dia_semana: number; turno: string }[][];
  onCerrar: () => void;
  onGuardado: () => void;
}

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const franja = (t: Turno) => (t.dia_semana - 1) * 2 + (t.turno === 'NOCTURNO' ? 1 : 0);
const consecutivos = (a: Turno, b: Turno) => { const d = Math.abs(franja(a) - franja(b)); return d === 1 || d === 13; };
const igual = (a: Turno, b: Turno) => a.dia_semana === b.dia_semana && a.turno === b.turno;

export default function ModalVinculosArm({ habilitadoId, nombre, vinculosActuales, onCerrar, onGuardado }: Props) {
  const inicial: Vinculo[] = vinculosActuales
    .filter(v => v.length === 2)
    .map(v => ({
      a: { dia_semana: v[0].dia_semana, turno: v[0].turno as 'DIURNO' | 'NOCTURNO' },
      b: { dia_semana: v[1].dia_semana, turno: v[1].turno as 'DIURNO' | 'NOCTURNO' },
    }));
  const [vinculos, setVinculos] = useState<Vinculo[]>(inicial);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const token = () => localStorage.getItem('token') ?? '';

  const setSlot = (idx: number, slot: 'a' | 'b', campo: 'dia_semana' | 'turno', valor: any) => {
    setVinculos(vinculos.map((v, i) => i === idx ? { ...v, [slot]: { ...v[slot], [campo]: campo === 'dia_semana' ? parseInt(valor) : valor } } : v));
  };
  const agregar = () => { if (vinculos.length < 3) setVinculos([...vinculos, { a: { dia_semana: 1, turno: 'DIURNO' }, b: { dia_semana: 3, turno: 'DIURNO' } }]); };
  const quitar = (idx: number) => setVinculos(vinculos.filter((_, i) => i !== idx));

  const guardar = async () => {
    for (let i = 0; i < vinculos.length; i++) {
      const { a, b } = vinculos[i];
      if (igual(a, b)) { setError(`Vínculo ${i + 1}: los dos turnos no pueden ser el mismo.`); return; }
      if (consecutivos(a, b)) { setError(`Vínculo ${i + 1}: los turnos no pueden ir consecutivos (24h seguidas).`); return; }
    }
    setGuardando(true); setError('');
    try {
      const res = await fetch(`http://localhost:3001/api/arm/${habilitadoId}/vinculos`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ vinculos: vinculos.map(v => [v.a, v.b]) })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Error al guardar los vínculos'); return; }
      onGuardado();
      onCerrar();
    } catch { setError('Error de conexión'); }
    finally { setGuardando(false); }
  };

  const sel = { padding: '7px 10px', borderRadius: '7px', border: '0.5px solid #e5e7eb', fontSize: '13px', flex: 1 };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
      <div style={{ background: 'white', borderRadius: '12px', padding: '28px', width: '520px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#0a2540', margin: '0 0 16px' }}>Vínculos del ARM</h2>
        <div style={{ background: '#f8f9fb', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '13px', color: '#0a2540', fontWeight: 500 }}>{nombre}</div>

        {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 14px', borderRadius: '7px', fontSize: '13px', marginBottom: '16px' }}>{error}</div>}

        <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '12px' }}>
          Cada vínculo = 24h en 2 turnos de 12h <strong>no consecutivos</strong>. Hasta 3 vínculos.
        </label>

        {vinculos.length === 0 && <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '12px' }}>Sin vínculos. Agregá al menos uno.</div>}

        {vinculos.map((v, idx) => {
          const choca = consecutivos(v.a, v.b) || igual(v.a, v.b);
          return (
            <div key={idx} style={{ border: `0.5px solid ${choca ? '#fecaca' : '#e5e7eb'}`, borderRadius: '10px', padding: '14px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#0a2540' }}>Vínculo {idx + 1} <span style={{ color: '#9ca3af', fontWeight: 400 }}>· 24h</span></span>
                <button onClick={() => quitar(idx)} style={{ background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '12px' }}>Quitar</button>
              </div>
              {(['a', 'b'] as const).map((slot, s) => (
                <div key={slot} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: s === 0 ? '8px' : 0 }}>
                  <span style={{ width: '58px', fontSize: '12px', color: '#6b7280' }}>Turno {s + 1}</span>
                  <select value={v[slot].dia_semana} onChange={e => setSlot(idx, slot, 'dia_semana', e.target.value)} style={sel}>
                    {DIAS.map((d, i) => <option key={i + 1} value={i + 1}>{d}</option>)}
                  </select>
                  <select value={v[slot].turno} onChange={e => setSlot(idx, slot, 'turno', e.target.value)} style={sel}>
                    <option value="DIURNO">☀️ Mañana (07-19)</option>
                    <option value="NOCTURNO">🌙 Noche (19-07)</option>
                  </select>
                </div>
              ))}
              {choca && <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '8px' }}>⚠️ Los dos turnos son consecutivos o iguales.</div>}
            </div>
          );
        })}

        {vinculos.length < 3 && (
          <button onClick={agregar} style={{ background: 'transparent', border: '0.5px dashed #cbd5e1', color: '#0a2540', padding: '9px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', width: '100%', marginBottom: '20px' }}>
            + Agregar vínculo
          </button>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button onClick={onCerrar} style={{ padding: '9px 18px', borderRadius: '7px', border: '0.5px solid #e5e7eb', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#6b7280' }}>Cancelar</button>
          <button onClick={guardar} disabled={guardando} style={{ padding: '9px 18px', borderRadius: '7px', border: 'none', background: '#0a2540', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
            {guardando ? 'Guardando...' : 'Guardar vínculos'}
          </button>
        </div>
      </div>
    </div>
  );
}