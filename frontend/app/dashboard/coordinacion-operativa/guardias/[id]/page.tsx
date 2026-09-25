'use client';

import { API_URL } from '@/app/lib/api';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { esSoloLectura } from '@/lib/permisos';

interface Tripulante {
  id: number;
  funcion: string;
  usuario: {
    id: number;
    persona: {
      primer_nombre: string;
      primer_apellido: string;
    }
  };
}

interface MovilGuardia {
  id: number;
  estado: string;
  vigencia_inicio: string | null;
  vigencia_fin: string | null;
  movil: { id: number; cod_movil: string; tipo: string };
  base: { id: number; nombre: string };
  tipo_soporte: { id: number; nombre: string };
  tripulacion: Tripulante[];
}

interface Guardia {
  id: number;
  codigo: string;
  tipo: string;
  nombre: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  observacion: string | null;
  usuario: { persona: { primer_nombre: string; primer_apellido: string } };
  rol_guardia_movil: MovilGuardia[];
}

const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const pad = (n: number) => String(n).padStart(2, '0');
// ISO -> valor de <input datetime-local> ('YYYY-MM-DDTHH:mm') en hora local.
const toLocalInput = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const hoyLocal = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T00:00`; };
const fmtRango = (a?: string | null, b?: string | null) => (a && b)
  ? `${new Date(a).toLocaleString('es-PY', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} → ${new Date(b).toLocaleString('es-PY', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`
  : 'sin horario';

export default function GuardiaDetallePage() {
  const { id } = useParams();
  const router = useRouter();
  const [guardia, setGuardia] = useState<Guardia | null>(null);
  const [cargando, setCargando] = useState(true);
  const [modalMovil, setModalMovil] = useState(false);
  const [modalTripulante, setModalTripulante] = useState(false);
  const [movilSeleccionado, setMovilSeleccionado] = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [usuarioRol, setUsuarioRol] = useState('');
  const [confirmandoEliminar, setConfirmandoEliminar] = useState<number | null>(null);
  const [confirmandoEliminarMovil, setConfirmandoEliminarMovil] = useState<number | null>(null);
  const [errorModal, setErrorModal] = useState('');

  const [moviles, setMoviles] = useState<any[]>([]);
  const [bases, setBases] = useState<any[]>([]);
  const [tiposSoporte, setTiposSoporte] = useState<any[]>([]);
  const [personalDisponible, setPersonalDisponible] = useState<any[]>([]);
  const [diaSemana, setDiaSemana] = useState<number>(0);
  const [cargandoPersonal, setCargandoPersonal] = useState(false);

  const [formMovil, setFormMovil] = useState({ vehiculo_id: '', base_id: '', tipo_soporte_id: '', vigencia_inicio: '', vigencia_fin: '' });
  const [formTripulante, setFormTripulante] = useState({ usuario_id: '', funcion: 'PARAMÉDICO' });

  const token = () => localStorage.getItem('token') ?? '';

  const cargarGuardia = () => {
    setCargando(true);
    fetch(`${API_URL}/api/guardias/${id}`, {
      headers: { Authorization: `Bearer ${token()}` }
    })
      .then(r => r.json())
      .then(data => setGuardia(data))
      .catch(err => console.error(err))
      .finally(() => setCargando(false));
  };

  // El personal disponible se calcula para el HORARIO del móvil (respeta la superposición).
  const cargarPersonalDisponible = (movilId: number) => {
    setCargandoPersonal(true);
    fetch(`${API_URL}/api/guardias/${id}/personal-disponible?movil_id=${movilId}`, {
      headers: { Authorization: `Bearer ${token()}` }
    })
      .then(r => r.json())
      .then(data => {
        if (data.personal) {
          setPersonalDisponible(data.personal);
          setDiaSemana(data.dia_semana);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setCargandoPersonal(false));
  };

  useEffect(() => {
    try { setUsuarioRol(JSON.parse(localStorage.getItem('usuario') || '{}').rol ?? ''); } catch {}
    cargarGuardia();
    fetch(`${API_URL}/api/ambulancias`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(data => { if (Array.isArray(data)) setMoviles(data.filter((m: any) => m.activo)); });
    fetch(`${API_URL}/api/bases`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(data => { if (Array.isArray(data)) setBases(data.filter((b: any) => b.activa)); });
    fetch(`${API_URL}/api/tipo-soporte`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(data => { if (Array.isArray(data)) setTiposSoporte(data); })
      .catch(() => setTiposSoporte([
        { id: 1, nombre: 'BÁSICO' },
        { id: 2, nombre: 'SOPORTE AVANZADO' },
        { id: 3, nombre: 'SOPORTE AVANZADO PEDIÁTRICO' }
      ]));
  }, [id]);

  // Al abrir "Agregar móvil" se prellena la vigencia con el rango de la guardia (editable).
  const abrirModalMovil = () => {
    setFormMovil({
      vehiculo_id: '', base_id: '', tipo_soporte_id: '',
      vigencia_inicio: toLocalInput(guardia?.fecha_inicio),
      vigencia_fin: toLocalInput(guardia?.fecha_fin),
    });
    setError('');
    setModalMovil(true);
  };

  const handleAbrirTripulante = (movilId: number) => {
    setMovilSeleccionado(movilId);
    setFormTripulante({ usuario_id: '', funcion: 'PARAMÉDICO' });
    setError('');
    cargarPersonalDisponible(movilId);
    setModalTripulante(true);
  };

  const agregarMovil = async () => {
    if (!formMovil.vehiculo_id || !formMovil.base_id || !formMovil.tipo_soporte_id) {
      setError('Móvil, base y tipo de soporte son obligatorios'); return;
    }
    if (!formMovil.vigencia_inicio || !formMovil.vigencia_fin) {
      setError('Cargá la fecha/hora de inicio y de cierre del móvil'); return;
    }
    if (new Date(formMovil.vigencia_fin) <= new Date(formMovil.vigencia_inicio)) {
      setError('El cierre debe ser posterior al inicio'); return;
    }
    if (new Date(formMovil.vigencia_fin) <= new Date()) {
      setError('El horario del móvil no puede estar en el pasado'); return;
    }
    setGuardando(true); setError('');
    try {
      const res = await fetch(`${API_URL}/api/guardias/${id}/movil`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(formMovil)
      });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Error'); return; }
      cargarGuardia();
      setModalMovil(false);
      setFormMovil({ vehiculo_id: '', base_id: '', tipo_soporte_id: '', vigencia_inicio: '', vigencia_fin: '' });
    } catch { setError('Error de conexión'); }
    finally { setGuardando(false); }
  };

  const agregarTripulante = async () => {
    if (!formTripulante.usuario_id) { setError('Seleccioná un usuario'); return; }
    setGuardando(true); setError('');
    try {
      const res = await fetch(`${API_URL}/api/guardias/movil/${movilSeleccionado}/tripulante`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(formTripulante)
      });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Error'); return; }
      cargarGuardia();
      setModalTripulante(false);
      setFormTripulante({ usuario_id: '', funcion: 'PARAMÉDICO' });
    } catch { setError('Error de conexión'); }
    finally { setGuardando(false); }
  };

  const eliminarTripulante = async (tripulanteId: number) => {
    try {
      await fetch(`${API_URL}/api/guardias/tripulante/${tripulanteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` }
      });
      cargarGuardia();
      setConfirmandoEliminar(null);
    } catch (err) { console.error(err); }
  };

  const eliminarMovilGuardia = async (movilId: number) => {
    try {
      const res = await fetch(`${API_URL}/api/guardias/movil/${movilId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` }
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorModal(data.error ?? 'Error al eliminar móvil');
        return;
      }
      cargarGuardia();
      setConfirmandoEliminarMovil(null);
      setErrorModal('');
    } catch (err) { console.error(err); }
  };

  const getNombre = (persona: any) => `${persona.primer_nombre} ${persona.primer_apellido}`;

  const coloresEstado: Record<string, { bg: string; color: string }> = {
    DISPONIBLE: { bg: '#f0fdf4', color: '#15803d' },
    ASIGNADO: { bg: '#eff6ff', color: '#1d4ed8' },
    EN_CAMINO: { bg: '#fefce8', color: '#a16207' },
    EN_LUGAR: { bg: '#fff7ed', color: '#c2410c' },
    PACIENTE_ABORDO: { bg: '#f5f3ff', color: '#7c3aed' },
    EN_DESTINO: { bg: '#fdf4ff', color: '#a21caf' },
    RETORNA: { bg: '#f0fdf4', color: '#0f766e' },
    FUERA_DE_SERVICIO: { bg: '#fef2f2', color: '#dc2626' },
  };

  const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: '7px', border: '0.5px solid #e5e7eb', fontSize: '13px', boxSizing: 'border-box' as const };
  const labelStyle = { fontSize: '12px', color: '#6b7280', display: 'block' as const, marginBottom: '6px' };

  const puedeEditar = (guardia?.estado === 'PLANIFICADO' || guardia?.estado === 'ACTIVO') && !esSoloLectura(usuarioRol);

  if (cargando) return <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Cargando guardia...</div>;
  if (!guardia) return <div style={{ padding: '40px', textAlign: 'center', color: '#dc2626' }}>Guardia no encontrada</div>;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <div style={{ marginBottom: '6px' }}>
            <button onClick={() => router.push('/dashboard/coordinacion-operativa/guardias')}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '13px', padding: 0 }}>
              ← Volver
            </button>
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: '500', color: '#0a2540', margin: 0 }}>
            {guardia.codigo} {guardia.nombre ? `— ${guardia.nombre}` : ''}
          </h1>
          <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
            📅 {new Date(guardia.fecha_inicio).toLocaleString('es-PY')} → {new Date(guardia.fecha_fin).toLocaleString('es-PY')}
          </p>
          <p style={{ fontSize: '13px', color: '#6b7280' }}>
            👤 Coordinador: {getNombre(guardia.usuario.persona)}
          </p>
        </div>
        {puedeEditar && (
          <button onClick={abrirModalMovil} style={{ background: '#0a2540', color: 'white', border: 'none', padding: '9px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
            + Agregar móvil
          </button>
        )}
      </div>

      {/* Móviles de la guardia */}
      {guardia.rol_guardia_movil.length === 0 ? (
        <div style={{ background: 'white', borderRadius: '10px', padding: '40px', textAlign: 'center', color: '#9ca3af', border: '0.5px solid #e5e7eb' }}>
          No hay móviles asignados a esta guardia
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {guardia.rol_guardia_movil.map(m => (
            <div key={m.id} style={{ background: 'white', borderRadius: '10px', border: '0.5px solid #e5e7eb', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', background: '#f8f9fb', borderBottom: '0.5px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' as const }}>
                  <span style={{ fontSize: '15px', fontWeight: '600', color: '#0a2540' }}>🚑 {m.movil.cod_movil}</span>
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>📍 {m.base.nombre}</span>
                  <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '500' }}>
                    {m.tipo_soporte.nombre}
                  </span>
                  <span style={{ fontSize: '12px', color: '#374151', background: '#f0f4f8', padding: '2px 10px', borderRadius: '20px' }}>
                    ⏰ {fmtRango(m.vigencia_inicio, m.vigencia_fin)}
                  </span>
                  <span style={{
                    background: coloresEstado[m.estado]?.bg ?? '#f9fafb',
                    color: coloresEstado[m.estado]?.color ?? '#6b7280',
                    padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '500'
                  }}>
                    {m.estado.replace(/_/g, ' ')}
                  </span>
                </div>
                {puedeEditar && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleAbrirTripulante(m.id)}
                      style={{ background: 'transparent', border: '0.5px solid #e5e7eb', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: '#374151' }}>
                      + Tripulante
                    </button>
                    <button
                      onClick={() => { setConfirmandoEliminarMovil(m.id); setErrorModal(''); }}
                      style={{ background: 'transparent', border: '0.5px solid #fecaca', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: '#dc2626' }}>
                      Quitar móvil
                    </button>
                  </div>
                )}
              </div>

              <div style={{ padding: '16px 20px' }}>
                {m.tripulacion.length === 0 ? (
                  <div style={{ fontSize: '13px', color: '#9ca3af' }}>Sin tripulación asignada</div>
                ) : (
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' as const }}>
                    {m.tripulacion.map(t => (
                      <div key={t.id} style={{
                        background: t.funcion === 'CONDUCTOR' ? '#fff7ed' : '#f0fdf4',
                        border: `0.5px solid ${t.funcion === 'CONDUCTOR' ? '#fed7aa' : '#bbf7d0'}`,
                        borderRadius: '8px', padding: '10px 14px', minWidth: '180px',
                        position: 'relative' as const
                      }}>
                        <div style={{ fontSize: '11px', fontWeight: '500', color: t.funcion === 'CONDUCTOR' ? '#c2410c' : '#15803d', marginBottom: '4px' }}>
                          {t.funcion}
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: '500', color: '#0a2540', paddingRight: '20px' }}>
                          {getNombre(t.usuario.persona)}
                        </div>
                        {puedeEditar && (
                          <button
                            onClick={() => setConfirmandoEliminar(t.id)}
                            style={{
                              position: 'absolute' as const, top: '6px', right: '6px',
                              background: 'transparent', border: 'none', cursor: 'pointer',
                              fontSize: '12px', color: '#dc2626', padding: '2px 6px',
                              borderRadius: '4px', lineHeight: 1
                            }}>
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal agregar móvil */}
      {modalMovil && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '28px', width: '480px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '500', color: '#0a2540', margin: '0 0 20px' }}>Agregar móvil a la guardia</h2>
            {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 14px', borderRadius: '7px', fontSize: '13px', marginBottom: '16px' }}>{error}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Móvil *</label>
                <select value={formMovil.vehiculo_id} onChange={e => setFormMovil({ ...formMovil, vehiculo_id: e.target.value })} style={inputStyle}>
                  <option value="">Seleccionar móvil...</option>
                  {moviles.map(m => <option key={m.id} value={m.id}>{m.cod_movil} — {m.tipo}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Base *</label>
                <select value={formMovil.base_id} onChange={e => setFormMovil({ ...formMovil, base_id: e.target.value })} style={inputStyle}>
                  <option value="">Seleccionar base...</option>
                  {bases.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Tipo de soporte *</label>
                <select value={formMovil.tipo_soporte_id} onChange={e => setFormMovil({ ...formMovil, tipo_soporte_id: e.target.value })} style={inputStyle}>
                  <option value="">Seleccionar tipo...</option>
                  {tiposSoporte.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Inicio (fecha y hora) *</label>
                  <input type="datetime-local" min={hoyLocal()} value={formMovil.vigencia_inicio} onChange={e => setFormMovil({ ...formMovil, vigencia_inicio: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Cierre (fecha y hora) *</label>
                  <input type="datetime-local" min={formMovil.vigencia_inicio || hoyLocal()} value={formMovil.vigencia_fin} onChange={e => setFormMovil({ ...formMovil, vigencia_fin: e.target.value })} style={inputStyle} />
                </div>
              </div>
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                Fuera de este horario el móvil no aparece en Despacho. El cierre es exclusivo: 06:00 → 06:00 no se superpone con el turno que arranca 06:00.
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
              <button onClick={() => { setModalMovil(false); setError(''); }} style={{ padding: '9px 18px', borderRadius: '7px', border: '0.5px solid #e5e7eb', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#6b7280' }}>Cancelar</button>
              <button onClick={agregarMovil} disabled={guardando} style={{ padding: '9px 18px', borderRadius: '7px', border: 'none', background: '#0a2540', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                {guardando ? 'Guardando...' : 'Agregar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal agregar tripulante */}
      {modalTripulante && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '28px', width: '460px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '500', color: '#0a2540', margin: '0 0 8px' }}>Agregar tripulante</h2>
            {diaSemana > 0 && (
              <div style={{ background: '#eff6ff', border: '0.5px solid #bfdbfe', borderRadius: '7px', padding: '8px 12px', marginBottom: '16px', fontSize: '12px', color: '#1d4ed8' }}>
                📅 Personal disponible para el horario del móvil (día <strong>{DIAS[diaSemana]}</strong>), sin superposición de turnos.
              </div>
            )}
            {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 14px', borderRadius: '7px', fontSize: '13px', marginBottom: '16px' }}>{error}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Función *</label>
                <select value={formTripulante.funcion} onChange={e => setFormTripulante({ ...formTripulante, funcion: e.target.value, usuario_id: '' })} style={inputStyle}>
                  <option value="CONDUCTOR">Conductor</option>
                  <option value="PARAMÉDICO">Paramédico</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Personal * {cargandoPersonal && '(cargando...)'}</label>
                <select value={formTripulante.usuario_id} onChange={e => setFormTripulante({ ...formTripulante, usuario_id: e.target.value })} style={inputStyle}>
                  <option value="">Seleccionar personal...</option>
                  {personalDisponible
                    .filter(u => {
                      // Se tripula según la HABILITACIÓN. Estas relaciones son 1-1 (objeto o null),
                      // NO listas: hay que chequear existencia (!!), no .length.
                      if (formTripulante.funcion === 'CONDUCTOR') return !!u.conductor_habilitado_usuario;
                      if (formTripulante.funcion === 'PARAMÉDICO') return !!u.paramedico_habilitado_usuario;
                      return true;
                    })
                    .map(u => {
                      const esParamConduce = formTripulante.funcion === 'CONDUCTOR' && u.rol.nombre === 'PARAMEDICO';
                      return (
                        <option key={u.id} value={u.id}>
                          {u.persona.primer_nombre} {u.persona.primer_apellido} — {esParamConduce ? 'PARAMÉDICO (habilitado p/ conducir)' : u.rol.nombre}
                        </option>
                      );
                    })}
                </select>
                {!cargandoPersonal && personalDisponible.length === 0 && (
                  <div style={{ fontSize: '12px', color: '#dc2626', marginTop: '6px' }}>
                    ⚠️ No hay personal disponible para ese horario
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
              <button onClick={() => { setModalTripulante(false); setError(''); }} style={{ padding: '9px 18px', borderRadius: '7px', border: '0.5px solid #e5e7eb', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#6b7280' }}>Cancelar</button>
              <button onClick={agregarTripulante} disabled={guardando} style={{ padding: '9px 18px', borderRadius: '7px', border: 'none', background: '#0a2540', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                {guardando ? 'Guardando...' : 'Agregar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar eliminar tripulante */}
      {confirmandoEliminar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '28px', width: '360px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '500', color: '#0a2540', margin: '0 0 12px' }}>¿Eliminar tripulante?</h2>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '24px' }}>Esta acción quitará al funcionario de la guardia.</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setConfirmandoEliminar(null)} style={{ padding: '9px 18px', borderRadius: '7px', border: '0.5px solid #e5e7eb', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#6b7280' }}>Cancelar</button>
              <button onClick={() => eliminarTripulante(confirmandoEliminar)} style={{ padding: '9px 18px', borderRadius: '7px', border: 'none', background: '#dc2626', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar eliminar móvil */}
      {confirmandoEliminarMovil && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '28px', width: '380px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '500', color: '#0a2540', margin: '0 0 12px' }}>¿Quitar móvil de la guardia?</h2>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>El móvil será removido de esta guardia.</p>
            <div style={{ background: '#fff7ed', border: '0.5px solid #fed7aa', borderRadius: '8px', padding: '10px 12px', marginBottom: '16px', fontSize: '12px', color: '#c2410c' }}>
              ⚠️ Si el móvil tiene tripulación asignada, debés eliminarla primero.
            </div>
            {errorModal && (
              <div style={{ background: '#fef2f2', border: '0.5px solid #fecaca', borderRadius: '8px', padding: '10px 12px', marginBottom: '16px', fontSize: '12px', color: '#dc2626' }}>
                {errorModal}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => { setConfirmandoEliminarMovil(null); setErrorModal(''); }} style={{ padding: '9px 18px', borderRadius: '7px', border: '0.5px solid #e5e7eb', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#6b7280' }}>Cancelar</button>
              <button onClick={() => eliminarMovilGuardia(confirmandoEliminarMovil)} style={{ padding: '9px 18px', borderRadius: '7px', border: 'none', background: '#dc2626', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>Quitar móvil</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}