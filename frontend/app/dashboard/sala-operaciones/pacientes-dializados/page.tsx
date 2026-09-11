'use client';

import { API_URL } from '@/app/lib/api';
import { useEffect, useState } from 'react';
import ProtectedRoute from '../../../components/ProtectedRoute';

interface Persona { id: number; primer_nombre: string; segundo_nombre: string | null; primer_apellido: string; segundo_apellido: string | null; nro_documento: string; tipo_documento: number; sexo: string; fecha_nacimiento: string; }
interface Paciente { id: number; activo: boolean; centro_dialisis: string; dias_semana: string; hora_turno: string | null; observacion: string | null; persona: Persona; }

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const horaDe = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(11, 16) : '');
const FORM = { primer_nombre: '', segundo_nombre: '', primer_apellido: '', segundo_apellido: '', nro_documento: '', tipo_documento: '1', sexo: 'M', fecha_nacimiento: '', persona_id: '', centro_dialisis: '', hora_turno: '', observacion: '' };

export default function PacientesDializadosPage() {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [modal, setModal] = useState(false);
  const [editar, setEditar] = useState<Paciente | null>(null);
  const [form, setForm] = useState({ ...FORM });
  const [dias, setDias] = useState<number[]>([]);
  const [documento, setDocumento] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [personaEnc, setPersonaEnc] = useState<Persona | null>(null);
  const [personaNueva, setPersonaNueva] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const token = () => localStorage.getItem('token') ?? '';
  const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

  const cargar = () => {
    setCargando(true);
    fetch(`${API_URL}/api/pacientes-dializados`, { headers: headers() })
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setPacientes(d); })
      .catch(() => { }).finally(() => setCargando(false));
  };
  useEffect(() => { cargar(); }, []);

  const nombre = (p: Persona) => `${p.primer_nombre} ${p.segundo_nombre ?? ''} ${p.primer_apellido} ${p.segundo_apellido ?? ''}`.trim();
  const filtrados = pacientes.filter(p => nombre(p.persona).toLowerCase().includes(busqueda.toLowerCase()) || p.persona.nro_documento.includes(busqueda) || p.centro_dialisis.toLowerCase().includes(busqueda.toLowerCase()));

  const toggleDia = (d: number) => setDias(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

  const buscarDoc = async () => {
    if (!documento) return;
    setBuscando(true); setPersonaEnc(null); setPersonaNueva(false); setError('');
    try {
      const res = await fetch(`${API_URL}/api/usuarios/persona/${documento}`, { headers: headers() });
      if (res.ok) { const d = await res.json(); setPersonaEnc(d); setForm(prev => ({ ...prev, persona_id: String(d.id), nro_documento: d.nro_documento })); }
      else { setPersonaNueva(true); setForm(prev => ({ ...prev, nro_documento: documento })); }
    } catch { setError('Error de conexión'); } finally { setBuscando(false); }
  };

  const abrirNuevo = () => { setForm({ ...FORM }); setDias([]); setDocumento(''); setPersonaEnc(null); setPersonaNueva(false); setError(''); setEditar(null); setModal(true); };
  const abrirEditar = (p: Paciente) => {
    setEditar(p); setError('');
    setForm({ ...FORM, centro_dialisis: p.centro_dialisis, hora_turno: horaDe(p.hora_turno), observacion: p.observacion ?? '' });
    setDias(p.dias_semana ? p.dias_semana.split(',').map(Number).filter(Boolean) : []);
    setModal(true);
  };

  const guardar = async () => {
    if (!form.centro_dialisis) { setError('El centro de diálisis es obligatorio.'); return; }
    setGuardando(true); setError('');
    try {
      const body = { ...form, dias_semana: dias.sort((a, b) => a - b).join(','), hora_turno: form.hora_turno || null };
      const url = editar ? `${API_URL}/api/pacientes-dializados/${editar.id}` : `${API_URL}/api/pacientes-dializados`;
      const res = await fetch(url, { method: editar ? 'PUT' : 'POST', headers: headers(), body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Error al guardar'); return; }
      setModal(false); cargar();
    } catch { setError('Error de conexión'); } finally { setGuardando(false); }
  };

  const toggleActivo = async (p: Paciente) => {
    await fetch(`${API_URL}/api/pacientes-dializados/${p.id}/activo`, { method: 'PATCH', headers: headers(), body: JSON.stringify({ activo: !p.activo }) });
    cargar();
  };

  const input = { width: '100%', padding: '9px 12px', borderRadius: '7px', border: '0.5px solid #e5e7eb', fontSize: '13px', boxSizing: 'border-box' as const };
  const label = { fontSize: '12px', color: '#6b7280', display: 'block' as const, marginBottom: '6px' };

  return (
    <ProtectedRoute rolesPermitidos={['ADMINISTRADOR', 'COORDINADOR_REGULACION']}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 500, color: '#0a2540', margin: 0 }}>Pacientes dializados</h1>
            <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>Padrón de pacientes en diálisis · Coordinación de Regulación</p>
          </div>
          <button onClick={abrirNuevo} style={{ background: '#0a2540', color: 'white', border: 'none', padding: '9px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>+ Nuevo paciente</button>
        </div>

        <input type="text" placeholder="Buscar por nombre, CI o centro..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
          style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '0.5px solid #e5e7eb', fontSize: '14px', boxSizing: 'border-box', marginBottom: '16px', outline: 'none' }} />

        <div style={{ background: 'white', borderRadius: '10px', border: '0.5px solid #e5e7eb', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '820px' }}>
            <thead><tr style={{ background: '#f8f9fb', borderBottom: '0.5px solid #e5e7eb' }}>
              {['Paciente', 'CI', 'Centro de diálisis', 'Días', 'Horario', 'Estado', 'Acciones'].map(c => <th key={c} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', color: '#6b7280', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{c}</th>)}
            </tr></thead>
            <tbody>
              {cargando ? <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Cargando…</td></tr>
                : filtrados.length === 0 ? <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Sin pacientes en el padrón</td></tr>
                : filtrados.map(p => (
                  <tr key={p.id} style={{ borderBottom: '0.5px solid #f3f4f6' }}>
                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 500, color: '#0a2540' }}>{nombre(p.persona)}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>{p.persona.nro_documento}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>{p.centro_dialisis}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {p.dias_semana.split(',').filter(Boolean).map(d => <span key={d} style={{ background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 500 }}>{DIAS[Number(d) - 1]}</span>)}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>{horaDe(p.hora_turno) || '—'}</td>
                    <td style={{ padding: '12px 16px' }}><span style={{ background: p.activo ? '#f0fdf4' : '#fef2f2', color: p.activo ? '#15803d' : '#dc2626', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 500 }}>{p.activo ? 'Activo' : 'Inactivo'}</span></td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => abrirEditar(p)} style={{ background: 'transparent', border: '0.5px solid #e5e7eb', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: '#0a2540' }}>Editar</button>
                        <button onClick={() => toggleActivo(p)} style={{ background: 'transparent', border: `0.5px solid ${p.activo ? '#fecaca' : '#bbf7d0'}`, padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: p.activo ? '#dc2626' : '#15803d', whiteSpace: 'nowrap' }}>{p.activo ? 'Dar de baja' : 'Dar de alta'}</button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {modal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 300, padding: '24px', overflowY: 'auto' }}>
            <div style={{ background: 'white', borderRadius: '12px', padding: '28px', width: '560px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#0a2540', margin: '0 0 18px' }}>{editar ? `Editar — ${nombre(editar.persona)}` : 'Nuevo paciente dializado'}</h2>
              {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 14px', borderRadius: '7px', fontSize: '13px', marginBottom: '14px' }}>{error}</div>}

              {!editar && (
                <>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={label}>Documento del paciente *</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input value={documento} onChange={e => setDocumento(e.target.value)} onKeyDown={e => e.key === 'Enter' && buscarDoc()} placeholder="Ej: 1234567" style={{ ...input, flex: 1 }} />
                      <button onClick={buscarDoc} disabled={buscando} style={{ padding: '9px 16px', borderRadius: '7px', border: 'none', background: '#0a2540', color: 'white', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>{buscando ? 'Buscando...' : 'Buscar'}</button>
                    </div>
                  </div>
                  {personaEnc && <div style={{ background: '#f0fdf4', border: '0.5px solid #bbf7d0', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '13px' }}>✅ {nombre(personaEnc)} · CI {personaEnc.nro_documento}</div>}
                  {personaNueva && (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ background: '#fff7ed', border: '0.5px solid #fed7aa', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '13px', color: '#c2410c' }}>⚠️ Persona no encontrada. Completá los datos.</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div><label style={label}>Primer nombre *</label><input value={form.primer_nombre} onChange={e => setForm({ ...form, primer_nombre: e.target.value })} style={input} /></div>
                        <div><label style={label}>Segundo nombre</label><input value={form.segundo_nombre} onChange={e => setForm({ ...form, segundo_nombre: e.target.value })} style={input} /></div>
                        <div><label style={label}>Primer apellido *</label><input value={form.primer_apellido} onChange={e => setForm({ ...form, primer_apellido: e.target.value })} style={input} /></div>
                        <div><label style={label}>Segundo apellido</label><input value={form.segundo_apellido} onChange={e => setForm({ ...form, segundo_apellido: e.target.value })} style={input} /></div>
                        <div><label style={label}>Sexo</label><select value={form.sexo} onChange={e => setForm({ ...form, sexo: e.target.value })} style={input}><option value="M">Masculino</option><option value="F">Femenino</option></select></div>
                        <div><label style={label}>Fecha nacimiento</label><input type="date" value={form.fecha_nacimiento} onChange={e => setForm({ ...form, fecha_nacimiento: e.target.value })} style={input} /></div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {(editar || personaEnc || personaNueva) && (
                <>
                  <div style={{ marginBottom: '14px' }}><label style={label}>Centro de diálisis *</label><input value={form.centro_dialisis} onChange={e => setForm({ ...form, centro_dialisis: e.target.value })} placeholder="Ej: Centro de Diálisis San Lorenzo" style={input} /></div>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={label}>Días de sesión</label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {DIAS.map((d, i) => { const n = i + 1; const on = dias.includes(n); return <button key={n} type="button" onClick={() => toggleDia(n)} style={{ padding: '6px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 500, background: on ? '#0a2540' : '#f0f4f8', color: on ? 'white' : '#6b7280' }}>{d}</button>; })}
                    </div>
                  </div>
                  <div style={{ marginBottom: '14px', display: 'grid', gridTemplateColumns: '160px 1fr', gap: '12px' }}>
                    <div><label style={label}>Horario</label><input type="time" value={form.hora_turno} onChange={e => setForm({ ...form, hora_turno: e.target.value })} style={input} /></div>
                    <div><label style={label}>Observación</label><input value={form.observacion} onChange={e => setForm({ ...form, observacion: e.target.value })} style={input} /></div>
                  </div>
                </>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
                <button onClick={() => setModal(false)} style={{ padding: '9px 18px', borderRadius: '7px', border: '0.5px solid #e5e7eb', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#6b7280' }}>Cancelar</button>
                {(editar || personaEnc || personaNueva) && <button onClick={guardar} disabled={guardando} style={{ padding: '9px 18px', borderRadius: '7px', border: 'none', background: '#0a2540', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>{guardando ? 'Guardando...' : editar ? 'Guardar cambios' : 'Registrar paciente'}</button>}
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}