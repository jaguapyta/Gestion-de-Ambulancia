'use client';

import { useEffect, useState } from 'react';
import FirmaTouch from './FirmaTouch';

interface Props {
  solicitudId: number;
  onCerrar: () => void;
  onGuardado?: () => void;
}
type Datos = Record<string, any>;

// Escalas de Glasgow (la opción muestra el valor + su descripción = referencia visible).
const GCS: Record<'adulto' | 'pediatrico', { ref: string; ocular: [number, string][]; verbal: [number, string][]; motora: [number, string][] }> = {
  adulto: {
    ref: 'Adulto · Ref: 14-13 leve · 12-9 moderado · 8-3 grave',
    ocular: [[4, 'Espontánea'], [3, 'A la voz'], [2, 'Al dolor'], [1, 'No responde']],
    verbal: [[5, 'Orientado'], [4, 'Confuso / desorientado'], [3, 'Palabras inapropiadas'], [2, 'Sonidos incomprensibles'], [1, 'No responde']],
    motora: [[6, 'Cumple órdenes'], [5, 'Localiza el dolor'], [4, 'Retira al dolor'], [3, 'Flexión al dolor'], [2, 'Extensión al dolor'], [1, 'No responde']],
  },
  pediatrico: {
    ref: 'Pediátrico · Ref: 15-14 leve · 13-9 moderado · 8-3 grave',
    ocular: [[4, 'Espontánea'], [3, 'A la voz / a órdenes'], [2, 'Al dolor'], [1, 'No responde']],
    verbal: [[5, 'Balbucea / sonríe / orientado'], [4, 'Llanto consolable / confuso'], [3, 'Llora ante el dolor / grita'], [2, 'Se queja / gruñe'], [1, 'No responde']],
    motora: [[6, 'Movimientos espontáneos'], [5, 'Se retira al tacto'], [4, 'Se retira al dolor'], [3, 'Flexión al dolor'], [2, 'Extensión al dolor'], [1, 'No responde']],
  },
};

