const prisma = require('../config/db');

// IP real del cliente. Detrás de Traefik viene en X-Forwarded-For.
function ipDe(req) {
  const xff = req.headers['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim().slice(0, 45);
  return String(req.ip || req.socket?.remoteAddress || '').slice(0, 45);
}

function dispositivoDe(req) {
  return String(req.headers['user-agent'] || '').slice(0, 100) || null;
}

// Registra un intento de acceso (login). No lanza: si falla, solo loguea.
async function registrarAcceso({
  req, usuario_id = null, usuario_nombre = null, rol_nombre = null,
  resultado, detalle_error = null, descripcion = null,
}) {
  try {
    await prisma.auditoria.create({
      data: {
        usuario_id, usuario_nombre, rol_nombre,
        ip: ipDe(req), dispositivo: dispositivoDe(req),
        modulo: 'AUTENTICACION', tabla: 'usuario', operacion: 'LOGIN',
        resultado, detalle_error, descripcion,
      },
    });
  } catch (e) {
    console.error('No se pudo registrar la auditoría de acceso:', e.message);
  }
}

module.exports = { registrarAcceso };