'use client';

import { useEffect, useState } from 'react';

interface Cat { id: number; nombre?: string; }
interface Catalogos {
  tipos_paciente: Cat[]; tipos_requerimiento: Cat[]; condiciones: Cat[];
  tipos_oxigeno: Cat[]; tipos_inotropico: Cat[]; canales: Cat[]; hospitales: Cat[];
}
interface Props { onCerrar: () => void; onGuardado: () => void; }

const UNIDAD_EDAD = ['AÑOS DE VIDA', 'MESES DE VIDA', 'DIAS DE VIDA', 'HORAS DE VIDA', 'MINUTOS DE VIDA'];
const UNIDAD_PESO = ['KILOGRAMOS', 'GRAMOS', 'APROXIMADOS', 'SIN DATOS'];

const PEDIDO_VACIO = {
  paciente_nombre: '', paciente_apellido: '', paciente_edad: '', paciente_edad_unidad: 'AÑOS DE VIDA', paciente_sexo: '',
  seguro_medico: '', tipo_paciente_id: '', peso: '', unidad_peso: 'KILOGRAMOS',
  antecedentes: '', diagnostico: '', tiempo_evolucion: '', tiempo_internacion: '',
  laboratorio: '', imagenes: '',
  tipo_requerimiento_id: '', en_uti: false, condicion_id: '',
  presion_arterial: '', frecuencia_cardiaca: '', frecuencia_respiratoria: '', temperatura: '', glasgow: '', saturacion: '',
  tipo_oxigeno_id: '', oxigeno_flujo: '', tratamiento: '', otros_datos: '',
  edad_gestacional: '', controles_prenatales: '', edad_materna: '', via_parto: '', apgar: '', maduracion_pulmonar: '',
};

