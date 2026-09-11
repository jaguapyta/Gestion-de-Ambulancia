'use client';

import { API_URL } from '@/app/lib/api';
import { useEffect, useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import ModalEstadosTemporales from '../../../../components/ModalEstadosTemporales';
import ModalResetearPassword from '../../../../components/ModalResetearPassword';
import ModalEditarFuncionario from '../../../../components/ModalEditarFuncionario';
import ModalVinculosArm from '../../../../components/ModalVinculosArm';

interface Contacto { id: number; valor: string; principal: boolean; tipo_contacto: { id: number; nombre: string }; }
interface TurnoReg { id: number; dia_semana: number; turno: string; vinculo: number | null; }
interface Supervisor {
  id: number; activo: boolean; nro_registro: string | null; fecha_vencimiento: string | null;
  usuario: {
    id: number; activo: boolean;
    persona: { primer_nombre: string; segundo_nombre: string | null; primer_apellido: string; segundo_apellido: string | null; nro_documento: string; contacto: Contacto[]; };
    turno_regulacion: TurnoReg[];
    rol: { nombre: string };
  };
}
interface Persona {
  id: number; primer_nombre: string; segundo_nombre: string | null; primer_apellido: string; segundo_apellido: string | null;
  nro_documento: string; tipo_documento: number; sexo: string; fecha_nacimiento: string;
}
interface Turno { dia_semana: number; turno: 'DIURNO' | 'NOCTURNO'; }
interface Vinculo { a: Turno; b: Turno; }

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const DIAS_AB = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const TIPOS_CONTACTO = [
  { id: 1, nombre: 'CELULAR' }, { id: 2, nombre: 'FIJO' }, { id: 3, nombre: 'WHATSAPP' }, { id: 4, nombre: 'EMAIL' },
];
const chipTurno = (t: { dia_semana: number; turno: string }) => `${DIAS_AB[t.dia_semana - 1]} ${t.turno === 'NOCTURNO' ? '🌙' : '☀️'}`;
const franja = (t: Turno) => (t.dia_semana - 1) * 2 + (t.turno === 'NOCTURNO' ? 1 : 0);
const consecutivos = (a: Turno, b: Turno) => { const d = Math.abs(franja(a) - franja(b)); return d === 1 || d === 13; };
const igual = (a: Turno, b: Turno) => a.dia_semana === b.dia_semana && a.turno === b.turno;

const vinculosDe = (turnos: TurnoReg[]) => {
  const map = new Map<number, TurnoReg[]>();
  turnos.forEach(t => { const k = t.vinculo ?? 0; if (!map.has(k)) map.set(k, []); map.get(k)!.push(t); });
  return [...map.entries()].sort((x, y) => x[0] - y[0]);
};

export default function SupervisoresPage() {
  const [supers, setSupers] = useState<Supervisor[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalContactoAbierto, setModalContactoAbierto] = useState(false);
  const [modalEstadosAbierto, setModalEstadosAbierto] = useState(false);
  const [modalPasswordAbierto, setModalPasswordAbierto] = useState(false);
  const [modalVinculosAbierto, setModalVinculosAbierto] = useState(false);
  const [modalEditarAbierto, setModalEditarAbierto] = useState(false);
  const [modalImportAbierto, setModalImportAbierto] = useState(false);
  const [archivoData, setArchivoData] = useState<any[]>([]);
  const [importando, setImportando] = useState(false);
  const [resultadoImport, setResultadoImport] = useState<{ creados: number; errores: any[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [seleccionado, setSeleccionado] = useState<Supervisor | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [passwordGenerada, setPasswordGenerada] = useState('');

  const [documento, setDocumento] = useState('');
  const [buscandoDoc, setBuscandoDoc] = useState(false);
  const [personaEncontrada, setPersonaEncontrada] = useState<Persona | null>(null);
  const [personaNueva, setPersonaNueva] = useState(false);

  const [form, setForm] = useState({
    primer_nombre: '', segundo_nombre: '', primer_apellido: '', segundo_apellido: '',
    nro_documento: '', tipo_documento: '1', sexo: 'M', fecha_nacimiento: '', persona_id: '',
    nro_registro: '', fecha_vencimiento: ''
  });
  const [vinculos, setVinculos] = useState<Vinculo[]>([{ a: { dia_semana: 1, turno: 'DIURNO' }, b: { dia_semana: 3, turno: 'DIURNO' } }]);
  const [contactos, setContactos] = useState<{ tipo_contacto_id: string; valor: string; principal: boolean }[]>([]);
  const [formContacto, setFormContacto] = useState({ tipo_contacto_id: '1', valor: '' });

  const token = () => localStorage.getItem('token') ?? '';

  const cargar = () => {
    setCargando(true);
    fetch(`${API_URL}/api/supervisores`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setSupers(data); })
      .catch(err => console.error(err))
      .finally(() => setCargando(false));
  };
  useEffect(() => { cargar(); }, []);

  const getNombre = (s: Supervisor) =>
    `${s.usuario.persona.primer_nombre} ${s.usuario.persona.segundo_nombre ?? ''} ${s.usuario.persona.primer_apellido} ${s.usuario.persona.segundo_apellido ?? ''}`.trim();

  const filtrados = supers.filter(s =>
    getNombre(s).toLowerCase().includes(busqueda.toLowerCase()) || s.usuario.persona.nro_documento.includes(busqueda));

  const buscarPorDocumento = async () => {
    if (!documento) return;
    setBuscandoDoc(true); setPersonaEncontrada(null); setPersonaNueva(false); setError('');
    try {
      const res = await fetch(`${API_URL}/api/usuarios/persona/${documento}`, { headers: { Authorization: `Bearer ${token()}` } });
      if (res.ok) {
        const data = await res.json();
        setPersonaEncontrada(data);
        setForm(prev => ({
          ...prev,
          primer_nombre: data.primer_nombre, segundo_nombre: data.segundo_nombre ?? '',
          primer_apellido: data.primer_apellido, segundo_apellido: data.segundo_apellido ?? '',
          nro_documento: data.nro_documento, tipo_documento: String(data.tipo_documento),
          sexo: data.sexo, fecha_nacimiento: data.fecha_nacimiento?.split('T')[0] ?? '', persona_id: String(data.id),
        }));
      } else {
        setPersonaNueva(true);
        setForm(prev => ({ ...prev, nro_documento: documento }));
      }
    } catch { setError('Error de conexión'); }
    finally { setBuscandoDoc(false); }
  };

  const setSlot = (idx: number, slot: 'a' | 'b', campo: 'dia_semana' | 'turno', valor: any) => {
    setVinculos(vinculos.map((v, i) => i === idx ? { ...v, [slot]: { ...v[slot], [campo]: campo === 'dia_semana' ? parseInt(valor) : valor } } : v));
  };
  const agregarVinculo = () => { if (vinculos.length < 3) setVinculos([...vinculos, { a: { dia_semana: 1, turno: 'DIURNO' }, b: { dia_semana: 3, turno: 'DIURNO' } }]); };
  const quitarVinculo = (idx: number) => setVinculos(vinculos.filter((_, i) => i !== idx));

  const agregarContacto = () => {
    if (!formContacto.valor) return;
    setContactos([...contactos, { ...formContacto, principal: contactos.length === 0 }]);
    setFormContacto({ tipo_contacto_id: '1', valor: '' });
  };
  const eliminarContacto = (i: number) => setContactos(contactos.filter((_, idx) => idx !== i));

  const handleGuardar = async () => {
    if (!form.nro_documento) { setError('El documento es obligatorio.'); return; }
    if (vinculos.length === 0) { setError('Agregá al menos un vínculo.'); return; }
    for (let i = 0; i < vinculos.length; i++) {
      const { a, b } = vinculos[i];
      if (igual(a, b)) { setError(`Vínculo ${i + 1}: los dos turnos no pueden ser el mismo.`); return; }
      if (consecutivos(a, b)) { setError(`Vínculo ${i + 1}: los turnos no pueden ir consecutivos (24h seguidas).`); return; }
    }
    if (contactos.length === 0) { setError('Agregá al menos un contacto.'); return; }
    if (personaNueva && (!form.primer_nombre || !form.primer_apellido || !form.fecha_nacimiento)) {
      setError('Completá todos los campos obligatorios.'); return;
    }
    setGuardando(true); setError('');
    try {
      const res = await fetch(`${API_URL}/api/supervisores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ ...form, vinculos: vinculos.map(v => [v.a, v.b]), contactos })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Error al crear supervisor'); return; }
      setPasswordGenerada(data.password_generada ?? '');
      cargar();
    } catch { setError('Error de conexión'); }
    finally { setGuardando(false); }
  };

  const agregarContactoExistente = async () => {
    if (!seleccionado || !formContacto.valor) return;
    setGuardando(true);
    try {
      await fetch(`${API_URL}/api/supervisores/${seleccionado.id}/contacto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(formContacto)
      });
      cargar(); setModalContactoAbierto(false); setFormContacto({ tipo_contacto_id: '1', valor: '' });
    } catch { } finally { setGuardando(false); }
  };

  const toggleActivo = async (id: number, activo: boolean) => {
    try {
      await fetch(`${API_URL}/api/supervisores/${id}/activo`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ activo: !activo })
      });
      cargar();
    } catch (err) { console.error(err); }
  };

  const cerrarModal = () => {
    setModalAbierto(false); setPasswordGenerada(''); setError(''); setDocumento('');
    setPersonaEncontrada(null); setPersonaNueva(false);
    setVinculos([{ a: { dia_semana: 1, turno: 'DIURNO' }, b: { dia_semana: 3, turno: 'DIURNO' } }]);
    setContactos([]); setFormContacto({ tipo_contacto_id: '1', valor: '' });
    setForm({ primer_nombre: '', segundo_nombre: '', primer_apellido: '', segundo_apellido: '', nro_documento: '', tipo_documento: '1', sexo: 'M', fecha_nacimiento: '', persona_id: '', nro_registro: '', fecha_vencimiento: '' });
  };

  const handleArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      setArchivoData(XLSX.utils.sheet_to_json(ws));
      setResultadoImport(null);
    };
    reader.readAsBinaryString(file);
  };

  const handleImportar = async () => {
    if (archivoData.length === 0) return;
    setImportando(true);
    try {
      const res = await fetch(`${API_URL}/api/supervisores/masivo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ supervisores: archivoData })
      });
      const data = await res.json();
      setResultadoImport(data);
      cargar();
    } catch {
      setResultadoImport({ creados: 0, errores: [{ motivo: 'Error de conexión' }] });
    } finally {
      setImportando(false);
    }
  };

  const descargarPlantilla = () => {
    const datos = [{
      nro_documento: '1234567', primer_nombre: 'CARLOS', segundo_nombre: 'ALBERTO',
      primer_apellido: 'GIMÉNEZ', segundo_apellido: 'ROA', sexo: 'M', fecha_nacimiento: '1980-05-12',
      nro_registro: '', fecha_vencimiento: '', vinculos: '1D+3D;2N+5D',
      celulares: '0981123456', whatsapps: '0981123456', emails: 'carlos@email.com'
    }];
    const instrucciones = [
      { Columna: 'nro_documento', Obligatorio: 'SI', Descripcion: 'Cédula de identidad', Ejemplo: '1234567' },
      { Columna: 'primer_nombre', Obligatorio: 'SI', Descripcion: 'Primer nombre', Ejemplo: 'CARLOS' },
      { Columna: 'segundo_nombre', Obligatorio: 'NO', Descripcion: 'Segundo nombre', Ejemplo: 'ALBERTO' },
      { Columna: 'primer_apellido', Obligatorio: 'SI', Descripcion: 'Primer apellido', Ejemplo: 'GIMÉNEZ' },
      { Columna: 'segundo_apellido', Obligatorio: 'NO', Descripcion: 'Segundo apellido', Ejemplo: 'ROA' },
      { Columna: 'sexo', Obligatorio: 'SI', Descripcion: 'M o F', Ejemplo: 'M' },
      { Columna: 'fecha_nacimiento', Obligatorio: 'SI', Descripcion: 'AAAA-MM-DD', Ejemplo: '1980-05-12' },
      { Columna: 'nro_registro', Obligatorio: 'NO', Descripcion: 'Registro/credencial (si tiene)', Ejemplo: '' },
      { Columna: 'fecha_vencimiento', Obligatorio: 'NO', Descripcion: 'Vencimiento AAAA-MM-DD (si aplica)', Ejemplo: '' },
      { Columna: 'vinculos', Obligatorio: 'NO', Descripcion: 'Vínculos: ; separa vínculos, + une los 2 turnos. Turno = díaLetra (1=Lun…7=Dom, D=mañana N=noche). No consecutivos. Máx 3.', Ejemplo: '1D+3D;2N+5D' },
      { Columna: 'celulares', Obligatorio: 'NO', Descripcion: 'Celulares separados por coma', Ejemplo: '0981123456' },
      { Columna: 'whatsapps', Obligatorio: 'NO', Descripcion: 'WhatsApp separados por coma', Ejemplo: '0981123456' },
      { Columna: 'emails', Obligatorio: 'NO', Descripcion: 'Correos separados por coma', Ejemplo: 'carlos@email.com' },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(datos), 'Supervisores');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(instrucciones), 'Instrucciones');
    XLSX.writeFile(wb, 'plantilla_supervisores_seme.xlsx');
  };

  const diasRestantes = (f: string) => Math.ceil((new Date(f).getTime() - Date.now()) / 86400000);
  const colorVenc = (f: string | null) => {
    if (!f) return { bg: '#f1f5f9', color: '#64748b', label: 'Sin vencimiento' };
    const d = diasRestantes(f);
    if (d < 0) return { bg: '#fef2f2', color: '#dc2626', label: 'VENCIDO' };
    if (d <= 30) return { bg: '#fff7ed', color: '#c2410c', label: `Vence en ${d} días` };
    return { bg: '#f0fdf4', color: '#15803d', label: `Vence en ${d} días` };
  };

  const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: '7px', border: '0.5px solid #e5e7eb', fontSize: '13px', boxSizing: 'border-box' as const };
  const labelStyle = { fontSize: '12px', color: '#6b7280', display: 'block' as const, marginBottom: '6px' };
  const sel = { padding: '7px 10px', borderRadius: '7px', border: '0.5px solid #e5e7eb', fontSize: '13px', flex: 1 };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 500, color: '#0a2540', margin: 0 }}>Supervisores de guardia</h1>
          <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>Solo el Coordinador de Regulación · vínculos de 24h (2×12h no consecutivos)</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setModalImportAbierto(true)} style={{ background: 'white', color: '#0a2540', border: '0.5px solid #e5e7eb', padding: '9px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
            📥 Importar Excel
          </button>
          <button onClick={() => setModalAbierto(true)} style={{ background: '#0a2540', color: 'white', border: 'none', padding: '9px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
            + Nuevo supervisor
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Total', value: supers.length, color: '#0a2540' },
          { label: 'Activos', value: supers.filter(s => s.activo).length, color: '#15803d' },
          { label: 'Inactivos', value: supers.filter(s => !s.activo).length, color: '#dc2626' },
          { label: 'Con 3 vínculos', value: supers.filter(s => vinculosDe(s.usuario.turno_regulacion).length >= 3).length, color: '#c2410c' },
        ].map(c => (
          <div key={c.label} style={{ background: 'white', borderRadius: '10px', padding: '16px', border: '0.5px solid #e5e7eb', borderTop: `3px solid ${c.color}` }}>
            <div style={{ fontSize: '24px', fontWeight: 500, color: c.color }}>{c.value}</div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{c.label}</div>
          </div>
        ))}
      </div>

      <input type="text" placeholder="Buscar por nombre o documento..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '0.5px solid #e5e7eb', fontSize: '14px', boxSizing: 'border-box', marginBottom: '16px', outline: 'none' }} />

      <div style={{ background: 'white', borderRadius: '10px', border: '0.5px solid #e5e7eb', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
          <thead>
            <tr style={{ background: '#f8f9fb', borderBottom: '0.5px solid #e5e7eb' }}>
              {['#', 'Nombre', 'Documento', 'Registro', 'Vencimiento', 'Vínculos (24h)', 'Contactos', 'Estado', 'Acciones'].map(col => (
                <th key={col} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', color: '#6b7280', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Cargando supervisores...</td></tr>
            ) : filtrados.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>No se encontraron supervisores</td></tr>
            ) : filtrados.map((s, i) => {
              const venc = colorVenc(s.fecha_vencimiento);
              const grupos = vinculosDe(s.usuario.turno_regulacion);
              return (
                <tr key={s.id} style={{ borderBottom: '0.5px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#9ca3af' }}>{i + 1}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 500, color: '#0a2540' }}>{getNombre(s)}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>{s.usuario.persona.nro_documento}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>{s.nro_registro || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ background: venc.bg, color: venc.color, padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 500 }}>{venc.label}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {grupos.map(([n, ts]) => (
                        <div key={n} style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <span style={{ fontSize: '10px', color: '#9ca3af', width: '24px' }}>V{n}</span>
                          {ts.map(t => (
                            <span key={t.id} style={{ background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 500 }}>{chipTurno(t)}</span>
                          ))}
                        </div>
                      ))}
                      <button onClick={() => { setSeleccionado(s); setModalVinculosAbierto(true); }}
                        style={{ background: 'transparent', border: 'none', color: '#1d4ed8', fontSize: '11px', cursor: 'pointer', padding: 0, whiteSpace: 'nowrap', textAlign: 'left' }}>
                        {grupos.length === 0 ? '+ Asignar vínculos' : 'Editar'}
                      </button>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {s.usuario.persona.contacto.map(c => (
                        <div key={c.id} style={{ fontSize: '12px', color: '#6b7280' }}>
                          <span style={{ fontWeight: 500, color: '#0a2540' }}>{c.tipo_contacto.nombre}:</span> {c.valor}
                        </div>
                      ))}
                      <button onClick={() => { setSeleccionado(s); setModalContactoAbierto(true); }}
                        style={{ background: 'transparent', border: 'none', color: '#1d4ed8', fontSize: '11px', cursor: 'pointer', textAlign: 'left', padding: 0, marginTop: '2px' }}>
                        + Agregar contacto
                      </button>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ background: s.activo ? '#f0fdf4' : '#fef2f2', color: s.activo ? '#15803d' : '#dc2626', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 500 }}>
                      {s.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => { setSeleccionado(s); setModalEditarAbierto(true); }} style={{ background: 'transparent', border: '0.5px solid #e5e7eb', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: '#0a2540', whiteSpace: 'nowrap' }}>Editar</button>
                      <button onClick={() => { setSeleccionado(s); setModalEstadosAbierto(true); }} style={{ background: 'transparent', border: '0.5px solid #e5e7eb', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: '#0a2540', whiteSpace: 'nowrap' }}>Estados</button>
                      <button onClick={() => { setSeleccionado(s); setModalPasswordAbierto(true); }} title="Restablecer contraseña" style={{ background: 'transparent', border: '0.5px solid #e5e7eb', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: '#0a2540', whiteSpace: 'nowrap' }}>🔑 Contraseña</button>
                      <button onClick={() => toggleActivo(s.id, s.activo)} style={{ background: 'transparent', border: `0.5px solid ${s.activo ? '#fecaca' : '#bbf7d0'}`, padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: s.activo ? '#dc2626' : '#15803d', whiteSpace: 'nowrap' }}>
                        {s.activo ? 'Dar de baja' : 'Dar de alta'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal nuevo supervisor */}
      {modalAbierto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '28px', width: '560px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            {passwordGenerada ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '40px', marginBottom: '16px' }}>✅</div>
                <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#0a2540', marginBottom: '8px' }}>Supervisor registrado correctamente</h2>
                <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>Guardá la contraseña — deberá cambiarla al primer ingreso.</p>
                <div style={{ background: '#f0fdf4', border: '0.5px solid #bbf7d0', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
                  <div style={{ fontSize: '12px', color: '#15803d', marginBottom: '6px' }}>Contraseña generada</div>
                  <div style={{ fontSize: '22px', fontWeight: 500, color: '#0a2540', letterSpacing: '2px' }}>{passwordGenerada}</div>
                </div>
                <button onClick={cerrarModal} style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: '#0a2540', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>Cerrar</button>
              </div>
            ) : (
              <>
                <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#0a2540', margin: '0 0 20px' }}>Nuevo supervisor de guardia</h2>
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
                    <div style={{ fontSize: '12px', color: '#15803d', marginBottom: '6px', fontWeight: 500 }}>✅ Persona encontrada</div>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#0a2540' }}>
                      {personaEncontrada.primer_nombre} {personaEncontrada.segundo_nombre} {personaEncontrada.primer_apellido} {personaEncontrada.segundo_apellido}
                    </div>
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>CI: {personaEncontrada.nro_documento}</div>
                  </div>
                )}

                {personaNueva && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ background: '#fff7ed', border: '0.5px solid #fed7aa', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#c2410c' }}>⚠️ Persona no encontrada. Completá los datos.</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div><label style={labelStyle}>Primer nombre *</label><input value={form.primer_nombre} onChange={e => setForm({ ...form, primer_nombre: e.target.value })} style={inputStyle} /></div>
                      <div><label style={labelStyle}>Segundo nombre</label><input value={form.segundo_nombre} onChange={e => setForm({ ...form, segundo_nombre: e.target.value })} style={inputStyle} /></div>
                      <div><label style={labelStyle}>Primer apellido *</label><input value={form.primer_apellido} onChange={e => setForm({ ...form, primer_apellido: e.target.value })} style={inputStyle} /></div>
                      <div><label style={labelStyle}>Segundo apellido</label><input value={form.segundo_apellido} onChange={e => setForm({ ...form, segundo_apellido: e.target.value })} style={inputStyle} /></div>
                      <div><label style={labelStyle}>Sexo *</label>
                        <select value={form.sexo} onChange={e => setForm({ ...form, sexo: e.target.value })} style={inputStyle}>
                          <option value="M">Masculino</option><option value="F">Femenino</option>
                        </select>
                      </div>
                      <div><label style={labelStyle}>Fecha nacimiento *</label><input type="date" value={form.fecha_nacimiento} onChange={e => setForm({ ...form, fecha_nacimiento: e.target.value })} style={inputStyle} /></div>
                      <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Tipo documento</label>
                        <select value={form.tipo_documento} onChange={e => setForm({ ...form, tipo_documento: e.target.value })} style={inputStyle}>
                          <option value="1">Cédula de identidad</option><option value="2">Pasaporte</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {(personaEncontrada || personaNueva) && (
                  <>
                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 500, color: '#0a2540', display: 'block', marginBottom: '10px' }}>Registro (opcional)</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div><label style={labelStyle}>Nro. de registro / credencial</label><input value={form.nro_registro} onChange={e => setForm({ ...form, nro_registro: e.target.value })} placeholder="Opcional" style={inputStyle} /></div>
                        <div><label style={labelStyle}>Fecha de vencimiento</label><input type="date" value={form.fecha_vencimiento} onChange={e => setForm({ ...form, fecha_vencimiento: e.target.value })} style={inputStyle} /></div>
                      </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                      <label style={{ ...labelStyle, marginBottom: '10px' }}>Vínculos * (cada uno 24h = 2 turnos de 12h no consecutivos · máx. 3)</label>
                      {vinculos.map((v, idx) => {
                        const choca = consecutivos(v.a, v.b) || igual(v.a, v.b);
                        return (
                          <div key={idx} style={{ border: `0.5px solid ${choca ? '#fecaca' : '#e5e7eb'}`, borderRadius: '10px', padding: '14px', marginBottom: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                              <span style={{ fontSize: '13px', fontWeight: 500, color: '#0a2540' }}>Vínculo {idx + 1} <span style={{ color: '#9ca3af', fontWeight: 400 }}>· 24h</span></span>
                              {vinculos.length > 1 && <button onClick={() => quitarVinculo(idx)} style={{ background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '12px' }}>Quitar</button>}
                            </div>
                            {(['a', 'b'] as const).map((slot, sidx) => (
                              <div key={slot} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: sidx === 0 ? '8px' : 0 }}>
                                <span style={{ width: '58px', fontSize: '12px', color: '#6b7280' }}>Turno {sidx + 1}</span>
                                <select value={v[slot].dia_semana} onChange={e => setSlot(idx, slot, 'dia_semana', e.target.value)} style={sel}>
                                  {DIAS.map((d, i) => <option key={i + 1} value={i + 1}>{d}</option>)}
                                </select>
                                <select value={v[slot].turno} onChange={e => setSlot(idx, slot, 'turno', e.target.value)} style={sel}>
                                  <option value="DIURNO">☀️ Mañana</option>
                                  <option value="NOCTURNO">🌙 Noche</option>
                                </select>
                              </div>
                            ))}
                            {choca && <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '8px' }}>⚠️ Turnos consecutivos o iguales.</div>}
                          </div>
                        );
                      })}
                      {vinculos.length < 3 && (
                        <button onClick={agregarVinculo} style={{ background: 'transparent', border: '0.5px dashed #cbd5e1', color: '#0a2540', padding: '9px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', width: '100%' }}>
                          + Agregar vínculo
                        </button>
                      )}
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                      <label style={labelStyle}>Contactos * (al menos uno)</label>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                        <select value={formContacto.tipo_contacto_id} onChange={e => setFormContacto({ ...formContacto, tipo_contacto_id: e.target.value })} style={{ ...inputStyle, width: '140px' }}>
                          {TIPOS_CONTACTO.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                        </select>
                        <input value={formContacto.valor} onChange={e => setFormContacto({ ...formContacto, valor: e.target.value })} placeholder="Valor del contacto" style={{ ...inputStyle, flex: 1 }} />
                        <button onClick={agregarContacto} style={{ padding: '9px 14px', borderRadius: '7px', border: 'none', background: '#0a2540', color: 'white', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>+ Agregar</button>
                      </div>
                      {contactos.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {contactos.map((c, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8f9fb', borderRadius: '7px', padding: '8px 12px', fontSize: '13px' }}>
                              <span><strong>{TIPOS_CONTACTO.find(t => String(t.id) === c.tipo_contacto_id)?.nombre}:</strong> {c.valor} {c.principal && <span style={{ color: '#15803d', fontSize: '11px' }}>★ Principal</span>}</span>
                              <button onClick={() => eliminarContacto(i)} style={{ background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '12px' }}>✕</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                      <button onClick={cerrarModal} style={{ padding: '9px 18px', borderRadius: '7px', border: '0.5px solid #e5e7eb', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#6b7280' }}>Cancelar</button>
                      <button onClick={handleGuardar} disabled={guardando} style={{ padding: '9px 18px', borderRadius: '7px', border: 'none', background: '#0a2540', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
                        {guardando ? 'Guardando...' : 'Registrar supervisor'}
                      </button>
                    </div>
                  </>
                )}

                {!personaEncontrada && !personaNueva && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={cerrarModal} style={{ padding: '9px 18px', borderRadius: '7px', border: '0.5px solid #e5e7eb', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#6b7280' }}>Cancelar</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal importar Excel */}
      {modalImportAbierto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '28px', width: '580px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#0a2540', margin: '0 0 20px' }}>Importar supervisores desde Excel</h2>
            <div style={{ background: '#f8f9fb', borderRadius: '8px', padding: '16px', marginBottom: '20px', border: '0.5px solid #e5e7eb' }}>
              <div style={{ fontSize: '13px', fontWeight: 500, color: '#0a2540', marginBottom: '6px' }}>Paso 1 — Descargá la plantilla</div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>Vínculos como <code>1D+3D;2N+5D</code> (<code>;</code> separa vínculos, <code>+</code> une los 2 turnos de 12h).</div>
              <button onClick={descargarPlantilla} style={{ background: 'white', color: '#0a2540', border: '0.5px solid #e5e7eb', padding: '8px 16px', borderRadius: '7px', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}>📄 Descargar plantilla Excel</button>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '13px', fontWeight: 500, color: '#0a2540', marginBottom: '8px' }}>Paso 2 — Subí el archivo completado</div>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleArchivo} style={{ display: 'none' }} />
              <button onClick={() => fileRef.current?.click()} style={{ background: 'white', color: '#0a2540', border: '0.5px solid #e5e7eb', padding: '8px 16px', borderRadius: '7px', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}>📁 Seleccionar archivo</button>
              {archivoData.length > 0 && (
                <div style={{ marginTop: '10px', background: '#f0fdf4', border: '0.5px solid #bbf7d0', borderRadius: '7px', padding: '10px 14px', fontSize: '13px', color: '#15803d' }}>
                  ✅ {archivoData.length} supervisor(es) encontrados en el archivo
                </div>
              )}
            </div>
            {resultadoImport && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ background: '#f0fdf4', border: '0.5px solid #bbf7d0', borderRadius: '8px', padding: '14px', marginBottom: '10px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: '#15803d' }}>✅ {resultadoImport.creados} supervisor(es) creados correctamente</div>
                </div>
                {resultadoImport.errores.length > 0 && (
                  <div style={{ background: '#fef2f2', border: '0.5px solid #fecaca', borderRadius: '8px', padding: '14px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: '#dc2626', marginBottom: '8px' }}>⚠️ {resultadoImport.errores.length} error(es):</div>
                    {resultadoImport.errores.map((e, i) => (
                      <div key={i} style={{ fontSize: '12px', color: '#dc2626', marginBottom: '4px' }}>• {e.documento ?? ''} — {e.motivo}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => { setModalImportAbierto(false); setArchivoData([]); setResultadoImport(null); }} style={{ padding: '9px 18px', borderRadius: '7px', border: '0.5px solid #e5e7eb', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#6b7280' }}>Cerrar</button>
              {archivoData.length > 0 && !resultadoImport && (
                <button onClick={handleImportar} disabled={importando} style={{ padding: '9px 18px', borderRadius: '7px', border: 'none', background: '#0a2540', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
                  {importando ? 'Importando...' : `Importar ${archivoData.length} supervisores`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal agregar contacto rápido */}
      {modalContactoAbierto && seleccionado && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '28px', width: '400px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#0a2540', margin: '0 0 16px' }}>Agregar contacto</h2>
            <div style={{ background: '#f8f9fb', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '13px', color: '#0a2540', fontWeight: 500 }}>{getNombre(seleccionado)}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label style={labelStyle}>Tipo de contacto</label>
                <select value={formContacto.tipo_contacto_id} onChange={e => setFormContacto({ ...formContacto, tipo_contacto_id: e.target.value })} style={inputStyle}>
                  {TIPOS_CONTACTO.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Valor *</label>
                <input value={formContacto.valor} onChange={e => setFormContacto({ ...formContacto, valor: e.target.value })} placeholder="Ej: 0981 123 456" style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => { setModalContactoAbierto(false); setFormContacto({ tipo_contacto_id: '1', valor: '' }); }} style={{ padding: '9px 18px', borderRadius: '7px', border: '0.5px solid #e5e7eb', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#6b7280' }}>Cancelar</button>
              <button onClick={agregarContactoExistente} disabled={guardando} style={{ padding: '9px 18px', borderRadius: '7px', border: 'none', background: '#0a2540', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
                {guardando ? 'Guardando...' : 'Agregar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalEstadosAbierto && seleccionado && (
        <ModalEstadosTemporales usuarioId={seleccionado.usuario.id} nombre={getNombre(seleccionado)}
          companeros={supers.map(s => ({ id: s.usuario.id, nombre: getNombre(s) }))}
          onCerrar={() => { setModalEstadosAbierto(false); cargar(); }} />
      )}
      {modalPasswordAbierto && seleccionado && (
        <ModalResetearPassword usuarioId={seleccionado.usuario.id} nombre={getNombre(seleccionado)} documento={seleccionado.usuario.persona.nro_documento}
          onCerrar={() => setModalPasswordAbierto(false)} />
      )}
      {modalVinculosAbierto && seleccionado && (
        <ModalVinculosArm recurso="supervisores" habilitadoId={seleccionado.id} nombre={getNombre(seleccionado)}
          vinculosActuales={vinculosDe(seleccionado.usuario.turno_regulacion).map(([, ts]) => ts.map(t => ({ dia_semana: t.dia_semana, turno: t.turno })))}
          onCerrar={() => setModalVinculosAbierto(false)} onGuardado={cargar} />
      )}
      {modalEditarAbierto && seleccionado && (
        <ModalEditarFuncionario recurso="supervisores" habilitadoId={seleccionado.id} nombre={getNombre(seleccionado)}
          contactos={seleccionado.usuario.persona.contacto} nroRegistro={seleccionado.nro_registro ?? ''} fechaVencimiento={seleccionado.fecha_vencimiento ?? ''}
          onCerrar={() => setModalEditarAbierto(false)} onGuardado={cargar} />
      )}
    </div>
  );
}