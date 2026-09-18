// Ventana de acceso al sistema para ARM y médicos reguladores.
// Solo pueden iniciar sesión dentro de su turno de guardia, con un margen de
// 2 horas antes y 2 horas después. Todo se evalúa en horario de Paraguay
// (America/Asuncion), independiente del huso horario del servidor/contenedor.
//
// Turnos (de turno_regulacion): DIURNO 07-19 · NOCTURNO 19-07.
//   DIURNO   -> ventana 05:00 a 21:00 del mismo día.
//   NOCTURNO -> ventana 17:00 a 09:00 del día siguiente (cruza la medianoche;
//               el domingo-noche empalma con el lunes-mañana).

const MARGEN_MIN = 120;                 // 2 horas de margen
const MINUTOS_SEMANA = 7 * 24 * 60;     // 10080
const ROLES_CON_HORARIO = ['ARM', 'MEDICO_REGULADOR'];

const DIA_A_NUM = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

// Día de la semana (1=Lunes..7=Domingo) y minuto de la semana en hora de Asunción.
function ahoraAsuncion(base = new Date()) {
  const partes = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Asuncion',
    weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(base);
  const val = (t) => partes.find((p) => p.type === t)?.value;
  const dia = DIA_A_NUM[val('weekday')] || 1;
  let hh = parseInt(val('hour'), 10);
  if (hh === 24) hh = 0; // algunos entornos emiten "24" a la medianoche
  const mm = parseInt(val('minute'), 10);
  return { dia, minuto: (dia - 1) * 1440 + hh * 60 + mm };
}

// Cada turno -> intervalo [inicio, fin) en minutos de la semana, ya con margen.
function ventanaDeTurno(t) {
  const base = (t.dia_semana - 1) * 1440;
  if (t.turno === 'NOCTURNO') {
    return [base + 19 * 60 - MARGEN_MIN, base + (24 + 7) * 60 + MARGEN_MIN];
  }
  return [base + 7 * 60 - MARGEN_MIN, base + 19 * 60 + MARGEN_MIN];
}

// Pertenencia con inicio inclusivo y fin exclusivo. Si la ventana cruza el fin
// de semana (fin > 10080), el tramo sobrante se compara al inicio de la semana.
function dentroDe(minuto, [inicio, fin]) {
  if (fin <= MINUTOS_SEMANA) return minuto >= inicio && minuto < fin;
  return minuto >= inicio || minuto < (fin - MINUTOS_SEMANA);
}

// ¿El usuario con estos turnos puede ingresar en este instante?
// Devuelve { permitido } y, si no, el { motivo } para la auditoría.
function puedeIngresarAhora(turnos, base = new Date()) {
  if (!Array.isArray(turnos) || turnos.length === 0) {
    return { permitido: false, motivo: 'Sin turno de guardia asignado' };
  }
  const { minuto } = ahoraAsuncion(base);
  const ok = turnos.some((t) => dentroDe(minuto, ventanaDeTurno(t)));
  return ok ? { permitido: true } : { permitido: false, motivo: 'Fuera de horario de guardia' };
}

module.exports = { ROLES_CON_HORARIO, puedeIngresarAhora, ahoraAsuncion, MARGEN_MIN };