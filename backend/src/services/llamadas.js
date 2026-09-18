// Crea la llamada principal de un incidente recién creado (dentro de la misma transacción).
async function crearLlamadaPrincipal(tx, solicitud, recepcionistaId, extra = {}) {
  return tx.llamada.create({
    data: {
      solicitud_id: solicitud.id,
      recepcionista_id: recepcionistaId,
      canal_ingreso_id: solicitud.canal_ingreso_id,
      denunciante_nombre: extra.denunciante_nombre ?? solicitud.denunciante_nombre ?? null,
      denunciante_telefono: extra.denunciante_telefono ?? solicitud.denunciante_telefono ?? null,
      relato: extra.relato ?? null,
      es_principal: true,
    },
  });
}

module.exports = { crearLlamadaPrincipal };