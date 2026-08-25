'use client';

import { useEffect, useState } from 'react';
import { soloTelefono, telefonoValido } from '../../lib/validaciones';

interface Cat { id: number; nombre?: string; codigo?: string; descripcion?: string; usa_flujo?: boolean; }
interface Catalogos { servicios: Cat[]; requerimientos: Cat[]; tipos_oxigeno: Cat[]; tipos_inotropico: Cat[]; canales: Cat[]; }
interface Props { telefono?: string; nombre?: string; onCerrar: () => void; onGuardado: () => void; }

const UNIDAD_EDAD = ['AÑOS DE VIDA', 'MESES DE VIDA', 'DIAS DE VIDA', 'HORAS DE VIDA', 'MINUTOS DE VIDA'];
const UNIDAD_PESO = ['KILOGRAMOS', 'GRAMOS', 'APROXIMADOS', 'SIN DATOS'];
const SERV_TRASLADO = [4, 5, 6, 7];

const soloEnt = (v: string) => v.replace(/\D/g, '');
const dec2 = (v: string) => { const m = v.replace(/[^\d.]/g, '').match(/^\d*\.?\d{0,2}/); return m ? m[0] : ''; };
const capMax = (v: string, max: number) => { const n = parseInt(v); return isNaN(n) ? v : String(Math.min(n, max)); };

const F = {
  tipo_servicio_id: '', fecha_hora_traslado: '', estudio_procedimiento: '', origen: '', destino: '',
  denunciante_telefono: '', denunciante_nombre: '',
  direccion: '', nro_casa: '', ciudad: '', barrio: '', ubicacion_paciente: '',
  paciente_nombre: '', paciente_apellido: '', paciente_documento: '', paciente_edad: '', paciente_edad_unidad: 'AÑOS DE VIDA', paciente_sexo: '',
  peso: '', unidad_peso: 'KILOGRAMOS', diagnostico: '',
  presion_arterial: '', frecuencia_cardiaca: '', frecuencia_respiratoria: '', temperatura: '', glasgow: '', saturacion: '',
  oxi_activo: false, oxi_tipo_id: '', oxi_litros: '', intubado: false,
  acompana_medico: false,
  receptor_nombre: '', receptor_lugar: '', receptor_telefono: '', observacion: '',
};