export default function ModalPedidoCama({ onCerrar, onGuardado }: Props) {
  const [cat, setCat] = useState<Catalogos | null>(null);
  const [sol, setSol] = useState({ canal_ingreso_id: '', centro_solicitante: '', profesional_nombre: '', especialidad: '', telefono_contacto: '', operador_medico: '' });
  const [pedidos, setPedidos] = useState<{ nombre: string; tipo: string }[]>([]);

  const [cedula, setCedula] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [modo, setModo] = useState<'' | 'nuevo' | 'reiteracion'>('');
  const [original, setOriginal] = useState<any>(null);

  const [f, setF] = useState({ ...PEDIDO_VACIO });
  const [inotropicos, setInotropicos] = useState<number[]>([]);
  const [mostrarObst, setMostrarObst] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const token = () => localStorage.getItem('token') ?? '';
  const set = (k: keyof typeof PEDIDO_VACIO, v: any) => setF(prev => ({ ...prev, [k]: v }));
  const setS = (k: keyof typeof sol, v: any) => setSol(prev => ({ ...prev, [k]: v }));

  useEffect(() => {
    fetch('http://localhost:3001/api/camas/catalogos', { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(setCat).catch(() => { });
  }, []);

  const resetPedido = () => {
    setF({ ...PEDIDO_VACIO }); setInotropicos([]); setMostrarObst(false);
    setModo(''); setOriginal(null); setCedula(''); setError('');
  };

  const buscar = async () => {
    if (!cedula.trim()) { setError('Ingresá la cédula del paciente.'); return; }
    setBuscando(true); setError('');
    try {
      const res = await fetch(`http://localhost:3001/api/camas/paciente/${encodeURIComponent(cedula.trim())}`, { headers: { Authorization: `Bearer ${token()}` } });
      const data = await res.json();
      if (data.existe && data.original) {
        setOriginal(data.original);
        setModo('reiteracion');
        // Prefill del requerimiento/condición con lo del pedido original
        const c = data.original.ref_cama_clinica;
        setF(prev => ({ ...prev, tipo_requerimiento_id: c?.tipo_requerimiento_id ? String(c.tipo_requerimiento_id) : '', condicion_id: c?.condicion_id ? String(c.condicion_id) : '', en_uti: !!c?.en_uti }));
      } else {
        setModo('nuevo');
        setOriginal(null);
      }
    } catch { setError('Error de conexión'); }
    finally { setBuscando(false); }
  };

  const toggleIno = (id: number) => setInotropicos(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const agregarPedido = async () => {
    if (!sol.canal_ingreso_id) { setError('Elegí el canal de ingreso (arriba).'); return; }
    if (!sol.centro_solicitante || !sol.profesional_nombre || !sol.especialidad || !sol.telefono_contacto || !sol.operador_medico) {
      setError('Completá los datos del solicitante (arriba).'); return;
    }
    if (modo === 'nuevo') {
      if (!f.tipo_paciente_id) { setError('Elegí el tipo de paciente.'); return; }
      if (!f.diagnostico) { setError('El diagnóstico es obligatorio.'); return; }
    }
    if (modo === 'reiteracion') {
      if (!f.tipo_requerimiento_id || !f.condicion_id) { setError('La reiteración requiere el requerimiento y la condición.'); return; }
    }
    setGuardando(true); setError('');
    try {
      const signos = {
        presion_arterial: f.presion_arterial, frecuencia_cardiaca: f.frecuencia_cardiaca, frecuencia_respiratoria: f.frecuencia_respiratoria,
        temperatura: f.temperatura, glasgow: f.glasgow, saturacion: f.saturacion, tipo_oxigeno_id: f.tipo_oxigeno_id, oxigeno_flujo: f.oxigeno_flujo,
      };
      const body: any = {
        ...sol,
        tipo_pedido: modo === 'reiteracion' ? 'REITERACION' : 'NUEVO',
        paciente_documento: cedula.trim(),
        tipo_requerimiento_id: f.tipo_requerimiento_id, condicion_id: f.condicion_id, en_uti: f.en_uti, tratamiento: f.tratamiento,
        signos,
      };
      if (modo === 'nuevo') {
        Object.assign(body, {
          paciente_nombre: f.paciente_nombre, paciente_apellido: f.paciente_apellido, paciente_edad: f.paciente_edad,
          paciente_edad_unidad: f.paciente_edad_unidad, paciente_sexo: f.paciente_sexo, seguro_medico: f.seguro_medico,
          tipo_paciente_id: f.tipo_paciente_id, peso: f.peso, unidad_peso: f.unidad_peso,
          antecedentes: f.antecedentes, diagnostico: f.diagnostico, tiempo_evolucion: f.tiempo_evolucion, tiempo_internacion: f.tiempo_internacion,
          laboratorio: f.laboratorio, imagenes: f.imagenes, otros_datos: f.otros_datos, inotropicos,
        });
        if (mostrarObst) body.obstetrica = { edad_gestacional: f.edad_gestacional, controles_prenatales: f.controles_prenatales, edad_materna: f.edad_materna, via_parto: f.via_parto, apgar: f.apgar, maduracion_pulmonar: f.maduracion_pulmonar };
      }
      const res = await fetch('http://localhost:3001/api/camas', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Error al agregar el pedido'); return; }
      const nombre = modo === 'reiteracion'
        ? `${original?.paciente_nombre ?? ''} ${original?.paciente_apellido ?? ''}`.trim() || `CI ${cedula}`
        : `${f.paciente_nombre} ${f.paciente_apellido}`.trim() || `CI ${cedula}`;
      setPedidos(prev => [...prev, { nombre, tipo: modo === 'reiteracion' ? 'REITERACIÓN' : 'NUEVO' }]);
      onGuardado();
      resetPedido();
    } catch { setError('Error de conexión'); }
    finally { setGuardando(false); }
  };

  const input = { width: '100%', padding: '9px 12px', borderRadius: '7px', border: '0.5px solid #e5e7eb', fontSize: '13px', boxSizing: 'border-box' as const };
  const label = { fontSize: '12px', color: '#6b7280', display: 'block' as const, marginBottom: '6px' };
  const seccion = { fontSize: '13px', fontWeight: 600, color: '#0a2540', margin: '18px 0 10px', paddingBottom: '6px', borderBottom: '0.5px solid #f0f0f0' } as const;

  if (!cat) {
    return <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
      <div style={{ background: 'white', borderRadius: '12px', padding: '28px', fontSize: '14px', color: '#6b7280' }}>Cargando formulario…</div>
    </div>;
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 300, padding: '24px', overflowY: 'auto' }}>
      <div style={{ background: 'white', borderRadius: '12px', padding: '28px', width: '760px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
        <h2 style={{ fontSize: '17px', fontWeight: 600, color: '#0a2540', margin: '0 0 4px' }}>🛏️ Pedidos de cama — llamada</h2>
        <p style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 8px' }}>Cargá el solicitante una vez y agregá los pedidos que haga esta llamada.</p>
        {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 14px', borderRadius: '7px', fontSize: '13px', marginBottom: '8px' }}>{error}</div>}

        {/* Solicitante (una vez por llamada) */}
        <div style={seccion}>Solicitante (médico / centro)</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <div><label style={label}>Canal *</label>
            <select value={sol.canal_ingreso_id} onChange={e => setS('canal_ingreso_id', e.target.value)} style={input}>
              <option value="">—</option>{cat.canales.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div><label style={label}>Centro solicitante *</label><input value={sol.centro_solicitante} onChange={e => setS('centro_solicitante', e.target.value)} placeholder="Ej: HD VILLETA" style={input} /></div>
          <div><label style={label}>Teléfono *</label><input value={sol.telefono_contacto} onChange={e => setS('telefono_contacto', e.target.value)} style={input} /></div>
          <div><label style={label}>Profesional *</label><input value={sol.profesional_nombre} onChange={e => setS('profesional_nombre', e.target.value)} style={input} /></div>
          <div><label style={label}>Especialidad *</label><input value={sol.especialidad} onChange={e => setS('especialidad', e.target.value)} style={input} /></div>
          <div><label style={label}>Operador / médico *</label><input value={sol.operador_medico} onChange={e => setS('operador_medico', e.target.value)} style={input} /></div>
        </div>

        {/* Pedidos ya agregados en esta llamada */}
        {pedidos.length > 0 && (
          <div style={{ marginTop: '16px', background: '#f0fdf4', border: '0.5px solid #bbf7d0', borderRadius: '8px', padding: '12px 14px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#15803d', marginBottom: '6px' }}>Pedidos registrados en esta llamada ({pedidos.length})</div>
            {pedidos.map((p, i) => (
              <div key={i} style={{ fontSize: '13px', color: '#166534' }}>✓ {p.nombre} — <strong>{p.tipo}</strong></div>
            ))}
          </div>
        )}

        {/* Buscar paciente */}
        <div style={seccion}>Agregar pedido — buscar paciente por cédula</div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <input value={cedula} onChange={e => { setCedula(e.target.value); setModo(''); setOriginal(null); }}
            onKeyDown={e => e.key === 'Enter' && buscar()} placeholder="Cédula del paciente" style={{ ...input, flex: 1 }} />
          <button onClick={buscar} disabled={buscando} style={{ padding: '9px 18px', borderRadius: '7px', border: 'none', background: '#0a2540', color: 'white', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}>
            {buscando ? 'Buscando…' : 'Buscar'}
          </button>
        </div>

        {modo === 'reiteracion' && original && (
          <div style={{ background: '#eff6ff', border: '0.5px solid #bfdbfe', borderRadius: '8px', padding: '12px 14px', marginBottom: '8px', fontSize: '13px', color: '#1e40af' }}>
            🔁 <strong>REITERACIÓN</strong> — paciente ya registrado: <strong>{original.paciente_nombre} {original.paciente_apellido}</strong>
            {original.paciente_edad ? ` · ${original.paciente_edad} ${original.paciente_edad_unidad ?? ''}` : ''} · Dx: {original.ref_cama_clinica?.diagnostico ?? '—'}
            <div style={{ fontSize: '12px', color: '#3b82f6', marginTop: '4px' }}>Solo cargá las variaciones (requerimiento, condición y signos vitales). Los datos generales se heredan.</div>
          </div>
        )}
        {modo === 'nuevo' && (
          <div style={{ background: '#fff7ed', border: '0.5px solid #fed7aa', borderRadius: '8px', padding: '10px 14px', marginBottom: '8px', fontSize: '13px', color: '#c2410c' }}>
            🆕 <strong>NUEVO</strong> — paciente sin pedidos previos. Cargá todos los datos.
          </div>
        )}

        {/* ---------- NUEVO: datos completos ---------- */}
        {modo === 'nuevo' && (
          <>
            <div style={seccion}>Datos del paciente</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div><label style={label}>Nombre y apellido</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input value={f.paciente_nombre} onChange={e => set('paciente_nombre', e.target.value)} placeholder="Nombre" style={input} />
                  <input value={f.paciente_apellido} onChange={e => set('paciente_apellido', e.target.value)} placeholder="Apellido" style={input} />
                </div>
              </div>
              <div><label style={label}>Edad</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input value={f.paciente_edad} onChange={e => set('paciente_edad', e.target.value)} style={{ ...input, width: '80px' }} />
                  <select value={f.paciente_edad_unidad} onChange={e => set('paciente_edad_unidad', e.target.value)} style={input}>{UNIDAD_EDAD.map(u => <option key={u} value={u}>{u}</option>)}</select>
                </div>
              </div>
              <div><label style={label}>Sexo</label>
                <select value={f.paciente_sexo} onChange={e => set('paciente_sexo', e.target.value)} style={input}><option value="">—</option><option value="M">MASCULINO</option><option value="F">FEMENINO</option></select>
              </div>
              <div><label style={label}>Tipo de paciente *</label>
                <select value={f.tipo_paciente_id} onChange={e => set('tipo_paciente_id', e.target.value)} style={input}><option value="">—</option>{cat.tipos_paciente.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}</select>
              </div>
              <div><label style={label}>Seguro médico</label><input value={f.seguro_medico} onChange={e => set('seguro_medico', e.target.value)} style={input} /></div>
              <div><label style={label}>Peso</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input value={f.peso} onChange={e => set('peso', e.target.value)} style={{ ...input, width: '90px' }} />
                  <select value={f.unidad_peso} onChange={e => set('unidad_peso', e.target.value)} style={input}>{UNIDAD_PESO.map(u => <option key={u} value={u}>{u}</option>)}</select>
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

            <div style={{ ...seccion, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Obstétrica / RN</span>
              <label style={{ fontSize: '12px', color: '#6b7280', fontWeight: 400, display: 'flex', gap: '6px', alignItems: 'center', cursor: 'pointer' }}>
                <input type="checkbox" checked={mostrarObst} onChange={e => setMostrarObst(e.target.checked)} /> Aplica
              </label>
            </div>
            {mostrarObst && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div><label style={label}>Edad gestacional</label><input value={f.edad_gestacional} onChange={e => set('edad_gestacional', e.target.value)} style={input} /></div>
                <div><label style={label}>Controles prenatales</label><input value={f.controles_prenatales} onChange={e => set('controles_prenatales', e.target.value)} style={input} /></div>
                <div><label style={label}>Edad materna (RN)</label><input value={f.edad_materna} onChange={e => set('edad_materna', e.target.value)} style={input} /></div>
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

        {/* ---------- Variaciones (NUEVO y REITERACIÓN) ---------- */}
        {modo && (
          <>
            <div style={seccion}>Requerimiento y condición</div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px', alignItems: 'end' }}>
              <div><label style={label}>Tipo de sala / cama {modo === 'reiteracion' ? '*' : ''}</label>
                <select value={f.tipo_requerimiento_id} onChange={e => set('tipo_requerimiento_id', e.target.value)} style={input}><option value="">—</option>{cat.tipos_requerimiento.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}</select>
              </div>
              <div><label style={label}>Condición {modo === 'reiteracion' ? '*' : ''}</label>
                <select value={f.condicion_id} onChange={e => set('condicion_id', e.target.value)} style={input}><option value="">—</option>{cat.condiciones.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select>
              </div>
              <label style={{ fontSize: '13px', color: '#374151', display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer', paddingBottom: '9px' }}>
                <input type="checkbox" checked={f.en_uti} onChange={e => set('en_uti', e.target.checked)} /> Internado en UTI
              </label>
            </div>

            <div style={seccion}>Signos vitales</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
              <div><label style={label}>Presión arterial</label><input value={f.presion_arterial} onChange={e => set('presion_arterial', e.target.value)} placeholder="120/80" style={input} /></div>
              <div><label style={label}>Frec. cardíaca</label><input value={f.frecuencia_cardiaca} onChange={e => set('frecuencia_cardiaca', e.target.value)} style={input} /></div>
              <div><label style={label}>Frec. respiratoria</label><input value={f.frecuencia_respiratoria} onChange={e => set('frecuencia_respiratoria', e.target.value)} style={input} /></div>
              <div><label style={label}>Temperatura</label><input value={f.temperatura} onChange={e => set('temperatura', e.target.value)} style={input} /></div>
              <div><label style={label}>Glasgow</label><input value={f.glasgow} onChange={e => set('glasgow', e.target.value)} style={input} /></div>
              <div><label style={label}>Saturación</label><input value={f.saturacion} onChange={e => set('saturacion', e.target.value)} style={input} /></div>
              <div><label style={label}>Oxígeno</label><select value={f.tipo_oxigeno_id} onChange={e => set('tipo_oxigeno_id', e.target.value)} style={input}><option value="">—</option>{cat.tipos_oxigeno.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}</select></div>
              <div><label style={label}>Flujo (l/min)</label><input value={f.oxigeno_flujo} onChange={e => set('oxigeno_flujo', e.target.value)} style={input} /></div>
            </div>

            <div style={seccion}>Tratamiento recibido</div>
            <textarea value={f.tratamiento} onChange={e => set('tratamiento', e.target.value)} rows={2} style={{ ...input, resize: 'vertical' }} />
            {modo === 'nuevo' && (
              <>
                <label style={{ ...label, marginTop: '10px' }}>Inotrópicos</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {cat.tipos_inotropico.map(t => {
                    const on = inotropicos.includes(t.id);
                    return <button key={t.id} type="button" onClick={() => toggleIno(t.id)} style={{ padding: '6px 12px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 500, background: on ? '#0a2540' : '#f0f4f8', color: on ? 'white' : '#6b7280' }}>{t.nombre}</button>;
                  })}
                </div>
                <div style={{ marginTop: '12px' }}><label style={label}>Otros datos de interés</label><input value={f.otros_datos} onChange={e => set('otros_datos', e.target.value)} style={input} /></div>
              </>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
              <button onClick={resetPedido} style={{ padding: '9px 18px', borderRadius: '7px', border: '0.5px solid #e5e7eb', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#6b7280' }}>Descartar pedido</button>
              <button onClick={agregarPedido} disabled={guardando} style={{ padding: '9px 18px', borderRadius: '7px', border: 'none', background: '#0a2540', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
                {guardando ? 'Guardando…' : '＋ Agregar pedido a la llamada'}
              </button>
            </div>
          </>
        )}

        {/* Cerrar llamada */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '22px', borderTop: '0.5px solid #f0f0f0', paddingTop: '16px' }}>
          <button onClick={onCerrar} style={{ padding: '9px 20px', borderRadius: '7px', border: 'none', background: pedidos.length > 0 ? '#15803d' : '#e5e7eb', color: pedidos.length > 0 ? 'white' : '#6b7280', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
            {pedidos.length > 0 ? `Terminar llamada (${pedidos.length})` : 'Cerrar'}
          </button>
        </div>
      </div>
    </div>
  );
}
