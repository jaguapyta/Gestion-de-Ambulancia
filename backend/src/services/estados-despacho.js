// Máquina de estados del despacho — fuente única, usada por el tablero (coordinador)
// y por la vista de la tripulación (servicios).
const prisma = require('../config/db');
const socket = require('../socket');

// estado_despacho -> estado_solicitud (ids reales del catálogo)
const MAP_SOL = { 1: 3, 6: 13, 7: 4, 2: 5, 3: 6, 8: 14, 4: 7, 5: 9 };
const NOMBRE_DESP = { 1: 'DESPACHADO', 6: 'RECIBIDO', 7: 'EN CAMINO', 2: 'EN ESCENA', 3: 'TRASLADANDO', 8: 'EN DESTINO', 4: 'FINALIZADO', 5: 'CANCELADO' };
// (label corregido)
// Transiciones permitidas: desde -> [estados a los que puede pasar]
const TRANSICIONES = { 1: [6, 5], 6: [7, 5], 7: [2, 5], 2: [3, 4, 5], 3: [8], 8: [4] };
const HORA_ESTADO = { 6: 'hora_recibido', 7: 'hora_en_camino', 2: 'hora_en_escena', 8: 'hora_en_destino' };
const FINALES = [4, 5];
const PRE_ESCENA = [1, 6, 7];
const TERMINALES = [7, 8, 9, 10, 11, 12];

const num = (v) => (v === undefined || v === null || v === '' ? null : parseInt(v));

// Aplica una transición de estado. Devuelve { ok, error, status, despacho, solicitud_id }.
async function avanzarEstado({ despachoId, nuevo, usuarioId, condicion_cierre_id, km_inicio, km_fin, motivo }) {
  const d = await prisma.despacho.findUnique({ where: { id: despachoId } });
  if (!d) return { ok: false, status: 404, error: 'Despacho no encontrado' };
  if (!MAP_SOL[nuevo]) return { ok: false, status: 400, error: 'Estado inválido' };
  const permitidos = TRANSICIONES[d.estado_despacho_id] || [];
  if (!permitidos.includes(nuevo)) {
    return { ok: false, status: 409, error: `No se puede pasar de ${NOMBRE_DESP[d.estado_despacho_id]} a ${NOMBRE_DESP[nuevo]}` };
  }
  if (nuevo === 7 && num(km_inicio) === null) return { ok: false, status: 400, error: 'Ingresá el km de inicio del móvil' };
  // La condición de cierre se exige solo al cerrar EN ESCENA (asistido en el lugar) o al cancelar;
  // NO al finalizar tras un traslado (EN DESTINO -> FINALIZADO), donde no aplica.
  const requiereCondicion = nuevo === 5 || (nuevo === 4 && d.estado_despacho_id === 2);
  if (requiereCondicion && !condicion_cierre_id) return { ok: false, status: 400, error: 'Indicá la condición de cierre' };

  const cerrado = FINALES.includes(nuevo);
  const upd = await prisma.$transaction(async (tx) => {
    const dataD = { estado_despacho_id: nuevo };
    if (HORA_ESTADO[nuevo]) dataD[HORA_ESTADO[nuevo]] = new Date();
    if (nuevo === 7) dataD.km_inicio = num(km_inicio);
    if (cerrado) {
      dataD.hora_fin = new Date();
      dataD.condicion_cierre_id = num(condicion_cierre_id);
      if (num(km_fin) !== null) dataD.km_fin = num(km_fin);
      if (nuevo === 5) { dataD.cancelacion_tipo = 'SERVICIO'; dataD.motivo_cambio = motivo || null; }
    }
    const r = await tx.despacho.update({ where: { id: despachoId }, data: dataD });
    const sol = await tx.solicitud.findUnique({ where: { id: d.solicitud_id } });
    await tx.solicitud.update({ where: { id: d.solicitud_id }, data: { estado_solicitud_id: MAP_SOL[nuevo] } });
    await tx.historial_solicitud.create({ data: { solicitud_id: d.solicitud_id, estado_anterior_id: sol.estado_solicitud_id, estado_nuevo_id: MAP_SOL[nuevo], usuario_id: usuarioId, observacion: NOMBRE_DESP[nuevo] } });
    if (cerrado) await tx.rol_guardia_movil.update({ where: { id: d.rol_guardia_movil_id }, data: { estado: 'DISPONIBLE' } });
    return r;
  });
  socket.cambioEstadoSolicitud({ id: d.solicitud_id, estado_solicitud_id: MAP_SOL[nuevo] });
  if (cerrado) socket.cambioEstadoVehiculo({ rol_guardia_movil_id: d.rol_guardia_movil_id, estado: 'DISPONIBLE' });
  return { ok: true, despacho: upd, solicitud_id: d.solicitud_id };
}

module.exports = { avanzarEstado, MAP_SOL, TRANSICIONES, FINALES, PRE_ESCENA, TERMINALES, NOMBRE_DESP };