// Componentes de layout a nivel de módulo (estables: no re-montan los inputs, no pierden foco).
const Sec = ({ t }: { t: string }) => (
  <div style={{ background: '#0a2540', color: '#fff', fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em', padding: '6px 12px', borderRadius: '6px', margin: '16px 0 10px' }}>{t}</div>
);
const Fila = ({ children, cols = '1fr 1fr' }: { children: any; cols?: string }) => (
  <div style={{ display: 'grid', gridTemplateColumns: cols, gap: '8px', marginBottom: '8px' }}>{children}</div>
);
const Bloque = ({ children }: { children: any }) => (
  <div style={{ border: '0.5px solid #e5e7eb', borderRadius: '8px', padding: '10px 12px', marginBottom: '8px' }}>{children}</div>
);

export default function FichaPrehospitalaria({ solicitudId, onCerrar, onGuardado }: Props) {
  const [f, setF] = useState<Datos>({});
  const [firmaPaciente, setFirmaPaciente] = useState<string | null>(null);
  const [firmaTestigo, setFirmaTestigo] = useState<string | null>(null);
  const [firmaParamedico, setFirmaParamedico] = useState<string | null>(null);
  const [firmaMedico, setFirmaMedico] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState('');

  const token = () => localStorage.getItem('token') ?? '';
  const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });
  const set = (k: string, v: any) => setF(prev => ({ ...prev, [k]: v }));

  // Actualiza un componente del Glasgow y recalcula el total automáticamente.
  const setGcs = (campo: string, valor: string) => {
    setF(prev => {
      const n = { ...prev, [campo]: valor };
      const o = parseInt(n.p5_gcs_ocular) || 0, v = parseInt(n.p5_gcs_verbal) || 0, m = parseInt(n.p5_gcs_motora) || 0;
      n.p5_gcs_total = (o + v + m) || '';
      return n;
    });
  };

  useEffect(() => {
    fetch(`http://localhost:3001/api/fichas/${solicitudId}`, { headers: headers() })
      .then(r => r.json())
      .then(d => {
        const p = d.precarga || {};
        const base: Datos = {
          p5_gcs_tipo: 'adulto',
          dg_fecha: p.fecha ? new Date(p.fecha).toLocaleDateString('es-PY') : '',
          dg_servicio: p.run_number || '',
          dg_ci: p.paciente_documento || '',
          p2_direccion: p.lugar_escena || '',
          p3_nombre: p.paciente_nombre || '',
          p3_edad: p.paciente_edad || '',
          p3_sexo_m: p.paciente_sexo === 'M' || p.paciente_sexo === 'MASCULINO',
          p3_sexo_f: p.paciente_sexo === 'F' || p.paciente_sexo === 'FEMENINO',
          p3_telefono: p.llamante_telefono || '',
          p3_residencia: p.paciente_direccion || '',
          p4_detalles: p.motivo_consulta || '',
          p5_pa: p.vs_bp || '', p5_fc: p.vs_hr || '', p5_fr: p.vs_rr || '',
          p5_spo2: p.vs_spo2 || '', p5_temp: p.vs_temp || '', p5_glucemia: p.vs_rbs || '',
        };
        if (d.ficha) {
          Object.assign(base, d.ficha.datos || {});
          const fi = d.ficha.datos?._firmas || {};
          setFirmaPaciente(fi.paciente || null);
          setFirmaTestigo(fi.testigo || null);
          setFirmaParamedico(d.ficha.firma_prestador || fi.paramedico || null);
          setFirmaMedico(fi.medico || null);
        }
        setF(base);
      })
      .catch(() => setMsg('No se pudo cargar la ficha'))
      .finally(() => setCargando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solicitudId]);

  const guardar = async (cerrar: boolean) => {
    if (cerrar && !firmaParamedico) { setMsg('Falta la firma del paramédico para cerrar el servicio.'); return; }
    setGuardando(true); setMsg('');
    const datos = { ...f, _firmas: { paciente: firmaPaciente, testigo: firmaTestigo, paramedico: firmaParamedico, medico: firmaMedico } };
    try {
      const res = await fetch(`http://localhost:3001/api/fichas/${solicitudId}`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ datos, firma_entrega: firmaMedico, firma_prestador: firmaParamedico, cerrar }),
      });
      const d = await res.json();
      if (!res.ok) { setMsg(d.error || 'No se pudo guardar'); return; }
      if (cerrar) { onGuardado?.(); onCerrar(); }
      else setMsg('Borrador guardado ✓');
    } catch { setMsg('Error de conexión'); }
    finally { setGuardando(false); }
  };

  // ---- helpers de campos (funciones, no componentes: conservan el foco) ----
  const inp = { padding: '6px 8px', borderRadius: '6px', border: '0.5px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' as const };
  const chkS = { display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#374151', marginRight: '12px', marginBottom: '4px', cursor: 'pointer' };
  const lbl = { fontSize: '11px', fontWeight: 600, color: '#0a2540', display: 'block' as const, marginBottom: '3px' };
  const chk = (k: string, label: string) => (
    <label key={k} style={chkS}><input type="checkbox" checked={!!f[k]} onChange={e => set(k, e.target.checked)} /> <span>{label}</span></label>
  );
  const txt = (k: string, ph = '', width?: string) => (
    <input value={f[k] ?? ''} onChange={e => set(k, e.target.value)} placeholder={ph} style={{ ...inp, width: width ?? '100%' }} />
  );
  const area = (k: string, ph = '', rows = 2) => (
    <textarea value={f[k] ?? ''} onChange={e => set(k, e.target.value)} placeholder={ph} rows={rows} style={{ ...inp, width: '100%', resize: 'vertical' }} />
  );
  const campo = (k: string, label: string, ph = '') => (<div><label style={lbl}>{label}</label>{txt(k, ph)}</div>);
  const grupo = (titulo: string, items: [string, string][]) => (
    <div style={{ marginBottom: '6px' }}>
      <div style={{ fontSize: '11px', fontWeight: 600, color: '#c2410c', marginBottom: '2px' }}>{titulo}</div>
      {items.map(([k, l]) => chk(k, l))}
    </div>
  );

  // Bloque de Glasgow con selects (rango válido), toggle adulto/pediátrico y total automático.
  const glasgow = () => {
    const tipo: 'adulto' | 'pediatrico' = f.p5_gcs_tipo === 'pediatrico' ? 'pediatrico' : 'adulto';
    const esc = GCS[tipo];
    const total = parseInt(f.p5_gcs_total) || 0;
    const leveMin = tipo === 'pediatrico' ? 14 : 13;
    const sev = total === 0 ? '' : total >= leveMin ? 'LEVE' : total >= 9 ? 'MODERADO' : 'GRAVE';
    const sevColor = sev === 'GRAVE' ? '#dc2626' : sev === 'MODERADO' ? '#c2410c' : sev === 'LEVE' ? '#15803d' : '#cbd5e1';
    const selGcs = (campo: string, opts: [number, string][], label: string) => (
      <div>
        <label style={lbl}>{label}</label>
        <select value={f[campo] ?? ''} onChange={e => setGcs(campo, e.target.value)} style={{ ...inp, width: '100%', background: '#fff' }}>
          <option value="">— seleccionar —</option>
          {opts.map(([val, desc]) => <option key={val} value={val}>{val} · {desc}</option>)}
        </select>
      </div>
    );
    return (
      <Bloque>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#0a2540' }}>Escala de coma de Glasgow</div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {(['adulto', 'pediatrico'] as const).map(tp => (
              <button key={tp} type="button" onClick={() => set('p5_gcs_tipo', tp)}
                style={{ fontSize: '11px', padding: '3px 12px', borderRadius: '6px', cursor: 'pointer', border: tipo === tp ? 'none' : '0.5px solid #e5e7eb', background: tipo === tp ? '#0a2540' : '#fff', color: tipo === tp ? '#fff' : '#6b7280' }}>
                {tp === 'adulto' ? 'Adulto' : 'Pediátrico'}
              </button>
            ))}
          </div>
        </div>
        <div style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '6px' }}>{esc.ref}</div>
        <Fila cols="1fr 1fr 1fr 0.8fr">
          {selGcs('p5_gcs_ocular', esc.ocular, 'Ocular (1-4)')}
          {selGcs('p5_gcs_verbal', esc.verbal, 'Verbal (1-5)')}
          {selGcs('p5_gcs_motora', esc.motora, 'Motora (1-6)')}
          <div>
            <label style={lbl}>Total</label>
            <div style={{ padding: '6px 4px', borderRadius: '6px', border: `1.5px solid ${sevColor}`, textAlign: 'center', fontWeight: 700, color: sevColor, fontSize: '13px' }}>
              {total || '—'}/15{sev ? <div style={{ fontSize: '9px' }}>{sev}</div> : null}
            </div>
          </div>
        </Fila>
      </Bloque>
    );
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 500, padding: '20px', overflowY: 'auto' }}>
      <div style={{ background: '#fff', borderRadius: '12px', width: '940px', maxWidth: '100%', boxShadow: '0 8px 32px rgba(0,0,0,.2)' }}>
        <div style={{ position: 'sticky', top: 0, background: '#fff', borderBottom: '0.5px solid #e5e7eb', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '12px 12px 0 0', zIndex: 2 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#0a2540' }}>Ficha Prehospitalaria SEME — Servicio #{solicitudId}</h2>
            <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>MSPyBS · DIGIES · Servicio de Emergencias Médicas Extrahospitalaria</div>
          </div>
          <button onClick={onCerrar} style={{ background: 'transparent', border: 'none', fontSize: '22px', color: '#9ca3af', cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ padding: '16px 20px' }}>
          {cargando ? <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Cargando ficha...</div> : (
            <>
              <Sec t="DATOS GENERALES DEL SERVICIO" />
              <Fila cols="1fr 1fr 1fr 1fr">
                {campo('dg_servicio', 'Servicio N°')}
                {campo('dg_fecha', 'Fecha')}
                {campo('dg_ci', 'C.I. N°')}
                {campo('dg_h_despacho', 'Hora despacho')}
                {campo('dg_h_salida', 'Hora salida móvil')}
                {campo('dg_h_llegada', 'Hora llegada al lugar')}
                {campo('dg_h_llegada_dest', 'Hora llegada (destino)')}
                {campo('dg_radiooperador', 'Radio operador')}
              </Fila>

              <Sec t="I · DATOS DEL MÓVIL Y LA TRIPULACIÓN (Rol de Guardia)" />
              <Fila cols="1fr 1fr 1fr">
                {campo('p1_movil', 'Móvil')}
                {campo('p1_base', 'Base')}
                {campo('p1_guardia_dia', 'Guardia día')}
                {campo('p1_conductor', 'Conductor (BRAVO)')}
                {campo('p1_paramedico1', 'Paramédico 1 (ECO)')}
                {campo('p1_paramedico2', 'Paramédico 2 (ECO)')}
                {campo('p1_medico_regulador', 'Médico regulador')}
              </Fila>

              <Sec t="II · DATOS DEL SERVICIO (Lugar del Incidente)" />
              <div style={{ marginBottom: '6px' }}>{chk('p2_cobertura', 'Cobertura')}{chk('p2_asistencia', 'Asistencia')}{chk('p2_traslado', 'Traslado')}{chk('p2_tbr', 'TBR')}{chk('p2_tar', 'TAR')}</div>
              <Fila cols="2fr 1fr 1fr">
                {campo('p2_direccion', 'Dirección')}
                {campo('p2_barrio', 'Barrio')}
                {campo('p2_ciudad', 'Ciudad')}
                {campo('p2_trasladado_a', 'Trasladado a')}
              </Fila>

              <Sec t="III · DATOS DEL PACIENTE (Lugar de Residencia)" />
              <Fila cols="2fr 1fr 1fr 1fr">
                {campo('p3_nombre', 'Nombre y apellido')}
                {campo('p3_edad', 'Edad')}
                {campo('p3_peso', 'Peso')}
                <div><label style={lbl}>Sexo</label><div style={{ paddingTop: '3px' }}>{chk('p3_sexo_m', 'M')}{chk('p3_sexo_f', 'F')}</div></div>
                {campo('p3_nombre_social', 'Nombre social')}
                {campo('p3_telefono', 'Teléfono 09')}
                {campo('p3_residencia', 'Residencia / Barrio')}
                {campo('p3_ciudad', 'Ciudad')}
                {campo('p3_seguro', 'Seguro médico')}
              </Fila>

              <Sec t="IV · DATOS DEL EVENTO (Valoración de la escena)" />
              <Bloque>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#0a2540', marginBottom: '4px' }}>Asistencia clínica — Problemas de salud</div>
                {chk('p4_cardiovascular', 'Cardiovascular')}{chk('p4_ginecourinario', 'Ginecourinario')}{chk('p4_neurologico', 'Neurológico')}{chk('p4_infeccion', 'Infección por')}{chk('p4_gastrointestinal', 'Gastrointestinal')}{chk('p4_muscular', 'Muscular')}{chk('p4_respiratorio', 'Respiratorio')}{chk('p4_clinico_otros', 'Otros')}
              </Bloque>
              <Bloque>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#0a2540', marginBottom: '4px' }}>Lesiones por causas externas — Mecanismo del trauma</div>
                {chk('p4_transito', 'Accidente de tránsito')}{chk('p4_explosion', 'Explosión')}{chk('p4_arma_blanca', 'Arma blanca')}{chk('p4_arma_fuego', 'Arma de fuego')}{chk('p4_hipotermia', 'Hipotermia')}{chk('p4_desastres', 'Desastres naturales')}{chk('p4_mano', 'Mano/Puño/Pie')}{chk('p4_maquinaria', 'Maquinaria')}{chk('p4_objeto_filoso', 'Objeto filoso/punzante')}{chk('p4_objeto_contundente', 'Objeto contundente')}{chk('p4_quemaduras', 'Quemaduras')}{chk('p4_violencia', 'Violencia social')}{chk('p4_electrocucion', 'Electrocución')}{chk('p4_mecanismo_otros', 'Otros')}
                <Fila cols="1fr 1fr"><div>{campo('p4_mordedura', 'Mordedura de')}</div><div>{campo('p4_picadura', 'Picadura de')}</div></Fila>
              </Bloque>
              <Bloque>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#0a2540', marginBottom: '4px' }}>Lugar donde ocurrió el evento</div>
                {chk('p4_lug_hogar', 'En el hogar')}{chk('p4_lug_laboral', 'Laboral')}{chk('p4_lug_deportivo', 'Deportivo')}{chk('p4_lug_educativo', 'Centro educativo')}{chk('p4_lug_via', 'Vía pública')}{chk('p4_lug_otros', 'Otros')}
              </Bloque>
              <Bloque>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#0a2540', marginBottom: '4px' }}>1041 · Accidente de tránsito (detalles observados)</div>
                {grupo('Vehículo', [['p4_v_auto', 'Automóvil'], ['p4_v_moto', 'Moto'], ['p4_v_bici', 'Bicicleta'], ['p4_v_omnibus', 'Ómnibus'], ['p4_v_motocarro', 'Motocarro'], ['p4_v_camion', 'Camión'], ['p4_v_movil', 'Móvil de emergencia']])}
                {grupo('Situación', [['p4_s_conductor', 'Conductor'], ['p4_s_acompanante', 'Acompañante'], ['p4_s_pasajero', 'Pasajero'], ['p4_s_peaton', 'Peatón']])}
                {grupo('Seguridad', [['p4_seg_ccint', 'C/ cinturón'], ['p4_seg_scint', 'S/ cinturón'], ['p4_seg_ccasco', 'C/ casco'], ['p4_seg_scasco', 'S/ casco'], ['p4_seg_airbag', 'Airbag activado']])}
                {grupo('Impacto', [['p4_i_frontal', 'Frontal'], ['p4_i_lateral', 'Lateral'], ['p4_i_posterior', 'Posterior'], ['p4_i_techo', 'Techo'], ['p4_i_vuelco', 'Vuelco'], ['p4_i_arrollado', 'Arrollado']])}
                {grupo('Condición', [['p4_c_atrapado', 'Atrapado'], ['p4_c_expulsado', 'Expulsado'], ['p4_c_parado', 'Parado'], ['p4_c_sentado', 'Sentado'], ['p4_c_caida', 'Caída']])}
              </Bloque>
              <Fila cols="1fr 1fr">
                <Bloque>{grupo('Intoxicación con', [['p4_int_estup', 'Estupefacientes'], ['p4_int_gases', 'Gases tóxicos'], ['p4_int_medic', 'Medicamentos'], ['p4_int_agro', 'Agrotóxicos'], ['p4_int_alim', 'Alimentos'], ['p4_int_alcohol', 'Bebida alcohólica'], ['p4_int_co2', 'Bióxido CO₂ (humo)']])}</Bloque>
                <Bloque>{grupo('Herida / lesión por', [['p4_h_avalancha', 'Avalancha'], ['p4_h_altura', 'Caída de altura'], ['p4_h_derrumbe', 'Derrumbe'], ['p4_h_arroll', 'Arrollamiento'], ['p4_h_asfixia', 'Asfixia / OVACE'], ['p4_h_atentado', 'Atentado']])}</Bloque>
              </Fila>
              <div><label style={lbl}>Detalles del evento</label>{area('p4_detalles', '', 2)}</div>

              <Sec t="V · EXAMEN Y VALORACIÓN DEL PACIENTE" />
              <Bloque>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#0a2540', marginBottom: '4px' }}>Evaluación primaria</div>
                <div>Conciencia: {chk('p5_conciente', 'Conciente')}{chk('p5_inconciente', 'Inconciente')}{chk('p5_somnoliento', 'Somnoliento')}</div>
                <div>Vía aérea/ventilación: {chk('p5_va_normal', 'Normal')}{chk('p5_va_mala', 'Mala mecánica')}{chk('p5_va_dificultad', 'C/ dificultad')}{chk('p5_va_norespira', 'No respira')}</div>
                <div>Pulso: {chk('p5_p_normal', 'Normal')}{chk('p5_p_debil', 'Débil')}{chk('p5_p_acelerado', 'Acelerado')}{chk('p5_p_nodetecta', 'No se detecta')}</div>
                <div>Abdomen: {chk('p5_ab_normal', 'Normal')}{chk('p5_ab_rigido', 'Rígido')}{chk('p5_ab_distendido', 'Distendido')}</div>
              </Bloque>
              <Bloque>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#0a2540', marginBottom: '4px' }}>Control de signos vitales</div>
                <Fila cols="repeat(6, 1fr)">
                  {campo('p5_pa', 'P/A')}{campo('p5_fc', 'FC')}{campo('p5_fr', 'FR')}{campo('p5_spo2', 'SpO₂')}{campo('p5_temp', 'Temp')}{campo('p5_glucemia', 'Glucemia')}
                </Fila>
                <Fila cols="repeat(6, 1fr)">
                  {campo('p5_2_hora', 'Hora 2º control')}{campo('p5_2_pa', 'P/A')}{campo('p5_2_fc', 'FC')}{campo('p5_2_fr', 'FR')}{campo('p5_2_spo2', 'SpO₂')}{campo('p5_2_temp', 'Temp')}
                </Fila>
              </Bloque>
              {glasgow()}
              <Bloque>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#0a2540', marginBottom: '4px' }}>Pupilas</div>
                {chk('p5_pup_normal', 'Normal')}{chk('p5_pup_anisocoria', 'Anisocoria')}{chk('p5_pup_miosis', 'Miosis')}{chk('p5_pup_midriasis', 'Midriasis')}
                <span style={{ marginLeft: '16px' }}>{chk('p5_sin_signos_vida', 'Pcte SIN signos de vida')}{chk('p5_recuperado', 'Recuperado')}</span>
              </Bloque>
              <div><label style={lbl}>Localización de lesiones observadas</label>{area('p5_lesiones', 'Describí ubicación y tipo de lesiones', 3)}</div>
              <Bloque>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#0a2540', marginBottom: '4px' }}>Evaluación secundaria — Parámetros clínicos</div>
                <Fila cols="1fr 1fr">
                  {campo('p5_sec_neuro', 'Neurológico')}{campo('p5_sec_resp', 'Respiratorio')}
                  {campo('p5_sec_circ', 'Circulatorio')}{campo('p5_sec_abdomen', 'Abdomen')}
                </Fila>
              </Bloque>

              <Sec t="VI · SERVICIOS SUSPENDIDOS (1015)" />
              <Bloque>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#0a2540', marginBottom: '4px' }}>Cancelado por (motivo)</div>
                {chk('p6_accidente_movil', 'Accidente del móvil')}{chk('p6_falsa_alarma', 'Falsa alarma')}{chk('p6_medicos_hosp', 'Médicos del hospital')}{chk('p6_req_avanzada', 'Requiere unidad avanzada')}{chk('p6_obito', 'Óbito del paciente')}{chk('p6_central141', 'Central 141 - SEME')}{chk('p6_inaccesible', 'Lugar inaccesible')}{chk('p6_inestable', 'Paciente inestable')}{chk('p6_terceros', 'Trasladado por terceros')}{chk('p6_niega', 'Paciente se niega a la asistencia')}{chk('p6_desperfecto', 'Desperfecto mecánico')}{chk('p6_inseguro', 'Lugar inseguro / peligro')}{chk('p6_susp_otros', 'Otros')}
              </Bloque>
              <div style={{ fontSize: '10px', color: '#6b7280', lineHeight: 1.5, marginBottom: '6px' }}>
                <b>Negativa a la asistencia y traslado:</b> habiendo sido informado por el personal del SEME, y en pleno conocimiento de las condiciones del estado de salud del paciente y las consecuencias derivadas de la falta de asistencia y/o traslado, me niego a autorizar la asistencia y/o traslado indicados por el personal del SEME.
              </div>
              <div>{chk('p6_niega_firmar', 'Se niega a firmar')}</div>
              <div><label style={lbl}>Observación</label>{area('p6_obs', '', 2)}</div>

              <Sec t="VII · TRASLADOS (Detalles del Servicio)" />
              <Bloque>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#0a2540', marginBottom: '4px' }}>Traslado de bajo riesgo — TBR</div>
                {chk('p7_tbr_alta', 'Alta')}{chk('p7_tbr_estudios', 'Para estudios')}{chk('p7_tbr_intra', 'Intrahospitalarios')}{chk('p7_tbr_dialisis', 'Diálisis')}{chk('p7_tbr_otros', 'Otros')}
                <Fila cols="1fr 1fr 1fr">
                  {campo('p7_tbr_dx', 'Diagnóstico')}{campo('p7_tbr_acompana', 'Acompaña')}{campo('p7_tbr_vinculo', 'Vínculo')}
                </Fila>
                {campo('p7_tbr_relevancia', 'Datos de relevancia')}
              </Bloque>
              <Bloque>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#0a2540', marginBottom: '4px' }}>Traslado de alto riesgo — TAR</div>
                {chk('p7_tar_uti', 'UTI')}{chk('p7_tar_medevac', 'MEDEVAC')}{chk('p7_tar_polit', 'Politraumatismo')}{chk('p7_tar_postpcr', 'Post PCR')}{chk('p7_tar_estudios', 'P/ estudios')}{chk('p7_tar_dialisis', 'Diálisis')}
                <Fila cols="1fr 1fr"><div>{campo('p7_tar_dx', 'Diagnóstico')}</div><div>{campo('p7_tar_medico', 'Médico que acompaña')}</div></Fila>
                <div style={{ marginTop: '4px' }}>Paciente va con: {chk('p7_tar_bomba', 'Bomba')}{chk('p7_tar_pic', 'Catéter PIC')}{chk('p7_tar_intubado', 'Intubado')}{chk('p7_tar_inotropicos', 'Inotrópicos')}{chk('p7_tar_vcentral', 'Vía central')}{chk('p7_tar_vperif', 'Vía periférica')}{chk('p7_tar_vintra', 'Vía intraósea')}</div>
                {campo('p7_tar_sedacion', 'Sedación')}
                <div style={{ marginTop: '4px' }}>Soporte O₂: {chk('p7_o2_mascarilla', 'Mascarilla')}{chk('p7_o2_bigotera', 'Bigotera')}{chk('p7_o2_ambu', 'Ambú')}{chk('p7_o2_ciclador', 'Ciclador')}{chk('p7_o2_canula', 'Cánula')}{chk('p7_o2_respirador', 'Respirador')}{chk('p7_o2_neopuff', 'Neopuff')}</div>
                <div>Sonda: {chk('p7_sonda_vesical', 'Vesical')}{chk('p7_sonda_ng', 'Nasogástrica')} · {chk('p7_colostomia', 'Bolsa colostomía')}{chk('p7_traqueo', 'Traqueotomía')}{chk('p7_tutor', 'Tutor')}</div>
                <Fila cols="1fr 1fr"><div>{campo('p7_yeso', 'Yeso / venda / inmovilizador')}</div><div><label style={lbl}>Suero</label><div style={{ paddingTop: '3px' }}>{chk('p7_suero_fisio', 'Fisiológico')}{chk('p7_suero_gluco', 'Glucosado')}{chk('p7_suero_ringer', 'Ringer')}</div></div></Fila>
                {campo('p7_medicacion', 'Medicación')}
              </Bloque>

              <Sec t="VIII · PROCEDIMIENTOS REALIZADOS" />
              <Bloque>
                <div>Inmovilización: {chk('p8_collar', 'Collar cervical')}{chk('p8_tabla', 'Tabla espinal')}{chk('p8_ferulas', 'Férulas')}{chk('p8_laterales', 'Laterales')}{chk('p8_vendajes', 'Vendajes')}{chk('p8_chaleco', 'Chaleco extricación')}</div>
                <Fila cols="1fr 2fr"><div>{campo('p8_venoclisis', 'Venoclisis catéter N°')}</div><div><label style={lbl}>Suero</label><div style={{ paddingTop: '3px' }}>{chk('p8_suero_fisio', 'Fisiológico')}{chk('p8_suero_gluco', 'Glucosado')}{chk('p8_suero_ringer', 'Ringer')}</div></div></Fila>
                {campo('p8_medicacion', 'Medicación')}
                <div style={{ marginTop: '4px' }}>Control de hemorragia: {chk('p8_h_directa', 'Presión directa')}{chk('p8_h_compresiva', 'Compresiva')}{chk('p8_h_torniquete', 'Torniquete')}{chk('p8_h_oclusivo', 'Oclusivo')}{chk('p8_h_empaq', 'Empaquetamiento')}</div>
                <div>Oxígenoterapia: {txt('p8_o2_litros', 'Litros', '90px')} {chk('p8_o2_mascarilla', 'Mascarilla')}{chk('p8_o2_bigotera', 'Bigotera')}{chk('p8_o2_otros', 'Otros')}</div>
                <div>RCP: {chk('p8_rcp_basico', 'Básico')}{chk('p8_rcp_avanzado', 'Avanzado')} · {chk('p8_cardiodesf', 'Cardiodesfibrilador')}{chk('p8_dea', 'D.E.A')} {txt('p8_rcp_equipo', 'Equipo utilizado')}</div>
              </Bloque>

              <Sec t="IX · DATOS FINALES DEL SERVICIO" />
              <Bloque>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#0a2540', marginBottom: '4px' }}>Antecedentes médicos referidos</div>
                {chk('p9_cancer', 'Cáncer')}{chk('p9_convulsion', 'Convulsión')}{chk('p9_epilepsia', 'Epilepsia')}{chk('p9_diabetes', 'Diabetes')}{chk('p9_epoc', 'EPOC')}{chk('p9_hta', 'HTA')}{chk('p9_irc', 'IRC')}{chk('p9_antec_otros', 'Otros')}
                {campo('p9_alergia', 'Alergia a medicamentos')}
              </Bloque>
              <div><label style={lbl}>Evolución del paciente / comentarios</label>{area('p9_evolucion', '', 3)}</div>
              <Bloque>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#0a2540', marginBottom: '4px' }}>Paciente queda en</div>
                {chk('p9_urgencias', 'Urgencias')}{chk('p9_uti', 'UTI')}{chk('p9_utip', 'UTIP')}{chk('p9_rea', 'R.E.A')}{chk('p9_internados', 'Internados')}{chk('p9_nefrologia', 'Nefrología')}{chk('p9_domicilio', 'Su domicilio')}{chk('p9_en_lugar', 'En el lugar')}{chk('p9_queda_otros', 'Otros')}
                <Fila cols="1fr 1fr 1fr">
                  {campo('p9_entrega', 'Entrega paciente')}{campo('p9_recibe', 'Recibe el paciente')}{campo('p9_hora', 'Hora')}
                </Fila>
              </Bloque>
              <Bloque>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#0a2540', marginBottom: '4px' }}>Intervenciones interinstitucionales</div>
                <Fila cols="1fr 1fr 1fr">
                  {campo('p9_policia', 'Policía Nacional')}{campo('p9_bomberos', 'Bomberos')}{campo('p9_fiscalia', 'Fiscalía')}
                </Fila>
                {campo('p9_observaciones', 'Observaciones')}
                <div style={{ marginTop: '4px' }}>{chk('p9_obito', 'Óbito - 1045')}</div>
              </Bloque>

              <Sec t="FIRMAS" />
              <div style={{ fontSize: '9px', color: '#9ca3af', lineHeight: 1.4, marginBottom: '10px' }}>
                El diagnóstico detallado en el presente reporte es de carácter presuntivo, sobre las posibles lesiones o enfermedad observadas por los paramédicos, a ser descartadas por médicos especialistas del lugar donde queda el paciente.
              </div>
              <Fila cols="1fr 1fr">
                <div>
                  {campo('firma_paciente_aclaracion', 'Paciente/familiar — aclaración')}
                  {campo('firma_paciente_vinculo', 'Vínculo con el paciente')}
                  <div style={{ marginTop: '6px' }}><FirmaTouch label="Firma del paciente y/o familiar" value={firmaPaciente} onChange={setFirmaPaciente} width={360} height={130} /></div>
                </div>
                <div>
                  {campo('firma_testigo_aclaracion', 'Testigo — aclaración')}
                  <div style={{ marginTop: '6px', paddingTop: '18px' }}><FirmaTouch label="Firma del testigo" value={firmaTestigo} onChange={setFirmaTestigo} width={360} height={130} /></div>
                </div>
              </Fila>
              <Fila cols="1fr 1fr">
                <div>
                  {campo('firma_paramedico_aclaracion', 'Paramédico — aclaración y sello')}
                  <div style={{ marginTop: '6px' }}><FirmaTouch label="Firma y sello PARAMÉDICOS *" value={firmaParamedico} onChange={setFirmaParamedico} width={360} height={130} /></div>
                </div>
                <div>
                  {campo('firma_medico_aclaracion', 'Médico — aclaración y sello')}
                  <div style={{ marginTop: '6px' }}><FirmaTouch label="Firma y sello MÉDICO" value={firmaMedico} onChange={setFirmaMedico} width={360} height={130} /></div>
                </div>
              </Fila>
            </>
          )}
        </div>

        <div style={{ position: 'sticky', bottom: 0, background: '#fff', borderTop: '0.5px solid #e5e7eb', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '0 0 12px 12px' }}>
          <div style={{ fontSize: '12px', color: msg.includes('✓') ? '#15803d' : '#c2410c' }}>{msg}</div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => guardar(false)} disabled={guardando || cargando} style={{ padding: '9px 16px', borderRadius: '7px', border: '0.5px solid #e5e7eb', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: '#0a2540' }}>
              {guardando ? 'Guardando...' : 'Guardar borrador'}
            </button>
            <button onClick={() => guardar(true)} disabled={guardando || cargando} style={{ padding: '9px 16px', borderRadius: '7px', border: 'none', background: '#15803d', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
              Cerrar servicio con la ficha
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}