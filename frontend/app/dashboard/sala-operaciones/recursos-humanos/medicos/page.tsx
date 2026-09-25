'use client';

import { API_URL } from '@/app/lib/api';
import { useEffect, useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import ModalEstadosTemporales from '../../../../components/ModalEstadosTemporales';
import ModalResetearPassword from '../../../../components/ModalResetearPassword';
import ModalEditarFuncionario from '../../../../components/ModalEditarFuncionario';
import ModalTurnosMedico from '../../../../components/ModalTurnosMedico';
import { esSoloLectura } from '@/lib/permisos';

interface Contacto { id: number; valor: string; principal: boolean; tipo_contacto: { id: number; nombre: string }; }
interface TurnoReg { id: number; dia_semana: number; turno: string; vinculo: number | null; }
interface Medico {
  id: number; activo: boolean; nro_registro: string; fecha_vencimiento: string;
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

const DIAS_AB = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const TIPOS_CONTACTO = [
  { id: 1, nombre: 'CELULAR' }, { id: 2, nombre: 'FIJO' }, { id: 3, nombre: 'WHATSAPP' }, { id: 4, nombre: 'EMAIL' },
];
const chipTurno = (t: TurnoReg) => `${DIAS_AB[t.dia_semana - 1]} ${t.turno === 'NOCTURNO' ? '🌙' : '☀️'}`;

export default function MedicosPage() {
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalContactoAbierto, setModalContactoAbierto] = useState(false);
  const [modalEstadosAbierto, setModalEstadosAbierto] = useState(false);
  const [modalPasswordAbierto, setModalPasswordAbierto] = useState(false);
  const [modalTurnosAbierto, setModalTurnosAbierto] = useState(false);
  const [modalEditarAbierto, setModalEditarAbierto] = useState(false);
  const [modalImportAbierto, setModalImportAbierto] = useState(false);
  const [archivoData, setArchivoData] = useState<any[]>([]);
  const [importando, setImportando] = useState(false);
  const [resultadoImport, setResultadoImport] = useState<{ creados: number; errores: any[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [seleccionado, setSeleccionado] = useState<Medico | null>(null);
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
  const [turnosSel, setTurnosSel] = useState<{ dia_semana: number; turno: 'DIURNO' | 'NOCTURNO' }[]>([]);
  const [contactos, setContactos] = useState<{ tipo_contacto_id: string; valor: string; principal: boolean }[]>([]);
  const [formContacto, setFormContacto] = useState({ tipo_contacto_id: '1', valor: '' });

  const token = () => localStorage.getItem('token') ?? '';

  const cargar = () => {
    setCargando(true);
    fetch(`${API_URL}/api/medicos`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setMedicos(data); })
      .catch(err => console.error(err))
      .finally(() => setCargando(false));
  };
  const [soloLectura, setSoloLectura] = useState(false);
  useEffect(() => {
    try { setSoloLectura(esSoloLectura(JSON.parse(localStorage.getItem('usuario') || '{}').rol)); } catch {}
    cargar();
  }, []);

  const getNombre = (m: Medico) =>
    `${m.usuario.persona.primer_nombre} ${m.usuario.persona.segundo_nombre ?? ''} ${m.usuario.persona.primer_apellido} ${m.usuario.persona.segundo_apellido ?? ''}`.trim();

  const filtrados = medicos.filter(m =>
    getNombre(m).toLowerCase().includes(busqueda.toLowerCase()) || m.usuario.persona.nro_documento.includes(busqueda));

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

  const tieneTurno = (d: number, t: 'DIURNO' | 'NOCTURNO') => turnosSel.some(x => x.dia_semana === d && x.turno === t);
  const toggleTurno = (d: number, t: 'DIURNO' | 'NOCTURNO') => {
    if (tieneTurno(d, t)) setTurnosSel(turnosSel.filter(x => !(x.dia_semana === d && x.turno === t)));
    else setTurnosSel([...turnosSel, { dia_semana: d, turno: t }]);
  };

  const agregarContacto = () => {
    if (!formContacto.valor) return;
    setContactos([...contactos, { ...formContacto, principal: contactos.length === 0 }]);
    setFormContacto({ tipo_contacto_id: '1', valor: '' });
  };
  const eliminarContacto = (i: number) => setContactos(contactos.filter((_, idx) => idx !== i));

  const handleGuardar = async () => {
    if (!form.nro_documento) { setError('El documento es obligatorio.'); return; }
    if (!form.nro_registro) { setError('El nro. de registro (matrícula) es obligatorio.'); return; }
    if (!form.fecha_vencimiento) { setError('La fecha de vencimiento es obligatoria.'); return; }
    if (turnosSel.length === 0) { setError('Asigná al menos un turno de 12h.'); return; }
    if (contactos.length === 0) { setError('Agregá al menos un contacto.'); return; }
    if (personaNueva && (!form.primer_nombre || !form.primer_apellido || !form.fecha_nacimiento)) {
      setError('Completá todos los campos obligatorios.'); return;
    }
    setGuardando(true); setError('');
    try {
      const res = await fetch(`${API_URL}/api/medicos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ ...form, turnos: turnosSel, contactos })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Error al crear médico'); return; }
      setPasswordGenerada(data.password_generada ?? '');
      cargar();
    } catch { setError('Error de conexión'); }
    finally { setGuardando(false); }
  };

  const agregarContactoExistente = async () => {
    if (!seleccionado || !formContacto.valor) return;
    setGuardando(true);
    try {
      await fetch(`${API_URL}/api/medicos/${seleccionado.id}/contacto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify(formContacto)
      });
      cargar(); setModalContactoAbierto(false); setFormContacto({ tipo_contacto_id: '1', valor: '' });
    } catch { } finally { setGuardando(false); }
  };

  const toggleActivo = async (id: number, activo: boolean) => {
    try {
      await fetch(`${API_URL}/api/medicos/${id}/activo`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ activo: !activo })
      });
      cargar();
    } catch (err) { console.error(err); }
  };

  const cerrarModal = () => {
    setModalAbierto(false); setPasswordGenerada(''); setError(''); setDocumento('');
    setPersonaEncontrada(null); setPersonaNueva(false); setTurnosSel([]); setContactos([]);
    setFormContacto({ tipo_contacto_id: '1', valor: '' });
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
      const res = await fetch(`${API_URL}/api/medicos/masivo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ medicos: archivoData })
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
      nro_documento: '1234567', primer_nombre: 'JUAN', segundo_nombre: 'CARLOS',
      primer_apellido: 'PÉREZ', segundo_apellido: 'GARCÍA', sexo: 'M', fecha_nacimiento: '1985-06-20',
      nro_registro: '12345', fecha_vencimiento: '2027-12-31', turnos: '1D,1N,4D',
      celulares: '0981123456', whatsapps: '0981123456', emails: 'juan@email.com'
    }];
    const instrucciones = [
      { Columna: 'nro_documento', Obligatorio: 'SI', Descripcion: 'Cédula de identidad', Ejemplo: '1234567' },
      { Columna: 'primer_nombre', Obligatorio: 'SI', Descripcion: 'Primer nombre', Ejemplo: 'JUAN' },
      { Columna: 'segundo_nombre', Obligatorio: 'NO', Descripcion: 'Segundo nombre', Ejemplo: 'CARLOS' },
      { Columna: 'primer_apellido', Obligatorio: 'SI', Descripcion: 'Primer apellido', Ejemplo: 'PÉREZ' },
      { Columna: 'segundo_apellido', Obligatorio: 'NO', Descripcion: 'Segundo apellido', Ejemplo: 'GARCÍA' },
      { Columna: 'sexo', Obligatorio: 'SI', Descripcion: 'M o F', Ejemplo: 'M' },
      { Columna: 'fecha_nacimiento', Obligatorio: 'SI', Descripcion: 'AAAA-MM-DD', Ejemplo: '1985-06-20' },
      { Columna: 'nro_registro', Obligatorio: 'SI', Descripcion: 'Matrícula profesional', Ejemplo: '12345' },
      { Columna: 'fecha_vencimiento', Obligatorio: 'SI', Descripcion: 'Vencimiento matrícula AAAA-MM-DD', Ejemplo: '2027-12-31' },
      { Columna: 'turnos', Obligatorio: 'NO', Descripcion: 'Turnos 12h: díaLetra separados por coma. Día 1=Lun…7=Dom, D=mañana(07-19) N=noche(19-07). Puede encadenar 24h.', Ejemplo: '1D,1N,4D' },
      { Columna: 'celulares', Obligatorio: 'NO', Descripcion: 'Celulares separados por coma', Ejemplo: '0981123456' },
      { Columna: 'whatsapps', Obligatorio: 'NO', Descripcion: 'WhatsApp separados por coma', Ejemplo: '0981123456' },
      { Columna: 'emails', Obligatorio: 'NO', Descripcion: 'Correos separados por coma', Ejemplo: 'juan@email.com' },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(datos), 'Médicos');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(instrucciones), 'Instrucciones');
    XLSX.writeFile(wb, 'plantilla_medicos_seme.xlsx');
  };

  const diasRestantes = (f: string) => Math.ceil((new Date(f).getTime() - Date.now()) / 86400000);
  const colorVenc = (f: string) => {
    const d = diasRestantes(f);
    if (d < 0) return { bg: '#fef2f2', color: '#dc2626', label: 'VENCIDO' };
    if (d <= 30) return { bg: '#fff7ed', color: '#c2410c', label: `Vence en ${d} días` };
    return { bg: '#f0fdf4', color: '#15803d', label: `Vence en ${d} días` };
  };

  const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: '7px', border: '0.5px solid #e5e7eb', fontSize: '13px', boxSizing: 'border-box' as const };
  const labelStyle = { fontSize: '12px', color: '#6b7280', display: 'block' as const, marginBottom: '6px' };
  const chipStyle = (activo: boolean): React.CSSProperties => ({ flex: 1, padding: '6px 0', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 500, background: activo ? '#0a2540' : '#f0f4f8', color: activo ? 'white' : '#6b7280' });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 500, color: '#0a2540', margin: 0 }}>Médicos reguladores</h1>
          <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>Recursos Humanos del Centro de Regulación · turnos de 12h</p>
        </div>
        {!soloLectura && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setModalImportAbierto(true)} style={{ background: 'white', color: '#0a2540', border: '0.5px solid #e5e7eb', padding: '9px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
              📥 Importar Excel
            </button>
            <button onClick={() => setModalAbierto(true)} style={{ background: '#0a2540', color: 'white', border: 'none', padding: '9px 18px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
              + Nuevo médico
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Total', value: medicos.length, color: '#0a2540' },
          { label: 'Activos', value: medicos.filter(m => m.activo).length, color: '#15803d' },
          { label: 'Inactivos', value: medicos.filter(m => !m.activo).length, color: '#dc2626' },
          { label: 'Por vencer', value: medicos.filter(m => { const d = diasRestantes(m.fecha_vencimiento); return d >= 0 && d <= 30; }).length, color: '#c2410c' },
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
              {['#', 'Nombre', 'Documento', 'Matrícula', 'Vencimiento', 'Turnos (12h)', 'Contactos', 'Estado', 'Acciones'].map(col => (
                <th key={col} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', color: '#6b7280', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Cargando médicos...</td></tr>
            ) : filtrados.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>No se encontraron médicos</td></tr>
            ) : filtrados.map((m, i) => {
              const venc = colorVenc(m.fecha_vencimiento);
              return (
                <tr key={m.id} style={{ borderBottom: '0.5px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#9ca3af' }}>{i + 1}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 500, color: '#0a2540' }}>{getNombre(m)}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>{m.usuario.persona.nro_documento}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>{m.nro_registro}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ background: venc.bg, color: venc.color, padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 500 }}>{venc.label}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' as const }}>
                      {m.usuario.turno_regulacion.map(t => (
                        <span key={t.id} style={{ background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 500 }}>{chipTurno(t)}</span>
                      ))}
                      {!soloLectura && (
                        <button onClick={() => { setSeleccionado(m); setModalTurnosAbierto(true); }}
                          style={{ background: 'transparent', border: 'none', color: '#1d4ed8', fontSize: '11px', cursor: 'pointer', padding: 0, whiteSpace: 'nowrap' }}>
                          {m.usuario.turno_regulacion.length === 0 ? '+ Asignar turnos' : 'Editar'}
                        </button>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {m.usuario.persona.contacto.map(c => (
                        <div key={c.id} style={{ fontSize: '12px', color: '#6b7280' }}>
                          <span style={{ fontWeight: 500, color: '#0a2540' }}>{c.tipo_contacto.nombre}:</span> {c.valor}
                        </div>
                      ))}
                      {!soloLectura && (
                        <button onClick={() => { setSeleccionado(m); setModalContactoAbierto(true); }}
                          style={{ background: 'transparent', border: 'none', color: '#1d4ed8', fontSize: '11px', cursor: 'pointer', textAlign: 'left', padding: 0, marginTop: '2px' }}>
                          + Agregar contacto
                        </button>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ background: m.activo ? '#f0fdf4' : '#fef2f2', color: m.activo ? '#15803d' : '#dc2626', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 500 }}>
                      {m.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {soloLectura ? (
                      <span style={{ fontSize: '12px', color: '#9ca3af' }}>—</span>
                    ) : (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => { setSeleccionado(m); setModalEditarAbierto(true); }} style={{ background: 'transparent', border: '0.5px solid #e5e7eb', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: '#0a2540', whiteSpace: 'nowrap' }}>Editar</button>
                      <button onClick={() => { setSeleccionado(m); setModalEstadosAbierto(true); }} style={{ background: 'transparent', border: '0.5px solid #e5e7eb', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: '#0a2540', whiteSpace: 'nowrap' }}>Estados</button>
                      <button onClick={() => { setSeleccionado(m); setModalPasswordAbierto(true); }} title="Restablecer contraseña" style={{ background: 'transparent', border: '0.5px solid #e5e7eb', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: '#0a2540', whiteSpace: 'nowrap' }}>🔑 Contraseña</button>
                      <button onClick={() => toggleActivo(m.id, m.activo)} style={{ background: 'transparent', border: `0.5px solid ${m.activo ? '#fecaca' : '#bbf7d0'}`, padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: m.activo ? '#dc2626' : '#15803d', whiteSpace: 'nowrap' }}>
                        {m.activo ? 'Dar de baja' : 'Dar de alta'}
                      </button>
                    </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal nuevo médico */}
      {modalAbierto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '28px', width: '560px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            {passwordGenerada ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '40px', marginBottom: '16px' }}>✅</div>
                <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#0a2540', marginBottom: '8px' }}>Médico registrado correctamente</h2>
                <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px' }}>Guardá la contraseña — deberá cambiarla al primer ingreso.</p>
                <div style={{ background: '#f0fdf4', border: '0.5px solid #bbf7d0', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
                  <div style={{ fontSize: '12px', color: '#15803d', marginBottom: '6px' }}>Contraseña generada</div>
                  <div style={{ fontSize: '22px', fontWeight: 500, color: '#0a2540', letterSpacing: '2px' }}>{passwordGenerada}</div>
                </div>
                <button onClick={cerrarModal} style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: '#0a2540', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>Cerrar</button>
              </div>
            ) : (
              <>
                <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#0a2540', margin: '0 0 20px' }}>Nuevo médico regulador</h2>
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
                      <label style={{ fontSize: '13px', fontWeight: 500, color: '#0a2540', display: 'block', marginBottom: '10px' }}>Registro profesional</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div><label style={labelStyle}>Nro. de matrícula *</label><input value={form.nro_registro} onChange={e => setForm({ ...form, nro_registro: e.target.value })} placeholder="Ej: 12345" style={inputStyle} /></div>
                        <div><label style={labelStyle}>Fecha de vencimiento *</label><input type="date" value={form.fecha_vencimiento} onChange={e => setForm({ ...form, fecha_vencimiento: e.target.value })} style={inputStyle} /></div>
                      </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                      <label style={labelStyle}>Turnos de 12h * (☀️ mañana 07–19 · 🌙 noche 19–07 · puede encadenar 24h)</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {DIAS_AB.map((dia, i) => {
                          const n = i + 1;
                          return (
                            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ width: '46px', fontSize: '12px', color: '#6b7280' }}>{dia}</span>
                              <button type="button" onClick={() => toggleTurno(n, 'DIURNO')} style={chipStyle(tieneTurno(n, 'DIURNO'))}>☀️ Mañana</button>
                              <button type="button" onClick={() => toggleTurno(n, 'NOCTURNO')} style={chipStyle(tieneTurno(n, 'NOCTURNO'))}>🌙 Noche</button>
                            </div>
                          );
                        })}
                      </div>
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
                        {guardando ? 'Guardando...' : 'Registrar médico'}
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
            <h2 style={{ fontSize: '16px', fontWeight: 500, color: '#0a2540', margin: '0 0 20px' }}>Importar médicos desde Excel</h2>
            <div style={{ background: '#f8f9fb', borderRadius: '8px', padding: '16px', marginBottom: '20px', border: '0.5px solid #e5e7eb' }}>
              <div style={{ fontSize: '13px', fontWeight: 500, color: '#0a2540', marginBottom: '6px' }}>Paso 1 — Descargá la plantilla</div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>Trae una hoja de <strong>Instrucciones</strong>. Los turnos van como <code>1D,1N,4D</code> (día 1-7 + D mañana / N noche).</div>
              <button onClick={descargarPlantilla} style={{ background: 'white', color: '#0a2540', border: '0.5px solid #e5e7eb', padding: '8px 16px', borderRadius: '7px', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}>📄 Descargar plantilla Excel</button>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '13px', fontWeight: 500, color: '#0a2540', marginBottom: '8px' }}>Paso 2 — Subí el archivo completado</div>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleArchivo} style={{ display: 'none' }} />
              <button onClick={() => fileRef.current?.click()} style={{ background: 'white', color: '#0a2540', border: '0.5px solid #e5e7eb', padding: '8px 16px', borderRadius: '7px', cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}>📁 Seleccionar archivo</button>
              {archivoData.length > 0 && (
                <div style={{ marginTop: '10px', background: '#f0fdf4', border: '0.5px solid #bbf7d0', borderRadius: '7px', padding: '10px 14px', fontSize: '13px', color: '#15803d' }}>
                  ✅ {archivoData.length} médico(s) encontrados en el archivo
                </div>
              )}
            </div>
            {resultadoImport && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ background: '#f0fdf4', border: '0.5px solid #bbf7d0', borderRadius: '8px', padding: '14px', marginBottom: '10px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: '#15803d' }}>✅ {resultadoImport.creados} médico(s) creados correctamente</div>
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
                  {importando ? 'Importando...' : `Importar ${archivoData.length} médicos`}
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
          companeros={medicos.map(m => ({ id: m.usuario.id, nombre: getNombre(m) }))}
          onCerrar={() => { setModalEstadosAbierto(false); cargar(); }} />
      )}
      {modalPasswordAbierto && seleccionado && (
        <ModalResetearPassword usuarioId={seleccionado.usuario.id} nombre={getNombre(seleccionado)} documento={seleccionado.usuario.persona.nro_documento}
          onCerrar={() => setModalPasswordAbierto(false)} />
      )}
      {modalTurnosAbierto && seleccionado && (
        <ModalTurnosMedico habilitadoId={seleccionado.id} nombre={getNombre(seleccionado)}
          turnosActuales={seleccionado.usuario.turno_regulacion.map(t => ({ dia_semana: t.dia_semana, turno: t.turno }))}
          onCerrar={() => setModalTurnosAbierto(false)} onGuardado={cargar} />
      )}
      {modalEditarAbierto && seleccionado && (
        <ModalEditarFuncionario recurso="medicos" habilitadoId={seleccionado.id} nombre={getNombre(seleccionado)}
          contactos={seleccionado.usuario.persona.contacto} nroRegistro={seleccionado.nro_registro} fechaVencimiento={seleccionado.fecha_vencimiento}
          onCerrar={() => setModalEditarAbierto(false)} onGuardado={cargar} />
      )}
    </div>
  );
}