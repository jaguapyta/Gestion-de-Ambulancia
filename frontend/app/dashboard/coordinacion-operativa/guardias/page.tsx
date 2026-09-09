'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Guardia {
  id: number;
  codigo: string;
  tipo: string;
  nombre: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  observacion: string | null;
  usuario: {
    persona: {
      primer_nombre: string;
      primer_apellido: string;
    }
  };
  rol_guardia_movil: any[];
}

// Compat: los registros viejos pueden tener TURNO_REGULAR / COBERTURA_ESPECIAL.
const esEspecial = (t: string) => t === 'ESPECIAL' || t === 'COBERTURA_ESPECIAL';
const pad = (n: number) => String(n).padStart(2, '0');
// datetime-local usa hora local sin zona: mínimo = hoy a las 00:00 (permite la guardia en curso, bloquea días pasados).
const hoyLocal = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T00:00`; };

export default function GuardiasPage() {
  const router = useRouter();
  const [guardias, setGuardias] = useState<Guardia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [usuario, setUsuario] = useState<any>(null);

  const [form, setForm] = useState({
    tipo: 'ESTANDAR',
    nombre: '',
    coordinador_id: '',
    fecha_inicio: '',
    fecha_fin: '',
    observacion: ''
  });

  const cargarGuardias = () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setCargando(true);
    fetch('http://localhost:3001/api/guardias', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setGuardias(data); })
      .catch(err => console.error(err))
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    cargarGuardias();
    const userData = localStorage.getItem('usuario');
    if (userData) {
      const user = JSON.parse(userData);
      setUsuario(user);
      setForm(prev => ({ ...prev, coordinador_id: String(user.id) }));
    }
  }, []);

  const handleGuardar = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    if (!form.coordinador_id || !form.fecha_inicio || !form.fecha_fin) {
      setError('Fecha inicio y fecha fin son obligatorios.');
      return;
    }
    if (form.tipo === 'ESPECIAL' && !form.nombre) {
      setError('El nombre del evento es obligatorio para una guardia Especial.');
      return;
    }
    if (new Date(form.fecha_fin) <= new Date(form.fecha_inicio)) {
      setError('La fecha de cierre debe ser posterior a la de inicio.');
      return;
    }
    if (new Date(form.fecha_fin) <= new Date()) {
      setError('No se puede crear una guardia que ya finalizó (fecha en el pasado).');
      return;
    }
    setGuardando(true);
    setError('');
    try {
      const res = await fetch('http://localhost:3001/api/guardias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Error al crear guardia'); return; }
      cargarGuardias();
      setModalAbierto(false);
      router.push(`/dashboard/coordinacion-operativa/guardias/${data.id}`);
    } catch { setError('Error de conexión'); }
    finally { setGuardando(false); }
  };

  const cambiarEstado = async (id: number, estado: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await fetch(`http://localhost:3001/api/guardias/${id}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ estado })
      });
      cargarGuardias();
    } catch (err) { console.error(err); }
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setError('');
    setForm(prev => ({
      tipo: 'ESTANDAR',
      nombre: '',
      coordinador_id: prev.coordinador_id,
      fecha_inicio: '',
      fecha_fin: '',
      observacion: ''
    }));
  };

  const coloresEstado: Record<string, { bg: string; color: string }> = {
    PLANIFICADO: { bg: '#eff6ff', color: '#1d4ed8' },
    ACTIVO: { bg: '#f0fdf4', color: '#15803d' },
    CERRADO: { bg: '#f9fafb', color: '#6b7280' },
  };

  const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: '7px', border: '0.5px solid #e5e7eb', fontSize: '13px', boxSizing: 'border-box' as const };
  const inputReadOnly = { ...inputStyle, background: '#f8f9fb', color: '#6b7280', cursor: 'not-allowed' as const };
  const labelStyle = { fontSize: '12px', color: '#6b7280', display: 'block' as const, marginBottom: '6px' };

  const getNombre = (u: any) => `${u.persona.primer_nombre} ${u.persona.primer_apellido}`;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '500', color: '#0a2540', margin: 0 }}>Guardias</h1>
          <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>Agrupador de móviles de guardia · la disponibilidad la define el horario de cada móvil</p>
        </div>
        <button onClick={() => setModalAbierto(true)} style={{ background: '#0a2540', color: 'white', border: 'none', padding: '9px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
          + Nueva guardia
        </button>
      </div>

      {/* Cards resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Total', value: guardias.length, color: '#0a2540' },
          { label: 'Planificadas', value: guardias.filter(g => g.estado === 'PLANIFICADO').length, color: '#1d4ed8' },
          { label: 'Activas', value: guardias.filter(g => g.estado === 'ACTIVO').length, color: '#15803d' },
          { label: 'Cerradas', value: guardias.filter(g => g.estado === 'CERRADO').length, color: '#6b7280' },
        ].map(card => (
          <div key={card.label} style={{ background: 'white', borderRadius: '10px', padding: '16px', border: '0.5px solid #e5e7eb', borderTop: `3px solid ${card.color}` }}>
            <div style={{ fontSize: '24px', fontWeight: '500', color: card.color }}>{card.value}</div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Lista de guardias */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {cargando ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Cargando guardias...</div>
        ) : guardias.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', background: 'white', borderRadius: '10px', border: '0.5px solid #e5e7eb' }}>
            No hay guardias registradas
          </div>
        ) : guardias.map(g => (
          <div key={g.id} style={{ background: 'white', borderRadius: '10px', padding: '20px', border: '0.5px solid #e5e7eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' as const }}>
                  <span style={{ fontSize: '15px', fontWeight: '600', color: '#0a2540' }}>{g.codigo}</span>
                  {g.nombre && <span style={{ fontSize: '13px', color: '#6b7280' }}>— {g.nombre}</span>}
                  <span style={{
                    background: esEspecial(g.tipo) ? '#fff7ed' : '#f0f4f8',
                    color: esEspecial(g.tipo) ? '#c2410c' : '#0a2540',
                    padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '500'
                  }}>
                    {esEspecial(g.tipo) ? 'Especial por evento' : 'Estándar por fecha'}
                  </span>
                  <span style={{
                    background: coloresEstado[g.estado]?.bg ?? '#f9fafb',
                    color: coloresEstado[g.estado]?.color ?? '#6b7280',
                    padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '500'
                  }}>
                    {g.estado}
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>
                  📅 {new Date(g.fecha_inicio).toLocaleString('es-PY')} → {new Date(g.fecha_fin).toLocaleString('es-PY')}
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>
                  👤 Coordinador: {getNombre(g.usuario)} | 🚑 {g.rol_guardia_movil.length} móvil(es)
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => router.push(`/dashboard/coordinacion-operativa/guardias/${g.id}`)}
                  style={{ background: '#0a2540', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                  Ver detalle
                </button>
                {g.estado === 'PLANIFICADO' && (
                  <button onClick={() => cambiarEstado(g.id, 'ACTIVO')}
                    style={{ background: '#15803d', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                    Activar
                  </button>
                )}
                {g.estado === 'ACTIVO' && (
                  <button onClick={() => cambiarEstado(g.id, 'CERRADO')}
                    style={{ background: '#dc2626', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
                    Cerrar guardia
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal nueva guardia */}
      {modalAbierto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '28px', width: '520px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '500', color: '#0a2540', margin: '0 0 20px' }}>Nueva guardia</h2>
            {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 14px', borderRadius: '7px', fontSize: '13px', marginBottom: '16px' }}>{error}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Tipo *</label>
                <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} style={inputStyle}>
                  <option value="ESTANDAR">Estándar por fecha</option>
                  <option value="ESPECIAL">Especial por evento</option>
                </select>
              </div>

              {form.tipo === 'ESPECIAL' && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Nombre del evento *</label>
                  <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: RALLY DEL CHACO 2026" style={inputStyle} />
                </div>
              )}

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Coordinador</label>
                <input value={usuario?.nombre ?? 'Cargando...'} readOnly style={inputReadOnly} />
              </div>

              <div>
                <label style={labelStyle}>Fecha y hora inicio *</label>
                <input type="datetime-local" min={hoyLocal()} value={form.fecha_inicio} onChange={e => setForm({ ...form, fecha_inicio: e.target.value })} style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Fecha y hora fin *</label>
                <input type="datetime-local" min={form.fecha_inicio || hoyLocal()} value={form.fecha_fin} onChange={e => setForm({ ...form, fecha_fin: e.target.value })} style={inputStyle} />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Observación</label>
                <textarea value={form.observacion} onChange={e => setForm({ ...form, observacion: e.target.value })}
                  placeholder="Observaciones adicionales..." rows={3}
                  style={{ ...inputStyle, resize: 'vertical' as const }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
              <button onClick={cerrarModal} style={{ padding: '9px 18px', borderRadius: '7px', border: '0.5px solid #e5e7eb', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#6b7280' }}>Cancelar</button>
              <button onClick={handleGuardar} disabled={guardando} style={{ padding: '9px 18px', borderRadius: '7px', border: 'none', background: '#0a2540', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                {guardando ? 'Guardando...' : 'Crear guardia'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}