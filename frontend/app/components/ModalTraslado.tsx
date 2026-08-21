'use client';

import { useEffect, useState } from 'react';

interface Cat { id: number; nombre?: string; codigo?: string; descripcion?: string; }
interface Catalogos { servicios: Cat[]; requerimientos: Cat[]; tipos_oxigeno: Cat[]; canales: Cat[]; }
interface Props { telefono?: string; nombre?: string; onCerrar: () => void; onGuardado: () => void; }

const UNIDAD_EDAD = ['AÑOS DE VIDA', 'MESES DE VIDA', 'DIAS DE VIDA', 'HORAS DE VIDA', 'MINUTOS DE VIDA'];
const UNIDAD_PESO = ['KILOGRAMOS', 'GRAMOS', 'SIN DATOS'];
const SERV_TRASLADO = [4, 5, 6, 7]; // 10.51 / 10.54 / 10.56 / 10.57

const F = {
  canal_ingreso_id: '', tipo_servicio_id: '',
  denunciante_telefono: '', denunciante_nombre: '',
  direccion: '', nro_casa: '', ciudad: '', barrio: '', ubicacion_paciente: '',
  paciente_nombre: '', paciente_apellido: '', paciente_documento: '', paciente_edad: '', paciente_edad_unidad: 'AÑOS DE VIDA', paciente_sexo: '', es_nn: false,
  peso: '', unidad_peso: 'KILOGRAMOS', diagnostico: '',
  presion_arterial: '', frecuencia_cardiaca: '', frecuencia_respiratoria: '', temperatura: '', glasgow: '', saturacion: '',
  tipo_oxigeno_id: '', oxigeno_flujo: '',
  oxi_tipo_id: '', oxi_litros: '',
  receptor_nombre: '', receptor_lugar: '', receptor_telefono: '', observacion: '',
};

