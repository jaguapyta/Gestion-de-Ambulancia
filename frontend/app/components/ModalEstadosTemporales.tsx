'use client';

import { API_URL } from '@/app/lib/api';
import { useEffect, useState } from 'react';

interface EstadoTemporal {
  id: number;
  tipo: string;
  fecha_inicio: string;
  fecha_fin: string;
  dia_semana_nuevo: number | null;
  observacion: string | null;
  activo: boolean;
  usuario_relacionado: { persona: { primer_nombre: string; primer_apellido: string } } | null;
  registrador: { persona: { primer_nombre: string; primer_apellido: string } } | null;
}

interface Props {
  usuarioId: number;
  nombre: string;
  companeros: { id: number; nombre: string }[];
  onCerrar: () => void;
}

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const TIPOS = [
  { valor: 'VACACIONES', label: 'Vacaciones', bg: '#eff6ff', color: '#1d4ed8' },
  { valor: 'EN_REPOSO', label: 'En reposo', bg: '#fff7ed', color: '#c2410c' },
  { valor: 'CAMBIO_GUARDIA_TEMPORAL', label: 'Cambio de guardia', bg: '#f5f3ff', color: '#7c3aed' },
  { valor: 'REEMPLAZO', label: 'Reemplazo', bg: '#f0fdf4', color: '#15803d' },
];

// Tipos que exigen indicar el día de semana al que se mueve / que cubre
const TIPOS_CON_DIA = ['CAMBIO_GUARDIA_TEMPORAL', 'REEMPLAZO'];

// Se parsea solo la parte de fecha como hora local: usar new Date() sobre el ISO
// completo la interpreta en UTC y corre un día para atrás en Paraguay (UTC-3/-4).
const parseFecha = (s: string) => {
  const [a, m, d] = s.split('T')[0].split('-').map(Number);
  return new Date(a, m - 1, d);
};

const fmt = (s: string) => s.split('T')[0].split('-').reverse().join('/');

