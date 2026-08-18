'use client';

import { useEffect, useState, useRef } from 'react';
import * as XLSX from 'xlsx';

interface Base {
  id: number;
  nombre: string;
  calle: string | null;
  nro: string | null;
  barrio: string | null;
  ciudad: string | null;
  referencia: string | null;
  latitud: number | null;
  longitud: number | null;
  activa: boolean;
}

export default function BasesPage() {
  const [bases, setBases] = useState<Base[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalImportAbierto, setModalImportAbierto] = useState(false);
  const [baseEditando, setBaseEditando] = useState<Base | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [archivoData, setArchivoData] = useState<any[]>([]);
  const [importando, setImportando] = useState(false);
  const [resultadoImport, setResultadoImport] = useState<{creados: number, errores: any[]} | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    nombre: '', calle: '', nro: '', barrio: '',
    ciudad: '', referencia: '', latitud: '', longitud: ''
  });

  const cargarBases = () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setCargando(true);
    fetch('http://localhost:3001/api/bases', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setBases(data); })
      .catch(err => console.error(err))
      .finally(() => setCargando(false));
  };

  useEffect(() => { cargarBases(); }, []);

  const filtradas = bases.filter(b =>
    (b.nombre ?? '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (b.ciudad ?? '').toLowerCase().includes(busqueda.toLowerCase())
  );

  const handleEditar = (b: Base) => {
    setBaseEditando(b);
    setForm({
      nombre: b.nombre ?? '', calle: b.calle ?? '', nro: b.nro ?? '',
      barrio: b.barrio ?? '', ciudad: b.ciudad ?? '', referencia: b.referencia ?? '',
      latitud: b.latitud?.toString() ?? '', longitud: b.longitud?.toString() ?? ''
    });
    setModalAbierto(true);
  };

  const handleNuevo = () => {
    setBaseEditando(null);
    setForm({ nombre: '', calle: '', nro: '', barrio: '', ciudad: '', referencia: '', latitud: '', longitud: '' });
    setModalAbierto(true);
  };

  const toggleActiva = async (id: number, activa: boolean) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await fetch(`http://localhost:3001/api/bases/${id}/activa`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ activa: !activa })
      });
      cargarBases();
    } catch (err) { console.error(err); }
  };

  const handleGuardar = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    if (!form.nombre) { setError('El nombre es obligatorio.'); return; }
    setGuardando(true);
    setError('');
    try {
      const url = baseEditando
        ? `http://localhost:3001/api/bases/${baseEditando.id}`
        : 'http://localhost:3001/api/bases';
      const method = baseEditando ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Error al guardar'); return; }
      cargarBases();
      setModalAbierto(false);
    } catch { setError('Error de conexión'); }
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
    const token = localStorage.getItem('token');
    setImportando(true);
    try {
      const res = await fetch('http://localhost:3001/api/bases/masivo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bases: archivoData })
      });
      const data = await res.json();
      setResultadoImport(data);
      cargarBases();
    } catch {
      setResultadoImport({ creados: 0, errores: [{ motivo: 'Error de conexión' }] });
    } finally {
      setImportando(false);
    }
  };

  const descargarPlantilla = () => {
    const plantilla = [{
      nombre: 'BASE CENTRAL', calle: 'AV. ESPAÑA', nro: '1234',
      barrio: 'CENTRO', ciudad: 'ASUNCIÓN', referencia: 'FRENTE AL HOSPITAL DE CLÍNICAS',
      latitud: -25.2867, longitud: -57.6470
    }];
    const ws = XLSX.utils.json_to_sheet(plantilla);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bases');
    XLSX.writeFile(wb, 'plantilla_bases_seme.xlsx');
  };

  const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: '7px', border: '0.5px solid #e5e7eb', fontSize: '13px', boxSizing: 'border-box' as const };
  const labelStyle = { fontSize: '12px', color: '#6b7280', display: 'block' as const, marginBottom: '6px' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '500', color: '#0a2540', margin: 0 }}>Bases</h1>
          <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>Bases operativas del SEME</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setModalImportAbierto(true)} style={{ background: 'white', color: '#0a2540', border: '0.5px solid #e5e7eb', padding: '9px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
            📥 Importar Excel
          </button>
          <button onClick={handleNuevo} style={{ background: '#0a2540', color: 'white', border: 'none', padding: '9px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
            + Nueva base
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Total', value: bases.length, color: '#0a2540' },
          { label: 'Activas', value: bases.filter(b => b.activa).length, color: '#15803d' },
          { label: 'Inactivas', value: bases.filter(b => !b.activa).length, color: '#dc2626' },
        ].map(card => (
          <div key={card.label} style={{ background: 'white', borderRadius: '10px', padding: '16px', border: '0.5px solid #e5e7eb', borderTop: `3px solid ${card.color}` }}>
            <div style={{ fontSize: '24px', fontWeight: '500', color: card.color }}>{card.value}</div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{card.label}</div>
          </div>
        ))}
      </div>

      <input type="text" placeholder="Buscar por nombre o ciudad..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '0.5px solid #e5e7eb', fontSize: '14px', boxSizing: 'border-box', marginBottom: '16px', outline: 'none' }} />

      <div style={{ background: 'white', borderRadius: '10px', border: '0.5px solid #e5e7eb', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
          <thead>
            <tr style={{ background: '#f8f9fb', borderBottom: '0.5px solid #e5e7eb' }}>
              {['#', 'Nombre', 'Dirección', 'Ciudad', 'Referencia', 'Coordenadas', 'Estado', 'Acciones'].map(col => (
                <th key={col} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', color: '#6b7280', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>Cargando bases...</td></tr>
            ) : filtradas.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>No se encontraron bases</td></tr>
            ) : filtradas.map((b, i) => (
              <tr key={b.id} style={{ borderBottom: '0.5px solid #f3f4f6' }}>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#9ca3af' }}>{i + 1}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '500', color: '#0a2540' }}>{b.nombre}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>
                  {[b.calle, b.nro, b.barrio].filter(Boolean).join(', ') || '—'}
                </td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>{b.ciudad ?? '—'}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>{b.referencia ?? '—'}</td>
                <td style={{ padding: '12px 16px', fontSize: '12px', color: '#9ca3af' }}>
                  {b.latitud && b.longitud ? `${b.latitud}, ${b.longitud}` : '—'}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ background: b.activa ? '#f0fdf4' : '#fef2f2', color: b.activa ? '#15803d' : '#dc2626', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '500' }}>
                    {b.activa ? 'Activa' : 'Inactiva'}
                  </span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => handleEditar(b)} style={{ background: 'transparent', border: '0.5px solid #e5e7eb', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: '#374151' }}>Editar</button>
                    <button onClick={() => toggleActiva(b.id, b.activa)} style={{ background: 'transparent', border: `0.5px solid ${b.activa ? '#fecaca' : '#bbf7d0'}`, padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: b.activa ? '#dc2626' : '#15803d' }}>
                      {b.activa ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal nuevo/editar */}
      {modalAbierto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '28px', width: '520px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '500', color: '#0a2540', margin: '0 0 20px' }}>
              {baseEditando ? 'Editar base' : 'Nueva base'}
            </h2>
            {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 14px', borderRadius: '7px', fontSize: '13px', marginBottom: '16px' }}>{error}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Nombre *</label>
                <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: BASE CENTRAL" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Calle</label>
                <input value={form.calle} onChange={e => setForm({ ...form, calle: e.target.value })} placeholder="Ej: Av. España" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Nro.</label>
                <input value={form.nro} onChange={e => setForm({ ...form, nro: e.target.value })} placeholder="Ej: 1234" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Barrio</label>
                <input value={form.barrio} onChange={e => setForm({ ...form, barrio: e.target.value })} placeholder="Ej: Centro" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Ciudad</label>
                <input value={form.ciudad} onChange={e => setForm({ ...form, ciudad: e.target.value })} placeholder="Ej: Asunción" style={inputStyle} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Referencia</label>
                <input value={form.referencia} onChange={e => setForm({ ...form, referencia: e.target.value })} placeholder="Ej: Frente al Hospital de Clínicas" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Latitud</label>
                <input value={form.latitud} onChange={e => setForm({ ...form, latitud: e.target.value })} placeholder="Ej: -25.2867" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Longitud</label>
                <input value={form.longitud} onChange={e => setForm({ ...form, longitud: e.target.value })} placeholder="Ej: -57.6470" style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
              <button onClick={() => setModalAbierto(false)} style={{ padding: '9px 18px', borderRadius: '7px', border: '0.5px solid #e5e7eb', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#6b7280' }}>Cancelar</button>
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
            <h2 style={{ fontSize: '16px', fontWeight: '500', color: '#0a2540', margin: '0 0 20px' }}>Importar bases desde Excel</h2>
            <div style={{ background: '#f8f9fb', borderRadius: '8px', padding: '16px', marginBottom: '20px', border: '0.5px solid #e5e7eb' }}>
              <div style={{ fontSize: '13px', fontWeight: '500', color: '#0a2540', marginBottom: '6px' }}>Paso 1 — Descargá la plantilla</div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>Columnas: nombre, calle, nro, barrio, ciudad, referencia, latitud, longitud</div>
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
                  ✅ {archivoData.length} base(s) encontradas en el archivo
                </div>
              )}
            </div>
            {resultadoImport && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ background: '#f0fdf4', border: '0.5px solid #bbf7d0', borderRadius: '8px', padding: '14px', marginBottom: '10px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#15803d' }}>✅ {resultadoImport.creados} base(s) creadas correctamente</div>
                </div>
                {resultadoImport.errores.length > 0 && (
                  <div style={{ background: '#fef2f2', border: '0.5px solid #fecaca', borderRadius: '8px', padding: '14px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: '#dc2626', marginBottom: '8px' }}>⚠️ {resultadoImport.errores.length} error(es):</div>
                    {resultadoImport.errores.map((e, i) => (
                      <div key={i} style={{ fontSize: '12px', color: '#dc2626', marginBottom: '4px' }}>• {e.nombre} — {e.motivo}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => { setModalImportAbierto(false); setArchivoData([]); setResultadoImport(null); }} style={{ padding: '9px 18px', borderRadius: '7px', border: '0.5px solid #e5e7eb', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#6b7280' }}>Cerrar</button>
              {archivoData.length > 0 && !resultadoImport && (
                <button onClick={handleImportar} disabled={importando} style={{ padding: '9px 18px', borderRadius: '7px', border: 'none', background: '#0a2540', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                  {importando ? 'Importando...' : `Importar ${archivoData.length} bases`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}