export default function ModalTraslado({ telefono, nombre, onCerrar, onGuardado }: Props) {
  const [cat, setCat] = useState<Catalogos | null>(null);
  const [f, setF] = useState({ ...F, denunciante_telefono: telefono ?? '', denunciante_nombre: nombre ?? '' });
  const [inoActivo, setInoActivo] = useState(false);
  const [inoSel, setInoSel] = useState<Record<number, { dosis: string; goteo: string }>>({});
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState<number | null>(null);

  const token = () => localStorage.getItem('token') ?? '';
  const set = (k: keyof typeof F, v: any) => setF(prev => ({ ...prev, [k]: v }));

  useEffect(() => {
    fetch('http://localhost:3001/api/traslados/catalogos', { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(setCat).catch(() => { });
  }, []);

  const oxiSel = cat?.tipos_oxigeno.find(o => String(o.id) === f.oxi_tipo_id);
  const usaFlujo = !!oxiSel?.usa_flujo;
  const servSel = cat?.servicios.find(s => String(s.id) === f.tipo_servicio_id);
  const esEstudios = servSel?.descripcion === 'ESTUDIOS AUXILIARES';
  const toggleIno = (id: number) => setInoSel(prev => { const n = { ...prev }; if (n[id]) delete n[id]; else n[id] = { dosis: '', goteo: '' }; return n; });
  const setIno = (id: number, k: 'dosis' | 'goteo', v: string) => setInoSel(prev => ({ ...prev, [id]: { ...prev[id], [k]: v } }));

  const guardar = async () => {
    if (!f.denunciante_telefono) { setError('El teléfono es obligatorio.'); return; }
    if (!f.tipo_servicio_id) { setError('Elegí el tipo de traslado.'); return; }
    if (esEstudios && !f.estudio_procedimiento.trim()) { setError('Indicá el estudio y/o procedimiento a realizar.'); return; }
    if (!f.origen.trim() || !f.destino.trim()) { setError('Indicá el origen y el destino del traslado.'); return; }
    if (f.glasgow && (parseInt(f.glasgow) < 3 || parseInt(f.glasgow) > 15)) { setError('El Glasgow debe estar entre 3 y 15.'); return; }
    setGuardando(true); setError('');
    try {
      const body = {
        tipo_servicio_id: f.tipo_servicio_id, fecha_hora_traslado: f.fecha_hora_traslado || null, estudio_procedimiento: f.estudio_procedimiento, origen: f.origen, destino: f.destino,
        denunciante_telefono: f.denunciante_telefono, denunciante_nombre: f.denunciante_nombre,
        direccion: f.direccion, nro_casa: f.nro_casa, ciudad: f.ciudad, barrio: f.barrio, ubicacion_paciente: f.ubicacion_paciente,
        paciente_nombre: f.paciente_nombre, paciente_apellido: f.paciente_apellido, paciente_documento: f.paciente_documento,
        paciente_edad: f.paciente_edad, paciente_edad_unidad: f.paciente_edad_unidad, paciente_sexo: f.paciente_sexo,
        peso: f.peso, unidad_peso: f.unidad_peso, diagnostico: f.diagnostico,
        signos: { presion_arterial: f.presion_arterial, frecuencia_cardiaca: f.frecuencia_cardiaca, frecuencia_respiratoria: f.frecuencia_respiratoria, temperatura: f.temperatura, glasgow: f.glasgow, saturacion: f.saturacion },
        receptor_nombre: f.receptor_nombre, receptor_lugar: f.receptor_lugar, receptor_telefono: f.receptor_telefono, observacion: f.observacion,
        oxigeno: f.oxi_activo ? { activo: true, tipo_oxigeno_id: f.oxi_tipo_id, litros: usaFlujo ? f.oxi_litros : '' } : null,
        intubado: f.intubado, acompana_medico: f.acompana_medico,
        inotropicos: inoActivo ? Object.entries(inoSel).map(([id, d]) => ({ tipo_inotripico_id: Number(id), dosis: d.dosis, goteo: d.goteo })) : [],
      };
      const res = await fetch('http://localhost:3001/api/traslados', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Error al registrar el traslado'); return; }
      onGuardado(); setExito(data.id ?? null);
    } catch { setError('Error de conexión'); }
    finally { setGuardando(false); }
  };

  const input = { width: '100%', padding: '9px 12px', borderRadius: '7px', border: '0.5px solid #e5e7eb', fontSize: '13px', boxSizing: 'border-box' as const };
  const label = { fontSize: '12px', color: '#6b7280', display: 'block' as const, marginBottom: '6px' };
  const seccion = { fontSize: '13px', fontWeight: 600, color: '#0a2540', margin: '18px 0 10px', paddingBottom: '6px', borderBottom: '0.5px solid #f0f0f0' } as const;
  const uni = { fontSize: '12px', color: '#9ca3af', whiteSpace: 'nowrap' as const };
  const optBtn = (on: boolean): React.CSSProperties => ({ padding: '10px 12px', borderRadius: '8px', border: `0.5px solid ${on ? '#0a2540' : '#e5e7eb'}`, cursor: 'pointer', fontSize: '13px', fontWeight: 500, background: on ? '#0a2540' : 'white', color: on ? 'white' : '#374151', textAlign: 'left' });
  const checkBtn = (on: boolean): React.CSSProperties => ({ padding: '7px 16px', borderRadius: '7px', border: `0.5px solid ${on ? '#0a2540' : '#e5e7eb'}`, cursor: 'pointer', fontSize: '12px', fontWeight: 500, background: on ? '#0a2540' : 'white', color: on ? 'white' : '#6b7280' });

  const signo = (k: keyof typeof F, lbl: string, unidad: string, onChange: (v: string) => void, ph = '') => (
    <div><label style={label}>{lbl}</label>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <input value={f[k] as string} onChange={e => onChange(e.target.value)} placeholder={ph} style={input} /><span style={uni}>{unidad}</span>
      </div>
    </div>
  );

  if (!cat) return <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}><div style={{ background: 'white', borderRadius: '12px', padding: '28px', fontSize: '14px', color: '#6b7280' }}>Cargando formulario…</div></div>;

  return (
    <>
    {exito !== null && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400 }}>
        <div style={{ background: 'white', borderRadius: '14px', padding: '32px 44px', textAlign: 'center', boxShadow: '0 12px 40px rgba(0,0,0,0.25)' }}>
          <div style={{ fontSize: '54px', lineHeight: 1, marginBottom: '10px' }}>✅</div>
          <div style={{ fontSize: '17px', fontWeight: 600, color: '#0a2540', marginBottom: '12px' }}>Traslado cargado correctamente</div>
          <div style={{ fontSize: '12px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Número de pedido</div>
          <div style={{ fontSize: '36px', fontWeight: 700, color: '#15803d', margin: '4px 0 22px' }}>#{exito}</div>
          <button onClick={() => { setExito(null); onCerrar(); }} style={{ padding: '10px 30px', borderRadius: '8px', border: 'none', background: '#0a2540', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>Continuar</button>
        </div>
      </div>
    )}
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 300, padding: '24px', overflowY: 'auto' }}>
      <div style={{ background: 'white', borderRadius: '12px', padding: '28px', width: '720px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
        <h2 style={{ fontSize: '17px', fontWeight: 600, color: '#0a2540', margin: '0 0 12px' }}>🚐 Pedido de ambulancia — Traslado programado</h2>
        {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 14px', borderRadius: '7px', fontSize: '13px', marginBottom: '8px' }}>{error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div><label style={label}>Teléfono del solicitante *</label><input value={f.denunciante_telefono} onChange={e => set('denunciante_telefono', soloTelefono(e.target.value))} style={input} /></div>
          <div><label style={label}>Nombre del solicitante</label><input value={f.denunciante_nombre} onChange={e => set('denunciante_nombre', e.target.value)} style={input} /></div>
        </div>

        <div style={seccion}>Tipo de traslado *</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {cat.servicios.filter(s => SERV_TRASLADO.includes(s.id)).map(s => (
            <button key={s.id} type="button" onClick={() => set('tipo_servicio_id', String(s.id))} style={optBtn(String(s.id) === f.tipo_servicio_id)}>{s.descripcion}</button>
          ))}
        </div>

        <div style={{ marginTop: '14px' }}>
          <label style={label}>Fecha y hora del traslado (programado)</label>
          <input type="datetime-local" value={f.fecha_hora_traslado} onChange={e => set('fecha_hora_traslado', e.target.value)} style={{ ...input, width: '260px' }} />
        </div>
          {esEstudios && (
          <div style={{ marginTop: '14px' }}>
            <label style={label}>Estudio y/o procedimiento a realizar *</label>
            <textarea value={f.estudio_procedimiento} onChange={e => set('estudio_procedimiento', e.target.value)} rows={2} style={{ ...input, resize: 'vertical' }} placeholder="Ej: TAC de cráneo, endoscopía, ecografía…" />
          </div>
        )}

        <div style={seccion}>Ubicación exacta del paciente</div>
        <div style={seccion}>Traslado — ¿de dónde a dónde?</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div><label style={label}>De (origen) *</label><input value={f.origen} onChange={e => set('origen', e.target.value)} placeholder="Ej: Hospital de Luque" style={input} /></div>
          <div><label style={label}>A (destino) *</label><input value={f.destino} onChange={e => set('destino', e.target.value)} placeholder="Ej: Hospital de Barrio Obrero" style={input} /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '12px' }}>
          <div><label style={label}>Dirección</label><input value={f.direccion} onChange={e => set('direccion', e.target.value)} style={input} /></div>
          <div><label style={label}>Nro</label><input value={f.nro_casa} onChange={e => set('nro_casa', e.target.value)} style={input} /></div>
          <div><label style={label}>Ciudad</label><input value={f.ciudad} onChange={e => set('ciudad', e.target.value)} style={input} /></div>
          <div><label style={label}>Barrio</label><input value={f.barrio} onChange={e => set('barrio', e.target.value)} style={input} /></div>
          <div style={{ gridColumn: '1 / -1' }}><label style={label}>Ubicación exacta del paciente</label><input value={f.ubicacion_paciente} onChange={e => set('ubicacion_paciente', e.target.value)} placeholder="Ej: Hospital X, sala 3, cama 12" style={input} /></div>
        </div>

        <div style={seccion}>Paciente</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <div><label style={label}>Nombre</label><input value={f.paciente_nombre} onChange={e => set('paciente_nombre', e.target.value)} style={input} /></div>
          <div><label style={label}>Apellido</label><input value={f.paciente_apellido} onChange={e => set('paciente_apellido', e.target.value)} style={input} /></div>
          <div><label style={label}>Cédula</label><input value={f.paciente_documento} onChange={e => set('paciente_documento', e.target.value)} style={input} /></div>
          <div><label style={label}>Edad</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input value={f.paciente_edad} onChange={e => set('paciente_edad', soloEnt(e.target.value))} style={{ ...input, width: '70px' }} />
              <select value={f.paciente_edad_unidad} onChange={e => set('paciente_edad_unidad', e.target.value)} style={input}>{UNIDAD_EDAD.map(u => <option key={u} value={u}>{u}</option>)}</select>
            </div>
          </div>
          <div><label style={label}>Sexo</label><select value={f.paciente_sexo} onChange={e => set('paciente_sexo', e.target.value)} style={input}><option value="">—</option><option value="M">MASCULINO</option><option value="F">FEMENINO</option></select></div>
          <div><label style={label}>Peso</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input value={f.peso} onChange={e => set('peso', dec2(e.target.value))} style={{ ...input, width: '80px' }} />
              <select value={f.unidad_peso} onChange={e => set('unidad_peso', e.target.value)} style={input}>{UNIDAD_PESO.map(u => <option key={u} value={u}>{u}</option>)}</select>
            </div>
          </div>
        </div>
        <div style={{ marginTop: '12px' }}><label style={label}>Diagnóstico</label><input value={f.diagnostico} onChange={e => set('diagnostico', e.target.value)} style={input} /></div>

        <div style={seccion}>Signos vitales</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <div><label style={label}>Presión arterial</label><input value={f.presion_arterial} onChange={e => set('presion_arterial', e.target.value)} placeholder="120/80" style={input} /></div>
          {signo('frecuencia_cardiaca', 'Frec. cardíaca', 'lpm', v => set('frecuencia_cardiaca', soloEnt(v)))}
          {signo('frecuencia_respiratoria', 'Frec. respiratoria', 'rpm', v => set('frecuencia_respiratoria', soloEnt(v)))}
          {signo('temperatura', 'Temperatura', '°C', v => set('temperatura', dec2(v)))}
          {signo('glasgow', 'Glasgow', '/15', v => set('glasgow', capMax(soloEnt(v), 15)))}
          {signo('saturacion', 'Saturación', '%', v => set('saturacion', capMax(soloEnt(v), 100)))}
        </div>

        <div style={seccion}>Requerimientos para el traslado</div>
        {/* Oxígeno */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '10px' }}>
          <span style={{ width: '90px', fontSize: '13px', color: '#0a2540', fontWeight: 500 }}>Oxígeno</span>
          <button type="button" onClick={() => set('oxi_activo', !f.oxi_activo)} style={checkBtn(f.oxi_activo)}>{f.oxi_activo ? 'Sí' : 'No'}</button>
          {f.oxi_activo && (
            <>
              <select value={f.oxi_tipo_id} onChange={e => set('oxi_tipo_id', e.target.value)} style={{ ...input, width: '240px' }}>
                <option value="">— vía de oxígeno —</option>{cat.tipos_oxigeno.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
              {usaFlujo && <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}><input value={f.oxi_litros} onChange={e => set('oxi_litros', soloEnt(e.target.value))} placeholder="Flujo" style={{ ...input, width: '90px' }} /><span style={uni}>l/min</span></div>}
            </>
          )}
        </div>
        {/* Intubado */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{ width: '90px', fontSize: '13px', color: '#0a2540', fontWeight: 500 }}>Intubado</span>
          <button type="button" onClick={() => set('intubado', !f.intubado)} style={checkBtn(f.intubado)}>{f.intubado ? 'Sí' : 'No'}</button>
        </div>
        {/* Inotrópico */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ width: '90px', fontSize: '13px', color: '#0a2540', fontWeight: 500 }}>Inotrópico</span>
          <button type="button" onClick={() => setInoActivo(!inoActivo)} style={checkBtn(inoActivo)}>{inoActivo ? 'Sí' : 'No'}</button>
        </div>
        {inoActivo && (
          <div style={{ paddingLeft: '10px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
              {cat.tipos_inotropico.map(t => <button key={t.id} type="button" onClick={() => toggleIno(t.id)} style={{ padding: '6px 12px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 500, background: inoSel[t.id] ? '#0a2540' : '#f0f4f8', color: inoSel[t.id] ? 'white' : '#6b7280' }}>{t.nombre}</button>)}
            </div>
            {cat.tipos_inotropico.filter(t => inoSel[t.id]).map(t => (
              <div key={t.id} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ width: '120px', fontSize: '12px', fontWeight: 500, color: '#0a2540' }}>{t.nombre}</span>
                <input value={inoSel[t.id].dosis} onChange={e => setIno(t.id, 'dosis', e.target.value)} placeholder="Dosis" style={{ ...input, flex: 1 }} />
                <input value={inoSel[t.id].goteo} onChange={e => setIno(t.id, 'goteo', e.target.value)} placeholder="Goteo" style={{ ...input, flex: 1 }} />
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '18px' }}>
          <span style={{ fontSize: '13px', color: '#0a2540', fontWeight: 500 }}>¿Acompaña médico?</span>
          <button type="button" onClick={() => set('acompana_medico', !f.acompana_medico)} style={checkBtn(f.acompana_medico)}>{f.acompana_medico ? 'Sí' : 'No'}</button>
        </div>

        <div style={seccion}>Receptor (destino)</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <div><label style={label}>Nombre del receptor</label><input value={f.receptor_nombre} onChange={e => set('receptor_nombre', e.target.value)} style={input} /></div>
          <div><label style={label}>Lugar de recepción</label><input value={f.receptor_lugar} onChange={e => set('receptor_lugar', e.target.value)} style={input} /></div>
          <div><label style={label}>Teléfono del receptor</label><input value={f.receptor_telefono} onChange={e => set('receptor_telefono', soloTelefono(e.target.value))} style={input} /></div>
        </div>

        <div style={{ marginTop: '16px' }}><label style={label}>Observación</label><textarea value={f.observacion} onChange={e => set('observacion', e.target.value)} rows={2} style={{ ...input, resize: 'vertical' }} /></div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '22px', borderTop: '0.5px solid #f0f0f0', paddingTop: '16px' }}>
          <button onClick={onCerrar} style={{ padding: '9px 18px', borderRadius: '7px', border: '0.5px solid #e5e7eb', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#6b7280' }}>Cancelar</button>
          <button onClick={guardar} disabled={guardando} style={{ padding: '9px 18px', borderRadius: '7px', border: 'none', background: '#0a2540', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>{guardando ? 'Guardando…' : 'Registrar traslado'}</button>
        </div>
      </div>
    </div>
    </>
  );
}
