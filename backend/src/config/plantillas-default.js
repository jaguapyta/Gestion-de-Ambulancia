// Plantillas por defecto de los documentos imprimibles (Transporte).
// El HTML usa variables {{...}} que el front reemplaza al imprimir.
// Sirven para el seed inicial y para "Restaurar por defecto".

const ORDEN = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Orden de Trabajo {{nro_orden}}</title>
<style>
  @page { size: A4 portrait; margin: 9mm; }
  body { font-family: Arial, sans-serif; font-size: 10px; margin: 0; color: #000; }
  .header { text-align: center; margin-bottom: 6px; } .header img { height: 54px; }
  .header .l1 { font-weight: bold; font-size: 11px; } .header .l2 { font-size: 10px; }
  .titulo { font-size: 15px; font-weight: bold; }
  .fila { display: flex; gap: 16px; margin-bottom: 4px; align-items: flex-end; }
  .fila div label { font-weight: bold; }
  .fila div span { border-bottom: 1px solid #000; display: inline-block; min-width: 70px; min-height: 13px; }
  .trabajos { border: 1px solid #000; min-height: 42px; padding: 5px; margin-top: 4px; }
  .firmas { display: flex; justify-content: space-between; margin-top: 24px; text-align: center; }
  .firma { width: 30%; } .firma-linea { border-top: 1px solid #000; padding-top: 4px; margin-top: 22px; font-weight: bold; }
  .meta { margin-top: 10px; font-size: 9px; color: #444; }
  .pie { text-align: center; margin-top: 6px; font-size: 9px; border-top: 1px solid #000; padding-top: 5px; }
  .tipo-box { border: 2px solid #000; padding: 1px 8px; font-weight: bold; display: inline-block; }
</style></head><body>
  <div class="header">
    <img src="{{logo}}" />
    <div class="l1">MINISTERIO DE SALUD PÚBLICA Y BIENESTAR SOCIAL</div>
    <div class="l1">SERVICIO DE EMERGENCIAS MÉDICAS EXTRAHOSPITALARIAS (S.E.M.E.)</div>
    <div class="l2"><strong>DEPARTAMENTO DE TRANSPORTE</strong></div>
  </div>
  <div style="display:flex; align-items:center; gap:20px; margin:6px 0;">
    <div class="titulo">ORDEN DE TRABAJO N°</div><div style="font-size:18px; font-weight:bold;">{{nro_orden}}</div>
  </div>
  <div style="display:flex; gap:30px; margin-bottom:8px;">
    <div>ORDINARIO <span class="tipo-box">{{tipo_ord_x}}</span></div>
    <div>EXTRAORDINARIO <span class="tipo-box">{{tipo_ext_x}}</span></div>
  </div>
  <div class="fila">
    <div><label>Vehículo Tipo: </label><span>{{vehiculo_tipo}}</span></div>
    <div><label>Chapa N°: </label><span>{{chapa}}</span></div>
    <div><label>Marca: </label><span>{{marca}}</span></div>
    <div><label>Modelo: </label><span>{{modelo}}</span></div>
  </div>
  <div class="fila">
    <div><label>Código de Móvil: </label><span>{{cod_movil}}</span></div>
    <div><label>R.A.S.P. N°: </label><span>{{rasp}}</span></div>
    <div><label>Área Asignada: </label><span>{{area}}</span></div>
  </div>
  <div class="fila"><div><label>N° de Orden Asignado: </label><span>{{nro_orden_asignado}}</span></div></div>
  <div class="fila">
    <div style="flex:2"><label>Conductor/es Autorizado/s: </label><span style="min-width:200px">{{conductor}}</span></div>
    <div><label>C.I. N°: </label><span>{{ci}}</span></div>
  </div>
  <div class="fila">
    <div><label>Fecha de la misión: Desde </label><span>{{fecha_inicio}}</span></div>
    <div><label>Hasta el: </label><span>{{fecha_fin}}</span></div>
  </div>
  <div class="fila">
    <div><label>Hora de la misión: Desde las </label><span>{{hora_inicio}}</span></div>
    <div><label>Hasta las </label><span>{{hora_fin}}</span></div>
  </div>
  <div class="fila"><div><label>Km. De Salida: </label><span>{{km_salida}}</span></div>
    <div><label>Km. De Llegada: </label><span>{{km_llegada}}</span></div>
    <div><label>Total recorrido: </label><span>{{km_total}}</span></div></div>
  <div class="fila">
    <div><label>Km. Estimado a recorrer: </label><span>{{km_estimado}}</span></div>
    <div><label>Consumo estimado x 100Km.: </label><span>{{consumo}}</span> Lts.</div>
  </div>
  <div style="margin:10px 0;"><strong>TRABAJOS A REALIZAR:</strong><div class="trabajos">{{trabajos}}</div></div>
  <div class="firmas">
    <div class="firma"><div>{{fecha_inicio}}</div><div class="firma-linea">FECHA</div></div>
    <div class="firma"><div>{{conductor}}</div><div class="firma-linea">CONDUCTOR</div></div>
    <div class="firma"><div>{{jefe}}</div><div class="firma-linea">FIRMA AUTORIZADA</div></div>
  </div>
  <div class="meta">Generado el {{generado}} por {{usuario}}</div>
  <div class="pie">
    <p>ORIGINAL: Conductor del Móvil &nbsp;·&nbsp; Copia: Transporte</p>
    <p>Avda. Fdo. De la Mora E/ Dr. Venza &nbsp;·&nbsp; Telefax: 021-562.903 &nbsp;·&nbsp; E-mail: seme@mspsbs.gov.py &nbsp;·&nbsp; Urgencias y Emergencias: 141</p>
    <p><strong>ASUNCIÓN - PARAGUAY</strong></p>
  </div>
</body></html>`;

const ANEXO_III = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Anexo III - {{nro_orden}}</title>
<style>
  @page { size: A4 landscape; margin: 8mm; }
  body { font-family: Arial, sans-serif; font-size: 11px; margin: 0; color: #000; }
  .header { text-align:center; margin-bottom:6px; } .header img { height:50px; } .header .l1 { font-weight:bold; font-size:12px; }
  h2 { text-align: center; font-size: 14px; margin: 3px 0; } h3 { text-align: center; font-size: 12px; margin: 3px 0; }
  .fila { display: flex; gap: 24px; margin-bottom: 6px; align-items: flex-end; }
  .fila label { font-weight: bold; } .fila span { border-bottom: 1px solid #000; display: inline-block; min-width: 90px; min-height: 14px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { border: 1px solid #000; padding: 2px 6px; text-align: center; font-size: 10px; } th { background: #f0f0f0; }
  .firmas { display: flex; justify-content: space-between; margin-top: 16px; } .firma { text-align: center; width: 42%; }
  .firma-linea { border-top: 1px solid #000; padding-top: 4px; margin-top: 22px; }
  .check-box { border: 1px solid #000; display: inline-block; width: 14px; height: 14px; text-align: center; line-height: 14px; }
  .meta { margin-top: 8px; font-size: 9px; color: #444; }
</style></head><body>
  <div class="header"><img src="{{logo}}" />
    <div class="l1">MINISTERIO DE SALUD PÚBLICA Y BIENESTAR SOCIAL — S.E.M.E.</div></div>
  <h2>ANEXO : III</h2><h3>PARTE DIARIO DE USO DEL VEHÍCULO OFICIAL</h3>
  <div class="fila" style="margin-top:8px;">
    <div><label>FECHA: </label><span>{{fecha_inicio}}</span></div>
    <div><label>Orden de Trabajo N°: </label><span>{{nro_orden}}</span></div>
  </div>
  <div class="fila">
    <div><label>TIPO DE VEHÍCULO: </label><span>{{vehiculo_tipo}}</span></div>
    <div><label>CHAPA N°: </label><span>{{chapa}}</span></div>
    <div><label>TIPO DE COMBUSTIBLE</label>
      <div style="display:flex; gap:16px; margin-top:4px;">
        <div><span class="check-box">{{comb_nafta_x}}</span> NAFTA</div>
        <div><span class="check-box">{{comb_gasoil_x}}</span> GAS OIL</div>
      </div>
    </div>
  </div>
  <div class="fila">
    <div><label>Código de Móvil: </label><span>{{cod_movil}}</span></div>
    <div><label>R.A.S.P. N°: </label><span>{{rasp}}</span></div>
    <div><label>MARCA: </label><span>{{marca}}</span></div>
    <div><label>MODELO: </label><span>{{modelo}}</span></div>
  </div>
  <div class="fila">
    <div><label>N° DE ORDEN ASIGNADO: </label><span>{{nro_orden_asignado}}</span></div>
    <div><label>CONSUMO X 100 KM.: </label><span>{{consumo}}</span> Lts.</div>
  </div>
  <table>
    <thead><tr><th>Fecha Inicio</th><th>Fecha Término</th><th>Actividad</th><th>Km. Salida</th><th>Km. Regreso</th><th>Km. Total</th><th>Litros</th><th>Cupos en Gs.</th></tr></thead>
    <tbody>{{filas_anexo}}</tbody>
  </table>
  <div class="firmas">
    <div class="firma"><div class="firma-linea">Conductor: <strong>{{conductor}}</strong><br>C.I. N°: {{ci}}</div></div>
    <div class="firma"><div class="firma-linea">{{jefe}}<br>Jefe de Transporte</div></div>
  </div>
  <div class="meta">Generado el {{generado}} por {{usuario}}</div>
</body></html>`;

const RECIBO = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Recibo {{nro_recibo}}</title>
<style>
  @page { size: A4 portrait; margin: 10mm; }
  body { font-family: Arial, sans-serif; font-size: 12px; margin: 0; color: #000; }
  .recibo { border: 1px solid #000; padding: 14px; margin-bottom: 14px; }
  .header { text-align:center; } .header img { height: 48px; } .header .l1 { font-weight: bold; font-size: 11px; }
  .top { display:flex; justify-content:space-between; margin-top:8px; font-weight:bold; }
  p { margin: 8px 0; line-height: 1.5; }
  .firmas { margin-top: 24px; display:flex; justify-content:space-between; text-align:center; }
  .firmas .c { width: 45%; } .linea { border-top: 1px solid #000; padding-top: 4px; margin-top: 26px; }
  .copia { text-align:center; font-size: 10px; margin-top: 4px; }
  .meta { margin-top: 8px; font-size: 9px; color: #444; }
</style></head><body>
  <div class="recibo">
    <div class="header"><img src="{{logo}}" />
      <div class="l1">MINISTERIO DE SALUD PÚBLICA Y BIENESTAR SOCIAL</div>
      <div class="l1">SERVICIO DE EMERGENCIAS MÉDICAS EXTRAHOSPITALARIAS — DPTO. DE TRANSPORTE</div>
    </div>
    <div class="top"><span>RECIBO DE CONTROL INTERNO N°: {{nro_recibo}}</span><span>FECHA: {{fecha}}</span></div>
    <p>Recibí de la Unidad Administrativa la cantidad de <b>{{litros}} LITROS</b> (Gs. {{monto_gs}}) de combustible ({{combustible}} TIPO 1), Número de tickets: <b>{{nro_tickets}}</b>, para tareas en todo el territorio nacional según <b>Orden de Trabajo Nro.: {{nro_orden}}</b> en el móvil Nro.: <b>{{cod_movil}}</b>.</p>
    <div>Número de tarjeta asignada: <b>{{nro_tarjeta}}</b> &nbsp;·&nbsp; Código de autorización: <b>{{codigo_autorizacion}}</b></div>
    <div class="firmas">
      <div class="c"><div class="linea">RECIBÍ CONFORME — Firma / Aclaración: {{conductor}}<br>C.I. N°: {{ci}}</div></div>
      <div class="c"><div class="linea">{{jefe}}<br>Jefe de Transporte</div></div>
    </div>
    <div class="meta">Generado el {{generado}} por {{usuario}}</div>
  </div>
  <div class="recibo">
    <div class="header"><img src="{{logo}}" />
      <div class="l1">MINISTERIO DE SALUD PÚBLICA Y BIENESTAR SOCIAL</div>
      <div class="l1">SERVICIO DE EMERGENCIAS MÉDICAS EXTRAHOSPITALARIAS — DPTO. DE TRANSPORTE</div>
    </div>
    <div class="top"><span>RECIBO DE CONTROL INTERNO N°: {{nro_recibo}}</span><span>FECHA: {{fecha}}</span></div>
    <p>Recibí de la Unidad Administrativa la cantidad de <b>{{litros}} LITROS</b> (Gs. {{monto_gs}}) de combustible ({{combustible}} TIPO 1), Número de tickets: <b>{{nro_tickets}}</b>, para tareas en todo el territorio nacional según <b>Orden de Trabajo Nro.: {{nro_orden}}</b> en el móvil Nro.: <b>{{cod_movil}}</b>.</p>
    <div>Número de tarjeta asignada: <b>{{nro_tarjeta}}</b> &nbsp;·&nbsp; Código de autorización: <b>{{codigo_autorizacion}}</b></div>
    <div class="firmas">
      <div class="c"><div class="linea">RECIBÍ CONFORME — Firma / Aclaración: {{conductor}}<br>C.I. N°: {{ci}}</div></div>
      <div class="c"><div class="linea">{{jefe}}<br>Jefe de Transporte</div></div>
    </div>
    <div class="copia">COPIA DEL ORIGINAL</div>
  </div>
</body></html>`;

const DEFAULTS = {
  ORDEN:     { nombre: 'Orden de Trabajo', orientacion: 'portrait',  contenido_html: ORDEN },
  ANEXO_III: { nombre: 'Anexo III — Parte diario', orientacion: 'landscape', contenido_html: ANEXO_III },
  RECIBO:    { nombre: 'Recibo de combustible', orientacion: 'portrait', contenido_html: RECIBO },
};

module.exports = { DEFAULTS };
