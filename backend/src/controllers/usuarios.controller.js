const prisma = require('../config/db');
const { tienePotestad } = require('../config/permisos');

// Contraseña por defecto del SEME: iniciales de nombre y apellido + documento.
// Se usa en el alta individual, en la masiva y en el restablecimiento, para que
// la jefatura pueda comunicarla sin tener que consultarla en la base.
const passwordPorDefecto = (primer_nombre, primer_apellido, nro_documento) => {
  const iniciales = `${primer_nombre?.[0] ?? 'U'}${primer_apellido?.[0] ?? 'S'}`.toUpperCase();
  return `${iniciales}${nro_documento}`;
};

// Obtener todos los usuarios
const getUsuarios = async (req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      include: {
        persona: true,
        rol: true
      },
      orderBy: { created_at: 'desc' }
    });
    res.json(usuarios);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
};

// Obtener usuario por ID
const getUsuarioById = async (req, res) => {
  const { id } = req.params;
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: parseInt(id) },
      include: { persona: true, rol: true }
    });
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(usuario);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
};

// Activar/desactivar usuario
const toggleActivo = async (req, res) => {
  const { id } = req.params;
  const { activo } = req.body;
  try {
    const usuario = await prisma.usuario.update({
      where: { id: parseInt(id) },
      data: { activo: Boolean(activo) }
    });
    res.json(usuario);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
};

// Cambiar rol de usuario
const updateRol = async (req, res) => {
  const { id } = req.params;
  const { rol_id } = req.body;
  try {
    const usuario = await prisma.usuario.update({
      where: { id: parseInt(id) },
      data: { rol_id: parseInt(rol_id) }
    });
    res.json(usuario);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar rol' });
  }
};

// Crear nuevo usuario
const crearUsuario = async (req, res) => {
  const {
    primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
    nro_documento, tipo_documento, sexo, fecha_nacimiento, rol_id, persona_id
  } = req.body;

  try {
    let personaId = persona_id;

    // Si no viene persona_id, crear nueva persona
    if (!personaId) {
      const existe = await prisma.persona.findFirst({
        where: { nro_documento }
      });
      if (existe) {
        personaId = existe.id;
      } else {
        const persona = await prisma.persona.create({
          data: {
            primer_nombre: primer_nombre.toUpperCase(),
            segundo_nombre: segundo_nombre?.toUpperCase() ?? null,
            primer_apellido: primer_apellido.toUpperCase(),
            segundo_apellido: segundo_apellido?.toUpperCase() ?? null,
            nro_documento,
            tipo_documento: parseInt(tipo_documento),
            sexo,
            fecha_nacimiento: new Date(fecha_nacimiento)
          }
        });
        personaId = persona.id;
      }
    }

    // Verificar que no tenga ya un usuario activo
    const usuarioExiste = await prisma.usuario.findFirst({
        where: { persona_id: parseInt(personaId) }
      });

    if (usuarioExiste) {
      return res.status(400).json({ error: 'Esta persona ya tiene un usuario registrado' });
    }

    // Generar password automática: iniciales + documento
    const password = passwordPorDefecto(primer_nombre, primer_apellido, nro_documento);

    // Crear usuario
    const usuario = await prisma.usuario.create({
      data: {
        persona_id: parseInt(personaId),
        rol_id: parseInt(rol_id),
        password,
        activo: true,
        debe_cambiar_password: true
      },
      include: { persona: true, rol: true }
    });

    res.status(201).json({ ...usuario, password_generada: password });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear usuario' });
  }
};

// Buscar persona por documento
const buscarPersonaPorDocumento = async (req, res) => {
  const { nro_documento } = req.params;
  try {
    const persona = await prisma.persona.findFirst({
      where: { nro_documento },
      include: {
        usuario: {
          include: { rol: true }
        }
      }
    });
    if (!persona) return res.status(404).json({ error: 'Persona no encontrada' });
    res.json(persona);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al buscar persona' });
  }
};

// Crear usuarios masivamente
const crearUsuariosMasivo = async (req, res) => {
  const { usuarios } = req.body;
  if (!Array.isArray(usuarios) || usuarios.length === 0) {
    return res.status(400).json({ error: 'No se enviaron usuarios' });
  }

  const resultados = { creados: 0, errores: [] };

  for (const u of usuarios) {
    try {
      // Buscar o crear persona
      let persona = await prisma.persona.findFirst({
        where: { nro_documento: String(u.nro_documento) }
      });

      if (!persona) {
        persona = await prisma.persona.create({
          data: {
            primer_nombre: String(u.primer_nombre).toUpperCase(),
            segundo_nombre: u.segundo_nombre ? String(u.segundo_nombre).toUpperCase() : null,
            primer_apellido: String(u.primer_apellido).toUpperCase(),
            segundo_apellido: u.segundo_apellido ? String(u.segundo_apellido).toUpperCase() : null,
            nro_documento: String(u.nro_documento),
            tipo_documento: 1,
            sexo: u.sexo ?? 'M',
            fecha_nacimiento: new Date(u.fecha_nacimiento)
          }
        });
      }

      // Verificar si ya tiene usuario
      const existe = await prisma.usuario.findFirst({
        where: { persona_id: persona.id }
      });
      if (existe) {
        resultados.errores.push({ documento: u.nro_documento, motivo: 'Ya tiene usuario registrado' });
        continue;
      }

      // Buscar rol
      const rol = await prisma.rol.findFirst({
        where: { nombre: String(u.rol).toUpperCase() }
      });
      if (!rol) {
        resultados.errores.push({ documento: u.nro_documento, motivo: `Rol "${u.rol}" no encontrado` });
        continue;
      }

      // Generar password
      const password = passwordPorDefecto(u.primer_nombre, u.primer_apellido, u.nro_documento);

      await prisma.usuario.create({
        data: {
          persona_id: persona.id,
          rol_id: rol.id,
          password,
          activo: true,
          debe_cambiar_password: true
        }
      });

      resultados.creados++;
    } catch (err) {
      resultados.errores.push({ documento: u.nro_documento, motivo: 'Error interno' });
    }
  }

  res.json(resultados);
};

// Restablecer la contraseña al valor por defecto y forzar el cambio
// en el próximo ingreso. Lo ejecuta la jefatura del área del funcionario.
const resetearPassword = async (req, res) => {
  const { id } = req.params;
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: parseInt(id) },
      include: { persona: true, rol: true }
    });
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    // Potestad sobre el legajo: la misma regla que rige los estados temporales
    if (!tienePotestad(usuario.rol.nombre, req.usuario.rol)) {
      return res.status(403).json({
        error: `No tenés potestad sobre funcionarios con rol ${usuario.rol.nombre}`
      });
    }

    const p = usuario.persona;
    const password = passwordPorDefecto(p.primer_nombre, p.primer_apellido, p.nro_documento);

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        password,
        // Esto es lo que hace que el login lo derive a /cambiar-password
        debe_cambiar_password: true
      }
    });

    res.json({
      mensaje: 'Contraseña restablecida correctamente',
      usuario: `${p.primer_nombre} ${p.primer_apellido}`,
      nro_documento: p.nro_documento,
      password_generada: password
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al restablecer la contraseña' });
  }
};

module.exports = {
  getUsuarios,
  getUsuarioById,
  toggleActivo,
  updateRol,
  crearUsuario,
  buscarPersonaPorDocumento,
  crearUsuariosMasivo,
  resetearPassword
};