'use client';

import { useEffect, useState } from 'react';
import { soloTelefono, telefonoValido } from '../../lib/validaciones';

interface Cat { id: number; nombre?: string; usa_flujo?: boolean; }
interface Catalogos {
  tipos_paciente: Cat[]; tipos_requerimiento: Cat[]; condiciones: Cat[];
  tipos_oxigeno: Cat[]; tipos_inotropico: Cat[]; centros: Cat[];
}
interface Props { telefono?: string; nombre?: string; onCerrar: () => void; onGuardado: () => void; }

const UNIDAD_EDAD = ['AÑOS DE VIDA', 'MESES DE VIDA', 'DIAS DE VIDA', 'HORAS DE VIDA', 'MINUTOS DE VIDA'];
const UNIDAD_PESO = ['KILOGRAMOS', 'GRAMOS', 'APROXIMADOS', 'SIN DATOS'];

const soloEnt = (v: string) => v.replace(/\D/g, '');
const dec2 = (v: string) => { const m = v.replace(/[^\d.]/g, '').match(/^\d*\.?\d{0,2}/); return m ? m[0] : ''; };
const capMax = (v: string, max: number) => { const n = parseInt(v); return isNaN(n) ? v : String(Math.min(n, max)); };

const PEDIDO = {
  centro_solicitante: '',
  paciente_nombre: '', paciente_apellido: '', paciente_edad: '', paciente_edad_unidad: 'AÑOS DE VIDA', paciente_sexo: '',
  tipo_paciente_id: '', peso: '', unidad_peso: 'KILOGRAMOS',
  tieneSeguro: false, seguro_medico: '',
  antecedentes: '', diagnostico: '', tiempo_evolucion: '', tiempo_internacion: '', laboratorio: '', imagenes: '',
  tipo_requerimiento_id: '', en_uti: false, condicion_id: '',
  presion_arterial: '', frecuencia_cardiaca: '', frecuencia_respiratoria: '', temperatura: '', glasgow: '', saturacion: '',
  tipo_oxigeno_id: '', oxigeno_flujo: '', tratamiento: '', otros_datos: '',
  // obstétrica
  edad_gestacional: '', tieneControles: false, controles_prenatales: '',
  // RN
  edad_materna: '', via_parto: '', apgar: '', maduracion_pulmonar: '',
};

