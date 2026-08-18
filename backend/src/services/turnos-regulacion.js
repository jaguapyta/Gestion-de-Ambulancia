// Régimen de guardias del Centro de Regulación: turnos de 12 horas.
// Vive aparte de dias-guardia.js porque el régimen es distinto al de
// paramédicos/conductores (que trabajan por día completo).
//
//   - Médico regulador: turnos de 12h sueltos. Puede tener varios y encadenar
//     dos seguidos (24h). Solo se prohíbe repetir el mismo turno.
//   - ARM: trabaja por "vínculos". Cada vínculo = 24h = 2 turnos de 12h que NO
//     pueden ser consecutivos. Hasta 3 vínculos por funcionario.

const TURNOS = ['DIURNO', 'NOCTURNO']; // DIURNO 07-19 · NOCTURNO 19-07
const NOMBRE_DIA = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const MAX_VINCULOS_ARM = 3;

// Ubica cada (día, turno) en una línea de tiempo semanal de 14 franjas de 12h.
// El Diurno de un día precede a su Nocturno; el Nocturno precede al Diurno del
// día siguiente. La semana es cíclica: domingo-noche empalma con lunes-mañana.
const franja = (dia, turno) => (dia - 1) * 2 + (turno === 'NOCTURNO' ? 1 : 0);

const sonConsecutivos = (a, b) => {
  const d = Math.abs(franja(a.dia_semana, a.turno) - franja(b.dia_semana, b.turno));
  return d === 1 || d === 13; // 13 = par domingo-noche(13) ↔ lunes-mañana(0)
};

const turnoValido = (t) =>
  t && Number.isInteger(Number(t.dia_semana)) &&
  Number(t.dia_semana) >= 1 && Number(t.dia_semana) <= 7 &&
  TURNOS.includes(t.turno);

const clave = (t) => `${t.dia_semana}-${t.turno}`;
const etiqueta = (t) => `${NOMBRE_DIA[t.dia_semana]} ${t.turno === 'NOCTURNO' ? 'noche' : 'mañana'}`;

// Médico: lista de turnos sueltos, sin repetir. Consecutivos permitidos.
// Devuelve { filas } listas para insertar, o { error }.
const normalizarTurnosMedico = (turnos) => {
  const lista = Array.isArray(turnos) ? turnos : [];
  if (lista.some(t => !turnoValido(t))) {
    return { error: 'Cada turno debe tener un día (1-7) y un turno (DIURNO/NOCTURNO) válidos' };
  }
  const vistos = new Set();
  for (const t of lista) {
    if (vistos.has(clave(t))) return { error: `Turno repetido: ${etiqueta(t)}` };
    vistos.add(clave(t));
  }
  return { filas: lista.map(t => ({ dia_semana: Number(t.dia_semana), turno: t.turno, vinculo: null })) };
};

// ARM: vinculos = [[t, t], [t, t], ...]. Cada vínculo exactamente 2 turnos no
// consecutivos. Máximo 3 vínculos. Sin repetir turnos entre vínculos.
const normalizarVinculosArm = (vinculos) => {
  const lista = Array.isArray(vinculos) ? vinculos : [];
  if (lista.length > MAX_VINCULOS_ARM) {
    return { error: `Un ARM no puede tener más de ${MAX_VINCULOS_ARM} vínculos` };
  }
  const vistos = new Set();
  const filas = [];
  for (let i = 0; i < lista.length; i++) {
    const par = Array.isArray(lista[i]) ? lista[i] : [];
    if (par.length !== 2) return { error: `El vínculo ${i + 1} debe tener exactamente 2 turnos de 12h` };
    if (par.some(t => !turnoValido(t))) return { error: `El vínculo ${i + 1} tiene un turno inválido` };
    if (clave(par[0]) === clave(par[1])) return { error: `El vínculo ${i + 1} no puede repetir el mismo turno` };
    if (sonConsecutivos(par[0], par[1])) {
      return { error: `Vínculo ${i + 1}: ${etiqueta(par[0])} y ${etiqueta(par[1])} son consecutivos (no pueden ir seguidos)` };
    }
    for (const t of par) {
      if (vistos.has(clave(t))) return { error: `Turno repetido entre vínculos: ${etiqueta(t)}` };
      vistos.add(clave(t));
      filas.push({ dia_semana: Number(t.dia_semana), turno: t.turno, vinculo: i + 1 });
    }
  }
  return { filas };
};

module.exports = {
  TURNOS, NOMBRE_DIA, MAX_VINCULOS_ARM,
  sonConsecutivos, normalizarTurnosMedico, normalizarVinculosArm
};