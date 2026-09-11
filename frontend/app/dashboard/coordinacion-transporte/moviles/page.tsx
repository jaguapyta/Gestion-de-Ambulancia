'use client';

import { API_URL } from '@/app/lib/api';
import { useEffect, useState, useRef } from 'react';
import * as XLSX from 'xlsx';

interface Movil {
  id: number;
  cod_movil: string;
  placa: string;
  nro_orden: string | null;
  rasp: string | null;
  funcion: string | null;
  consumo_l100km: number | null;
  nro_tarjeta_combustible: string | null;
  km_inicio: number | null;
  ultimo_km: number | null;
  tipo: string;
  marca: string | null;
  modelo: string | null;
  anio: number | null;
  activo: boolean;
}

const FUNCIONES_POR_TIPO: Record<string, string> = {
  'AMBULANCIA': 'URGENCIAS-EMERGENCIAS-TRASLADOS EN CAPITAL E INTERIOR',
  'MÓVIL ADMINISTRATIVO': 'TRASLADO DE FUNCIONARIOS E INSUMOS EN CAPITAL E INTERIOR',
  'MÓVIL DE COMUNICACIONES': 'PUESTO MÓVIL DE COMANDO Y COMUNICACIONES',
  'MÓVIL DE LOGÍSTICA': 'TRASLADO DE FUNCIONARIOS E INSUMOS EN CAPITAL E INTERIOR',
};

const tiposMovil = ['AMBULANCIA', 'MÓVIL ADMINISTRATIVO', 'MÓVIL DE LOGÍSTICA', 'MÓVIL DE COMUNICACIONES'];

