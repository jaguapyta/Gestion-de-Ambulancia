'use client';

import { API_URL } from '@/app/lib/api';
import { useEffect, useState } from 'react';
import ModalReciboCombustible from '../../../components/ModalReciboCombustible';
import { esSoloLectura } from '@/lib/permisos';
import { imprimirDesdePlantilla } from '@/app/lib/plantillas';

interface Orden {
  id: number;
  nro_orden: string;
  tipo: string;
  estado: string;
  area_asignada: string;
  fecha_inicio: string;
  fecha_fin: string;
  hora_inicio: string;
  hora_fin: string;
  km_salida: number | null;
  km_llegada: number | null;
  km_estimado: number | null;
  trabajos: string | null;
  created_at: string;
  movil: {
    cod_movil: string;
    placa: string | null;
    tipo: string;
    marca: string | null;
    modelo: string | null;
    rasp: string | null;
    nro_orden: string | null;
    consumo_l100km: number | null;
    nro_tarjeta_combustible: string | null;
    tipo_combustible?: string | null;
  };
  conductor: {
    id: number;
    persona: { primer_nombre: string; primer_apellido: string; nro_documento: string; };
  };
  creador: {
    persona: { primer_nombre: string; primer_apellido: string; };
  };
}

interface MovilGuardia {
  rol_guardia_movil_id: number;
  movil: any;
  conductor: any;
  fecha_inicio: string;
  fecha_fin: string;
}

