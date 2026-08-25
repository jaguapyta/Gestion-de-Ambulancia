// Validación de teléfonos (formato Paraguay).
// Celular: 0981123456 (10 dígitos, empieza con 09). Fijo: 021123456 (9, empieza con 0).
// soloTelefono → deja solo dígitos mientras se escribe (máx 11).
export const soloTelefono = (v: string) => v.replace(/\D/g, '').slice(0, 11);

// Válido: empieza con 0 y tiene entre 9 y 11 dígitos.
export const telefonoValido = (v: string) => /^0\d{8,10}$/.test((v ?? '').replace(/\D/g, ''));