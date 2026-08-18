'use client';

import { useState } from 'react';

interface Contacto {
  id: number;
  valor: string;
  principal: boolean;
  tipo_contacto: { id: number; nombre: string };
}

interface Props {
  recurso: 'paramedicos' | 'conductores' | 'medicos' | 'arm' | 'supervisores';
  nombre: string;
  contactos: Contacto[];
  // Datos profesionales actuales
  nroRegistro?: string;        // paramédico
  nroLicencia?: string;        // conductor
  categoria?: string;          // conductor
  fechaVencimiento: string;    // ISO
  onCerrar: () => void;
  onGuardado: () => void;
}

const TIPOS_CONTACTO = [
  { id: 1, nombre: 'CELULAR' },
  { id: 2, nombre: 'FIJO' },
  { id: 3, nombre: 'WHATSAPP' },
  { id: 4, nombre: 'EMAIL' },
];
const CATEGORIAS = ['A', 'B', 'C', 'D', 'E', 'F'];

const soloFecha = (s: string) => (s ? s.split('T')[0] : '');

export default function ModalEditarFuncionario(props: Props) {
  const { recurso, habilitadoId, nombre, contactos, onCerrar, onGuardado } = props;
    const esParamedico = recurso !== 'conductores'; // registro profesional: paramédico, médico y ARM

  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [guardando, setGuardando] = useState(false);

  // --- Datos profesionales ---
  const [nroRegistro, setNroRegistro] = useState(props.nroRegistro ?? '');
  const [nroLicencia, setNroLicencia] = useState(props.nroLicencia ?? '');
  const [categoria, setCategoria] = useState(props.categoria ?? '');
  const [vencimiento, setVencimiento] = useState(soloFecha(props.fechaVencimiento));

  // --- Contactos ---
  const [editando, setEditando] = useState<number | null>(null);
  const [editValor, setEditValor] = useState('');
  const [editTipo, setEditTipo] = useState('1');
  const [nuevoTipo, setNuevoTipo] = useState('1');
  const [nuevoValor, setNuevoValor] = useState('');

  const token = () => localStorage.getItem('token') ?? '';
  const base = `http://localhost:3001/api/${recurso}/${habilitadoId}`;
  const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

  const flash = (msg: string) => { setExito(msg); setError(''); setTimeout(() => setExito(''), 2500); };

  const guardarProfesional = async () => {
    setGuardando(true); setError('');
    try {
      const body = esParamedico
        ? { nro_registro: nroRegistro, fecha_vencimiento: vencimiento }
        : { nro_licencia: nroLicencia, categoria, fecha_vencimiento: vencimiento };
      const path = esParamedico ? '/registro' : '/licencia';
      const res = await fetch(base + path, { method: 'PUT', headers: headers(), body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Error al guardar'); return; }
      flash(esParamedico ? 'Registro profesional actualizado' : 'Licencia actualizada');
      onGuardado();
    } catch { setError('Error de conexión'); }
    finally { setGuardando(false); }
  };

  const iniciarEdicion = (c: Contacto) => {
    setEditando(c.id);
    setEditValor(c.valor);
    setEditTipo(String(c.tipo_contacto.id));
    setError('');
  };

  const guardarContacto = async (contactoId: number) => {
    if (!editValor.trim()) { setError('El valor del contacto no puede estar vacío.'); return; }
    setGuardando(true); setError('');
    try {
      const res = await fetch(`${base}/contacto/${contactoId}`, {
        method: 'PUT', headers: headers(),
        body: JSON.stringify({ tipo_contacto_id: editTipo, valor: editValor })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Error al editar contacto'); return; }
      setEditando(null);
      flash('Contacto actualizado');
      onGuardado();
    } catch { setError('Error de conexión'); }
    finally { setGuardando(false); }
  };

  const eliminarContacto = async (contactoId: number) => {
    setGuardando(true); setError('');
    try {
      const res = await fetch(`${base}/contacto/${contactoId}`, { method: 'DELETE', headers: headers() });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Error al eliminar contacto'); return; }
      flash('Contacto eliminado');
      onGuardado();
    } catch { setError('Error de conexión'); }
    finally { setGuardando(false); }
  };

  const agregarContacto = async () => {
    if (!nuevoValor.trim()) { setError('Ingresá el valor del nuevo contacto.'); return; }
    setGuardando(true); setError('');
    try {
      const res = await fetch(`${base}/contacto`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ tipo_contacto_id: nuevoTipo, valor: nuevoValor })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Error al agregar contacto'); return; }
      setNuevoValor(''); setNuevoTipo('1');
      flash('Contacto agregado');
      onGuardado();
    } catch { setError('Error de conexión'); }
    finally { setGuardando(false); }
  };

  const input = { width: '100%', padding: '9px 12px', borderRadius: '7px', border: '0.5px solid #e5e7eb', fontSize: '13px', boxSizing: 'border-box' as const };
  const label = { fontSize: '12px', color: '#6b7280', display: 'block' as const, marginBottom: '6px' };
  const btnMini = { padding: '5px 10px', borderRadius: '6px', border: '0.5px solid #e5e7eb', background: 'transparent', cursor: 'pointer', fontSize: '12px' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
      <div style={{ background: 'white', borderRadius: '12px', padding: '28px', width: '560px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '500', color: '#0a2540', margin: '0 0 16px' }}>Editar funcionario</h2>
        <div style={{ background: '#f8f9fb', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '13px', color: '#0a2540', fontWeight: '500' }}>
          {nombre}
        </div>

        {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 14px', borderRadius: '7px', fontSize: '13px', marginBottom: '16px' }}>{error}</div>}
        {exito && <div style={{ background: '#f0fdf4', color: '#15803d', padding: '10px 14px', borderRadius: '7px', fontSize: '13px', marginBottom: '16px' }}>{exito}</div>}

        {/* --- Datos profesionales --- */}
        <div style={{ border: '0.5px solid #e5e7eb', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: '500', color: '#0a2540', marginBottom: '14px' }}>
            {esParamedico ? 'Registro profesional' : 'Licencia de conducir'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: esParamedico ? '1fr 1fr' : '1fr 100px 1fr', gap: '12px', marginBottom: '14px' }}>
            {esParamedico ? (
              <div>
                <label style={label}>Nro. de registro</label>
                <input value={nroRegistro} onChange={e => setNroRegistro(e.target.value)} style={input} />
              </div>
            ) : (
              <>
                <div>
                  <label style={label}>Nro. de licencia</label>
                  <input value={nroLicencia} onChange={e => setNroLicencia(e.target.value)} style={input} />
                </div>
                <div>
                  <label style={label}>Categoría</label>
                  <select value={categoria} onChange={e => setCategoria(e.target.value)} style={input}>
                    <option value="">—</option>
                    {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </>
            )}
            <div>
              <label style={label}>Vencimiento</label>
              <input type="date" value={vencimiento} onChange={e => setVencimiento(e.target.value)} style={input} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={guardarProfesional} disabled={guardando}
              style={{ padding: '8px 16px', borderRadius: '7px', border: 'none', background: '#0a2540', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
              Guardar datos
            </button>
          </div>
        </div>

        {/* --- Contactos --- */}
        <div style={{ border: '0.5px solid #e5e7eb', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: '500', color: '#0a2540', marginBottom: '12px' }}>Contactos</div>

          {contactos.length === 0 && <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '12px' }}>Sin contactos cargados</div>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
            {contactos.map(c => (
              <div key={c.id} style={{ display: 'flex', gap: '8px', alignItems: 'center', background: '#f8f9fb', borderRadius: '7px', padding: '8px 10px' }}>
                {editando === c.id ? (
                  <>
                    <select value={editTipo} onChange={e => setEditTipo(e.target.value)} style={{ ...input, width: '120px' }}>
                      {TIPOS_CONTACTO.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                    </select>
                    <input value={editValor} onChange={e => setEditValor(e.target.value)} style={{ ...input, flex: 1 }} />
                    <button onClick={() => guardarContacto(c.id)} disabled={guardando}
                      style={{ ...btnMini, border: 'none', background: '#0a2540', color: 'white' }}>Guardar</button>
                    <button onClick={() => setEditando(null)} style={btnMini}>Cancelar</button>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: '13px', flex: 1 }}>
                      <strong style={{ color: '#0a2540' }}>{c.tipo_contacto.nombre}:</strong> {c.valor}
                    </span>
                    <button onClick={() => iniciarEdicion(c)} style={{ ...btnMini, color: '#1d4ed8' }}>Editar</button>
                    <button onClick={() => eliminarContacto(c.id)} disabled={guardando}
                      style={{ ...btnMini, color: '#dc2626', borderColor: '#fecaca' }}>Eliminar</button>
                  </>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px', borderTop: '0.5px solid #f3f4f6', paddingTop: '12px' }}>
            <select value={nuevoTipo} onChange={e => setNuevoTipo(e.target.value)} style={{ ...input, width: '120px' }}>
              {TIPOS_CONTACTO.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </select>
            <input value={nuevoValor} onChange={e => setNuevoValor(e.target.value)} placeholder="Nuevo contacto" style={{ ...input, flex: 1 }} />
            <button onClick={agregarContacto} disabled={guardando}
              style={{ padding: '9px 14px', borderRadius: '7px', border: 'none', background: '#0a2540', color: 'white', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>
              + Agregar
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onCerrar}
            style={{ padding: '9px 18px', borderRadius: '7px', border: '0.5px solid #e5e7eb', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#6b7280' }}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