export default function MovilesTransportePage() {
  const [moviles, setMoviles] = useState<Movil[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [seleccionados, setSeleccionados] = useState<number[]>([]);
  const [sortField, setSortField] = useState<string>('cod_movil');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [modalNuevoAbierto, setModalNuevoAbierto] = useState(false);
  const [modalEditarAbierto, setModalEditarAbierto] = useState(false);
  const [modalImportAbierto, setModalImportAbierto] = useState(false);
  const [movilEditando, setMovilEditando] = useState<Movil | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [confirmandoBaja, setConfirmandoBaja] = useState<{ moviles: Movil[], accion: 'baja' | 'alta' } | null>(null);
  const [archivoData, setArchivoData] = useState<any[]>([]);
  const [importando, setImportando] = useState(false);
  const [resultadoImport, setResultadoImport] = useState<{creados: number, errores: any[]} | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [formNuevo, setFormNuevo] = useState({
    placa: '', nro_orden: '', rasp: '', funcion: '',
    consumo_l100km: '', nro_tarjeta_combustible: '', km_inicio: '',
    ultimo_km: '', tipo: '', marca: '', modelo: '', anio: ''
  });

  const [formEditar, setFormEditar] = useState({
    ultimo_km: '', nro_tarjeta_combustible: ''
  });

  const token = () => localStorage.getItem('token') ?? '';

  const cargarMoviles = () => {
    setCargando(true);
    fetch(`${API_URL}/api/ambulancias`, {
      headers: { Authorization: `Bearer ${token()}` }
    })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setMoviles(data);
        setCargando(false);
      })
      .catch(err => {
        console.error(err);
        setCargando(false);
      });
  };

  useEffect(() => {
    setCargando(true);
    fetch(`${API_URL}/api/ambulancias`, {
      headers: { Authorization: `Bearer ${token()}` }
    })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setMoviles(data);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setCargando(false));
  }, []);

  const handleSort = (field: string) => {
    if (sortField === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const sortIcon = (field: string) => sortField !== field ? ' ↕' : sortDir === 'asc' ? ' ↑' : ' ↓';

  const filtrados = moviles
    .filter(m =>
      (m.cod_movil ?? '').toLowerCase().includes(busqueda.toLowerCase()) ||
      (m.placa ?? '').toLowerCase().includes(busqueda.toLowerCase()) ||
      (m.tipo ?? '').toLowerCase().includes(busqueda.toLowerCase()) ||
      (m.marca ?? '').toLowerCase().includes(busqueda.toLowerCase())
    )
    .sort((a, b) => {
      let valA: any = '';
      let valB: any = '';
      if (sortField === 'cod_movil') { valA = a.cod_movil; valB = b.cod_movil; }
      if (sortField === 'tipo') { valA = a.tipo; valB = b.tipo; }
      if (sortField === 'activo') { valA = a.activo ? '1' : '0'; valB = b.activo ? '1' : '0'; }
      return sortDir === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
    });

  const total = moviles.length;
  const activos = moviles.filter(m => m.activo).length;
  const inactivos = moviles.filter(m => !m.activo).length;
  const ambulancias = moviles.filter(m => m.tipo === 'AMBULANCIA').length;

  const toggleSeleccion = (id: number) => {
    setSeleccionados(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const toggleTodos = () => {
    if (seleccionados.length === filtrados.length) setSeleccionados([]);
    else setSeleccionados(filtrados.map(m => m.id));
  };

  const handleEditar = (m: Movil) => {
    setMovilEditando(m);
    setFormEditar({
      ultimo_km: m.ultimo_km?.toString() ?? '',
      nro_tarjeta_combustible: m.nro_tarjeta_combustible ?? ''
    });
    setError('');
    setModalEditarAbierto(true);
  };

  const handleGuardarNuevo = async () => {
    if (!formNuevo.placa || !formNuevo.tipo) { setError('Placa y tipo son obligatorios.'); return; }
    setGuardando(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/ambulancias`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(formNuevo)
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Error al guardar'); return; }
      cargarMoviles();
      setModalNuevoAbierto(false);
      setFormNuevo({ placa: '', nro_orden: '', rasp: '', funcion: '', consumo_l100km: '', nro_tarjeta_combustible: '', km_inicio: '', ultimo_km: '', tipo: '', marca: '', modelo: '', anio: '' });
    } catch { setError('Error de conexión'); }
    finally { setGuardando(false); }
  };

  const handleGuardarEdicion = async () => {
    if (!movilEditando) return;
    setGuardando(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/ambulancias/${movilEditando.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({
          placa: movilEditando.placa,
          tipo: movilEditando.tipo,
          ultimo_km: formEditar.ultimo_km ? parseInt(formEditar.ultimo_km) : null,
          nro_tarjeta_combustible: formEditar.nro_tarjeta_combustible || null
        })
      });
      if (!res.ok) { setError('Error al guardar'); return; }
      cargarMoviles();
      setModalEditarAbierto(false);
    } catch { setError('Error de conexión'); }
    finally { setGuardando(false); }
  };

  const confirmarCambioEstado = (accion: 'baja' | 'alta') => {
    const movilesSeleccionados = filtrados.filter(m => seleccionados.includes(m.id));
    setConfirmandoBaja({ moviles: movilesSeleccionados, accion });
  };

  const ejecutarCambioEstado = async () => {
    if (!confirmandoBaja) return;
    setGuardando(true);
    try {
      for (const m of confirmandoBaja.moviles) {
        await fetch(`${API_URL}/api/ambulancias/${m.id}/activo`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
          body: JSON.stringify({ activo: confirmandoBaja.accion === 'alta' })
        });
      }
      cargarMoviles();
      setSeleccionados([]);
      setConfirmandoBaja(null);
    } catch (err) { console.error(err); }
    finally { setGuardando(false); }
  };

  const handleArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws);
      setArchivoData(data);
      setResultadoImport(null);
    };
    reader.readAsBinaryString(file);
  };

  const handleImportar = async () => {
    if (archivoData.length === 0) return;
    setImportando(true);
    try {
      const res = await fetch(`${API_URL}/api/ambulancias/masivo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ moviles: archivoData })
      });
      const data = await res.json();
      setResultadoImport(data);
      cargarMoviles();
    } catch {
      setResultadoImport({ creados: 0, errores: [{ motivo: 'Error de conexión' }] });
    } finally { setImportando(false); }
  };

  const descargarPlantilla = () => {
    const plantilla = [{
      placa: 'AANN669', tipo: 'AMBULANCIA', marca: 'RENAULT', modelo: 'MASTER', anio: 2022,
      nro_orden: '2633', rasp: 'C-0012184',
      funcion: 'URGENCIAS-EMERGENCIAS-TRASLADOS EN CAPITAL E INTERIOR',
      consumo_l100km: 16, nro_tarjeta_combustible: '65798', km_inicio: 0, ultimo_km: 0
    }];
    const ws = XLSX.utils.json_to_sheet(plantilla);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Moviles');
    XLSX.writeFile(wb, 'plantilla_moviles_seme.xlsx');
  };

  const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: '7px', border: '0.5px solid #e5e7eb', fontSize: '13px', boxSizing: 'border-box' as const };
  const inputReadOnly = { ...inputStyle, background: '#f8f9fb', color: '#9ca3af', cursor: 'not-allowed' as const };
  const labelStyle = { fontSize: '12px', color: '#6b7280', display: 'block' as const, marginBottom: '6px' };

  const thSortable = (field: string) => ({
    padding: '12px 16px', textAlign: 'left' as const, fontSize: '11px',
    color: sortField === field ? '#0a2540' : '#6b7280',
    fontWeight: '500' as const, textTransform: 'uppercase' as const,
    letterSpacing: '0.05em', cursor: 'pointer', userSelect: 'none' as const,
    whiteSpace: 'nowrap' as const
  });

  const thPlain = {
    padding: '12px 16px', textAlign: 'left' as const, fontSize: '11px',
    color: '#6b7280', fontWeight: '500' as const, textTransform: 'uppercase' as const,
    letterSpacing: '0.05em', whiteSpace: 'nowrap' as const
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '500', color: '#0a2540', margin: 0 }}>Móviles</h1>
          <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>Flota de móviles del SEME</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setModalImportAbierto(true)} style={{ background: 'white', color: '#0a2540', border: '0.5px solid #e5e7eb', padding: '9px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
            📥 Importar Excel
          </button>
          <button onClick={() => setModalNuevoAbierto(true)} style={{ background: '#0a2540', color: 'white', border: 'none', padding: '9px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
            + Nuevo móvil
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Total', value: total, color: '#0a2540' },
          { label: 'Activos', value: activos, color: '#15803d' },
          { label: 'Inactivos', value: inactivos, color: '#dc2626' },
          { label: 'Ambulancias', value: ambulancias, color: '#1d4ed8' },
        ].map(card => (
          <div key={card.label} style={{ background: 'white', borderRadius: '10px', padding: '16px', border: '0.5px solid #e5e7eb', borderTop: `3px solid ${card.color}` }}>
            <div style={{ fontSize: '24px', fontWeight: '500', color: card.color }}>{cargando ? '...' : card.value}</div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{card.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', alignItems: 'center' }}>
        <input type="text" placeholder="Buscar por código, placa, tipo o marca..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
          style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '0.5px solid #e5e7eb', fontSize: '14px', boxSizing: 'border-box' as const, outline: 'none' }} />
        {seleccionados.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#6b7280' }}>{seleccionados.length} seleccionado(s)</span>
            <button onClick={() => confirmarCambioEstado('alta')} style={{ padding: '9px 16px', borderRadius: '8px', border: 'none', background: '#15803d', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>✓ Dar de alta</button>
            <button onClick={() => confirmarCambioEstado('baja')} style={{ padding: '9px 16px', borderRadius: '8px', border: 'none', background: '#dc2626', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>✗ Dar de baja</button>
            <button onClick={() => setSeleccionados([])} style={{ padding: '9px 16px', borderRadius: '8px', border: '0.5px solid #e5e7eb', background: 'white', color: '#6b7280', cursor: 'pointer', fontSize: '13px' }}>Cancelar</button>
          </div>
        )}
      </div>

      <div style={{ background: 'white', borderRadius: '10px', border: '0.5px solid #e5e7eb', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1000px' }}>
          <thead>
            <tr style={{ background: '#f8f9fb', borderBottom: '0.5px solid #e5e7eb' }}>
              <th style={{ padding: '12px 16px', width: '44px', textAlign: 'center' as const }}>
                <input type="checkbox"
                  checked={seleccionados.length === filtrados.length && filtrados.length > 0}
                  onChange={toggleTodos} style={{ cursor: 'pointer' }} />
              </th>
              <th onClick={() => handleSort('cod_movil')} style={thSortable('cod_movil')}>Cód. Móvil{sortIcon('cod_movil')}</th>
              <th style={thPlain}>Placa</th>
              <th onClick={() => handleSort('tipo')} style={thSortable('tipo')}>Tipo{sortIcon('tipo')}</th>
              <th style={thPlain}>Marca/Modelo</th>
              <th style={thPlain}>Año</th>
              <th style={thPlain}>RASP</th>
              <th style={thPlain}>Último Km</th>
              <th onClick={() => handleSort('activo')} style={thSortable('activo')}>Estado{sortIcon('activo')}</th>
              <th style={thPlain}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Cargando móviles...</td></tr>
            ) : filtrados.length === 0 ? (
              <tr><td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>No se encontraron móviles</td></tr>
            ) : filtrados.map(m => (
              <tr key={m.id} style={{ borderBottom: '0.5px solid #f3f4f6', background: seleccionados.includes(m.id) ? '#f0f4f8' : 'white' }}>
                <td style={{ padding: '12px 16px', textAlign: 'center' as const }}>
                  <input type="checkbox" checked={seleccionados.includes(m.id)} onChange={() => toggleSeleccion(m.id)} style={{ cursor: 'pointer' }} />
                </td>
                <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#0a2540' }}>{m.cod_movil}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>{m.placa}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ background: m.tipo === 'AMBULANCIA' ? '#eff6ff' : '#f3f4f6', color: m.tipo === 'AMBULANCIA' ? '#1d4ed8' : '#374151', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '500' }}>{m.tipo}</span>
                </td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#555' }}>{m.marca} {m.modelo}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>{m.anio ?? '—'}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>{m.rasp ?? '—'}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>{m.ultimo_km?.toLocaleString() ?? '—'}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ background: m.activo ? '#f0fdf4' : '#fef2f2', color: m.activo ? '#15803d' : '#dc2626', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '500' }}>
                    {m.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <button onClick={() => handleEditar(m)} style={{ background: 'transparent', border: '0.5px solid #e5e7eb', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: '#374151' }}>
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal nuevo móvil */}
      {modalNuevoAbierto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '28px', width: '560px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '500', color: '#0a2540', margin: '0 0 20px' }}>Nuevo móvil</h2>
            {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 14px', borderRadius: '7px', fontSize: '13px', marginBottom: '16px' }}>{error}</div>}
            <div style={{ background: '#f0fdf4', border: '0.5px solid #bbf7d0', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '13px', color: '#15803d' }}>
              ℹ️ El código se genera automáticamente (A-# para ambulancias, M-# para otros).
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Tipo *</label>
                <select value={formNuevo.tipo} onChange={e => {
                  const tipo = e.target.value;
                  setFormNuevo({ ...formNuevo, tipo, funcion: FUNCIONES_POR_TIPO[tipo] ?? '' });
                }} style={inputStyle}>
                  <option value="">Seleccionar tipo...</option>
                  {tiposMovil.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div><label style={labelStyle}>Placa *</label><input value={formNuevo.placa} onChange={e => setFormNuevo({ ...formNuevo, placa: e.target.value })} placeholder="Ej: AANN669" style={inputStyle} /></div>
              <div><label style={labelStyle}>Marca</label><input value={formNuevo.marca} onChange={e => setFormNuevo({ ...formNuevo, marca: e.target.value })} placeholder="Ej: RENAULT" style={inputStyle} /></div>
              <div><label style={labelStyle}>Modelo</label><input value={formNuevo.modelo} onChange={e => setFormNuevo({ ...formNuevo, modelo: e.target.value })} placeholder="Ej: MASTER" style={inputStyle} /></div>
              <div><label style={labelStyle}>Año</label><input value={formNuevo.anio} onChange={e => setFormNuevo({ ...formNuevo, anio: e.target.value })} placeholder="Ej: 2022" style={inputStyle} /></div>
              <div><label style={labelStyle}>Nro. Orden</label><input value={formNuevo.nro_orden} onChange={e => setFormNuevo({ ...formNuevo, nro_orden: e.target.value })} placeholder="Ej: 2633" style={inputStyle} /></div>
              <div><label style={labelStyle}>RASP</label><input value={formNuevo.rasp} onChange={e => setFormNuevo({ ...formNuevo, rasp: e.target.value })} placeholder="Ej: C-0012184" style={inputStyle} /></div>
              <div><label style={labelStyle}>Consumo L/100Km</label><input value={formNuevo.consumo_l100km} onChange={e => setFormNuevo({ ...formNuevo, consumo_l100km: e.target.value })} placeholder="Ej: 16" style={inputStyle} /></div>
              <div><label style={labelStyle}>Nro. Tarjeta Combustible</label><input value={formNuevo.nro_tarjeta_combustible} onChange={e => setFormNuevo({ ...formNuevo, nro_tarjeta_combustible: e.target.value })} placeholder="Ej: 65798" style={inputStyle} /></div>
              <div><label style={labelStyle}>Km inicio</label><input value={formNuevo.km_inicio} onChange={e => setFormNuevo({ ...formNuevo, km_inicio: e.target.value })} placeholder="Ej: 0" style={inputStyle} /></div>
              <div><label style={labelStyle}>Último Km</label><input value={formNuevo.ultimo_km} onChange={e => setFormNuevo({ ...formNuevo, ultimo_km: e.target.value })} placeholder="Ej: 0" style={inputStyle} /></div>
              <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Función</label><input value={formNuevo.funcion} readOnly style={inputReadOnly} /></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
              <button onClick={() => { setModalNuevoAbierto(false); setError(''); }} style={{ padding: '9px 18px', borderRadius: '7px', border: '0.5px solid #e5e7eb', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#6b7280' }}>Cancelar</button>
              <button onClick={handleGuardarNuevo} disabled={guardando} style={{ padding: '9px 18px', borderRadius: '7px', border: 'none', background: '#0a2540', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar — solo último Km y tarjeta combustible */}
      {modalEditarAbierto && movilEditando && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '28px', width: '420px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '500', color: '#0a2540', margin: '0 0 16px' }}>
              Editar móvil — {movilEditando.cod_movil}
            </h2>
            {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 14px', borderRadius: '7px', fontSize: '13px', marginBottom: '16px' }}>{error}</div>}
            <div style={{ background: '#f8f9fb', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '13px' }}>
              <div style={{ fontWeight: '500', color: '#0a2540' }}>{movilEditando.marca} {movilEditando.modelo} — {movilEditando.placa}</div>
              <div style={{ color: '#6b7280', marginTop: '2px' }}>{movilEditando.tipo}</div>
            </div>
            <div style={{ background: '#eff6ff', border: '0.5px solid #bfdbfe', borderRadius: '8px', padding: '10px 12px', marginBottom: '16px', fontSize: '12px', color: '#1d4ed8' }}>
              ℹ️ Coordinación de Transporte solo puede modificar el último Km y la tarjeta de combustible.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
              <div>
                <label style={labelStyle}>Último Km</label>
                <input type="number" value={formEditar.ultimo_km} onChange={e => setFormEditar({ ...formEditar, ultimo_km: e.target.value })} placeholder="Ej: 128255" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Nro. Tarjeta Combustible</label>
                <input value={formEditar.nro_tarjeta_combustible} onChange={e => setFormEditar({ ...formEditar, nro_tarjeta_combustible: e.target.value })} placeholder="Ej: 65798" style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setModalEditarAbierto(false)} style={{ padding: '9px 18px', borderRadius: '7px', border: '0.5px solid #e5e7eb', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#6b7280' }}>Cancelar</button>
              <button onClick={handleGuardarEdicion} disabled={guardando} style={{ padding: '9px 18px', borderRadius: '7px', border: 'none', background: '#0a2540', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal importar Excel */}
      {modalImportAbierto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '28px', width: '560px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '500', color: '#0a2540', margin: '0 0 20px' }}>Importar móviles desde Excel</h2>
            <div style={{ background: '#f8f9fb', borderRadius: '8px', padding: '16px', marginBottom: '20px', border: '0.5px solid #e5e7eb' }}>
              <div style={{ fontSize: '13px', fontWeight: '500', color: '#0a2540', marginBottom: '6px' }}>Paso 1 — Descargá la plantilla</div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>Columnas: placa, tipo, marca, modelo, anio, nro_orden, rasp, consumo_l100km, nro_tarjeta_combustible, km_inicio, ultimo_km</div>
              <button onClick={descargarPlantilla} style={{ background: 'white', color: '#0a2540', border: '0.5px solid #e5e7eb', padding: '8px 16px', borderRadius: '7px', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}>
                📄 Descargar plantilla Excel
              </button>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '13px', fontWeight: '500', color: '#0a2540', marginBottom: '8px' }}>Paso 2 — Subí el archivo completado</div>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleArchivo} style={{ display: 'none' }} />
              <button onClick={() => fileRef.current?.click()} style={{ background: 'white', color: '#0a2540', border: '0.5px solid #e5e7eb', padding: '8px 16px', borderRadius: '7px', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}>
                📁 Seleccionar archivo
              </button>
              {archivoData.length > 0 && (
                <div style={{ marginTop: '10px', background: '#f0fdf4', border: '0.5px solid #bbf7d0', borderRadius: '7px', padding: '10px 14px', fontSize: '13px', color: '#15803d' }}>
                  ✅ {archivoData.length} móvil(es) encontrados en el archivo
                </div>
              )}
            </div>
            {resultadoImport && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ background: '#f0fdf4', border: '0.5px solid #bbf7d0', borderRadius: '8px', padding: '14px', marginBottom: '10px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#15803d' }}>✅ {resultadoImport.creados} móvil(es) creados correctamente</div>
                </div>
                {resultadoImport.errores.length > 0 && (
                  <div style={{ background: '#fef2f2', border: '0.5px solid #fecaca', borderRadius: '8px', padding: '14px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: '#dc2626', marginBottom: '8px' }}>⚠️ {resultadoImport.errores.length} error(es):</div>
                    {resultadoImport.errores.map((e, i) => (
                      <div key={i} style={{ fontSize: '12px', color: '#dc2626', marginBottom: '4px' }}>• {e.placa} — {e.motivo}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => { setModalImportAbierto(false); setArchivoData([]); setResultadoImport(null); }}
                style={{ padding: '9px 18px', borderRadius: '7px', border: '0.5px solid #e5e7eb', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#6b7280' }}>Cerrar</button>
              {archivoData.length > 0 && !resultadoImport && (
                <button onClick={handleImportar} disabled={importando}
                  style={{ padding: '9px 18px', borderRadius: '7px', border: 'none', background: '#0a2540', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                  {importando ? 'Importando...' : `Importar ${archivoData.length} móviles`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar cambio de estado masivo */}
      {confirmandoBaja && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '28px', width: '440px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '500', color: '#0a2540', margin: '0 0 16px' }}>
              {confirmandoBaja.accion === 'baja' ? '⚠️ Dar de baja móviles' : '✅ Dar de alta móviles'}
            </h2>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '14px' }}>
              Se {confirmandoBaja.accion === 'baja' ? 'darán de baja' : 'darán de alta'} los siguientes {confirmandoBaja.moviles.length} móvil(es):
            </p>
            <div style={{ background: '#f8f9fb', borderRadius: '8px', padding: '12px', marginBottom: '16px', maxHeight: '200px', overflowY: 'auto' }}>
              {confirmandoBaja.moviles.map(m => (
                <div key={m.id} style={{ fontSize: '13px', color: '#0a2540', padding: '4px 0', borderBottom: '0.5px solid #e5e7eb' }}>
                  <strong>{m.cod_movil}</strong> — {m.placa} — {m.tipo}
                </div>
              ))}
            </div>
            {confirmandoBaja.accion === 'baja' && (
              <div style={{ background: '#fff7ed', border: '0.5px solid #fed7aa', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '13px', color: '#c2410c' }}>
                ⚠️ Los móviles dados de baja no podrán ser asignados a nuevas guardias. Los registros históricos se mantienen.
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setConfirmandoBaja(null)} style={{ padding: '9px 18px', borderRadius: '7px', border: '0.5px solid #e5e7eb', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#6b7280' }}>Cancelar</button>
              <button onClick={ejecutarCambioEstado} disabled={guardando}
                style={{ padding: '9px 18px', borderRadius: '7px', border: 'none', background: confirmandoBaja.accion === 'baja' ? '#dc2626' : '#15803d', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                {guardando ? 'Procesando...' : confirmandoBaja.accion === 'baja' ? 'Confirmar baja' : 'Confirmar alta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}