export default function ModalPedidoCama({ telefono, nombre, onCerrar, onGuardado }: Props) {
  const [cat, setCat] = useState<Catalogos | null>(null);
  const [sol, setSol] = useState({ profesional_nombre: nombre ?? '', especialidad: '', telefono_contacto: telefono ?? '' });
  const [centroOpen, setCentroOpen] = useState(false);
  const [pedidos, setPedidos] = useState<{ id: number; nombre: string; tipo: string }[]>([]);

  const [cedula, setCedula] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [modo, setModo] = useState<'' | 'nuevo' | 'reiteracion'>('');
  const [original, setOriginal] = useState<any>(null);

  const [f, setF] = useState({ ...PEDIDO });
  const [obstMode, setObstMode] = useState<'' | 'obstetrica' | 'rn'>('');
  const [inoSel, setInoSel] = useState<Record<number, { dosis: string; goteo: string }>>({});
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState<number | null>(null);
  const [exitoReit, setExitoReit] = useState(false);

  const token = () => localStorage.getItem('token') ?? '';
  const set = (k: keyof typeof PEDIDO, v: any) => setF(prev => ({ ...prev, [k]: v }));
  const setS = (k: keyof typeof sol, v: any) => setSol(prev => ({ ...prev, [k]: v }));

  useEffect(() => {
    fetch('http://localhost:3001/api/camas/catalogos', { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then((d) => setCat({ tipos_paciente: [], tipos_requerimiento: [], condiciones: [], tipos_oxigeno: [], tipos_inotropico: [], centros: [], ...d }))
      .catch(() => { });
  }, []);

  const resetPedido = () => { setF({ ...PEDIDO }); setObstMode(''); setInoSel({}); setModo(''); setOriginal(null); setCedula(''); setError(''); };

  const buscar = async () => {
    if (!cedula.trim()) { setError('Ingresá la cédula del paciente.'); return; }
    setBuscando(true); setError('');
    try {
      const res = await fetch(`http://localhost:3001/api/camas/paciente/${encodeURIComponent(cedula.trim())}?abierto=1`, { headers: { Authorization: `Bearer ${token()}` } });
      const data = await res.json();
      if (data.existe && data.original) {
        setOriginal(data.original); setModo('reiteracion');
        const c = data.original.ref_cama_clinica;
        setF(prev => ({ ...prev, tipo_requerimiento_id: c?.tipo_requerimiento_id ? String(c.tipo_requerimiento_id) : '', condicion_id: c?.condicion_id ? String(c.condicion_id) : '', en_uti: !!c?.en_uti }));
      } else { setModo('nuevo'); setOriginal(null); }
    } catch { setError('Error de conexión'); }
    finally { setBuscando(false); }
  };

  const toggleIno = (id: number) => setInoSel(prev => {
    const n = { ...prev };
    if (n[id]) delete n[id]; else n[id] = { dosis: '', goteo: '' };
    return n;
  });
  const setIno = (id: number, k: 'dosis' | 'goteo', v: string) => setInoSel(prev => ({ ...prev, [id]: { ...prev[id], [k]: v } }));

  const centroValido = !!cat?.centros?.some(c => c.nombre === f.centro_solicitante);
  const oxiSel = cat?.tipos_oxigeno?.find(o => String(o.id) === f.tipo_oxigeno_id);
  const usaFlujo = !!oxiSel?.usa_flujo;

  const agregarPedido = async () => {
    if (!sol.profesional_nombre || !sol.especialidad || !sol.telefono_contacto) { setError('Completá los datos del solicitante (arriba).'); return; }
    if (!telefonoValido(sol.telefono_contacto)) { setError('El teléfono del solicitante no es válido (ej: 0981123456).'); return; }
    if (f.glasgow && (parseInt(f.glasgow) < 3 || parseInt(f.glasgow) > 15)) { setError('El Glasgow debe estar entre 3 y 15.'); return; }
    if (modo === 'nuevo') {
      if (!centroValido) { setError('Elegí un centro asistencial de la lista.'); return; }
      if (!f.tipo_paciente_id) { setError('Elegí el tipo de paciente.'); return; }
      if (!f.diagnostico) { setError('El diagnóstico es obligatorio.'); return; }
    }
    if (modo === 'reiteracion' && (!f.tipo_requerimiento_id || !f.condicion_id)) { setError('La reiteración requiere el requerimiento y la condición.'); return; }
    setGuardando(true); setError('');
    try {
      const signos = {
        presion_arterial: f.presion_arterial, frecuencia_cardiaca: f.frecuencia_cardiaca, frecuencia_respiratoria: f.frecuencia_respiratoria,
        temperatura: f.temperatura, glasgow: f.glasgow, saturacion: f.saturacion,
        tipo_oxigeno_id: f.tipo_oxigeno_id, oxigeno_flujo: usaFlujo ? f.oxigeno_flujo : '',
      };
      const inotropicos = Object.entries(inoSel).map(([id, d]) => ({ tipo_inotripico_id: Number(id), dosis: d.dosis, goteo: d.goteo }));
      const body: any = {
        ...sol, tipo_pedido: modo === 'reiteracion' ? 'REITERACION' : 'NUEVO', paciente_documento: cedula.trim(),
        tipo_requerimiento_id: f.tipo_requerimiento_id, condicion_id: f.condicion_id, en_uti: f.en_uti, tratamiento: f.tratamiento, signos, inotropicos,
      };
      if (modo === 'nuevo') {
        Object.assign(body, {
          centro_solicitante: f.centro_solicitante,
          paciente_nombre: f.paciente_nombre, paciente_apellido: f.paciente_apellido, paciente_edad: f.paciente_edad,
          paciente_edad_unidad: f.paciente_edad_unidad, paciente_sexo: f.paciente_sexo,
          seguro_medico: f.tieneSeguro ? f.seguro_medico : '', tipo_paciente_id: f.tipo_paciente_id, peso: f.peso, unidad_peso: f.unidad_peso,
          antecedentes: f.antecedentes, diagnostico: f.diagnostico, tiempo_evolucion: f.tiempo_evolucion, tiempo_internacion: f.tiempo_internacion,
          laboratorio: f.laboratorio, imagenes: f.imagenes, otros_datos: f.otros_datos,
        });
        if (obstMode === 'obstetrica') body.obstetrica = { edad_gestacional: f.edad_gestacional, controles_prenatales: f.tieneControles ? f.controles_prenatales : '' };
        if (obstMode === 'rn') body.obstetrica = { edad_materna: f.edad_materna, via_parto: f.via_parto, apgar: f.apgar, maduracion_pulmonar: f.maduracion_pulmonar };
      }
      const res = await fetch('http://localhost:3001/api/camas', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Error al agregar el pedido'); return; }
      const nom = modo === 'reiteracion' ? `${original?.paciente_nombre ?? ''} ${original?.paciente_apellido ?? ''}`.trim() || `CI ${cedula}` : `${f.paciente_nombre} ${f.paciente_apellido}`.trim() || `CI ${cedula}`;
      const esReit = modo === 'reiteracion';
      setPedidos(prev => [...prev, { id: data.id, nombre: nom, tipo: esReit ? 'REITERACIÓN' : 'NUEVO' }]);
      onGuardado(); resetPedido();
      setExitoReit(esReit); setExito(data.id ?? null);
    } catch { setError('Error de conexión'); }
    finally { setGuardando(false); }
  };

  const input = { width: '100%', padding: '9px 12px', borderRadius: '7px', border: '0.5px solid #e5e7eb', fontSize: '13px', boxSizing: 'border-box' as const };
  const label = { fontSize: '12px', color: '#6b7280', display: 'block' as const, marginBottom: '6px' };
  const seccion = { fontSize: '13px', fontWeight: 600, color: '#0a2540', margin: '18px 0 10px', paddingBottom: '6px', borderBottom: '0.5px solid #f0f0f0' } as const;
  const uni = { fontSize: '12px', color: '#9ca3af', whiteSpace: 'nowrap' as const };
  const toggleBtn = (on: boolean): React.CSSProperties => ({ padding: '7px 14px', borderRadius: '7px', border: `0.5px solid ${on ? '#0a2540' : '#e5e7eb'}`, cursor: 'pointer', fontSize: '12px', fontWeight: 500, background: on ? '#0a2540' : 'white', color: on ? 'white' : '#6b7280' });

  if (!cat) return <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}><div style={{ background: 'white', borderRadius: '12px', padding: '28px', fontSize: '14px', color: '#6b7280' }}>Cargando formulario…</div></div>;

  const centrosFiltrados = cat.centros.filter(c => (c.nombre ?? '').toUpperCase().includes(f.centro_solicitante.toUpperCase()));

  // Campo de signo con unidad
  const signo = (k: keyof typeof PEDIDO, lbl: string, unidad: string, onChange: (v: string) => void, ph = '') => (
    <div><label style={label}>{lbl}</label>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <input value={f[k] as string} onChange={e => onChange(e.target.value)} placeholder={ph} style={input} />
        <span style={uni}>{unidad}</span>
      </div>
    </div>
  );

  return (
    <>
    {exito !== null && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400 }}>
        <div style={{ background: 'white', borderRadius: '14px', padding: '32px 44px', textAlign: 'center', boxShadow: '0 12px 40px rgba(0,0,0,0.25)' }}>
          <div style={{ fontSize: '54px', lineHeight: 1, marginBottom: '10px' }}>✅</div>
          <div style={{ fontSize: '17px', fontWeight: 600, color: '#0a2540', marginBottom: '12px' }}>{exitoReit ? 'Reiteración cargada correctamente' : 'Pedido cargado correctamente'}</div>
          <div style={{ fontSize: '12px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{exitoReit ? 'Se sumó al pedido' : 'Número de pedido'}</div>
          <div style={{ fontSize: '36px', fontWeight: 700, color: '#15803d', margin: '4px 0 22px' }}>#{exito}</div>
          <button onClick={() => setExito(null)} style={{ padding: '10px 30px', borderRadius: '8px', border: 'none', background: '#0a2540', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>Continuar</button>
        </div>
      </div>
    )}
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 300, padding: '24px', overflowY: 'auto' }}>
      <div style={{ background: 'white', borderRadius: '12px', padding: '28px', width: '760px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
        <h2 style={{ fontSize: '17px', fontWeight: 600, color: '#0a2540', margin: '0 0 4px' }}>🛏️ Pedidos de cama — llamada</h2>
        <p style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 8px' }}>Cargá el solicitante una vez y agregá los pedidos que haga esta llamada.</p>
        {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 14px', borderRadius: '7px', fontSize: '13px', marginBottom: '8px' }}>{error}</div>}

        {/* Solicitante */}
        <div style={seccion}>Solicitante (médico)</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <div><label style={label}>Teléfono *</label><input value={sol.telefono_contacto} onChange={e => setS('telefono_contacto', soloTelefono(e.target.value))} style={input} /></div>
          <div><label style={label}>Profesional *</label><input value={sol.profesional_nombre} onChange={e => setS('profesional_nombre', e.target.value)} style={input} /></div>
          <div><label style={label}>Especialidad *</label><input value={sol.especialidad} onChange={e => setS('especialidad', e.target.value)} style={input} /></div>
        </div>

        {pedidos.length > 0 && (
          <div style={{ marginTop: '16px', background: '#f0fdf4', border: '0.5px solid #bbf7d0', borderRadius: '8px', padding: '12px 14px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#15803d', marginBottom: '6px' }}>Pedidos registrados en esta llamada ({pedidos.length})</div>
            {pedidos.map((p, i) => <div key={i} style={{ fontSize: '13px', color: '#166534' }}>✓ <strong>N° {p.id}</strong> · {p.nombre} — {p.tipo}</div>)}
          </div>
        )}

        {/* Buscar */}
        <div style={seccion}>Agregar pedido — buscar paciente por cédula</div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <input value={cedula} onChange={e => { setCedula(e.target.value); setModo(''); setOriginal(null); }} onKeyDown={e => e.key === 'Enter' && buscar()} placeholder="Cédula del paciente" style={{ ...input, flex: 1 }} />
          <button onClick={buscar} disabled={buscando} style={{ padding: '9px 18px', borderRadius: '7px', border: 'none', background: '#0a2540', color: 'white', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>{buscando ? 'Buscando…' : 'Buscar'}</button>
        </div>

        {modo === 'reiteracion' && original && (() => {
          const o: any = original; const c = o.ref_cama_clinica ?? {}; const src = o.solicitud_ref_cama ?? {}; const ob = o.ref_cama_obstetrica;
          const ro = { fontSize: '12px', color: '#374151', lineHeight: 1.7 };
          return (
            <div style={{ background: '#eff6ff', border: '0.5px solid #bfdbfe', borderRadius: '8px', padding: '14px', marginBottom: '10px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e40af', marginBottom: '8px' }}>🔁 REITERACIÓN del pedido #{o.id} — datos heredados</div>
              <div style={ro}><strong>Centro:</strong> {src.centro_solicitante ?? '—'} · <strong>Prof.:</strong> {src.profesional_nombre ?? '—'} ({src.especialidad ?? '—'})</div>
              <div style={ro}><strong>Paciente:</strong> {o.paciente_nombre} {o.paciente_apellido} · CI {o.paciente_documento ?? '—'} · {o.paciente_edad ?? '—'} {o.paciente_edad_unidad ?? ''} · {o.paciente_sexo === 'M' ? 'Masc.' : o.paciente_sexo === 'F' ? 'Fem.' : '—'} · {c.tipo_paciente?.nombre ?? '—'}</div>
              <div style={ro}><strong>Seguro:</strong> {c.seguro_medico || '—'} · <strong>Peso:</strong> {c.peso ? `${c.peso} ${c.unidad_peso ?? ''}` : '—'}</div>
              <div style={ro}><strong>Diagnóstico:</strong> {c.diagnostico ?? '—'}</div>
              {c.antecedentes ? <div style={ro}><strong>Antecedentes:</strong> {c.antecedentes}</div> : null}
              {(c.tiempo_evolucion || c.tiempo_internacion) ? <div style={ro}><strong>Evolución:</strong> {c.tiempo_evolucion || '—'} · <strong>Internación:</strong> {c.tiempo_internacion || '—'}</div> : null}
              {ob ? <div style={ro}><strong>Obst./RN:</strong> {[ob.edad_gestacional && `EG ${ob.edad_gestacional}`, ob.controles_prenatales != null && `Controles ${ob.controles_prenatales}`, ob.edad_materna && `Edad materna ${ob.edad_materna}`, ob.via_parto, ob.apgar && `APGAR ${ob.apgar}`].filter(Boolean).join(' · ') || '—'}</div> : null}
              {(c.laboratorio || c.imagenes) ? <div style={ro}><strong>Lab:</strong> {c.laboratorio || '—'} · <strong>Img:</strong> {c.imagenes || '—'}</div> : null}
              <div style={{ fontSize: '12px', color: '#3b82f6', marginTop: '8px', fontWeight: 500 }}>↓ Cargá abajo solo las variaciones (requerimiento, condición y signos).</div>
            </div>
          );
        })()}
        {modo === 'nuevo' && <div style={{ background: '#fff7ed', border: '0.5px solid #fed7aa', borderRadius: '8px', padding: '10px 14px', marginBottom: '8px', fontSize: '13px', color: '#c2410c' }}>🆕 <strong>NUEVO</strong> — sin pedidos abiertos. Cargá todos los datos.</div>}

        {/* NUEVO */}
        {modo === 'nuevo' && (
          <>
            <div style={seccion}>Datos del paciente</div>
            <div style={{ position: 'relative', marginBottom: '12px' }}>
              <label style={label}>Centro asistencial *</label>
              <input value={f.centro_solicitante} onChange={e => { set('centro_solicitante', e.target.value.toUpperCase()); setCentroOpen(true); }}
                onFocus={() => setCentroOpen(true)} onBlur={() => setTimeout(() => setCentroOpen(false), 150)}
                placeholder="Escribí para buscar el centro…" style={{ ...input, borderColor: f.centro_solicitante && !centroValido ? '#fca5a5' : '#e5e7eb' }} />
              {centroOpen && centrosFiltrados.length > 0 && (
                <div style={{ position: 'absolute', zIndex: 5, top: '100%', left: 0, right: 0, background: 'white', border: '0.5px solid #e5e7eb', borderRadius: '7px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: '160px', overflowY: 'auto' }}>
                  {centrosFiltrados.map(c => (
                    <div key={c.id} onMouseDown={() => { set('centro_solicitante', c.nombre); setCentroOpen(false); }}
                      style={{ padding: '8px 12px', fontSize: '13px', cursor: 'pointer', color: '#0a2540' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f0f4f8')} onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                      {c.nombre}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div><label style={label}>Nombre y apellido</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input value={f.paciente_nombre} onChange={e => set('paciente_nombre', e.target.value)} placeholder="Nombre" style={input} />
                  <input value={f.paciente_apellido} onChange={e => set('paciente_apellido', e.target.value)} placeholder="Apellido" style={input} />
                </div>
              </div>
              <div><label style={label}>Edad</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input value={f.paciente_edad} onChange={e => set('paciente_edad', soloEnt(e.target.value))} style={{ ...input, width: '70px' }} />
                  <select value={f.paciente_edad_unidad} onChange={e => set('paciente_edad_unidad', e.target.value)} style={input}>{UNIDAD_EDAD.map(u => <option key={u} value={u}>{u}</option>)}</select>
                </div>
              </div>
              <div><label style={label}>Sexo</label><select value={f.paciente_sexo} onChange={e => set('paciente_sexo', e.target.value)} style={input}><option value="">—</option><option value="M">MASCULINO</option><option value="F">FEMENINO</option></select></div>
              <div><label style={label}>Tipo de paciente *</label><select value={f.tipo_paciente_id} onChange={e => set('tipo_paciente_id', e.target.value)} style={input}><option value="">—</option>{cat.tipos_paciente.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}</select></div>
              <div><label style={label}>Peso</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input value={f.peso} onChange={e => set('peso', dec2(e.target.value))} style={{ ...input, width: '90px' }} />
                  <select value={f.unidad_peso} onChange={e => set('unidad_peso', e.target.value)} style={input}>{UNIDAD_PESO.map(u => <option key={u} value={u}>{u}</option>)}</select>
                </div>
              </div>
              <div><label style={label}>¿Tiene seguro médico?</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button type="button" onClick={() => set('tieneSeguro', !f.tieneSeguro)} style={toggleBtn(f.tieneSeguro)}>{f.tieneSeguro ? 'Sí' : 'No'}</button>
                  {f.tieneSeguro && <input value={f.seguro_medico} onChange={e => set('seguro_medico', e.target.value)} placeholder="¿Cuál?" style={{ ...input, flex: 1 }} />}
                </div>
              </div>
            </div>

            <div style={seccion}>Cuadro clínico</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ gridColumn: '1 / -1' }}><label style={label}>Diagnóstico *</label><textarea value={f.diagnostico} onChange={e => set('diagnostico', e.target.value)} rows={2} style={{ ...input, resize: 'vertical' }} /></div>
              <div style={{ gridColumn: '1 / -1' }}><label style={label}>Antecedentes</label><input value={f.antecedentes} onChange={e => set('antecedentes', e.target.value)} style={input} /></div>
              <div><label style={label}>Tiempo de evolución</label><input value={f.tiempo_evolucion} onChange={e => set('tiempo_evolucion', e.target.value)} style={input} /></div>
              <div><label style={label}>Tiempo de internación</label><input value={f.tiempo_internacion} onChange={e => set('tiempo_internacion', e.target.value)} style={input} /></div>
            </div>

            {/* Obstétrica / RN — exclusivos */}
            <div style={{ ...seccion, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Obstétrica / Recién nacido</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" onClick={() => setObstMode(obstMode === 'obstetrica' ? '' : 'obstetrica')} style={toggleBtn(obstMode === 'obstetrica')}>Obstétrica</button>
                <button type="button" onClick={() => setObstMode(obstMode === 'rn' ? '' : 'rn')} style={toggleBtn(obstMode === 'rn')}>RN</button>
              </div>
            </div>
            {obstMode === 'obstetrica' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div><label style={label}>Edad gestacional</label><input value={f.edad_gestacional} onChange={e => set('edad_gestacional', e.target.value)} style={input} /></div>
                <div><label style={label}>¿Tiene controles prenatales?</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button type="button" onClick={() => set('tieneControles', !f.tieneControles)} style={toggleBtn(f.tieneControles)}>{f.tieneControles ? 'Sí' : 'No'}</button>
                    {f.tieneControles && <input value={f.controles_prenatales} onChange={e => set('controles_prenatales', soloEnt(e.target.value))} placeholder="¿Cuántas?" style={{ ...input, flex: 1 }} />}
                  </div>
                </div>
              </div>
            )}
            {obstMode === 'rn' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div><label style={label}>Edad materna</label><input value={f.edad_materna} onChange={e => set('edad_materna', soloEnt(e.target.value))} style={input} /></div>
                <div><label style={label}>Vía de parto</label><select value={f.via_parto} onChange={e => set('via_parto', e.target.value)} style={input}><option value="">—</option><option value="VAGINAL">VAGINAL</option><option value="CESAREA">CESÁREA</option></select></div>
                <div><label style={label}>APGAR</label><input value={f.apgar} onChange={e => set('apgar', e.target.value)} style={input} /></div>
                <div><label style={label}>Maduración pulmonar</label><input value={f.maduracion_pulmonar} onChange={e => set('maduracion_pulmonar', e.target.value)} style={input} /></div>
              </div>
            )}

            <div style={seccion}>Estudios complementarios</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div><label style={label}>Laboratorio</label><input value={f.laboratorio} onChange={e => set('laboratorio', e.target.value)} style={input} /></div>
              <div><label style={label}>Imágenes</label><input value={f.imagenes} onChange={e => set('imagenes', e.target.value)} style={input} /></div>
            </div>
          </>
        )}

        {/* Requerimiento + signos + tratamiento (nuevo y reiteración) */}
        {modo && (
          <>
            <div style={seccion}>Requerimiento y condición</div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px', alignItems: 'end' }}>
              <div><label style={label}>Tipo de sala / cama {modo === 'reiteracion' ? '*' : ''}</label><select value={f.tipo_requerimiento_id} onChange={e => set('tipo_requerimiento_id', e.target.value)} style={input}><option value="">—</option>{cat.tipos_requerimiento.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}</select></div>
              <div><label style={label}>Condición {modo === 'reiteracion' ? '*' : ''}</label><select value={f.condicion_id} onChange={e => set('condicion_id', e.target.value)} style={input}><option value="">—</option>{cat.condiciones.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>
              <label style={{ fontSize: '13px', color: '#374151', display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer', paddingBottom: '9px' }}><input type="checkbox" checked={f.en_uti} onChange={e => set('en_uti', e.target.checked)} /> Internado en UTI</label>
            </div>

            <div style={seccion}>Signos vitales</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
              <div><label style={label}>Presión arterial</label><input value={f.presion_arterial} onChange={e => set('presion_arterial', e.target.value)} placeholder="120/80" style={input} /></div>
              {signo('frecuencia_cardiaca', 'Frec. cardíaca', 'lpm', v => set('frecuencia_cardiaca', soloEnt(v)))}
              {signo('frecuencia_respiratoria', 'Frec. respiratoria', 'rpm', v => set('frecuencia_respiratoria', soloEnt(v)))}
              {signo('temperatura', 'Temperatura', '°C', v => set('temperatura', dec2(v)))}
              {signo('glasgow', 'Glasgow', '/15', v => set('glasgow', capMax(soloEnt(v), 15)))}
              {signo('saturacion', 'Saturación', '%', v => set('saturacion', capMax(soloEnt(v), 100)))}
              <div><label style={label}>Vía de oxígeno</label><select value={f.tipo_oxigeno_id} onChange={e => set('tipo_oxigeno_id', e.target.value)} style={input}><option value="">—</option>{cat.tipos_oxigeno.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}</select></div>
              {usaFlujo && <div><label style={label}>Flujo</label><div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}><input value={f.oxigeno_flujo} onChange={e => set('oxigeno_flujo', soloEnt(e.target.value))} style={input} /><span style={uni}>l/min</span></div></div>}
            </div>

            <div style={seccion}>Tratamiento recibido</div>
            <textarea value={f.tratamiento} onChange={e => set('tratamiento', e.target.value)} rows={2} style={{ ...input, resize: 'vertical' }} />
            {modo === 'nuevo' && (<>
            <label style={{ ...label, marginTop: '10px' }}>Inotrópicos</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {cat.tipos_inotropico.map(t => <button key={t.id} type="button" onClick={() => toggleIno(t.id)} style={{ padding: '6px 12px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 500, background: inoSel[t.id] ? '#0a2540' : '#f0f4f8', color: inoSel[t.id] ? 'white' : '#6b7280' }}>{t.nombre}</button>)}
            </div>
            {Object.keys(inoSel).length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                {cat.tipos_inotropico.filter(t => inoSel[t.id]).map(t => (
                  <div key={t.id} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ width: '120px', fontSize: '12px', fontWeight: 500, color: '#0a2540' }}>{t.nombre}</span>
                    <input value={inoSel[t.id].dosis} onChange={e => setIno(t.id, 'dosis', e.target.value)} placeholder="Dosis" style={{ ...input, flex: 1 }} />
                    <input value={inoSel[t.id].goteo} onChange={e => setIno(t.id, 'goteo', e.target.value)} placeholder="Goteo" style={{ ...input, flex: 1 }} />
                  </div>
                ))}
              </div>
            )}
            </>)}
            {modo === 'nuevo' && <div style={{ marginTop: '12px' }}><label style={label}>Otros datos de interés</label><input value={f.otros_datos} onChange={e => set('otros_datos', e.target.value)} style={input} /></div>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
              <button onClick={resetPedido} style={{ padding: '9px 18px', borderRadius: '7px', border: '0.5px solid #e5e7eb', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#6b7280' }}>Descartar pedido</button>
              <button onClick={agregarPedido} disabled={guardando} style={{ padding: '9px 18px', borderRadius: '7px', border: 'none', background: '#0a2540', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>{guardando ? 'Guardando…' : '＋ Agregar pedido a la llamada'}</button>
            </div>
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '22px', borderTop: '0.5px solid #f0f0f0', paddingTop: '16px' }}>
          <button onClick={onCerrar} style={{ padding: '9px 20px', borderRadius: '7px', border: 'none', background: pedidos.length > 0 ? '#15803d' : '#e5e7eb', color: pedidos.length > 0 ? 'white' : '#6b7280', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>{pedidos.length > 0 ? `Terminar llamada (${pedidos.length})` : 'Cerrar'}</button>
        </div>
      </div>
    </div>
    </>
  );
}
