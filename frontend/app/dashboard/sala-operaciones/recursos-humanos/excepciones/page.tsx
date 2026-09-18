'use client';

import { API_URL } from '@/app/lib/api';
import { useEffect, useState } from 'react';

interface Excepcion {
  id: number;
  usuario_id: number;
  usuario_nombre: string;
  rol: string;
  vigencia_inicio: string;
  vigencia_fin: string;
  motivo: string;
  autorizador_nombre: string;
  activo: boolean;
  vigente: boolean;
}

interface OpcionUsuario { usuario_id: number; nombre: string; rol: string; }

export default function ExcepcionesPage() {
  const [excepciones, setExcepciones] = useState<Excepcion[]>([]);
  const [usuarios, setUsuarios] = useState<OpcionUsuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ usuario_id: '', vigencia_inicio: '', vigencia_fin: '', motivo: '' });

  const token = () => localStorage.getItem('token');

  const cargar = () => {
    if (!token()) return;
    setCargando(true);
    fetch(`${API_URL}/api/excepciones-acceso`, { headers: { Authorization: `Bearer ${token()}` } })
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setExcepciones(data); })
      .catch((err) => console.error(err))
      .finally(() => setCargando(false));
  };

  const cargarUsuarios = async () => {
    if (!token()) return;
    try {
      const [arm, med] = await Promise.all([
        fetch(`${API_URL}/api/arm`, { headers: { Authorization: `Bearer ${token()}` } }).then((r) => r.json()),
        fetch(`${API_URL}/api/medicos`, { headers: { Authorization: `Bearer ${token()}` } }).then((r) => r.json()),
      ]);
      const mapear = (lista: any[], rol: string): OpcionUsuario[] =>
        (Array.isArray(lista) ? lista : [])
          .filter((x) => x.usuario && x.usuario.activo)
          .map((x) => ({
            usuario_id: x.usuario.id,
            nombre: `${x.usuario.persona.primer_nombre} ${x.usuario.persona.primer_apellido}`,
            rol,
          }));
      setUsuarios([...mapear(arm, 'ARM'), ...mapear(med, 'Médico regulador')]);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { cargar(); cargarUsuarios(); }, []);

  const fmt = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('es-PY', {
        timeZone: 'America/Asuncion',
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
      });
    } catch { return iso; }
  };

  const handleGuardar = async () => {
    if (!form.usuario_id || !form.vigencia_inicio || !form.vigencia_fin || !form.motivo.trim()) {
      setError('Completá usuario, vigencia y motivo.'); return;
    }
    setGuardando(true); setError('');
    try {
      const res = await fetch(`${API_URL}/api/excepciones-acceso`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Error al guardar'); return; }
      setModalAbierto(false);
      setForm({ usuario_id: '', vigencia_inicio: '', vigencia_fin: '', motivo: '' });
      cargar();
    } catch { setError('Error de conexión'); }
    finally { setGuardando(false); }
  };

  const revocar = async (id: number) => {
    if (!token()) return;
    try {
      await fetch(`${API_URL}/api/excepciones-acceso/${id}/revocar`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token()}` },
      });
      cargar();
    } catch (err) { console.error(err); }
  };

  const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: '7px', border: '0.5px solid #e5e7eb', fontSize: '13px', boxSizing: 'border-box' as const };
  const labelStyle = { fontSize: '12px', color: '#6b7280', display: 'block' as const, marginBottom: '6px' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '500', color: '#0a2540', margin: 0 }}>Excepciones de acceso</h1>
          <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>Autorizar el ingreso de un ARM o médico regulador fuera de su turno de guardia</p>
        </div>
        <button onClick={() => { setError(''); setModalAbierto(true); }} style={{ background: '#0a2540', color: 'white', border: 'none', padding: '9px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
          + Otorgar excepción
        </button>
      </div>

      <div style={{ background: 'white', borderRadius: '10px', border: '0.5px solid #e5e7eb', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
          <thead>
            <tr style={{ background: '#f8f9fb', borderBottom: '0.5px solid #e5e7eb' }}>
              {['Usuario', 'Rol', 'Desde', 'Hasta', 'Motivo', 'Autorizó', 'Estado', 'Acciones'].map((col) => (
                <th key={col} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', color: '#6b7280', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>Cargando...</td></tr>
            ) : excepciones.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>No hay excepciones registradas</td></tr>
            ) : excepciones.map((e) => {
              const estado = !e.activo ? { txt: 'Revocada', bg: '#f3f4f6', fg: '#6b7280' }
                : e.vigente ? { txt: 'Vigente', bg: '#f0fdf4', fg: '#15803d' }
                : { txt: 'Programada / vencida', bg: '#fffbeb', fg: '#b45309' };
              return (
                <tr key={e.id} style={{ borderBottom: '0.5px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '500', color: '#0a2540' }}>{e.usuario_nombre}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>{e.rol}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151', whiteSpace: 'nowrap' }}>{fmt(e.vigencia_inicio)}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151', whiteSpace: 'nowrap' }}>{fmt(e.vigencia_fin)}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280', maxWidth: '240px' }}>{e.motivo}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>{e.autorizador_nombre}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ background: estado.bg, color: estado.fg, padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '500', whiteSpace: 'nowrap' }}>{estado.txt}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {e.activo && (
                      <button onClick={() => revocar(e.id)} style={{ background: 'transparent', border: '0.5px solid #fecaca', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: '#dc2626' }}>Revocar</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modalAbierto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '28px', width: '480px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '500', color: '#0a2540', margin: '0 0 20px' }}>Otorgar excepción de acceso</h2>
            {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 14px', borderRadius: '7px', fontSize: '13px', marginBottom: '16px' }}>{error}</div>}
            <div style={{ display: 'grid', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Usuario (ARM / médico regulador) *</label>
                <select value={form.usuario_id} onChange={(e) => setForm({ ...form, usuario_id: e.target.value })} style={inputStyle}>
                  <option value="">Seleccionar...</option>
                  {usuarios.map((u) => (
                    <option key={u.usuario_id} value={u.usuario_id}>{u.nombre} — {u.rol}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Desde *</label>
                <input type="datetime-local" value={form.vigencia_inicio} onChange={(e) => setForm({ ...form, vigencia_inicio: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Hasta *</label>
                <input type="datetime-local" value={form.vigencia_fin} onChange={(e) => setForm({ ...form, vigencia_fin: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Motivo *</label>
                <textarea value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} rows={3} placeholder="Ej: cubre guardia de un colega ausente" style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
              <button onClick={() => setModalAbierto(false)} style={{ padding: '9px 18px', borderRadius: '7px', border: '0.5px solid #e5e7eb', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#6b7280' }}>Cancelar</button>
              <button onClick={handleGuardar} disabled={guardando} style={{ padding: '9px 18px', borderRadius: '7px', border: 'none', background: '#0a2540', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                {guardando ? 'Guardando...' : 'Otorgar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}