export default function ModalTraslado({ telefono, nombre, onCerrar, onGuardado }: Props) {
  const [cat, setCat] = useState<Catalogos | null>(null);
  const [f, setF] = useState({ ...F, denunciante_telefono: telefono ?? '', denunciante_nombre: nombre ?? '' });
  const [reqSel, setReqSel] = useState<number[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState<number | null>(null);

  const token = () => localStorage.getItem('token') ?? '';
  const set = (k: keyof typeof F, v: any) => setF(prev => ({ ...prev, [k]: v }));

  useEffect(() => {
    fetch('http://localhost:3001/api/traslados/catalogos', { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then((d: Catalogos) => {
        setCat(d);
        const tel = d.canales.find(c => c.nombre === 'TELEFONO');
        if (tel) setF(prev => ({ ...prev, canal_ingreso_id: String(tel.id) }));
      }).catch(() => { });
  }, []);

  const servicioId = f.tipo_servicio_id ? parseInt(f.tipo_servicio_id) : 0;
  const esTraslado = SERV_TRASLADO.includes(servicioId);
  const esOtro = servicioId > 0 && !esTraslado; // emergencia o cierre directo (todavía no)
  const oxigenoReq = cat?.requerimientos.find(r => r.nombre === 'OXIGENO');
  const toggleReq = (id: number) => setReqSel(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const guardar = async () => {
    if (!f.denunciante_telefono) { setError('El teléfono del denunciante es obligatorio.'); return; }
    if (!esTraslado) { setError('Elegí un servicio de traslado.'); return; }
    if (!f.canal_ingreso_id) { setError('Falta el canal de ingreso.'); return; }
    setGuardando(true); setError('');
    try {
      const requerimientos = reqSel.map(id => (oxigenoReq && id === oxigenoReq.id)
        ? { tipo_requerimiento_id: id, tipo_oxigeno_id: f.oxi_tipo_id || null, oxigeno_litros: f.oxi_litros || null }
        : { tipo_requerimiento_id: id });
      const body = {
        canal_ingreso_id: f.canal_ingreso_id, tipo_servicio_id: f.tipo_servicio_id,
        denunciante_telefono: f.denunciante_telefono, denunciante_nombre: f.denunciante_nombre,
        direccion: f.direccion, nro_casa: f.nro_casa, ciudad: f.ciudad, barrio: f.barrio,
        paciente_nombre: f.paciente_nombre, paciente_apellido: f.paciente_apellido, paciente_documento: f.paciente_documento,
        paciente_edad: f.paciente_edad, paciente_edad_unidad: f.paciente_edad_unidad, paciente_sexo: f.paciente_sexo, es_nn: f.es_nn,
        peso: f.peso, unidad_peso: f.unidad_peso, diagnostico: f.diagnostico, ubicacion_paciente: f.ubicacion_paciente,
        receptor_nombre: f.receptor_nombre, receptor_lugar: f.receptor_lugar, receptor_telefono: f.receptor_telefono,
        observacion: f.observacion,
        requerimientos,
        signos: {
          presion_arterial: f.presion_arterial, frecuencia_cardiaca: f.frecuencia_cardiaca, frecuencia_respiratoria: f.frecuencia_respiratoria,
          temperatura: f.temperatura, glasgow: f.glasgow, saturacion: f.saturacion, tipo_oxigeno_id: f.tipo_oxigeno_id, oxigeno_flujo: f.oxigeno_flujo,
        },
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

  if (!cat) return <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 }}>
    <div style={{ background: 'white', borderRadius: '12px', padding: '28px', fontSize: '14px', color: '#6b7280' }}>Cargando formulario…</div>
  </div>;

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
        <h2 style={{ fontSize: '17px', fontWeight: 600, color: '#0a2540', margin: '0 0 12px' }}>🚐 Pedido de ambulancia — Traslado</h2>
        {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 14px', borderRadius: '7px', fontSize: '13px', marginBottom: '8px' }}>{error}</div>}

        {/* Denunciante + servicio (lo primero) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <div><label style={label}>Teléfono del denunciante *</label><input value={f.denunciante_telefono} onChange={e => set('denunciante_telefono', e.target.value)} style={input} /></div>
          <div><label style={label}>Nombre del denunciante</label><input value={f.denunciante_nombre} onChange={e => set('denunciante_nombre', e.target.value)} style={input} /></div>
          <div><label style={label}>Servicio *</label>
            <select value={f.tipo_servicio_id} onChange={e => set('tipo_servicio_id', e.target.value)} style={input}>
              <option value="">— elegir servicio —</option>
              {cat.servicios.map(s => <option key={s.id} value={s.id}>{s.codigo} — {s.descripcion}</option>)}
            </select>
          </div>
        </div>

        {esOtro && (
          <div style={{ marginTop: '16px', background: '#fff7ed', border: '0.5px solid #fed7aa', borderRadius: '8px', padding: '14px', fontSize: '13px', color: '#c2410c' }}>
            ⚠️ Ese servicio corresponde a <strong>emergencia / cierre directo</strong> — esa rama todavía está en construcción. Elegí un servicio de traslado (10.51 / 10.54 / 10.56 / 10.57).
          </div>
        )}

        {esTraslado && (
          <>
            <div style={seccion}>Ubicación del paciente (origen)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '12px' }}>
              <div><label style={label}>Dirección</label><input value={f.direccion} onChange={e => set('direccion', e.target.value)} style={input} /></div>
              <div><label style={label}>Nro</label><input value={f.nro_casa} onChange={e => set('nro_casa', e.target.value)} style={input} /></div>
              <div><label style={label}>Ciudad</label><input value={f.ciudad} onChange={e => set('ciudad', e.target.value)} style={input} /></div>
              <div><label style={label}>Barrio</label><input value={f.barrio} onChange={e => set('barrio', e.target.value)} style={input} /></div>
              <div style={{ gridColumn: '1 / -1' }}><label style={label}>Ubicación exacta del paciente</label><input value={f.ubicacion_paciente} onChange={e => set('ubicacion_paciente', e.target.value)} placeholder="Ej: Hospital X, sala 3, cama 12" style={input} /></div>
            </div>

            <div style={{ ...seccion, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Paciente</span>
              <label style={{ fontSize: '12px', color: '#6b7280', fontWeight: 400, display: 'flex', gap: '6px', alignItems: 'center', cursor: 'pointer' }}>
                <input type="checkbox" checked={f.es_nn} onChange={e => set('es_nn', e.target.checked)} /> N/N (sin identificar)
              </label>
            </div>
            {!f.es_nn && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div><label style={label}>Nombre</label><input value={f.paciente_nombre} onChange={e => set('paciente_nombre', e.target.value)} style={input} /></div>
                <div><label style={label}>Apellido</label><input value={f.paciente_apellido} onChange={e => set('paciente_apellido', e.target.value)} style={input} /></div>
                <div><label style={label}>Cédula</label><input value={f.paciente_documento} onChange={e => set('paciente_documento', e.target.value)} style={input} /></div>
                <div><label style={label}>Edad</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input value={f.paciente_edad} onChange={e => set('paciente_edad', e.target.value)} style={{ ...input, width: '70px' }} />
                    <select value={f.paciente_edad_unidad} onChange={e => set('paciente_edad_unidad', e.target.value)} style={input}>{UNIDAD_EDAD.map(u => <option key={u} value={u}>{u}</option>)}</select>
                  </div>
                </div>
                <div><label style={label}>Sexo</label><select value={f.paciente_sexo} onChange={e => set('paciente_sexo', e.target.value)} style={input}><option value="">—</option><option value="M">MASCULINO</option><option value="F">FEMENINO</option></select></div>
                <div><label style={label}>Peso</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input value={f.peso} onChange={e => set('peso', e.target.value)} style={{ ...input, width: '80px' }} />
                    <select value={f.unidad_peso} onChange={e => set('unidad_peso', e.target.value)} style={input}>{UNIDAD_PESO.map(u => <option key={u} value={u}>{u}</option>)}</select>
                  </div>
                </div>
              </div>
            )}
            <div style={{ marginTop: '12px' }}><label style={label}>Diagnóstico</label><input value={f.diagnostico} onChange={e => set('diagnostico', e.target.value)} style={input} /></div>

            <div style={seccion}>Signos vitales</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
              <div><label style={label}>Presión arterial</label><input value={f.presion_arterial} onChange={e => set('presion_arterial', e.target.value)} placeholder="120/80" style={input} /></div>
              <div><label style={label}>Frec. cardíaca</label><input value={f.frecuencia_cardiaca} onChange={e => set('frecuencia_cardiaca', e.target.value)} style={input} /></div>
              <div><label style={label}>Frec. respiratoria</label><input value={f.frecuencia_respiratoria} onChange={e => set('frecuencia_respiratoria', e.target.value)} style={input} /></div>
              <div><label style={label}>Temperatura</label><input value={f.temperatura} onChange={e => set('temperatura', e.target.value)} style={input} /></div>
              <div><label style={label}>Glasgow</label><input value={f.glasgow} onChange={e => set('glasgow', e.target.value)} style={input} /></div>
              <div><label style={label}>Saturación</label><input value={f.saturacion} onChange={e => set('saturacion', e.target.value)} style={input} /></div>
            </div>

            <div style={seccion}>Requerimientos para el traslado</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {cat.requerimientos.map(r => {
                const on = reqSel.includes(r.id);
                return <button key={r.id} type="button" onClick={() => toggleReq(r.id)} style={{ padding: '6px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 500, background: on ? '#0a2540' : '#f0f4f8', color: on ? 'white' : '#6b7280' }}>{r.nombre}</button>;
              })}
            </div>
            {oxigenoReq && reqSel.includes(oxigenoReq.id) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                <div><label style={label}>Tipo de oxígeno</label><select value={f.oxi_tipo_id} onChange={e => set('oxi_tipo_id', e.target.value)} style={input}><option value="">—</option>{cat.tipos_oxigeno.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}</select></div>
                <div><label style={label}>Oxígeno (l/min)</label><input value={f.oxi_litros} onChange={e => set('oxi_litros', e.target.value)} style={input} /></div>
              </div>
            )}

            <div style={seccion}>Receptor (destino)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div><label style={label}>Nombre del receptor</label><input value={f.receptor_nombre} onChange={e => set('receptor_nombre', e.target.value)} style={input} /></div>
              <div><label style={label}>Lugar de recepción</label><input value={f.receptor_lugar} onChange={e => set('receptor_lugar', e.target.value)} style={input} /></div>
              <div><label style={label}>Teléfono del receptor</label><input value={f.receptor_telefono} onChange={e => set('receptor_telefono', e.target.value)} style={input} /></div>
            </div>

            <div style={{ marginTop: '16px' }}><label style={label}>Observación</label><textarea value={f.observacion} onChange={e => set('observacion', e.target.value)} rows={2} style={{ ...input, resize: 'vertical' }} /></div>
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '22px', borderTop: '0.5px solid #f0f0f0', paddingTop: '16px' }}>
          <button onClick={onCerrar} style={{ padding: '9px 18px', borderRadius: '7px', border: '0.5px solid #e5e7eb', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#6b7280' }}>Cancelar</button>
          <button onClick={guardar} disabled={guardando || !esTraslado} style={{ padding: '9px 18px', borderRadius: '7px', border: 'none', background: esTraslado ? '#0a2540' : '#9ca3af', color: 'white', cursor: esTraslado ? 'pointer' : 'default', fontSize: '13px', fontWeight: 500 }}>
            {guardando ? 'Guardando…' : 'Registrar traslado'}
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