export default function ModalEstadosTemporales({ usuarioId, nombre, companeros, onCerrar }: Props) {
  const [estados, setEstados] = useState<EstadoTemporal[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  const [form, setForm] = useState({
    tipo: 'VACACIONES',
    fecha_inicio: '',
    fecha_fin: '',
    dia_semana_nuevo: '1',
    usuario_relacionado_id: '',
    observacion: ''
  });

  const token = () => localStorage.getItem('token') ?? '';

  const cargar = () => {
    setCargando(true);
    fetch(`${API_URL}/api/estados-temporales?usuario_id=${usuarioId}&incluir_cancelados=true`, {
      headers: { Authorization: `Bearer ${token()}` }
    })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setEstados(data); })
      .catch(err => console.error(err))
      .finally(() => setCargando(false));
  };

  useEffect(() => { cargar(); }, [usuarioId]);

  const handleGuardar = async () => {
    setError('');
    setExito('');
    if (!form.fecha_inicio || !form.fecha_fin) { setError('Indicá la fecha de inicio y la de fin.'); return; }
    if (parseFecha(form.fecha_fin) < parseFecha(form.fecha_inicio)) {
      setError('La fecha de fin no puede ser anterior a la de inicio.'); return;
    }
    if (form.tipo === 'REEMPLAZO' && !form.usuario_relacionado_id) {
      setError('Indicá a qué funcionario reemplaza.'); return;
    }

    setGuardando(true);
    try {
      const body: Record<string, unknown> = {
        usuario_id: usuarioId,
        tipo: form.tipo,
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin,
        observacion: form.observacion || null
      };
      if (TIPOS_CON_DIA.includes(form.tipo)) body.dia_semana_nuevo = parseInt(form.dia_semana_nuevo);
      if (form.tipo === 'REEMPLAZO') body.usuario_relacionado_id = parseInt(form.usuario_relacionado_id);

      const res = await fetch(`${API_URL}/api/estados-temporales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Error al registrar el estado'); return; }

      setExito('Estado temporal registrado correctamente.');
      setForm({ tipo: 'VACACIONES', fecha_inicio: '', fecha_fin: '', dia_semana_nuevo: '1', usuario_relacionado_id: '', observacion: '' });
      cargar();
    } catch { setError('Error de conexión'); }
    finally { setGuardando(false); }
  };

  const handleCancelar = async (id: number) => {
    setError('');
    setExito('');
    try {
      const res = await fetch(`${API_URL}/api/estados-temporales/${id}/cancelar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` }
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Error al cancelar'); return; }
      setExito('Estado cancelado.');
      cargar();
    } catch { setError('Error de conexión'); }
  };

  const vigencia = (e: EstadoTemporal) => {
    if (!e.activo) return { label: 'Cancelado', bg: '#f3f4f6', color: '#9ca3af' };
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const ini = parseFecha(e.fecha_inicio);
    const fin = parseFecha(e.fecha_fin);
    if (hoy < ini) return { label: 'Programado', bg: '#eff6ff', color: '#1d4ed8' };
    if (hoy > fin) return { label: 'Finalizado', bg: '#f8f9fb', color: '#6b7280' };
    return { label: 'Vigente', bg: '#f0fdf4', color: '#15803d' };
  };

  const infoTipo = (t: string) => TIPOS.find(x => x.valor === t) ?? { label: t, bg: '#f3f4f6', color: '#6b7280' };

  const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: '7px', border: '0.5px solid #e5e7eb', fontSize: '13px', boxSizing: 'border-box' as const };
  const labelStyle = { fontSize: '12px', color: '#6b7280', display: 'block' as const, marginBottom: '6px' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
      <div style={{ background: 'white', borderRadius: '12px', padding: '28px', width: '640px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '500', color: '#0a2540', margin: '0 0 16px' }}>Estados temporales</h2>
        <div style={{ background: '#f8f9fb', borderRadius: '8px', padding: '12px', marginBottom: '20px', fontSize: '13px', color: '#0a2540', fontWeight: '500' }}>
          {nombre}
        </div>

        {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 14px', borderRadius: '7px', fontSize: '13px', marginBottom: '16px' }}>{error}</div>}
        {exito && <div style={{ background: '#f0fdf4', color: '#15803d', padding: '10px 14px', borderRadius: '7px', fontSize: '13px', marginBottom: '16px' }}>{exito}</div>}

        {/* --- Alta --- */}
        <div style={{ border: '0.5px solid #e5e7eb', borderRadius: '10px', padding: '16px', marginBottom: '24px' }}>
          <div style={{ fontSize: '13px', fontWeight: '500', color: '#0a2540', marginBottom: '14px' }}>Registrar nuevo estado</div>

          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Tipo *</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const }}>
              {TIPOS.map(t => (
                <button key={t.valor} type="button" onClick={() => setForm({ ...form, tipo: t.valor })}
                  style={{
                    padding: '6px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '500',
                    background: form.tipo === t.valor ? '#0a2540' : t.bg,
                    color: form.tipo === t.valor ? 'white' : t.color
                  }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={labelStyle}>Fecha de inicio *</label>
              <input type="date" value={form.fecha_inicio} onChange={e => setForm({ ...form, fecha_inicio: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Fecha de fin *</label>
              <input type="date" value={form.fecha_fin} onChange={e => setForm({ ...form, fecha_fin: e.target.value })} style={inputStyle} />
            </div>
          </div>

          {TIPOS_CON_DIA.includes(form.tipo) && (
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>
                {form.tipo === 'REEMPLAZO' ? 'Día que va a cubrir *' : 'Nuevo día de guardia *'}
              </label>
              <select value={form.dia_semana_nuevo} onChange={e => setForm({ ...form, dia_semana_nuevo: e.target.value })} style={inputStyle}>
                {DIAS.map((d, i) => <option key={i} value={i + 1}>{d}</option>)}
              </select>
            </div>
          )}

          {form.tipo === 'REEMPLAZO' && (
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>¿A quién reemplaza? *</label>
              <select value={form.usuario_relacionado_id} onChange={e => setForm({ ...form, usuario_relacionado_id: e.target.value })} style={inputStyle}>
                <option value="">Seleccioná un funcionario...</option>
                {companeros.filter(c => c.id !== usuarioId).map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Observación</label>
            <input value={form.observacion} onChange={e => setForm({ ...form, observacion: e.target.value })}
              placeholder="Motivo o referencia de la autorización" style={inputStyle} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={handleGuardar} disabled={guardando}
              style={{ padding: '9px 18px', borderRadius: '7px', border: 'none', background: '#0a2540', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
              {guardando ? 'Guardando...' : 'Registrar estado'}
            </button>
          </div>
        </div>

        {/* --- Historial --- */}
        <div style={{ fontSize: '13px', fontWeight: '500', color: '#0a2540', marginBottom: '10px' }}>Historial</div>
        {cargando ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>Cargando...</div>
        ) : estados.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>Sin estados temporales registrados</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {estados.map(e => {
              const t = infoTipo(e.tipo);
              const v = vigencia(e);
              return (
                <div key={e.id} style={{ border: '0.5px solid #e5e7eb', borderRadius: '8px', padding: '12px 14px', opacity: e.activo ? 1 : 0.6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span style={{ background: t.bg, color: t.color, padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '500' }}>{t.label}</span>
                      <span style={{ background: v.bg, color: v.color, padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '500' }}>{v.label}</span>
                    </div>
                    {e.activo && (
                      <button onClick={() => handleCancelar(e.id)}
                        style={{ background: 'transparent', border: '0.5px solid #fecaca', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', color: '#dc2626' }}>
                        Cancelar
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: '13px', color: '#0a2540' }}>
                    {fmt(e.fecha_inicio)} — {fmt(e.fecha_fin)}
                    {e.dia_semana_nuevo && <span style={{ color: '#6b7280' }}> · {DIAS[e.dia_semana_nuevo - 1]}</span>}
                  </div>
                  {e.usuario_relacionado && (
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                      Reemplaza a {e.usuario_relacionado.persona.primer_nombre} {e.usuario_relacionado.persona.primer_apellido}
                    </div>
                  )}
                  {e.observacion && <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{e.observacion}</div>}
                  {e.registrador && (
                    <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                      Registrado por {e.registrador.persona.primer_nombre} {e.registrador.persona.primer_apellido}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button onClick={onCerrar}
            style={{ padding: '9px 18px', borderRadius: '7px', border: '0.5px solid #e5e7eb', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#6b7280' }}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}