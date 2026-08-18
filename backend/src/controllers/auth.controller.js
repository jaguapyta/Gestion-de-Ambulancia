const prisma = require('../config/db');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/env');

const login = async (req, res) => {
  const { nro_documento, password } = req.body;

  console.log('Buscando:', nro_documento, '| password:', password);

  try {
    const usuario = await prisma.usuario.findFirst({
      where: {
        persona: {
          nro_documento: nro_documento
        }
      },
      include: {
        rol: true,
        persona: true
      }
    });

    console.log('Usuario encontrado:', usuario);

    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    if (!usuario.activo) {
      return res.status(401).json({ error: 'Usuario inactivo. Contactá al administrador.' });
    }

    if (usuario.password !== password) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Leer tiempo de sesión desde la BD
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
      {
        id: usuario.id,
        nro_documento: usuario.persona.nro_documento,
        rol: usuario.rol.nombre
      },
      JWT_SECRET,
      { expiresIn }
    );

    res.json({
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.persona.primer_nombre + ' ' + usuario.persona.primer_apellido,
        nro_documento: usuario.persona.nro_documento,
        rol: usuario.rol.nombre,
        debe_cambiar_password: usuario.debe_cambiar_password
      }
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
      data: {
        password: password,
        debe_cambiar_password: false
      }
    });
    res.json({ mensaje: 'Contraseña actualizada correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cambiar contraseña' });
  }
};

// Valida el token y devuelve el usuario según la BD, no según el cliente.
const verificarSesion = async (req, res) => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuario.id },
      include: { rol: true, persona: true }
    });
    if (!usuario || !usuario.activo) {
      return res.status(403).json({ error: 'Usuario inactivo o inexistente' });
    }
    res.json({
      id: usuario.id,
      nombre: `${usuario.persona.primer_nombre} ${usuario.persona.primer_apellido}`,
      nro_documento: usuario.persona.nro_documento,
      rol: usuario.rol.nombre,
      debe_cambiar_password: usuario.debe_cambiar_password
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al verificar la sesión' });
  }
};

module.exports = { login, cambiarPassword, verificarSesion };