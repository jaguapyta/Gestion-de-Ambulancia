'use client';

import { useEffect, useState, useRef } from 'react';
import * as XLSX from 'xlsx';

interface Usuario {
  id: number;
  activo: boolean;
  persona: {
    primer_nombre: string;
    segundo_nombre: string;
    primer_apellido: string;
    segundo_apellido: string;
    nro_documento: string;
  };
  rol: { id: number; nombre: string };
}

interface Persona {
  id: number;
  primer_nombre: string;
  segundo_nombre: string;
  primer_apellido: string;
  segundo_apellido: string;
  nro_documento: string;
  tipo_documento: number;
  sexo: string;
  fecha_nacimiento: string;
}

type SortField = 'nombre' | 'nro_documento' | 'rol' | 'activo';
type SortDir = 'asc' | 'desc';

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [rolesDisponibles, setRolesDisponibles] = useState<{id: number, nombre: string}[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalImportAbierto, setModalImportAbierto] = useState(false);
  const [modalEditarAbierto, setModalEditarAbierto] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);
  const [rolEditando, setRolEditando] = useState('');
  const [guardandoRol, setGuardandoRol] = useState(false);
  const [passwordGenerada, setPasswordGenerada] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [documento, setDocumento] = useState('');
  const [buscandoDoc, setBuscandoDoc] = useState(false);
  const [personaEncontrada, setPersonaEncontrada] = useState<Persona | null>(null);
  const [personaNueva, setPersonaNueva] = useState(false);
  const [sortField, setSortField] = useState<SortField>('nombre');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const [archivoData, setArchivoData] = useState<any[]>([]);
  const [importando, setImportando] = useState(false);
  const [resultadoImport, setResultadoImport] = useState<{creados: number, errores: any[]} | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    primer_nombre: '', segundo_nombre: '', primer_apellido: '',
    segundo_apellido: '', nro_documento: '', tipo_documento: '1',
    sexo: 'M', fecha_nacimiento: '', rol_id: '', persona_id: '',
  });

  const cargarUsuarios = () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setCargando(true);
    fetch('http://localhost:3001/api/usuarios', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setUsuarios(data); })
      .catch(err => console.error(err))
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    cargarUsuarios();
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch('http://localhost:3001/api/roles', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setRolesDisponibles(data); })
      .catch(err => console.error(err));
  }, []);

  const getNombre = (u: Usuario) =>
    `${u.persona.primer_nombre} ${u.persona.segundo_nombre ?? ''} ${u.persona.primer_apellido} ${u.persona.segundo_apellido ?? ''}`.trim();

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sortIcon = (field: SortField) => {
    if (sortField !== field) return ' ↕';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  };

  const filtrados = usuarios
    .filter(u =>
      getNombre(u).toLowerCase().includes(busqueda.toLowerCase()) ||
      u.persona.nro_documento.includes(busqueda)
    )
    .sort((a, b) => {
      let valA = '';
      let valB = '';
      if (sortField === 'nombre') { valA = getNombre(a); valB = getNombre(b); }
      if (sortField === 'nro_documento') { valA = a.persona.nro_documento; valB = b.persona.nro_documento; }
      if (sortField === 'rol') { valA = a.rol.nombre; valB = b.rol.nombre; }
      if (sortField === 'activo') { valA = a.activo ? '1' : '0'; valB = b.activo ? '1' : '0'; }
      return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });

  const buscarPorDocumento = async () => {
    if (!documento) return;
    const token = localStorage.getItem('token');
    setBuscandoDoc(true);
    setPersonaEncontrada(null);
    setPersonaNueva(false);
    setError('');
    try {
      const res = await fetch(`http://localhost:3001/api/usuarios/persona/${documento}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPersonaEncontrada(data);
        setForm(prev => ({
          ...prev,
          primer_nombre: data.primer_nombre,
          segundo_nombre: data.segundo_nombre ?? '',
          primer_apellido: data.primer_apellido,
          segundo_apellido: data.segundo_apellido ?? '',
          nro_documento: data.nro_documento,
          tipo_documento: String(data.tipo_documento),
          sexo: data.sexo,
          fecha_nacimiento: data.fecha_nacimiento?.split('T')[0] ?? '',
          persona_id: String(data.id),
        }));
      } else {
        setPersonaNueva(true);
        setForm(prev => ({ ...prev, nro_documento: documento }));
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setBuscandoDoc(false);
    }
  };

  const toggleActivo = async (id: number, activo: boolean) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await fetch(`http://localhost:3001/api/usuarios/${id}/activo`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ activo: !activo })
      });
      cargarUsuarios();
    } catch (err) { console.error(err); }
  };

  const handleEditar = (u: Usuario) => {
    setUsuarioEditando(u);
    setRolEditando(String(u.rol.id));
    setModalEditarAbierto(true);
  };

  const handleGuardarRol = async () => {
    if (!usuarioEditando || !rolEditando) return;
    const token = localStorage.getItem('token');
    setGuardandoRol(true);
    try {
      await fetch(`http://localhost:3001/api/usuarios/${usuarioEditando.id}/rol`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rol_id: parseInt(rolEditando) })
      });
      cargarUsuarios();
      setModalEditarAbierto(false);
    } catch (err) {
      console.error(err);
    } finally {
      setGuardandoRol(false);
    }
  };

  const handleGuardar = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    if (!form.rol_id) { setError('Seleccioná un rol.'); return; }
    if (personaNueva && (!form.primer_nombre || !form.primer_apellido || !form.fecha_nacimiento)) {
      setError('Completá todos los campos obligatorios.');
      return;
    }
    setGuardando(true);
    setError('');
    try {
      const res = await fetch('http://localhost:3001/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Error al crear usuario'); return; }
      setPasswordGenerada(data.password_generada);
      cargarUsuarios();
    } catch { setError('Error de conexión'); }
    finally { setGuardando(false); }
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setPasswordGenerada('');
    setError('');
    setDocumento('');
    setPersonaEncontrada(null);
    setPersonaNueva(false);
    setForm({ primer_nombre: '', segundo_nombre: '', primer_apellido: '', segundo_apellido: '', nro_documento: '', tipo_documento: '1', sexo: 'M', fecha_nacimiento: '', rol_id: '', persona_id: '' });
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
      const res = await fetch('http://localhost:3001/api/usuarios/masivo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ usuarios: archivoData })
      });
      const data = await res.json();
      setResultadoImport(data);
      cargarUsuarios();
    } catch {
      setResultadoImport({ creados: 0, errores: [{ motivo: 'Error de conexión' }] });
    } finally {
      setImportando(false);
    }
  };

  const descargarPlantilla = () => {
    const plantilla = [{
      nro_documento: '1234567', primer_nombre: 'JUAN', segundo_nombre: 'CARLOS',
      primer_apellido: 'PÉREZ', segundo_apellido: 'GARCÍA', sexo: 'M',
      fecha_nacimiento: '1990-01-15', rol: 'RECEPCIONISTA'
    }];
    const ws = XLSX.utils.json_to_sheet(plantilla);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Usuarios');
    XLSX.writeFile(wb, 'plantilla_usuarios_seme.xlsx');
  };

  const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: '7px', border: '0.5px solid #e5e7eb', fontSize: '13px', boxSizing: 'border-box' as const };
  const labelStyle = { fontSize: '12px', color: '#6b7280', display: 'block' as const, marginBottom: '6px' };
  const thStyle = (field: SortField) => ({
    padding: '12px 16px', textAlign: 'left' as const, fontSize: '11px',
    color: sortField === field ? '#0a2540' : '#6b7280',
    fontWeight: '500' as const, textTransform: 'uppercase' as const,
    letterSpacing: '0.05em', cursor: 'pointer', userSelect: 'none' as const,
    whiteSpace: 'nowrap' as const
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '500', color: '#0a2540', margin: 0 }}>Usuarios</h1>
          <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>Gestión de usuarios del sistema</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setModalImportAbierto(true)} style={{ background: 'white', color: '#0a2540', border: '0.5px solid #e5e7eb', padding: '9px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
            📥 Importar Excel
          </button>
          <button onClick={() => setModalAbierto(true)} style={{ background: '#0a2540', color: 'white', border: 'none', padding: '9px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
            + Nuevo usuario
          </button>
        </div>
      </div>

      <input type="text" placeholder="Buscar por nombre o documento..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '0.5px solid #e5e7eb', fontSize: '14px', boxSizing: 'border-box', marginBottom: '16px', outline: 'none' }} />

      <div style={{ background: 'white', borderRadius: '10px', border: '0.5px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8f9fb', borderBottom: '0.5px solid #e5e7eb' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', color: '#6b7280', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>#</th>
              <th onClick={() => handleSort('nombre')} style={thStyle('nombre')}>Nombre{sortIcon('nombre')}</th>
              <th onClick={() => handleSort('nro_documento')} style={thStyle('nro_documento')}>Documento{sortIcon('nro_documento')}</th>
              <th onClick={() => handleSort('rol')} style={thStyle('rol')}>Rol{sortIcon('rol')}</th>
              <th onClick={() => handleSort('activo')} style={thStyle('activo')}>Estado{sortIcon('activo')}</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', color: '#6b7280', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>Cargando usuarios...</td></tr>
            ) : filtrados.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>No se encontraron usuarios</td></tr>
            ) : filtrados.map((u, i) => (
              <tr key={u.id} style={{ borderBottom: '0.5px solid #f3f4f6' }}>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#9ca3af' }}>{i + 1}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '500', color: '#0a2540' }}>{getNombre(u)}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>{u.persona.nro_documento}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '500' }}>{u.rol.nombre}</span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ background: u.activo ? '#f0fdf4' : '#fef2f2', color: u.activo ? '#15803d' : '#dc2626', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '500' }}>
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => handleEditar(u)} style={{ background: 'transparent', border: '0.5px solid #e5e7eb', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: '#374151' }}>Editar</button>
                    <button onClick={() => toggleActivo(u.id, u.activo)} style={{ background: 'transparent', border: `0.5px solid ${u.activo ? '#fecaca' : '#bbf7d0'}`, padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: u.activo ? '#dc2626' : '#15803d' }}>
                      {u.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal nuevo usuario */}
      {modalAbierto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '28px', width: '500px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            {passwordGenerada ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '40px', marginBottom: '16px' }}>✅</div>
                <h2 style={{ fontSize: '16px', fontWeight: '500', color: '#0a2540', marginBottom: '8px' }}>Usuario creado correctamente</h2>
                <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>Guardá la contraseña — el usuario deberá cambiarla al primer ingreso.</p>
                <div style={{ background: '#f0fdf4', border: '0.5px solid #bbf7d0', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
                  <div style={{ fontSize: '12px', color: '#15803d', marginBottom: '6px' }}>Contraseña generada</div>
                  <div style={{ fontSize: '22px', fontWeight: '500', color: '#0a2540', letterSpacing: '2px' }}>{passwordGenerada}</div>
                </div>
                <button onClick={cerrarModal} style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: '#0a2540', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>Cerrar</button>
              </div>
            ) : (
              <>
                <h2 style={{ fontSize: '16px', fontWeight: '500', color: '#0a2540', margin: '0 0 20px' }}>Nuevo usuario</h2>
                {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 14px', borderRadius: '7px', fontSize: '13px', marginBottom: '16px' }}>{error}</div>}
                <div style={{ marginBottom: '20px' }}>
                  <label style={labelStyle}>Número de documento *</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input value={documento} onChange={e => setDocumento(e.target.value)} onKeyDown={e => e.key === 'Enter' && buscarPorDocumento()} placeholder="Ej: 1234567" style={{ ...inputStyle, flex: 1 }} />
                    <button onClick={buscarPorDocumento} disabled={buscandoDoc} style={{ padding: '9px 16px', borderRadius: '7px', border: 'none', background: '#0a2540', color: 'white', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>
                      {buscandoDoc ? 'Buscando...' : 'Buscar'}
                    </button>
                  </div>
                </div>
                {personaEncontrada && (
                  <div style={{ background: '#f0fdf4', border: '0.5px solid #bbf7d0', borderRadius: '8px', padding: '14px', marginBottom: '20px' }}>
                    <div style={{ fontSize: '12px', color: '#15803d', marginBottom: '6px', fontWeight: '500' }}>✅ Persona encontrada en el sistema</div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#0a2540' }}>
                      {personaEncontrada.primer_nombre} {personaEncontrada.segundo_nombre} {personaEncontrada.primer_apellido} {personaEncontrada.segundo_apellido}
                    </div>
                    <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>CI: {personaEncontrada.nro_documento}</div>
                  </div>
                )}
                {personaNueva && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ background: '#fff7ed', border: '0.5px solid #fed7aa', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#c2410c' }}>
                      ⚠️ Persona no encontrada. Completá los datos para registrarla.
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div><label style={labelStyle}>Primer nombre *</label><input value={form.primer_nombre} onChange={e => setForm({ ...form, primer_nombre: e.target.value })} placeholder="Ej: JUAN" style={inputStyle} /></div>
                      <div><label style={labelStyle}>Segundo nombre</label><input value={form.segundo_nombre} onChange={e => setForm({ ...form, segundo_nombre: e.target.value })} placeholder="Ej: CARLOS" style={inputStyle} /></div>
                      <div><label style={labelStyle}>Primer apellido *</label><input value={form.primer_apellido} onChange={e => setForm({ ...form, primer_apellido: e.target.value })} placeholder="Ej: PÉREZ" style={inputStyle} /></div>
                      <div><label style={labelStyle}>Segundo apellido</label><input value={form.segundo_apellido} onChange={e => setForm({ ...form, segundo_apellido: e.target.value })} placeholder="Ej: GARCÍA" style={inputStyle} /></div>
                      <div><label style={labelStyle}>Sexo *</label><select value={form.sexo} onChange={e => setForm({ ...form, sexo: e.target.value })} style={inputStyle}><option value="M">Masculino</option><option value="F">Femenino</option></select></div>
                      <div><label style={labelStyle}>Fecha de nacimiento *</label><input type="date" value={form.fecha_nacimiento} onChange={e => setForm({ ...form, fecha_nacimiento: e.target.value })} style={inputStyle} /></div>
                      <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Tipo documento *</label><select value={form.tipo_documento} onChange={e => setForm({ ...form, tipo_documento: e.target.value })} style={inputStyle}><option value="1">Cédula de identidad</option><option value="2">Pasaporte</option><option value="3">RUC</option></select></div>
                    </div>
                  </div>
                )}
                {(personaEncontrada || personaNueva) && (
                  <div style={{ marginBottom: '20px' }}>
                    <label style={labelStyle}>Rol *</label>
                    <select value={form.rol_id} onChange={e => setForm({ ...form, rol_id: e.target.value })} style={inputStyle}>
                      <option value="">Seleccionar rol...</option>
                      {rolesDisponibles.map(r => (<option key={r.id} value={r.id}>{r.nombre}</option>))}
                    </select>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                  <button onClick={cerrarModal} style={{ padding: '9px 18px', borderRadius: '7px', border: '0.5px solid #e5e7eb', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#6b7280' }}>Cancelar</button>
                  {(personaEncontrada || personaNueva) && (
                    <button onClick={handleGuardar} disabled={guardando} style={{ padding: '9px 18px', borderRadius: '7px', border: 'none', background: '#0a2540', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                      {guardando ? 'Guardando...' : 'Guardar'}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal importar Excel */}
      {modalImportAbierto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '28px', width: '560px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '500', color: '#0a2540', margin: '0 0 20px' }}>Importar usuarios desde Excel</h2>
            <div style={{ background: '#f8f9fb', borderRadius: '8px', padding: '16px', marginBottom: '20px', border: '0.5px solid #e5e7eb' }}>
              <div style={{ fontSize: '13px', fontWeight: '500', color: '#0a2540', marginBottom: '6px' }}>Paso 1 — Descargá la plantilla</div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>Columnas requeridas: nro_documento, primer_nombre, primer_apellido, sexo, fecha_nacimiento, rol.</div>
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
                  ✅ {archivoData.length} usuario(s) encontrados en el archivo
                </div>
              )}
            </div>
            {resultadoImport && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ background: '#f0fdf4', border: '0.5px solid #bbf7d0', borderRadius: '8px', padding: '14px', marginBottom: '10px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#15803d' }}>✅ {resultadoImport.creados} usuario(s) creados correctamente</div>
                </div>
                {resultadoImport.errores.length > 0 && (
                  <div style={{ background: '#fef2f2', border: '0.5px solid #fecaca', borderRadius: '8px', padding: '14px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: '#dc2626', marginBottom: '8px' }}>⚠️ {resultadoImport.errores.length} error(es):</div>
                    {resultadoImport.errores.map((e, i) => (
                      <div key={i} style={{ fontSize: '12px', color: '#dc2626', marginBottom: '4px' }}>• Doc: {e.documento} — {e.motivo}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => { setModalImportAbierto(false); setArchivoData([]); setResultadoImport(null); }} style={{ padding: '9px 18px', borderRadius: '7px', border: '0.5px solid #e5e7eb', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#6b7280' }}>Cerrar</button>
              {archivoData.length > 0 && !resultadoImport && (
                <button onClick={handleImportar} disabled={importando} style={{ padding: '9px 18px', borderRadius: '7px', border: 'none', background: '#0a2540', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                  {importando ? 'Importando...' : `Importar ${archivoData.length} usuarios`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal editar rol */}
      {modalEditarAbierto && usuarioEditando && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '28px', width: '400px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '500', color: '#0a2540', margin: '0 0 20px' }}>Cambiar rol</h2>
            <div style={{ background: '#f8f9fb', borderRadius: '8px', padding: '14px', marginBottom: '20px' }}>
              <div style={{ fontSize: '14px', fontWeight: '500', color: '#0a2540' }}>{getNombre(usuarioEditando)}</div>
              <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>CI: {usuarioEditando.persona.nro_documento}</div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>Rol actual: <span style={{ color: '#1d4ed8', fontWeight: '500' }}>{usuarioEditando.rol.nombre}</span></div>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Nuevo rol</label>
              <select value={rolEditando} onChange={e => setRolEditando(e.target.value)} style={inputStyle}>
                <option value="">Seleccionar rol...</option>
                {rolesDisponibles.map(r => (<option key={r.id} value={r.id}>{r.nombre}</option>))}
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setModalEditarAbierto(false)} style={{ padding: '9px 18px', borderRadius: '7px', border: '0.5px solid #e5e7eb', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#6b7280' }}>Cancelar</button>
              <button onClick={handleGuardarRol} disabled={guardandoRol} style={{ padding: '9px 18px', borderRadius: '7px', border: 'none', background: '#0a2540', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                {guardandoRol ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}