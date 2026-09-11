'use client';

import { API_URL } from '@/app/lib/api';
import { useState } from 'react';

interface Props {
  recurso: 'paramedicos' | 'conductores';
  habilitadoId: number;
  nombre: string;
  diasActuales: number[];
  // Motivo por el cual esta jefatura no puede editar a este funcionario.
  // Si viene, el modal se muestra en solo lectura.
  bloqueado?: string | null;
  onCerrar: () => void;
  onGuardado: () => void;
}

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const MAX = 3;

// Después de una guardia va un día de descanso. La semana es un ciclo, así que
// domingo(7) y lunes(1) también son correlativos — de ahí la distancia 6.
const sonCorrelativos = (a: number, b: number) => {
  const d = Math.abs(a - b);
  return d === 1 || d === 6;
};

export default function ModalDiasGuardia({
  recurso, habilitadoId, nombre, diasActuales, bloqueado, onCerrar, onGuardado
}: Props) {
  const [dias, setDias] = useState<number[]>([...diasActuales].sort((a, b) => a - b));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const token = () => localStorage.getItem('token') ?? '';

  const toggle = (dia: number) => {
    if (bloqueado) return;
    setError('');

    if (dias.includes(dia)) {
      setDias(dias.filter(d => d !== dia).sort((a, b) => a - b));
      return;
    }
    const choca = dias.find(d => sonCorrelativos(d, dia));
    if (choca !== undefined) {
      setError(`No puede tener guardias en días correlativos: ${DIAS[dia - 1]} va pegado a ${DIAS[choca - 1]}.`);
      return;
    }
    if (dias.length >= MAX) {
      setError(`Máximo ${MAX} guardias por funcionario. Sacá una antes de agregar otra.`);
      return;
    }
    setDias([...dias, dia].sort((a, b) => a - b));
  };

  const guardar = async () => {
    setGuardando(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/${recurso}/${habilitadoId}/dias-guardia`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ dias_guardia: dias })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Error al guardar los días de guardia'); return; }
      onGuardado();
      onCerrar();
    } catch { setError('Error de conexión'); }
    finally { setGuardando(false); }
  };

  const sinCambios = JSON.stringify(dias) === JSON.stringify([...diasActuales].sort((a, b) => a - b));

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
      <div style={{ background: 'white', borderRadius: '12px', padding: '28px', width: '480px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '500', color: '#0a2540', margin: '0 0 16px' }}>
          Días de guardia
        </h2>

        <div style={{ background: '#f8f9fb', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '13px', color: '#0a2540', fontWeight: '500' }}>
          {nombre}
        </div>

        {bloqueado && (
          <div style={{ background: '#fff7ed', border: '0.5px solid #fed7aa', borderRadius: '8px', padding: '12px 14px', marginBottom: '16px', fontSize: '13px', color: '#c2410c', lineHeight: 1.5 }}>
            🔒 {bloqueado}
          </div>
        )}

        {error && (
          <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 14px', borderRadius: '7px', fontSize: '13px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '10px' }}>
          Tocá un día para asignarlo o sacarlo — máximo {MAX}, y nunca en días seguidos
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const, marginBottom: '16px' }}>
          {DIAS.map((nombreDia, i) => {
            const dia = i + 1;
            const puesto = dias.includes(dia);
            const pegado = !puesto && dias.some(d => sonCorrelativos(d, dia));
            const tope = !puesto && !pegado && dias.length >= MAX;
            const inhabilitado = pegado || tope;
            return (
              <button key={dia} type="button" onClick={() => toggle(dia)}
                disabled={!!bloqueado}
                title={pegado ? 'Queda pegado a otra guardia' : tope ? `Ya tiene ${MAX} guardias` : undefined}
                style={{
                  padding: '7px 15px', borderRadius: '20px', border: 'none',
                  cursor: bloqueado ? 'not-allowed' : 'pointer',
                  fontSize: '12px', fontWeight: '500',
                  background: puesto ? '#0a2540' : '#f0f4f8',
                  color: puesto ? 'white' : '#6b7280',
                  textDecoration: pegado ? 'line-through' : 'none',
                  opacity: bloqueado ? 0.5 : (inhabilitado ? 0.35 : 1)
                }}>
                {nombreDia}
              </button>
            );
          })}
        </div>

        <div style={{ background: '#f8f9fb', borderRadius: '8px', padding: '12px 14px', marginBottom: '20px', fontSize: '13px', color: '#6b7280' }}>
          {dias.length === 0
            ? '⚠️ Sin guardias asignadas. No va a aparecer al armar ningún rol de guardia.'
            : <>Queda con <strong style={{ color: '#0a2540' }}>{dias.length}</strong> {dias.length === 1 ? 'guardia' : 'guardias'}: {dias.map(d => DIAS[d - 1]).join(', ')}</>}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button onClick={onCerrar}
            style={{ padding: '9px 18px', borderRadius: '7px', border: '0.5px solid #e5e7eb', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#6b7280' }}>
            {bloqueado ? 'Cerrar' : 'Cancelar'}
          </button>
          {!bloqueado && (
            <button onClick={guardar} disabled={guardando || sinCambios}
              style={{
                padding: '9px 18px', borderRadius: '7px', border: 'none',
                background: sinCambios ? '#9ca3af' : '#0a2540', color: 'white',
                cursor: sinCambios ? 'default' : 'pointer', fontSize: '13px', fontWeight: '500'
              }}>
              {guardando ? 'Guardando...' : 'Guardar cambios'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
