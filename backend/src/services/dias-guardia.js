// Reglas del rol de guardia del SEME, en un solo lugar porque las aplican
// tanto Coordinación Operativa (paramédicos) como Transporte (conductores),
// y en tres vías de entrada: alta individual, alta masiva y edición.
//
//   1. Máximo 3 guardias por funcionario.
//   2. Sin repetidos: no se puede tener dos veces el mismo día.
//   3. Sin días correlativos: después de una guardia va un día de descanso.
//      La semana se trata como un ciclo, así que domingo y lunes también
//      cuentan como correlativos.

const MAX_DIAS_GUARDIA = 3;

const NOMBRE_DIA = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

// La distancia 6 es el par domingo(7)–lunes(1), que en el calendario son días seguidos.
const sonCorrelativos = (a, b) => {
  const d = Math.abs(a - b);
  return d === 1 || d === 6;
};

// Devuelve { dias } si la combinación es válida, o { error } explicando por qué no.
const normalizarDias = (dias) => {
  const lista = Array.isArray(dias) ? dias : [];
  // El Set resuelve la regla de "sin repetidos": dos lunes colapsan en uno.
  const limpios = [...new Set(lista.map(Number))].sort((a, b) => a - b);

  if (limpios.some(d => !Number.isInteger(d) || d < 1 || d > 7)) {
    return { error: 'Los días deben ser números del 1 (lunes) al 7 (domingo)' };
  }

  if (limpios.length > MAX_DIAS_GUARDIA) {
    return { error: `Un funcionario no puede tener más de ${MAX_DIAS_GUARDIA} guardias` };
  }

  for (let i = 0; i < limpios.length; i++) {
    for (let j = i + 1; j < limpios.length; j++) {
      if (sonCorrelativos(limpios[i], limpios[j])) {
        return {
          error: `No se pueden asignar guardias en días correlativos: ${NOMBRE_DIA[limpios[i]]} y ${NOMBRE_DIA[limpios[j]]}`
        };
      }
    }
  }

  return { dias: limpios };
};

module.exports = { MAX_DIAS_GUARDIA, NOMBRE_DIA, sonCorrelativos, normalizarDias };
