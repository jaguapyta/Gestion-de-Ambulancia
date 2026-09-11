'use client';

import { API_URL } from '@/app/lib/api';
import { useState } from 'react';

interface Props { telefono?: string; nombre?: string; onCerrar: () => void; onGuardado: () => void; }

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const horaDe = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(11, 16) : '');
const edad = (f: string | null) => { if (!f) return '—'; const a = Math.floor((Date.now() - new Date(f).getTime()) / (365.25 * 24 * 3600 * 1000)); return a >= 0 ? String(a) : '—'; };

export default function ModalDialisis({ telefono, nombre, onCerrar, onGuardado }: Props) {
  const [cedula, setCedula] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [pac, setPac] = useState<any>(null);
  const [noEncontrado, setNoEncontrado] = useState(false);
  const [tipo, setTipo] = useState<'' | 'IDA' | 'VUELTA'>('');
  const [f, setF] = useState({ fecha_hora_traslado: '', ubicacion_paciente: '', origen: '', destino: '', direccion: '', nro_casa: '', ciudad: '', barrio: '' });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState<number | null>(null);

  const token = () => localStorage.getItem('token') ?? '';
  const set = (k: keyof typeof f, v: any) => setF(prev => ({ ...prev, [k]: v }));

  const buscar = async () => {
    if (!cedula.trim()) { setError('Ingresá la cédula.'); return; }
    setBuscando(true); setError(''); setPac(null); setNoEncontrado(false); setTipo('');
    try {
      const res = await fetch(`${API_URL}/api/dialisis/paciente/${encodeURIComponent(cedula.trim())}`, { headers: { Authorization: `Bearer ${token()}` } });
      const data = await res.json();
      if (data.existe) setPac(data.paciente); else setNoEncontrado(true);
    } catch { setError('Error de conexión'); } finally { setBuscando(false); }
  };

  // Al elegir ida/vuelta, precargo origen/destino con el centro del padrón
  const elegirTipo = (t: 'IDA' | 'VUELTA') => {
    setTipo(t);
    if (!pac) return;
    if (t === 'IDA') setF(prev => ({ ...prev, destino: pac.centro_dialisis, origen: prev.origen || '' }));
    else setF(prev => ({ ...prev, origen: pac.centro_dialisis, destino: prev.destino || '' }));
  };

  const guardar = async () => {
    if (!pac) { setError('Buscá y elegí un paciente del padrón.'); return; }
    if (!tipo) { setError('Elegí ida o vuelta.'); return; }
    if (!f.origen.trim() || !f.destino.trim()) { setError('Indicá el origen y el destino.'); return; }
    setGuardando(true); setError('');
    try {
      const res = await fetch(`${API_URL}/api/dialisis`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ paciente_dialisis_id: pac.id, tipo, denunciante_telefono: telefono, denunciante_nombre: nombre, ...f }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Error al registrar'); return; }
      onGuardado(); setExito(data.id ?? null);
    } catch { setError('Error de conexión'); } finally { setGuardando(false); }
  };

  const input = { width: '100%', padding: '9px 12px', borderRadius: '7px', border: '0.5px solid #e5e7eb', fontSize: '13px', boxSizing: 'border-box' as const };
  const label = { fontSize: '12px', color: '#6b7280', display: 'block' as const, marginBottom: '6px' };
  const seccion = { fontSize: '13px', fontWeight: 600, color: '#0a2540', margin: '18px 0 10px', paddingBottom: '6px', borderBottom: '0.5px solid #f0f0f0' } as const;
  const tipoBtn = (on: boolean): React.CSSProperties => ({ flex: 1, padding: '12px', borderRadius: '8px', border: `0.5px solid ${on ? '#0a2540' : '#e5e7eb'}`, cursor: 'pointer', fontSize: '14px', fontWeight: 600, background: on ? '#0a2540' : 'white', color: on ? 'white' : '#374151' });

  return (
    <>
      {exito !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400 }}>
          <div style={{ background: 'white', borderRadius: '14px', padding: '32px 44px', textAlign: 'center', boxShadow: '0 12px 40px rgba(0,0,0,0.25)' }}>
            <div style={{ fontSize: '54px', marginBottom: '10px' }}>✅</div>
            <div style={{ fontSize: '17px', fontWeight: 600, color: '#0a2540', marginBottom: '12px' }}>Traslado de diálisis cargado</div>
            <div style={{ fontSize: '12px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Número de pedido</div>
            <div style={{ fontSize: '36px', fontWeight: 700, color: '#15803d', margin: '4px 0 22px' }}>#{exito}</div>
            <button onClick={() => { setExito(null); onCerrar(); }} style={{ padding: '10px 30px', borderRadius: '8px', border: 'none', background: '#0a2540', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>Continuar</button>
          </div>
        </div>
      )}
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 300, padding: '24px', overflowY: 'auto' }}>
        <div style={{ background: 'white', borderRadius: '12px', padding: '28px', width: '620px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
          <h2 style={{ fontSize: '17px', fontWeight: 600, color: '#0a2540', margin: '0 0 12px' }}>🩺 Traslado de diálisis</h2>
          {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 14px', borderRadius: '7px', fontSize: '13px', marginBottom: '8px' }}>{error}</div>}

          <label style={label}>Buscar paciente por cédula (padrón)</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input value={cedula} onChange={e => { setCedula(e.target.value); setPac(null); setNoEncontrado(false); }} onKeyDown={e => e.key === 'Enter' && buscar()} placeholder="Cédula del paciente" style={{ ...input, flex: 1 }} />
            <button onClick={buscar} disabled={buscando} style={{ padding: '9px 18px', borderRadius: '7px', border: 'none', background: '#0a2540', color: 'white', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>{buscando ? 'Buscando…' : 'Buscar'}</button>
          </div>
          {noEncontrado && <div style={{ background: '#fff7ed', border: '0.5px solid #fed7aa', borderRadius: '8px', padding: '10px 14px', marginTop: '8px', fontSize: '13px', color: '#c2410c' }}>⚠️ No está en el padrón de dializados. Debe registrarlo Coordinación de Regulación.</div>}

          {pac && (
            <>
              <div style={{ background: '#eff6ff', border: '0.5px solid #bfdbfe', borderRadius: '8px', padding: '14px', marginTop: '10px', fontSize: '13px', color: '#1e40af', lineHeight: 1.7 }}>
                <div style={{ fontWeight: 600 }}>{pac.persona.primer_nombre} {pac.persona.primer_apellido} · CI {pac.persona.nro_documento}</div>
                <div>Edad: {edad(pac.persona.fecha_nacimiento)} · Sexo: {pac.persona.sexo === 'M' ? 'Masc.' : 'Fem.'}</div>
                <div>Centro: {pac.centro_dialisis} · Horario: {horaDe(pac.hora_turno) || '—'}</div>
                <div>Días: {pac.dias_semana.split(',').filter(Boolean).map((d: string) => DIAS[Number(d) - 1]).join(', ') || '—'}</div>
              </div>

              <div style={seccion}>¿Ida o vuelta?</div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => elegirTipo('IDA')} style={tipoBtn(tipo === 'IDA')}>IDA · casa → centro</button>
                <button type="button" onClick={() => elegirTipo('VUELTA')} style={tipoBtn(tipo === 'VUELTA')}>VUELTA · centro → casa</button>
              </div>

              {tipo && (
                <>
                  <div style={{ marginTop: '16px' }}>
                    <label style={label}>Fecha y hora del traslado (programado)</label>
                    <input type="datetime-local" value={f.fecha_hora_traslado} onChange={e => set('fecha_hora_traslado', e.target.value)} style={{ ...input, width: '260px' }} />
                  </div>

                  <div style={seccion}>Recorrido</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div><label style={label}>De (origen) *</label><input value={f.origen} onChange={e => set('origen', e.target.value)} style={input} /></div>
                    <div><label style={label}>A (destino) *</label><input value={f.destino} onChange={e => set('destino', e.target.value)} style={input} /></div>
                    <div style={{ gridColumn: '1 / -1' }}><label style={label}>Ubicación exacta del paciente</label><input value={f.ubicacion_paciente} onChange={e => set('ubicacion_paciente', e.target.value)} placeholder="Ej: casa, sala, cama…" style={input} /></div>
                  </div>

                  <div style={seccion}>Dirección</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '12px' }}>
                    <div><label style={label}>Dirección</label><input value={f.direccion} onChange={e => set('direccion', e.target.value)} style={input} /></div>
                    <div><label style={label}>Nro</label><input value={f.nro_casa} onChange={e => set('nro_casa', e.target.value)} style={input} /></div>
                    <div><label style={label}>Ciudad</label><input value={f.ciudad} onChange={e => set('ciudad', e.target.value)} style={input} /></div>
                    <div><label style={label}>Barrio</label><input value={f.barrio} onChange={e => set('barrio', e.target.value)} style={input} /></div>
                  </div>
                </>
              )}
            </>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '22px', borderTop: '0.5px solid #f0f0f0', paddingTop: '16px' }}>
            <button onClick={onCerrar} style={{ padding: '9px 18px', borderRadius: '7px', border: '0.5px solid #e5e7eb', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#6b7280' }}>Cancelar</button>
            {pac && tipo && <button onClick={guardar} disabled={guardando} style={{ padding: '9px 18px', borderRadius: '7px', border: 'none', background: '#0a2540', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>{guardando ? 'Guardando…' : 'Registrar traslado'}</button>}
          </div>
        </div>
      </div>
    </>
  );
}