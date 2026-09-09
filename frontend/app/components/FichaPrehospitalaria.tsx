'use client';

import { useEffect, useState } from 'react';
import FirmaTouch from './FirmaTouch';

interface Props {
  solicitudId: number;
  onCerrar: () => void;
  onGuardado?: () => void;
}

type Datos = Record<string, any>;

export default function FichaPrehospitalaria({ solicitudId, onCerrar, onGuardado }: Props) {
  const [f, setF] = useState<Datos>({});
  const [firmaEntrega, setFirmaEntrega] = useState<string | null>(null);
  const [firmaPrestador, setFirmaPrestador] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState('');

  const token = () => localStorage.getItem('token') ?? '';
  const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });
  const set = (k: string, v: any) => setF(prev => ({ ...prev, [k]: v }));

  useEffect(() => {
    fetch(`http://localhost:3001/api/fichas/${solicitudId}`, { headers: headers() })
      .then(r => r.json())
      .then(d => {
        const base: Datos = { ...(d.precarga || {}) };
        if (base.fecha) { try { base.fecha = new Date(base.fecha).toLocaleString('es-PY'); } catch (e) {} }
        if (d.ficha) {
          Object.assign(base, d.ficha.datos || {});
          setFirmaEntrega(d.ficha.firma_entrega || null);
          setFirmaPrestador(d.ficha.firma_prestador || null);
        }
        setF(base);
      })
      .catch(() => setMsg('No se pudo cargar la ficha'))
      .finally(() => setCargando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solicitudId]);

  const guardar = async (cerrar: boolean) => {
    if (cerrar && !firmaPrestador) { setMsg('Falta la firma del prestador para cerrar el servicio.'); return; }
    setGuardando(true); setMsg('');
    try {
      const res = await fetch(`http://localhost:3001/api/fichas/${solicitudId}`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ datos: f, firma_entrega: firmaEntrega, firma_prestador: firmaPrestador, cerrar }),
      });
      const d = await res.json();
      if (!res.ok) { setMsg(d.error || 'No se pudo guardar'); return; }
      if (cerrar) { onGuardado?.(); onCerrar(); }
      else setMsg('Borrador guardado ✓');
    } catch { setMsg('Error de conexión'); }
    finally { setGuardando(false); }
  };

  // ---- helpers de render (funciones que devuelven JSX: no pierden foco) ----
  const inp = { padding: '7px 9px', borderRadius: '6px', border: '0.5px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' as const };
  const chkS = { display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#374151', marginRight: '14px', marginBottom: '4px', cursor: 'pointer' };
  const lbl = { fontSize: '11px', fontWeight: 600, color: '#0a2540', display: 'block' as const, marginBottom: '4px' };

  const chk = (k: string, label: string) => (
    <label key={k} style={chkS}>
      <input type="checkbox" checked={!!f[k]} onChange={e => set(k, e.target.checked)} /> <span>{label}</span>
    </label>
  );
  const txt = (k: string, ph = '', width?: string) => (
    <input value={f[k] ?? ''} onChange={e => set(k, e.target.value)} placeholder={ph} style={{ ...inp, width: width ?? '100%' }} />
  );
  const area = (k: string, ph = '', rows = 2) => (
    <textarea value={f[k] ?? ''} onChange={e => set(k, e.target.value)} placeholder={ph} rows={rows} style={{ ...inp, width: '100%', resize: 'vertical' }} />
  );
  const campo = (k: string, label: string, ph = '') => (
    <div><label style={lbl}>{label}</label>{txt(k, ph)}</div>
  );

  const Sec = ({ t }: { t: string }) => (
    <div style={{ background: '#0a2540', color: '#fff', fontSize: '12px', fontWeight: 600, letterSpacing: '0.08em', padding: '6px 12px', borderRadius: '6px', margin: '18px 0 10px' }}>{t}</div>
  );
  const Fila = ({ children, cols = '1fr 1fr' }: { children: any; cols?: string }) => (
    <div style={{ display: 'grid', gridTemplateColumns: cols, gap: '10px', marginBottom: '10px' }}>{children}</div>
  );
  const Bloque = ({ children }: { children: any }) => (
    <div style={{ border: '0.5px solid #e5e7eb', borderRadius: '8px', padding: '10px 12px', marginBottom: '10px' }}>{children}</div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 500, padding: '20px', overflowY: 'auto' }}>
      <div style={{ background: '#fff', borderRadius: '12px', width: '900px', maxWidth: '100%', boxShadow: '0 8px 32px rgba(0,0,0,.2)' }}>
        {/* Header */}
        <div style={{ position: 'sticky', top: 0, background: '#fff', borderBottom: '0.5px solid #e5e7eb', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '12px 12px 0 0', zIndex: 2 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#0a2540' }}>Ficha Prehospitalaria — Servicio #{solicitudId}</h2>
            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>Basada en el WHO Prehospital Form</div>
          </div>
          <button onClick={onCerrar} style={{ background: 'transparent', border: 'none', fontSize: '22px', color: '#9ca3af', cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ padding: '18px 20px' }}>
          {cargando ? <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>Cargando ficha...</div> : (
            <>
              {/* DATOS ADMINISTRATIVOS */}
              <Sec t="DATOS ADMINISTRATIVOS" />
              <Fila cols="1fr 1fr 1fr">
                {campo('llamante_nombre', 'Nombre del llamante')}
                {campo('llamante_telefono', 'Teléfono del llamante')}
                {campo('fecha', 'Fecha')}
              </Fila>
              <Fila cols="2fr 1fr 1fr">
                {campo('paciente_nombre', 'Nombre del paciente')}
                {campo('paciente_documento', 'CI')}
                {campo('paciente_edad', 'Edad')}
              </Fila>
              <Fila cols="1fr 2fr 1fr">
                <div><label style={lbl}>Sexo</label><div style={{ paddingTop: '4px' }}>{chk('sexo_m', 'Masculino')}{chk('sexo_f', 'Femenino')}</div></div>
                {campo('paciente_direccion', 'Dirección del paciente')}
                {campo('ocupacion', 'Ocupación')}
              </Fila>
              <Bloque>
                <div style={{ marginBottom: '6px' }}>{chk('escena_llamado', 'Llamado en escena')}{chk('escena_interhospitalario', 'Traslado interhospitalario')}</div>
                <Fila cols="1fr 2fr">
                  {campo('run_number', 'N° de servicio')}
                  {campo('lugar_escena', 'Lugar y tipo de escena')}
                </Fila>
                <div>{chk('esc_domicilio', 'Domicilio')}{chk('esc_escuela', 'Escuela')}{chk('esc_edif_publico', 'Edificio público')}{chk('esc_salud', 'Establecimiento de salud')}{chk('esc_via_publica', 'Vía pública')}{chk('esc_otro', 'Otro')}</div>
              </Bloque>
              <Bloque>
                <label style={lbl}>Tiempos</label>
                <Fila cols="1fr 1fr 1fr">
                  {campo('t_llamada', 'Llamada recibida')}
                  {campo('t_en_camino', 'En camino a la escena')}
                  {campo('t_llegada', 'Llegada a la escena')}
                  {campo('t_trasladando', 'Trasladando')}
                  {campo('t_en_facility', 'En el establecimiento')}
                  {campo('t_disponible', 'Disponible (en servicio)')}
                </Fila>
              </Bloque>

              {/* MOTIVO + SIGNOS VITALES */}
              <Sec t="MOTIVO Y SIGNOS VITALES INICIALES" />
              <Fila cols="2fr 1fr">
                <div><label style={lbl}>Motivo de consulta {chk('motivo_lesion', 'Lesión/Trauma')}</label>{area('motivo_consulta', 'Motivo de consulta', 2)}</div>
                <div>
                  <label style={lbl}>Signos vitales iniciales</label>
                  <Fila cols="1fr 1fr">
                    {campo('vs_hr', 'FC')}{campo('vs_rr', 'FR')}{campo('vs_bp', 'PA')}{campo('vs_temp', 'Temp')}
                    {campo('vs_spo2', 'SatO₂ %')}{campo('vs_rbs', 'Glucemia')}
                  </Fila>
                </div>
              </Fila>
              <Fila cols="2fr 1fr">
                <div><label style={lbl}>Atención en curso al arribo</label>{area('atencion_arribo', '', 2)}</div>
                <div>
                  <label style={lbl}>Embarazada</label>
                  <div style={{ paddingTop: '4px' }}>{chk('emb_si', 'Sí')}{chk('emb_no', 'No')}{chk('emb_desc', 'Desconocido')}</div>
                  <label style={{ ...lbl, marginTop: '8px' }}>Dolor (0–10)</label>{txt('dolor', '0-10', '80px')}
                </div>
              </Fila>

              {/* ALTO RIESGO */}
              <Sec t="SIGNOS DE ALTO RIESGO" />
              <Bloque>
                <div style={{ fontWeight: 600, fontSize: '11px', color: '#c2410c' }}>A/B</div>
                {chk('ar_ab_estridor', 'Estridor, cianosis, dificultad respiratoria')}
                <div style={{ fontWeight: 600, fontSize: '11px', color: '#c2410c', marginTop: '6px' }}>C</div>
                {chk('ar_c_perfusion', 'Mala perfusión, pulso débil y rápido, relleno capilar >3s, sangrado abundante')}
                {chk('ar_c_nino', 'Niño letárgico, ojos hundidos, pliegue lento, bebe mal')}
                {chk('ar_c_fc', 'Adulto: FC <50 o >150')}
                <div style={{ fontWeight: 600, fontSize: '11px', color: '#c2410c', marginTop: '6px' }}>D</div>
                {chk('ar_d_sinresp', 'Sin respuesta')}{chk('ar_d_convul', 'Convulsiones agudas')}{chk('ar_d_hipoglu', 'Hipoglucemia')}{chk('ar_d_deficit', 'Déficit neurológico focal agudo')}{chk('ar_d_mental', 'Alteración del estado mental con fiebre/hipotermia/rigidez de nuca/cefalea')}
                <div style={{ fontWeight: 600, fontSize: '11px', color: '#c2410c', marginTop: '6px' }}>Otros</div>
                {chk('ar_o_trauma', 'Trauma de alto riesgo')}{chk('ar_o_miembro', 'Miembro amenazado')}{chk('ar_o_serpiente', 'Mordedura de serpiente')}{chk('ar_o_intox', 'Intoxicación/ingesta/exposición química')}{chk('ar_o_violento', 'Violento o agresivo')}{chk('ar_o_temp', 'Temp >39° o <36°')}{chk('ar_o_testicular', 'Dolor testicular agudo o priapismo')}{chk('ar_o_embarazo', 'Embarazada con hallazgos de alto riesgo')}{chk('ar_o_torax', 'Adulto con dolor torácico/abdominal severo o ECG con isquemia')}{chk('ar_o_lact8', 'Lactante <8 días')}{chk('ar_o_lact2m', 'Lactante <2 meses con temp >39° o <36°')}
              </Bloque>
              <Fila cols="1fr 2fr">
                <div>
                  <label style={lbl}>Categoría de triage</label>
                  <div style={{ paddingTop: '4px' }}>{chk('triage_rojo', '🔴 Rojo')}{chk('triage_amarillo', '🟡 Amarillo')}{chk('triage_verde', '🟢 Verde')}</div>
                </div>
                {campo('triage_motivo', 'Triage por')}
              </Fila>

              {/* EVALUACIÓN PRIMARIA ABCDE */}
              <Sec t="EVALUACIÓN PRIMARIA (ABCDE)" />
              <Bloque>
                <div style={{ fontWeight: 600, fontSize: '12px' }}>A · Vía aérea {chk('a_nml', 'Normal')}</div>
                {chk('a_voz', 'Cambios en la voz')}{chk('a_estridor', 'Estridor')}{chk('a_quemaduras', 'Quemaduras orales/de vía aérea')}{chk('a_angioedema', 'Angioedema')}
                <div style={{ fontSize: '11px', color: '#6b7280', margin: '4px 0' }}>Obstruida por:</div>
                {chk('a_lengua', 'Lengua')}{chk('a_sangre', 'Sangre')}{chk('a_secreciones', 'Secreciones')}{chk('a_vomito', 'Vómito')}{chk('a_cuerpo', 'Cuerpo extraño')}
                <div style={{ fontSize: '11px', color: '#6b7280', margin: '4px 0' }}>Manejo:</div>
                {chk('a_reposicion', 'Reposicionamiento')}{chk('a_aspiracion', 'Aspiración')}{chk('a_opa', 'Cánula orofaríngea')}{chk('a_npa', 'Cánula nasofaríngea')}{chk('a_lma', 'Máscara laríngea')}{chk('a_bvm', 'Ambú (BVM)')}{chk('a_tet', 'Tubo endotraqueal')}
                <div style={{ marginTop: '4px' }}>Columna cervical: {chk('a_cx_noneed', 'No necesaria')}{chk('a_cx_done', 'Estabilizada')}</div>
              </Bloque>
              <Bloque>
                <div style={{ fontWeight: 600, fontSize: '12px' }}>B · Ventilación {chk('b_nml', 'Normal')}</div>
                <div>Respiración espontánea: {chk('b_esp_si', 'Sí')}{chk('b_esp_no', 'No')}</div>
                <div>Expansión torácica: {chk('b_superficial', 'Superficial')}{chk('b_tiraje', 'Tiraje')}{chk('b_paradojal', 'Paradojal')}</div>
                <div>Tráquea: {chk('b_central', 'Central')}{chk('b_desv_izq', 'Desviada izq')}{chk('b_desv_der', 'Desviada der')} · Ruidos {chk('b_ruidos_nml', 'Normales')}</div>
                <div style={{ marginTop: '4px' }}>O₂: {txt('b_o2_litros', 'L/min', '70px')} {chk('b_cn', 'Cánula nasal')}{chk('b_mascara', 'Máscara facial')}{chk('b_reservorio', 'Máscara con reservorio')}{chk('b_bvm', 'Ambú')}{chk('b_bipap', 'BiPAP/CPAP')}{chk('b_otro', 'Otro')}</div>
              </Bloque>
              <Bloque>
                <div style={{ fontWeight: 600, fontSize: '12px' }}>C · Circulación {chk('c_nml', 'Normal')}</div>
                <div>Piel: {chk('c_caliente', 'Caliente')}{chk('c_seca', 'Seca')}{chk('c_palida', 'Pálida')}{chk('c_cianotica', 'Cianótica')}{chk('c_humeda', 'Húmeda')}{chk('c_fria', 'Fría')}</div>
                <div>Relleno capilar: {chk('c_rc_menor', '<3s')}{chk('c_rc_mayor', '≥3s')} · Pulsos: {chk('c_pulso_debil', 'Débiles')}{chk('c_pulso_asim', 'Asimétricos')} · Yugular: {chk('c_yug_si', 'Sí')}{chk('c_yug_no', 'No')}</div>
                <Fila cols="1fr 1fr">
                  {campo('c_sangrado_sitio', 'Sitio de sangrado activo')}
                  <div>{chk('c_sangrado_ctrl', 'Sangrado controlado')} {campo('c_sangrado_hora', 'Hora')}</div>
                </Fila>
                <div>Acceso: {chk('c_iv', 'Vía IV')} {txt('c_iv_calibre', 'calibre', '80px')} {chk('c_io', 'Vía intraósea')} {txt('c_io_calibre', 'calibre', '80px')}</div>
                <div style={{ marginTop: '4px' }}>{chk('c_ivf', 'Fluidos IV')} {txt('c_ivf_ml', 'ml', '70px')} {chk('c_sf', 'SF')}{chk('c_rl', 'Ringer lactato')}{chk('c_otro', 'Otro')} · {chk('c_pelvis', 'Pelvis estabilizada')}{chk('c_femur', 'Fémur estabilizado')}</div>
              </Bloque>
              <Bloque>
                <div style={{ fontWeight: 600, fontSize: '12px' }}>D · Estado neurológico {chk('d_nml', 'Normal')}</div>
                <div>Nivel de respuesta: {chk('d_a', 'A')}{chk('d_v', 'V')}{chk('d_p', 'D')}{chk('d_u', 'S')} · Glasgow: O {txt('d_gcs_o', '', '50px')} V {txt('d_gcs_v', '', '50px')} M {txt('d_gcs_m', '', '50px')}</div>
                <div>Moviliza: {chk('d_mov_bi', 'Brazo izq')}{chk('d_mov_bd', 'Brazo der')}{chk('d_mov_pi', 'Pierna izq')}{chk('d_mov_pd', 'Pierna der')}</div>
                <div>Pupilas — Tamaño Izq {txt('d_pup_ti', '', '50px')} Der {txt('d_pup_td', '', '50px')} · Reactividad Izq {txt('d_pup_ri', '', '50px')} Der {txt('d_pup_rd', '', '50px')}</div>
                <div style={{ marginTop: '4px' }}>{chk('d_glu_check', 'Glucemia controlada')}{chk('d_glu_dado', 'Glucosa administrada')}{chk('d_naloxona', 'Naloxona administrada')}</div>
              </Bloque>
              <Bloque>
                <div style={{ fontWeight: 600, fontSize: '12px' }}>E · Exposición {chk('e_nml', 'Normal')}</div>
                {chk('e_expuesto', 'Expuesto completamente')}
                {area('e_hallazgos', 'Hallazgos adicionales del examen', 2)}
              </Bloque>

              {/* SAMPLE */}
              <Sec t="SAMPLE" />
              {[
                ['sample_signos', 'Signos/síntomas'], ['sample_alergias', 'Alergias'], ['sample_medicacion', 'Medicación'],
                ['sample_antecedentes', 'Antecedentes médicos'], ['sample_cirugias', 'Cirugías previas'], ['sample_ingesta', 'Última ingesta (hs)'], ['sample_eventos', 'Eventos (y revisión por sistemas)'],
              ].map(([k, l]) => (
                <Fila key={k} cols="1fr 3fr">
                  <div style={{ display: 'flex', alignItems: 'center' }}><label style={{ ...lbl, margin: 0 }}>{l}</label></div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>{txt(k, '')}{chk(k + '_desc', 'Desconocido')}</div>
                </Fila>
              ))}

              {/* SI HAY LESIÓN */}
              <Sec t="SI HAY LESIÓN / TRAUMA" />
              <Bloque>
                {chk('inj_intencional', 'Intencional')}{chk('inj_no_intencional', 'No intencional')}{chk('inj_autoinfligida', 'Autoinfligida')}
                <div style={{ marginTop: '4px' }}>{chk('inj_caida', 'Caída')}{chk('inj_objeto', 'Golpe por objeto que cae')}{chk('inj_arma_blanca', 'Arma blanca/corte')}{chk('inj_arma_fuego', 'Arma de fuego')}{chk('inj_sexual', 'Agresión sexual')}{chk('inj_contuso', 'Otro trauma contuso')}{chk('inj_asfixia', 'Asfixia/atragantamiento/ahorcamiento')}{chk('inj_ahogamiento', 'Ahogamiento')}{chk('inj_quemadura', 'Quemadura')}{chk('inj_intox', 'Intoxicación/exposición tóxica')}{chk('inj_desconocido', 'Desconocido')}{chk('inj_otro', 'Otro')}</div>
                <div style={{ fontWeight: 600, fontSize: '11px', marginTop: '8px' }}>Siniestro de tránsito</div>
                <div>{chk('tr_conductor', 'Conductor')}{chk('tr_pasajero', 'Pasajero')}{chk('tr_peaton', 'Peatón')}{chk('tr_eyectado', 'Eyectado')}{chk('tr_extricado', 'Extricado')}</div>
                <div>Vehículo: {chk('tr_auto', 'Auto')}{chk('tr_bici', 'Bicicleta')}{chk('tr_moto', 'Motocicleta')}{chk('tr_otro_veh', 'Otro')} · Sujeción: {chk('tr_airbag', 'Airbag')}{chk('tr_cinturon', 'Cinturón')}{chk('tr_otra_suj', 'Otra')}{chk('tr_casco', 'Casco')}</div>
              </Bloque>

              {/* EXAMEN FÍSICO */}
              <Sec t="EXAMEN FÍSICO" />
              <Fila cols="1fr 1fr">
                {[
                  ['ef_general', 'General'], ['ef_pelvis', 'Pelvis/Genitourinario'],
                  ['ef_heent', 'Cabeza y cuello'], ['ef_neuro', 'Neurológico'],
                  ['ef_resp', 'Respiratorio'], ['ef_psiq', 'Psiquiátrico'],
                  ['ef_cardiaco', 'Cardíaco'], ['ef_msk', 'Musculoesquelético'],
                  ['ef_abdomen', 'Abdomen'], ['ef_piel', 'Piel'],
                ].map(([k, l]) => (
                  <div key={k}>
                    <label style={lbl}>{l} {chk(k + '_nml', 'Normal')}</label>
                    {txt(k, '')}
                  </div>
                ))}
              </Fila>

              {/* INTERVENCIONES */}
              <Sec t="INTERVENCIONES ADICIONALES" />
              <Fila cols="1fr 1fr">
                <Bloque>
                  <label style={lbl}>Medicación administrada</label>
                  {chk('med_broncodilatador', 'Broncodilatadores')}{chk('med_adrenalina', 'Adrenalina')}{chk('med_aspirina', 'Aspirina')}{chk('med_anticonvul', 'Anticonvulsivantes')}{chk('med_analgesia', 'Analgesia')}{chk('med_fluidos', 'Infusión de fluidos IV')}{chk('med_otro', 'Otro')}
                  {area('med_detalle', 'Detalle', 2)}
                </Bloque>
                <Bloque>
                  <label style={lbl}>Procedimientos</label>
                  {chk('proc_vendaje', 'Vendaje de heridas')}{chk('proc_quemadura', 'Curación de quemaduras')}{chk('proc_inmov', 'Inmovilización/reducción')}{chk('proc_pelvis', 'Estabilización pélvica')}{chk('proc_ecg', 'ECG')}{chk('proc_otro', 'Otro')}
                  {area('proc_detalle', 'Detalle', 2)}
                </Bloque>
              </Fila>
              <div><label style={lbl}>Evaluación (resumen y diferencial) y plan</label>{area('assessment', '', 3)}</div>

              {/* REEVALUACIONES */}
              <Sec t="REEVALUACIONES" />
              {[1, 2, 3].map(n => (
                <Bloque key={n}>
                  <Fila cols="repeat(8, 1fr)">
                    {campo(`re${n}_hora`, 'Hora')}
                    {campo(`re${n}_hr`, 'FC')}
                    {campo(`re${n}_rr`, 'FR')}
                    {campo(`re${n}_temp`, 'Temp')}
                    {campo(`re${n}_spo2`, 'SatO₂')}
                    {campo(`re${n}_rbs`, 'Glucemia')}
                    {campo(`re${n}_dolor`, 'Dolor')}
                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>{chk(`re${n}_sincambios`, 'Sin cambios')}</div>
                  </Fila>
                </Bloque>
              ))}
              <div><label style={lbl}>Diagnósticos presuntivos</label>{area('dx_presuntivos', '', 2)}</div>

              {/* DISPOSICIÓN + FIRMAS */}
              <Sec t="DESTINO / DISPOSICIÓN" />
              <Fila cols="2fr 1fr">
                {campo('disp_destino', 'Destino')}
                {campo('disp_hora_entrega', 'Hora de entrega')}
              </Fila>
              <Bloque>
                <label style={lbl}>Signos vitales a la entrega</label>
                <Fila cols="repeat(6, 1fr)">
                  {campo('disp_hr', 'FC')}{campo('disp_rr', 'FR')}{campo('disp_temp', 'Temp')}{campo('disp_bp', 'PA')}{campo('disp_spo2', 'SatO₂')}{campo('disp_o2', '% con O₂')}
                </Fila>
                <div>¿Plan conversado con el paciente? {chk('disp_plan_si', 'Sí')}{chk('disp_plan_no', 'No')}</div>
              </Bloque>
              <Fila cols="1fr 1fr">
                <div>
                  {campo('handover_nombre', 'Entregado a (nombre y cargo)')}
                  <div style={{ marginTop: '8px' }}><FirmaTouch label="Firma de quien recibe" value={firmaEntrega} onChange={setFirmaEntrega} width={360} height={140} /></div>
                </div>
                <div>
                  {campo('prestador_nombre', 'Nombre del prestador')}
                  <div style={{ marginTop: '8px' }}><FirmaTouch label="Firma del prestador *" value={firmaPrestador} onChange={setFirmaPrestador} width={360} height={140} /></div>
                </div>
              </Fila>
            </>
          )}
        </div>

        {/* Footer */}
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