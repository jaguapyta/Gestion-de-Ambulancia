const prisma = require('../config/db');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/env');
const { ROLES_CON_HORARIO, puedeIngresarAhora } = require('../services/horario-regulacion');
const { registrarAcceso } = require('../services/auditoria');

const login = async (req, res) => {
  const { nro_documento, password } = req.body;
  const desc = `Documento: ${nro_documento ?? '(vacío)'}`;

  try {
    const usuario = await prisma.usuario.findFirst({
      where: { persona: { nro_documento: nro_documento } },
      include: { rol: true, persona: true },
    });

    // 1) Documento inexistente
    if (!usuario) {
      await registrarAcceso({ req, resultado: 'FALLIDO', detalle_error: 'Documento inexistente', descripcion: desc });
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const nombre = `${usuario.persona.primer_nombre} ${usuario.persona.primer_apellido}`;
    const rolNombre = usuario.rol.nombre;
    const baseAudit = { usuario_id: usuario.id, usuario_nombre: nombre, rol_nombre: rolNombre, descripcion: desc };

    // 2) Usuario inactivo
    if (!usuario.activo) {
      await registrarAcceso({ req, ...baseAudit, resultado: 'FALLIDO', detalle_error: 'Usuario inactivo' });
      return res.status(401).json({ error: 'Usuario inactivo. Contactá al administrador.' });
    }

    // 3) Contraseña incorrecta (al usuario: mensaje genérico)
    if (usuario.password !== password) {
      await registrarAcceso({ req, ...baseAudit, resultado: 'FALLIDO', detalle_error: 'Contraseña incorrecta' });
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // 4) Ventana horaria: solo ARM y médicos reguladores
    let notaAcceso = null;
    if (ROLES_CON_HORARIO.includes(rolNombre)) {
      const turnos = await prisma.turno_regulacion.findMany({
        where: { usuario_id: usuario.id, activo: true },
        select: { dia_semana: true, turno: true },
      });
      const chequeo = puedeIngresarAhora(turnos);
      if (!chequeo.permitido) {
        // ¿Tiene una excepción de acceso vigente?
        const ahora = new Date();
        const excepcion = await prisma.acceso_excepcional.findFirst({
          where: {
            usuario_id: usuario.id,
            activo: true,
            vigencia_inicio: { lte: ahora },
            vigencia_fin: { gt: ahora },
          },
        });
        if (!excepcion) {
          await registrarAcceso({ req, ...baseAudit, resultado: 'FALLIDO', detalle_error: chequeo.motivo });
          // Mensaje genérico: no revela el motivo al de afuera.
          return res.status(403).json({ error: 'No se puede acceder al sistema' });
        }
        notaAcceso = 'Ingreso por excepción autorizada';
      }
    }

    // Tiempo de sesión desde la BD
    let expiresIn = JWT_EXPIRES_IN;
    try {
      const config = await prisma.configuracion.findUnique({ where: { id: 1 } });
      if (config && config.tiempo_sesion_minutos) {
        expiresIn = `${config.tiempo_sesion_minutos}m`;
      }
    } catch (e) {
      console.log('Usando tiempo de sesión por defecto:', expiresIn);
    }

    const token = jwt.sign(
      { id: usuario.id, nro_documento: usuario.persona.nro_documento, rol: rolNombre },
      JWT_SECRET,
      { expiresIn }
    );

    // 5) Acceso exitoso (marca si fue por excepción)
    await registrarAcceso({ req, ...baseAudit, resultado: 'EXITO', detalle_error: notaAcceso });

    res.json({
      token,
      usuario: {
        id: usuario.id,
        nombre: nombre,
        nro_documento: usuario.persona.nro_documento,
        rol: rolNombre,
        debe_cambiar_password: usuario.debe_cambiar_password,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const cambiarPassword = async (req, res) => {
  const { password } = req.body;
  try {
    await prisma.usuario.update({
      where: { id: req.usuario.id },
      data: { password: password, debe_cambiar_password: false },
    });
    res.json({ mensaje: 'Contraseña actualizada correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cambiar contraseña' });
  }
};

const verificarSesion = async (req, res) => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuario.id },
      include: { rol: true, persona: true },
    });
    if (!usuario || !usuario.activo) {
      return res.status(403).json({ error: 'Usuario inactivo o inexistente' });
    }
    res.json({
      id: usuario.id,
      nombre: `${usuario.persona.primer_nombre} ${usuario.persona.primer_apellido}`,
      nro_documento: usuario.persona.nro_documento,
      rol: usuario.rol.nombre,
      debe_cambiar_password: usuario.debe_cambiar_password,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al verificar la sesión' });
  }
};

module.exports = { login, cambiarPassword, verificarSesion };