export default function OrdenesPage() {
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalCerrarAbierto, setModalCerrarAbierto] = useState(false);
  const [ordenSeleccionada, setOrdenSeleccionada] = useState<Orden | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [kmLlegada, setKmLlegada] = useState('');
  const [modoGuardia, setModoGuardia] = useState(false);
  const [guardiaData, setGuardiaData] = useState<any>(null);
  const [movilGuardiaSeleccionado, setMovilGuardiaSeleccionado] = useState<MovilGuardia | null>(null);
  const [cargandoGuardia, setCargandoGuardia] = useState(false);
  const [reciboOrden, setReciboOrden] = useState<Orden | null>(null);
  const [jefeTransporte, setJefeTransporte] = useState('Jefe de Transporte');
  const [soloLectura, setSoloLectura] = useState(false);

  const [moviles, setMoviles] = useState<any[]>([]);
  const [conductores, setConductores] = useState<any[]>([]);

  const [form, setForm] = useState({
    tipo: 'ORDINARIO',
    movil_id: '',
    conductor_id: '',
    area_asignada: 'Dpto. de Transporte',
    fecha_inicio: '',
    fecha_fin: '',
    hora_inicio: '07:00',
    hora_fin: '07:00',
    km_salida: '',
    km_estimado: ''
  });

  const token = () => localStorage.getItem('token') ?? '';

  const cargarOrdenes = () => {
    setCargando(true);
    fetch(`${API_URL}/api/ordenes`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setOrdenes(data); })
      .catch(err => console.error(err))
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    try { setSoloLectura(esSoloLectura(JSON.parse(localStorage.getItem('usuario') || '{}').rol)); } catch {}
    cargarOrdenes();
    fetch(`${API_URL}/api/ambulancias`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setMoviles(data.filter((m: any) => m.activo)); });
    fetch(`${API_URL}/api/conductores`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setConductores(data.filter((c: any) => c.activo)); });
    fetch(`${API_URL}/api/configuracion`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(c => { if (c?.jefe_transporte) setJefeTransporte(c.jefe_transporte); });
  }, []);

  const filtrados = ordenes.filter(o =>
    o.nro_orden.includes(busqueda) ||
    o.movil.cod_movil.toLowerCase().includes(busqueda.toLowerCase()) ||
    `${o.conductor.persona.primer_nombre} ${o.conductor.persona.primer_apellido}`.toLowerCase().includes(busqueda.toLowerCase())
  );

  const cargarGuardiaActiva = async () => {
    setCargandoGuardia(true);
    try {
      const res = await fetch(`${API_URL}/api/ordenes/guardia-activa`, { headers: { Authorization: `Bearer ${token()}` } });
      if (!res.ok) { setError('No hay guardia activa en este momento.'); setModoGuardia(false); return; }
      const data = await res.json();
      setGuardiaData(data);
      setModoGuardia(true);
      setError('');
    } catch { setError('Error de conexión'); }
    finally { setCargandoGuardia(false); }
  };

  const handleSeleccionarMovilGuardia = (movil: MovilGuardia) => {
    setMovilGuardiaSeleccionado(movil);
    const fechaInicio = new Date(movil.fecha_inicio);
    const fechaFin = new Date(movil.fecha_fin);
    setForm({
      tipo: 'ORDINARIO',
      movil_id: String(movil.movil.id),
      conductor_id: String(movil.conductor.id),
      area_asignada: 'Dpto. de Transporte',
      fecha_inicio: fechaInicio.toISOString().split('T')[0],
      fecha_fin: fechaFin.toISOString().split('T')[0],
      hora_inicio: `${String(fechaInicio.getHours()).padStart(2, '0')}:${String(fechaInicio.getMinutes()).padStart(2, '0')}`,
      hora_fin: `${String(fechaFin.getHours()).padStart(2, '0')}:${String(fechaFin.getMinutes()).padStart(2, '0')}`,
      km_salida: movil.movil.ultimo_km?.toString() ?? '',
      km_estimado: ''
    });
    setModoGuardia(false);
  };

  const handleGuardar = async () => {
    if (!form.movil_id || !form.conductor_id || !form.fecha_inicio || !form.fecha_fin) {
      setError('Móvil, conductor y fechas son obligatorios.'); return;
    }
    setGuardando(true); setError('');
    try {
      const res = await fetch(`${API_URL}/api/ordenes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Error al crear orden'); return; }
      cargarOrdenes();
      setModalAbierto(false);
      cerrarModalNuevo();
    } catch { setError('Error de conexión'); }
    finally { setGuardando(false); }
  };

  const handleCerrar = async () => {
    if (!ordenSeleccionada) return;
    setGuardando(true);
    try {
      const res = await fetch(`${API_URL}/api/ordenes/${ordenSeleccionada.id}/cerrar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ km_llegada: kmLlegada })
      });
      if (!res.ok) { setError('Error al cerrar orden'); return; }
      cargarOrdenes();
      setModalCerrarAbierto(false);
      setOrdenSeleccionada(null);
      setKmLlegada('');
    } catch { setError('Error de conexión'); }
    finally { setGuardando(false); }
  };

  const cerrarModalNuevo = () => {
    setForm({ tipo: 'ORDINARIO', movil_id: '', conductor_id: '', area_asignada: 'Dpto. de Transporte', fecha_inicio: '', fecha_fin: '', hora_inicio: '07:00', hora_fin: '07:00', km_salida: '', km_estimado: '' });
    setError('');
    setModoGuardia(false);
    setGuardiaData(null);
    setMovilGuardiaSeleccionado(null);
  };

  const getNombreConductor = (o: Orden) =>
    `${o.conductor.persona.primer_nombre} ${o.conductor.persona.primer_apellido}`;

  const getNombreUsuario = (u: any) =>
    `${u.usuario.persona.primer_nombre} ${u.usuario.persona.primer_apellido}`;

  const imprimirOrdenTrabajo = (orden: Orden) => {
    const gen = new Date(orden.created_at).toLocaleString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const usuarioGen = `${orden.creador?.persona?.primer_nombre ?? ''} ${orden.creador?.persona?.primer_apellido ?? ''}`.trim() || '—';
    const kmTotal = orden.km_llegada && orden.km_salida ? (orden.km_llegada - orden.km_salida).toLocaleString() : '';
    imprimirDesdePlantilla('ORDEN', {
      logo: `${location.origin}/logo-seme.png`,
      nro_orden: orden.nro_orden,
      tipo_ord_x: orden.tipo === 'ORDINARIO' ? 'X' : '',
      tipo_ext_x: orden.tipo === 'EXTRAORDINARIO' ? 'X' : '',
      vehiculo_tipo: orden.movil.tipo,
      chapa: orden.movil.placa ?? '—',
      marca: orden.movil.marca ?? '—',
      modelo: orden.movil.modelo ?? '—',
      cod_movil: orden.movil.cod_movil,
      rasp: orden.movil.rasp ?? 'EN TRAMITE',
      area: orden.area_asignada,
      nro_orden_asignado: orden.movil.nro_orden ?? 'EN TRAMITE',
      conductor: getNombreConductor(orden).toUpperCase(),
      ci: orden.conductor.persona.nro_documento,
      fecha_inicio: new Date(orden.fecha_inicio).toLocaleDateString('es-PY'),
      fecha_fin: new Date(orden.fecha_fin).toLocaleDateString('es-PY'),
      hora_inicio: orden.hora_inicio,
      hora_fin: orden.hora_fin,
      km_salida: orden.km_salida?.toLocaleString() ?? '',
      km_llegada: orden.km_llegada?.toLocaleString() ?? '',
      km_total: kmTotal,
      km_estimado: orden.km_estimado?.toLocaleString() ?? '',
      consumo: orden.movil.consumo_l100km?.toString() ?? '',
      trabajos: orden.trabajos ?? '',
      jefe: jefeTransporte,
      generado: gen,
      usuario: usuarioGen,
    }, token());
  };

  const imprimirAnexoIII = (orden: Orden) => {
    const esNafta = (orden.movil.tipo_combustible ?? 'GASOIL') === 'NAFTA';
    const gen = new Date(orden.created_at).toLocaleString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const usuarioGen = `${orden.creador?.persona?.primer_nombre ?? ''} ${orden.creador?.persona?.primer_apellido ?? ''}`.trim() || '—';
    const fInicio = new Date(orden.fecha_inicio).toLocaleDateString('es-PY');
    const fFin = new Date(orden.fecha_fin).toLocaleDateString('es-PY');
    const kmTotal = orden.km_llegada && orden.km_salida ? (orden.km_llegada - orden.km_salida).toLocaleString() : '';
    const filaDatos = `<tr><td>${fInicio}</td><td>${fFin}</td><td></td><td>${orden.km_salida?.toLocaleString() ?? ''}</td><td>${orden.km_llegada?.toLocaleString() ?? ''}</td><td>${kmTotal}</td><td></td><td></td></tr>`;
    const filasBlanco = Array.from({ length: 20 }).map(() => '<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>').join('');
    imprimirDesdePlantilla('ANEXO_III', {
      logo: `${location.origin}/logo-seme.png`,
      nro_orden: orden.nro_orden,
      fecha_inicio: fInicio,
      vehiculo_tipo: orden.movil.tipo,
      chapa: orden.movil.placa ?? '—',
      comb_nafta_x: esNafta ? 'X' : '',
      comb_gasoil_x: esNafta ? '' : 'X',
      cod_movil: orden.movil.cod_movil,
      rasp: orden.movil.rasp ?? 'EN TRAMITE',
      marca: orden.movil.marca ?? '—',
      modelo: orden.movil.modelo ?? '—',
      nro_orden_asignado: orden.movil.nro_orden ?? 'EN TRAMITE',
      consumo: orden.movil.consumo_l100km?.toString() ?? '—',
      filas_anexo: filaDatos + filasBlanco,
      conductor: getNombreConductor(orden).toUpperCase(),
      ci: orden.conductor.persona.nro_documento,
      jefe: jefeTransporte,
      generado: gen,
      usuario: usuarioGen,
    }, token());
  };

  const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: '7px', border: '0.5px solid #e5e7eb', fontSize: '13px', boxSizing: 'border-box' as const };
  const labelStyle = { fontSize: '12px', color: '#6b7280', display: 'block' as const, marginBottom: '6px' };

  const movilSeleccionadoData = moviles.find(m => String(m.id) === form.movil_id);
  const conductorSeleccionadoData = conductores.find(c => String(c.usuario.id) === form.conductor_id);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '500', color: '#0a2540', margin: 0 }}>Órdenes de trabajo</h1>
          <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>Gestión de órdenes de trabajo de transporte</p>
        </div>
        {!soloLectura && (
          <button onClick={() => setModalAbierto(true)} style={{ background: '#0a2540', color: 'white', border: 'none', padding: '9px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
            + Nueva orden
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Total', value: ordenes.length, color: '#0a2540' },
          { label: 'Activas', value: ordenes.filter(o => o.estado === 'ACTIVA').length, color: '#15803d' },
          { label: 'Cerradas', value: ordenes.filter(o => o.estado === 'CERRADA').length, color: '#6b7280' },
          { label: 'Ordinarias', value: ordenes.filter(o => o.tipo === 'ORDINARIO').length, color: '#1d4ed8' },
          { label: 'Extraordinarias', value: ordenes.filter(o => o.tipo === 'EXTRAORDINARIO').length, color: '#c2410c' },
        ].map(card => (
          <div key={card.label} style={{ background: 'white', borderRadius: '10px', padding: '16px', border: '0.5px solid #e5e7eb', borderTop: `3px solid ${card.color}` }}>
            <div style={{ fontSize: '24px', fontWeight: '500', color: card.color }}>{card.value}</div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{card.label}</div>
          </div>
        ))}
      </div>

      <input type="text" placeholder="Buscar por nro orden, móvil o conductor..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '0.5px solid #e5e7eb', fontSize: '14px', boxSizing: 'border-box', marginBottom: '16px', outline: 'none' }} />

      <div style={{ background: 'white', borderRadius: '10px', border: '0.5px solid #e5e7eb', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1000px' }}>
          <thead>
            <tr style={{ background: '#f8f9fb', borderBottom: '0.5px solid #e5e7eb' }}>
              {['Nro Orden', 'Tipo', 'Móvil', 'Conductor', 'Fecha inicio', 'Fecha fin', 'Km salida', 'Km llegada', 'Estado', 'Acciones'].map(col => (
                <th key={col} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', color: '#6b7280', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Cargando órdenes...</td></tr>
            ) : filtrados.length === 0 ? (
              <tr><td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>No se encontraron órdenes</td></tr>
            ) : filtrados.map(o => (
              <tr key={o.id} style={{ borderBottom: '0.5px solid #f3f4f6' }}>
                <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#0a2540' }}>{o.nro_orden}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ background: o.tipo === 'ORDINARIO' ? '#eff6ff' : '#fff7ed', color: o.tipo === 'ORDINARIO' ? '#1d4ed8' : '#c2410c', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '500' }}>{o.tipo}</span>
                </td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#0a2540', fontWeight: '500' }}>{o.movil.cod_movil}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>{getNombreConductor(o)}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>{new Date(o.fecha_inicio).toLocaleDateString('es-PY')} {o.hora_inicio}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>{new Date(o.fecha_fin).toLocaleDateString('es-PY')} {o.hora_fin}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>{o.km_salida?.toLocaleString() ?? '—'}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>{o.km_llegada?.toLocaleString() ?? '—'}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ background: o.estado === 'ACTIVA' ? '#f0fdf4' : '#f9fafb', color: o.estado === 'ACTIVA' ? '#15803d' : '#6b7280', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '500' }}>{o.estado}</span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' as const }}>
                    <button onClick={() => imprimirOrdenTrabajo(o)} style={{ background: 'transparent', border: '0.5px solid #e5e7eb', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', color: '#374151' }}>🖨️ Orden</button>
                    <button onClick={() => imprimirAnexoIII(o)} style={{ background: 'transparent', border: '0.5px solid #e5e7eb', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', color: '#374151' }}>🖨️ Anexo III</button>
                    {!soloLectura && (
                      <button onClick={() => setReciboOrden(o)} style={{ background: 'transparent', border: '0.5px solid #e5e7eb', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', color: '#0a2540' }}>🧾 Recibo</button>
                    )}
                    {!soloLectura && o.estado === 'ACTIVA' && (
                      <button onClick={() => { setOrdenSeleccionada(o); setModalCerrarAbierto(true); }} style={{ background: 'transparent', border: '0.5px solid #fecaca', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', color: '#dc2626' }}>Cerrar</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal nueva orden */}
      {modalAbierto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '28px', width: '600px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '500', color: '#0a2540', margin: '0 0 16px' }}>Nueva orden de trabajo</h2>
            {!form.movil_id && (
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <button onClick={cargarGuardiaActiva} disabled={cargandoGuardia} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '0.5px solid #e5e7eb', background: '#f0f4f8', cursor: 'pointer', fontSize: '13px', fontWeight: '500', color: '#0a2540' }}>
                  {cargandoGuardia ? 'Cargando...' : '📋 Estirar desde guardia activa'}
                </button>
                <button onClick={() => setModoGuardia(false)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '0.5px solid #e5e7eb', background: '#f0f4f8', cursor: 'pointer', fontSize: '13px', fontWeight: '500', color: '#0a2540' }}>
                  ✍️ Ingresar manualmente
                </button>
              </div>
            )}
            {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 14px', borderRadius: '7px', fontSize: '13px', marginBottom: '16px' }}>{error}</div>}
            {modoGuardia && guardiaData && (
              <div>
                <div style={{ background: '#eff6ff', border: '0.5px solid #bfdbfe', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '13px', color: '#1d4ed8' }}>
                  📋 Guardia <strong>{guardiaData.codigo}</strong> — Seleccioná un móvil con conductor asignado
                </div>
                {guardiaData.moviles.length === 0 ? (
                  <div style={{ fontSize: '13px', color: '#9ca3af', textAlign: 'center', padding: '20px' }}>No hay móviles con conductor asignado en la guardia activa</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {guardiaData.moviles.map((m: MovilGuardia, i: number) => (
                      <div key={i} onClick={() => handleSeleccionarMovilGuardia(m)} style={{ background: '#f8f9fb', border: '0.5px solid #e5e7eb', borderRadius: '8px', padding: '12px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '600', color: '#0a2540' }}>🚑 {m.movil.cod_movil}</div>
                          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>👤 {m.conductor.persona.primer_nombre} {m.conductor.persona.primer_apellido}</div>
                        </div>
                        <div style={{ fontSize: '12px', color: '#1d4ed8' }}>Seleccionar →</div>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button onClick={() => { setModalAbierto(false); cerrarModalNuevo(); }} style={{ padding: '9px 18px', borderRadius: '7px', border: '0.5px solid #e5e7eb', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#6b7280' }}>Cancelar</button>
                </div>
              </div>
            )}
            {!modoGuardia && (
              <>
                {form.movil_id && (
                  <div style={{ background: '#f0fdf4', border: '0.5px solid #bbf7d0', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#15803d' }}>
                    ✅ Datos estirados desde la guardia — podés modificarlos si es necesario
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Tipo *</label>
                    <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} style={inputStyle}>
                      <option value="ORDINARIO">Ordinario</option>
                      <option value="EXTRAORDINARIO">Extraordinario</option>
                    </select>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Móvil *</label>
                    <select value={form.movil_id} onChange={e => setForm({ ...form, movil_id: e.target.value })} style={inputStyle}>
                      <option value="">Seleccionar móvil...</option>
                      {moviles.map(m => <option key={m.id} value={m.id}>{m.cod_movil} — {m.tipo} — {m.marca} {m.modelo}</option>)}
                    </select>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Conductor *</label>
                    <select value={form.conductor_id} onChange={e => setForm({ ...form, conductor_id: e.target.value })} style={inputStyle}>
                      <option value="">Seleccionar conductor...</option>
                      {conductores.map(c => <option key={c.id} value={c.usuario.id}>{getNombreUsuario(c)} — CI: {c.usuario.persona.nro_documento}</option>)}
                    </select>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Área asignada</label>
                    <input value={form.area_asignada} onChange={e => setForm({ ...form, area_asignada: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Fecha inicio *</label>
                    <input type="date" value={form.fecha_inicio} onChange={e => setForm({ ...form, fecha_inicio: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Hora inicio *</label>
                    <input type="time" value={form.hora_inicio} onChange={e => setForm({ ...form, hora_inicio: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Fecha fin *</label>
                    <input type="date" value={form.fecha_fin} onChange={e => setForm({ ...form, fecha_fin: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Hora fin *</label>
                    <input type="time" value={form.hora_fin} onChange={e => setForm({ ...form, hora_fin: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Km de salida</label>
                    <input type="number" value={form.km_salida} onChange={e => setForm({ ...form, km_salida: e.target.value })} placeholder="Ej: 142235" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Km estimado a recorrer</label>
                    <input type="number" value={form.km_estimado} onChange={e => setForm({ ...form, km_estimado: e.target.value })} placeholder="Ej: 1200" style={inputStyle} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                  <button onClick={() => { setModalAbierto(false); cerrarModalNuevo(); }} style={{ padding: '9px 18px', borderRadius: '7px', border: '0.5px solid #e5e7eb', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#6b7280' }}>Cancelar</button>
                  <button onClick={handleGuardar} disabled={guardando} style={{ padding: '9px 18px', borderRadius: '7px', border: 'none', background: '#0a2540', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                    {guardando ? 'Guardando...' : 'Crear orden'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal cerrar orden */}
      {modalCerrarAbierto && ordenSeleccionada && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '28px', width: '400px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '500', color: '#0a2540', margin: '0 0 16px' }}>Cerrar orden {ordenSeleccionada.nro_orden}</h2>
            <div style={{ background: '#f8f9fb', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '13px' }}>
              <div style={{ fontWeight: '500', color: '#0a2540' }}>{ordenSeleccionada.movil.cod_movil} — {getNombreConductor(ordenSeleccionada)}</div>
              <div style={{ color: '#6b7280', marginTop: '4px' }}>Km salida: {ordenSeleccionada.km_salida?.toLocaleString() ?? '—'}</div>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Km de llegada</label>
              <input type="number" value={kmLlegada} onChange={e => setKmLlegada(e.target.value)} placeholder="Ej: 143435" style={inputStyle} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => { setModalCerrarAbierto(false); setOrdenSeleccionada(null); setKmLlegada(''); }} style={{ padding: '9px 18px', borderRadius: '7px', border: '0.5px solid #e5e7eb', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#6b7280' }}>Cancelar</button>
              <button onClick={handleCerrar} disabled={guardando} style={{ padding: '9px 18px', borderRadius: '7px', border: 'none', background: '#0a2540', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                {guardando ? 'Cerrando...' : 'Cerrar orden'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal recibo de combustible */}
      {reciboOrden && (
        <ModalReciboCombustible orden={reciboOrden} jefe={jefeTransporte} onCerrar={() => setReciboOrden(null)} onGuardado={cargarOrdenes} />
      )}
    </div>
  );
}