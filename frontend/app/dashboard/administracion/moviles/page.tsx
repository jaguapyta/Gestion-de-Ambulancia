'use client';

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

type SortField = 'cod_movil' | 'placa' | 'tipo' | 'marca' | 'anio' | 'ultimo_km' | 'activo';
type SortDir = 'asc' | 'desc';

const FUNCIONES_POR_TIPO: Record<string, string> = {
  'AMBULANCIA': 'URGENCIAS-EMERGENCIAS-TRASLADOS EN CAPITAL E INTERIOR',
  'MÓVIL ADMINISTRATIVO': 'TRASLADO DE FUNCIONARIOS E INSUMOS EN CAPITAL E INTERIOR',
  'MÓVIL DE COMUNICACIONES': 'PUESTO MÓVIL DE COMANDO Y COMUNICACIONES',
  'MÓVIL DE LOGÍSTICA': 'TRASLADO DE FUNCIONARIOS E INSUMOS EN CAPITAL E INTERIOR',
};

export default function MovilesPage() {
  const [moviles, setMoviles] = useState<Movil[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalEditarAbierto, setModalEditarAbierto] = useState(false);
  const [modalImportAbierto, setModalImportAbierto] = useState(false);
  const [movilEditando, setMovilEditando] = useState<Movil | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [archivoData, setArchivoData] = useState<any[]>([]);
  const [importando, setImportando] = useState(false);
  const [resultadoImport, setResultadoImport] = useState<{creados: number, errores: any[]} | null>(null);
  const [sortField, setSortField] = useState<SortField>('cod_movil');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    placa: '', nro_orden: '', rasp: '', funcion: '',
    consumo_l100km: '', nro_tarjeta_combustible: '', km_inicio: '',
    ultimo_km: '', tipo: '', marca: '', modelo: '', anio: ''
  });

  const cargarMoviles = () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setCargando(true);
    fetch('http://localhost:3001/api/ambulancias', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setMoviles(data); })
      .catch(err => console.error(err))
      .finally(() => setCargando(false));
  };

  useEffect(() => { cargarMoviles(); }, []);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const sortIcon = (field: SortField) => sortField !== field ? ' ↕' : sortDir === 'asc' ? ' ↑' : ' ↓';

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
      if (sortField === 'placa') { valA = a.placa; valB = b.placa; }
      if (sortField === 'tipo') { valA = a.tipo; valB = b.tipo; }
      if (sortField === 'marca') { valA = a.marca ?? ''; valB = b.marca ?? ''; }
      if (sortField === 'anio') { valA = a.anio ?? 0; valB = b.anio ?? 0; }
      if (sortField === 'ultimo_km') { valA = a.ultimo_km ?? 0; valB = b.ultimo_km ?? 0; }
      if (sortField === 'activo') { valA = a.activo ? '1' : '0'; valB = b.activo ? '1' : '0'; }
      if (typeof valA === 'number') return sortDir === 'asc' ? valA - valB : valB - valA;
      return sortDir === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
    });

  const handleEditar = (m: Movil) => {
    setMovilEditando(m);
    setForm({
      placa: m.placa ?? '',
      nro_orden: m.nro_orden ?? '',
      rasp: m.rasp ?? '',
      funcion: m.funcion ?? '',
      consumo_l100km: m.consumo_l100km?.toString() ?? '',
      nro_tarjeta_combustible: m.nro_tarjeta_combustible ?? '',
      km_inicio: m.km_inicio?.toString() ?? '',
      ultimo_km: m.ultimo_km?.toString() ?? '',
      tipo: m.tipo ?? '',
      marca: m.marca ?? '',
      modelo: m.modelo ?? '',
      anio: m.anio?.toString() ?? ''
    });
    setModalEditarAbierto(true);
  };

  const toggleActivo = async (id: number, activo: boolean) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await fetch(`http://localhost:3001/api/ambulancias/${id}/activo`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ activo: !activo })
      });
      cargarMoviles();
    } catch (err) { console.error(err); }
  };

  const handleGuardar = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    if (!form.placa || !form.tipo) { setError('Placa y tipo son obligatorios.'); return; }
    setGuardando(true);
    setError('');
    try {
      const url = movilEditando
        ? `http://localhost:3001/api/ambulancias/${movilEditando.id}`
        : 'http://localhost:3001/api/ambulancias';
      const method = movilEditando ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Error al guardar'); return; }
      cargarMoviles();
      cerrarModal();
    } catch { setError('Error de conexión'); }
    finally { setGuardando(false); }
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setModalEditarAbierto(false);
    setMovilEditando(null);
    setError('');
    setForm({
      placa: '', nro_orden: '', rasp: '', funcion: '',
      consumo_l100km: '', nro_tarjeta_combustible: '', km_inicio: '',
      ultimo_km: '', tipo: '', marca: '', modelo: '', anio: ''
    });
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
    const token = localStorage.getItem('token');
    setImportando(true);
    try {
      const res = await fetch('http://localhost:3001/api/ambulancias/masivo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ moviles: archivoData })
      });
      const data = await res.json();
      setResultadoImport(data);
      cargarMoviles();
    } catch {
      setResultadoImport({ creados: 0, errores: [{ motivo: 'Error de conexión' }] });
    } finally {
      setImportando(false);
    }
  };

  const descargarPlantilla = () => {
    const plantilla = [{
      cod_movil: 'A-334', placa: 'AANN669', tipo: 'AMBULANCIA',
      marca: 'RENAULT', modelo: 'MASTER', anio: 2022,
      nro_orden: '2633', rasp: 'C-0012184',
      funcion: 'URGENCIAS-EMERGENCIAS-TRASLADOS EN CAPITAL E INTERIOR',
      consumo_l100km: 16, nro_tarjeta_combustible: '65798',
      km_inicio: 0, ultimo_km: 128255
    }];
    const ws = XLSX.utils.json_to_sheet(plantilla);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Moviles');
    XLSX.writeFile(wb, 'plantilla_moviles_seme.xlsx');
  };

  const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: '7px', border: '0.5px solid #e5e7eb', fontSize: '13px', boxSizing: 'border-box' as const };
  const inputReadOnly = { ...inputStyle, background: '#f8f9fb', color: '#9ca3af', cursor: 'not-allowed' };
  const labelStyle = { fontSize: '12px', color: '#6b7280', display: 'block' as const, marginBottom: '6px' };
  const tiposMovil = ['AMBULANCIA', 'MÓVIL ADMINISTRATIVO', 'MÓVIL DE LOGÍSTICA', 'MÓVIL DE COMUNICACIONES'];

  const thStyle = (field: SortField) => ({
    padding: '12px 16px', textAlign: 'left' as const, fontSize: '11px',
    color: sortField === field ? '#0a2540' : '#6b7280',
    fontWeight: '500' as const, textTransform: 'uppercase' as const,
    letterSpacing: '0.05em', cursor: 'pointer', userSelect: 'none' as const,
    whiteSpace: 'nowrap' as const
  });

  const thPlain = { padding: '12px 16px', textAlign: 'left' as const, fontSize: '11px', color: '#6b7280', fontWeight: '500' as const, textTransform: 'uppercase' as const, letterSpacing: '0.05em', whiteSpace: 'nowrap' as const };

  const isReadOnly = (field: string | null | number) => !!(movilEditando && field);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '500', color: '#0a2540', margin: 0 }}>Móviles</h1>
          <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>Gestión de la flota de móviles del SEME</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setModalImportAbierto(true)} style={{ background: 'white', color: '#0a2540', border: '0.5px solid #e5e7eb', padding: '9px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
            📥 Importar Excel
          </button>
          <button onClick={() => setModalAbierto(true)} style={{ background: '#0a2540', color: 'white', border: 'none', padding: '9px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
            + Nuevo móvil
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Total', value: moviles.length, color: '#0a2540' },
          { label: 'Activos', value: moviles.filter(m => m.activo).length, color: '#15803d' },
          { label: 'Inactivos', value: moviles.filter(m => !m.activo).length, color: '#dc2626' },
          { label: 'Ambulancias', value: moviles.filter(m => m.tipo === 'AMBULANCIA').length, color: '#1d4ed8' },
        ].map(card => (
          <div key={card.label} style={{ background: 'white', borderRadius: '10px', padding: '16px', border: '0.5px solid #e5e7eb', borderTop: `3px solid ${card.color}` }}>
            <div style={{ fontSize: '24px', fontWeight: '500', color: card.color }}>{card.value}</div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{card.label}</div>
          </div>
        ))}
      </div>

      <input type="text" placeholder="Buscar por código, placa, tipo o marca..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '0.5px solid #e5e7eb', fontSize: '14px', boxSizing: 'border-box', marginBottom: '16px', outline: 'none' }} />

      <div style={{ background: 'white', borderRadius: '10px', border: '0.5px solid #e5e7eb', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
          <thead>
            <tr style={{ background: '#f8f9fb', borderBottom: '0.5px solid #e5e7eb' }}>
              <th onClick={() => handleSort('cod_movil')} style={thStyle('cod_movil')}>Cód. Móvil{sortIcon('cod_movil')}</th>
              <th onClick={() => handleSort('placa')} style={thStyle('placa')}>Placa{sortIcon('placa')}</th>
              <th onClick={() => handleSort('tipo')} style={thStyle('tipo')}>Tipo{sortIcon('tipo')}</th>
              <th onClick={() => handleSort('marca')} style={thStyle('marca')}>Marca/Modelo{sortIcon('marca')}</th>
              <th onClick={() => handleSort('anio')} style={thStyle('anio')}>Año{sortIcon('anio')}</th>
              <th style={thPlain}>RASP</th>
              <th onClick={() => handleSort('ultimo_km')} style={thStyle('ultimo_km')}>Último Km{sortIcon('ultimo_km')}</th>
              <th onClick={() => handleSort('activo')} style={thStyle('activo')}>Estado{sortIcon('activo')}</th>
              <th style={thPlain}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>Cargando móviles...</td></tr>
            ) : filtrados.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>No se encontraron móviles</td></tr>
            ) : filtrados.map(m => (
              <tr key={m.id} style={{ borderBottom: '0.5px solid #f3f4f6' }}>
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
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => handleEditar(m)} style={{ background: 'transparent', border: '0.5px solid #e5e7eb', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: '#374151' }}>Editar</button>
                    <button onClick={() => toggleActivo(m.id, m.activo)} style={{ background: 'transparent', border: `0.5px solid ${m.activo ? '#fecaca' : '#bbf7d0'}`, padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: m.activo ? '#dc2626' : '#15803d' }}>
                      {m.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal nuevo/editar */}
      {(modalAbierto || modalEditarAbierto) && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '28px', width: '560px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '500', color: '#0a2540', margin: '0 0 20px' }}>{movilEditando ? 'Editar móvil' : 'Nuevo móvil'}</h2>
            {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 14px', borderRadius: '7px', fontSize: '13px', marginBottom: '16px' }}>{error}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {movilEditando && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Código de móvil (no editable)</label>
                  <input value={movilEditando.cod_movil} readOnly style={inputReadOnly} />
                </div>
              )}
              {!movilEditando && (
                <div style={{ gridColumn: '1 / -1', background: '#f0fdf4', border: '0.5px solid #bbf7d0', borderRadius: '8px', padding: '12px', fontSize: '13px', color: '#15803d' }}>
                  ℹ️ El código se genera automáticamente (A-# para ambulancias, M-# para otros).
                </div>
              )}

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Tipo *</label>
                <select
                  value={form.tipo}
                  onChange={e => {
                    const tipo = e.target.value;
                    setForm({ ...form, tipo, funcion: FUNCIONES_POR_TIPO[tipo] ?? form.funcion });
                  }}
                  disabled={!!movilEditando?.cod_movil.startsWith('M-')}
                  style={{ ...inputStyle, ...(movilEditando?.cod_movil.startsWith('M-') ? { background: '#f8f9fb' } : {}) }}
                >
                  <option value="">Seleccionar tipo...</option>
                  {tiposMovil.filter(t => movilEditando?.cod_movil.startsWith('M-') ? t !== 'AMBULANCIA' : true).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                {movilEditando?.cod_movil.startsWith('M-') && <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '4px' }}>Este móvil no puede cambiar a AMBULANCIA</div>}
              </div>

              <div>
                <label style={labelStyle}>Placa *</label>
                <input value={form.placa} onChange={e => setForm({ ...form, placa: e.target.value })}
                  placeholder="Ej: AANN669"
                  readOnly={isReadOnly(movilEditando?.placa ?? null)}
                  style={isReadOnly(movilEditando?.placa ?? null) ? inputReadOnly : inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Marca</label>
                <input value={form.marca} onChange={e => setForm({ ...form, marca: e.target.value })}
                  placeholder="Ej: RENAULT"
                  readOnly={isReadOnly(movilEditando?.marca ?? null)}
                  style={isReadOnly(movilEditando?.marca ?? null) ? inputReadOnly : inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Modelo</label>
                <input value={form.modelo} onChange={e => setForm({ ...form, modelo: e.target.value })}
                  placeholder="Ej: MASTER"
                  readOnly={isReadOnly(movilEditando?.modelo ?? null)}
                  style={isReadOnly(movilEditando?.modelo ?? null) ? inputReadOnly : inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Año</label>
                <input value={form.anio} onChange={e => setForm({ ...form, anio: e.target.value })}
                  placeholder="Ej: 2022"
                  readOnly={isReadOnly(movilEditando?.anio ?? null)}
                  style={isReadOnly(movilEditando?.anio ?? null) ? inputReadOnly : inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Nro. Orden</label>
                <input value={form.nro_orden} onChange={e => setForm({ ...form, nro_orden: e.target.value })}
                  placeholder="Ej: 2633"
                  readOnly={isReadOnly(movilEditando?.nro_orden ?? null)}
                  style={isReadOnly(movilEditando?.nro_orden ?? null) ? inputReadOnly : inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>RASP</label>
                <input value={form.rasp} onChange={e => setForm({ ...form, rasp: e.target.value })}
                  placeholder="Ej: C-0012184"
                  readOnly={isReadOnly(movilEditando?.rasp ?? null)}
                  style={isReadOnly(movilEditando?.rasp ?? null) ? inputReadOnly : inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Consumo L/100Km</label>
                <input value={form.consumo_l100km} onChange={e => setForm({ ...form, consumo_l100km: e.target.value })}
                  placeholder="Ej: 16"
                  readOnly={isReadOnly(movilEditando?.consumo_l100km ?? null)}
                  style={isReadOnly(movilEditando?.consumo_l100km ?? null) ? inputReadOnly : inputStyle} />
              </div>

              {/* Nro. Tarjeta Combustible — siempre editable */}
              <div>
                <label style={labelStyle}>Nro. Tarjeta Combustible</label>
                <input value={form.nro_tarjeta_combustible} onChange={e => setForm({ ...form, nro_tarjeta_combustible: e.target.value })}
                  placeholder="Ej: 65798" style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Km inicio</label>
                <input value={form.km_inicio} onChange={e => setForm({ ...form, km_inicio: e.target.value })}
                  placeholder="Ej: 0"
                  readOnly={isReadOnly(movilEditando?.km_inicio ?? null)}
                  style={isReadOnly(movilEditando?.km_inicio ?? null) ? inputReadOnly : inputStyle} />
              </div>

              {/* Último Km — siempre editable */}
              <div>
                <label style={labelStyle}>Último Km</label>
                <input value={form.ultimo_km} onChange={e => setForm({ ...form, ultimo_km: e.target.value })}
                  placeholder="Ej: 128255" style={inputStyle} />
              </div>

              {/* Función — solo lectura, se actualiza según tipo */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Función</label>
                <input value={form.funcion} readOnly style={inputReadOnly} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
              <button onClick={cerrarModal} style={{ padding: '9px 18px', borderRadius: '7px', border: '0.5px solid #e5e7eb', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#6b7280' }}>Cancelar</button>
              <button onClick={handleGuardar} disabled={guardando} style={{ padding: '9px 18px', borderRadius: '7px', border: 'none', background: '#0a2540', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
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
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>Columnas: cod_movil (opcional), placa, tipo, marca, modelo, anio, nro_orden, rasp, funcion, consumo_l100km, nro_tarjeta_combustible, km_inicio, ultimo_km</div>
              <button onClick={descargarPlantilla} style={{ background: 'white', color: '#0a2540', border: '0.5px solid #e5e7eb', padding: '8px 16px', borderRadius: '7px', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}>📄 Descargar plantilla Excel</button>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '13px', fontWeight: '500', color: '#0a2540', marginBottom: '8px' }}>Paso 2 — Subí el archivo completado</div>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleArchivo} style={{ display: 'none' }} />
              <button onClick={() => fileRef.current?.click()} style={{ background: 'white', color: '#0a2540', border: '0.5px solid #e5e7eb', padding: '8px 16px', borderRadius: '7px', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}>📁 Seleccionar archivo</button>
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
              <button onClick={() => { setModalImportAbierto(false); setArchivoData([]); setResultadoImport(null); }} style={{ padding: '9px 18px', borderRadius: '7px', border: '0.5px solid #e5e7eb', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#6b7280' }}>Cerrar</button>
              {archivoData.length > 0 && !resultadoImport && (
                <button onClick={handleImportar} disabled={importando} style={{ padding: '9px 18px', borderRadius: '7px', border: 'none', background: '#0a2540', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                  {importando ? 'Importando...' : `Importar ${archivoData.length} móviles`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}