const prisma = require('../config/db');

// Reglas del rol de guardia (tope, sin repetidos, sin correlativos)
const { normalizarDias } = require('../services/dias-guardia');

// Obtener todos los paramédicos habilitados
const getParamedicos = async (req, res) => {
  try {
    const paramedicos = await prisma.paramedico_habilitado.findMany({
      include: {
        usuario: {
          include: {
            persona: {
              include: {
                contacto: {
                  include: { tipo_contacto: true }
                }
              }
            },
            rol: true,
            horario_guardia: true,
            // Permite mostrar los vínculos: quién es además conductor habilitado
            conductor_habilitado_usuario: true
          }
        },
        habilitador: {
          include: { persona: true }
        }
      }
    });
    res.json(paramedicos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener paramédicos' });
  }
};

// Crear paramédico y habilitarlo
const crearParamedico = async (req, res) => {
  const {
    primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
    nro_documento, tipo_documento, sexo, fecha_nacimiento,
    persona_id, dias_guardia, contactos,
    nro_registro, fecha_vencimiento
  } = req.body;

  try {
    // Se valida antes de escribir nada, para no dejar datos a medio crear
    const { dias, error: errorDias } = normalizarDias(dias_guardia);
    if (errorDias) return res.status(400).json({ error: errorDias });

    let personaId = persona_id ? parseInt(persona_id) : null;

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
            segundo_nombre: segundo_nombre ? segundo_nombre.toUpperCase() : null,
            primer_apellido: primer_apellido.toUpperCase(),
            segundo_apellido: segundo_apellido ? segundo_apellido.toUpperCase() : null,
            nro_documento,
            tipo_documento: parseInt(tipo_documento),
            sexo,
            fecha_nacimiento: new Date(fecha_nacimiento)
          }
        });
        personaId = persona.id;
      }
    }

    // Verificar que no tenga ya un usuario
    const usuarioExiste = await prisma.usuario.findFirst({
      where: { persona_id: personaId }
    });
    if (usuarioExiste) {
      // Regla de negocio SEME: un conductor nunca puede ser paramédico habilitado.
      // Un paramédico sí puede habilitarse como conductor, pero no al revés.
      const rolUsuario = await prisma.rol.findUnique({ where: { id: usuarioExiste.rol_id } });
      if (rolUsuario?.nombre === 'CONDUCTOR') {
        return res.status(400).json({
          error: 'Esta persona es conductor. Un conductor no puede ser habilitado como paramédico.'
        });
      }

      // Si ya tiene usuario verificar si ya está habilitado como paramédico
      const yaHabilitado = await prisma.paramedico_habilitado.findFirst({
        where: { usuario_id: usuarioExiste.id }
      });
      if (yaHabilitado) {
        return res.status(400).json({ error: 'Esta persona ya está registrada como paramédico habilitado' });
      }
      // Si tiene usuario pero no está habilitado, solo habilitarlo
      const habilitadoPor = req.usuario.id;
      await prisma.paramedico_habilitado.create({
        data: {
          usuario_id: usuarioExiste.id,
          nro_registro: nro_registro ?? '',
          fecha_vencimiento: fecha_vencimiento ? new Date(fecha_vencimiento) : new Date(),
          habilitado_por: habilitadoPor,
          fecha_habilitacion: new Date(),
          activo: true
        }
      });
      return res.status(201).json({ mensaje: 'Usuario habilitado como paramédico correctamente' });
    }

    // Obtener rol PARAMEDICO
    const rol = await prisma.rol.findFirst({
      where: { nombre: 'PARAMEDICO' }
    });
    if (!rol) return res.status(400).json({ error: 'Rol PARAMEDICO no encontrado' });

    // Generar password
    const persona = await prisma.persona.findUnique({ where: { id: personaId } });
    const iniciales = `${persona.primer_nombre[0]}${persona.primer_apellido[0]}`.toUpperCase();
    const password = `${iniciales}${persona.nro_documento}`;

    // Crear usuario
    const usuario = await prisma.usuario.create({
      data: {
        persona_id: personaId,
        rol_id: rol.id,
        password,
        activo: true,
        debe_cambiar_password: true
      }
    });

    // Habilitar como paramédico
    const habilitadoPor = req.usuario.id;
    await prisma.paramedico_habilitado.create({
      data: {
        usuario_id: usuario.id,
        nro_registro: nro_registro ?? '',
        fecha_vencimiento: fecha_vencimiento ? new Date(fecha_vencimiento) : new Date(),
        habilitado_por: habilitadoPor,
        fecha_habilitacion: new Date(),
        activo: true
      }
    });

    // Guardar días de guardia
    if (dias.length > 0) {
      await prisma.horario_guardia.createMany({
        data: dias.map(dia => ({
          usuario_id: usuario.id,
          dia_semana: dia,
          activo: true
        }))
      });
    }

    // Guardar contactos
    if (contactos && contactos.length > 0) {
      await prisma.contacto.createMany({
        data: contactos.map(c => ({
          persona_id: personaId,
          tipo_contacto_id: parseInt(c.tipo_contacto_id),
          valor: c.valor,
          principal: c.principal ?? false,
          activo: true
        }))
      });
    }

    res.status(201).json({ ...usuario, password_generada: password });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear paramédico' });
  }
};

// Crear paramédicos masivamente desde Excel
const crearParamedicosMasivo = async (req, res) => {
  const { paramedicos } = req.body;
  if (!Array.isArray(paramedicos) || paramedicos.length === 0) {
    return res.status(400).json({ error: 'No se enviaron paramédicos' });
  }

  const rol = await prisma.rol.findFirst({ where: { nombre: 'PARAMEDICO' } });
  if (!rol) return res.status(400).json({ error: 'Rol PARAMEDICO no encontrado' });

  const habilitadoPor = req.usuario.id;
  const resultados = { creados: 0, errores: [] };

  for (const p of paramedicos) {
    try {
      if (!p.nro_documento || !p.primer_nombre || !p.primer_apellido) {
        resultados.errores.push({ documento: p.nro_documento ?? '?', motivo: 'Datos incompletos' });
        continue;
      }

      // Los días se validan antes de crear nada de esta fila
      const diasCrudos = p.dias_guardia
        ? String(p.dias_guardia).split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d))
        : [];
      const { dias, error: errorDias } = normalizarDias(diasCrudos);
      if (errorDias) {
        resultados.errores.push({ documento: p.nro_documento, motivo: errorDias });
        continue;
      }

      let personaId = null;
      const existe = await prisma.persona.findFirst({ where: { nro_documento: String(p.nro_documento) } });

      if (existe) {
        personaId = existe.id;
      } else {
        const persona = await prisma.persona.create({
          data: {
            primer_nombre: String(p.primer_nombre).toUpperCase(),
            segundo_nombre: p.segundo_nombre ? String(p.segundo_nombre).toUpperCase() : null,
            primer_apellido: String(p.primer_apellido).toUpperCase(),
            segundo_apellido: p.segundo_apellido ? String(p.segundo_apellido).toUpperCase() : null,
            nro_documento: String(p.nro_documento),
            tipo_documento: p.tipo_documento ? parseInt(p.tipo_documento) : 1,
            sexo: p.sexo ?? 'M',
            fecha_nacimiento: new Date(p.fecha_nacimiento)
          }
        });
        personaId = persona.id;
      }

      let usuarioId = null;
      const usuarioExiste = await prisma.usuario.findFirst({ where: { persona_id: personaId } });

      if (usuarioExiste) {
        usuarioId = usuarioExiste.id;

        // Un conductor nunca puede ser paramédico habilitado. Este control es el
        // que habría evitado la importación errónea de 108 conductores.
        const rolUsuario = await prisma.rol.findUnique({ where: { id: usuarioExiste.rol_id } });
        if (rolUsuario?.nombre === 'CONDUCTOR') {
          resultados.errores.push({ documento: p.nro_documento, motivo: 'Es conductor — no puede ser paramédico' });
          continue;
        }

        const yaHabilitado = await prisma.paramedico_habilitado.findFirst({ where: { usuario_id: usuarioId } });
        if (yaHabilitado) {
          resultados.errores.push({ documento: p.nro_documento, motivo: 'Ya está habilitado como paramédico' });
          continue;
        }
      } else {
        const persona = await prisma.persona.findUnique({ where: { id: personaId } });
        const iniciales = `${persona.primer_nombre[0]}${persona.primer_apellido[0]}`.toUpperCase();
        const password = `${iniciales}${persona.nro_documento}`;

        const usuario = await prisma.usuario.create({
          data: {
            persona_id: personaId,
            rol_id: rol.id,
            password,
            activo: true,
            debe_cambiar_password: true
          }
        });
        usuarioId = usuario.id;
      }

      // Habilitar como paramédico
      await prisma.paramedico_habilitado.create({
        data: {
          usuario_id: usuarioId,
          nro_registro: p.nro_registro ? String(p.nro_registro) : '',
          fecha_vencimiento: p.fecha_vencimiento ? new Date(p.fecha_vencimiento) : new Date(),
          habilitado_por: habilitadoPor,
          fecha_habilitacion: new Date(),
          activo: true
        }
      });

      // Días de guardia
      if (dias.length > 0) {
        await prisma.horario_guardia.createMany({
          data: dias.map(dia => ({ usuario_id: usuarioId, dia_semana: dia, activo: true }))
        });
      }

      // Celulares
      if (p.celulares) {
        const nums = String(p.celulares).split(',').map(n => n.trim()).filter(Boolean);
        for (let i = 0; i < nums.length; i++) {
          await prisma.contacto.create({
            data: { persona_id: personaId, tipo_contacto_id: 1, valor: nums[i], principal: i === 0, activo: true }
          });
        }
      }

      // WhatsApp
      if (p.whatsapps) {
        const nums = String(p.whatsapps).split(',').map(n => n.trim()).filter(Boolean);
        for (const num of nums) {
          await prisma.contacto.create({
            data: { persona_id: personaId, tipo_contacto_id: 3, valor: num, principal: false, activo: true }
          });
        }
      }

      // Emails
      if (p.emails) {
        const mails = String(p.emails).split(',').map(m => m.trim()).filter(Boolean);
        for (let i = 0; i < mails.length; i++) {
          await prisma.contacto.create({
            data: { persona_id: personaId, tipo_contacto_id: 4, valor: mails[i], principal: i === 0, activo: true }
          });
        }
      }

      resultados.creados++;
    } catch (err) {
      console.error(err);
      resultados.errores.push({ documento: p.nro_documento, motivo: 'Error interno' });
    }
  }

  res.json(resultados);
};

// Agregar contacto a paramédico
const agregarContacto = async (req, res) => {
  const { id } = req.params;
  const { tipo_contacto_id, valor, principal } = req.body;
  try {
    const habilitado = await prisma.paramedico_habilitado.findUnique({
      where: { id: parseInt(id) },
      include: { usuario: { include: { persona: true } } }
    });
    if (!habilitado) return res.status(404).json({ error: 'Paramédico no encontrado' });

    const contacto = await prisma.contacto.create({
      data: {
        persona_id: habilitado.usuario.persona_id,
        tipo_contacto_id: parseInt(tipo_contacto_id),
        valor,
        principal: principal ?? false,
        activo: true
      },
      include: { tipo_contacto: true }
    });
    res.status(201).json(contacto);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al agregar contacto' });
  }
};

// Editar un contacto existente. El :id es del paramedico_habilitado; se verifica
// que el contacto pertenezca a esa persona para no editar el de otra.
const editarContacto = async (req, res) => {
  const { id, contactoId } = req.params;
  const { tipo_contacto_id, valor, principal } = req.body;
  try {
    const habilitado = await prisma.paramedico_habilitado.findUnique({
      where: { id: parseInt(id) },
      include: { usuario: true }
    });
    if (!habilitado) return res.status(404).json({ error: 'Paramédico no encontrado' });

    const contacto = await prisma.contacto.findUnique({ where: { id: parseInt(contactoId) } });
    if (!contacto || contacto.persona_id !== habilitado.usuario.persona_id) {
      return res.status(404).json({ error: 'Contacto no encontrado' });
    }

    const actualizado = await prisma.contacto.update({
      where: { id: parseInt(contactoId) },
      data: {
        tipo_contacto_id: tipo_contacto_id !== undefined ? parseInt(tipo_contacto_id) : contacto.tipo_contacto_id,
        valor: valor ?? contacto.valor,
        principal: principal !== undefined ? Boolean(principal) : contacto.principal
      },
      include: { tipo_contacto: true }
    });
    res.json(actualizado);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al editar contacto' });
  }
};

// Eliminar un contacto de la persona del paramédico
const eliminarContacto = async (req, res) => {
  const { id, contactoId } = req.params;
  try {
    const habilitado = await prisma.paramedico_habilitado.findUnique({
      where: { id: parseInt(id) },
      include: { usuario: true }
    });
    if (!habilitado) return res.status(404).json({ error: 'Paramédico no encontrado' });

    const contacto = await prisma.contacto.findUnique({ where: { id: parseInt(contactoId) } });
    if (!contacto || contacto.persona_id !== habilitado.usuario.persona_id) {
      return res.status(404).json({ error: 'Contacto no encontrado' });
    }

    await prisma.contacto.delete({ where: { id: parseInt(contactoId) } });
    res.json({ mensaje: 'Contacto eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar contacto' });
  }
};

// Actualizar el registro profesional (número y vencimiento)
const actualizarRegistro = async (req, res) => {
  const { id } = req.params;
  const { nro_registro, fecha_vencimiento } = req.body;
  try {
    const habilitado = await prisma.paramedico_habilitado.findUnique({ where: { id: parseInt(id) } });
    if (!habilitado) return res.status(404).json({ error: 'Paramédico no encontrado' });

    const actualizado = await prisma.paramedico_habilitado.update({
      where: { id: parseInt(id) },
      data: {
        nro_registro: nro_registro !== undefined ? String(nro_registro) : habilitado.nro_registro,
        fecha_vencimiento: fecha_vencimiento ? new Date(fecha_vencimiento) : habilitado.fecha_vencimiento
      }
    });
    res.json({ mensaje: 'Registro profesional actualizado', habilitado: actualizado });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar el registro' });
  }
};

// Actualizar días de guardia — cambio permanente del rol de guardia del funcionario
const actualizarDiasGuardia = async (req, res) => {
  const { id } = req.params;
  const { dias_guardia } = req.body;
  try {
    const habilitado = await prisma.paramedico_habilitado.findUnique({
      where: { id: parseInt(id) }
    });
    if (!habilitado) return res.status(404).json({ error: 'Paramédico no encontrado' });

    const { dias, error: errorDias } = normalizarDias(dias_guardia);
    if (errorDias) return res.status(400).json({ error: errorDias });

    await prisma.horario_guardia.deleteMany({
      where: { usuario_id: habilitado.usuario_id }
    });
    if (dias.length > 0) {
      await prisma.horario_guardia.createMany({
        data: dias.map(dia => ({
          usuario_id: habilitado.usuario_id,
          dia_semana: dia,
          activo: true
        }))
      });
    }
    res.json({ mensaje: 'Días de guardia actualizados', dias });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar días de guardia' });
  }
};

// Activar/desactivar habilitación de paramédico
const toggleActivo = async (req, res) => {
  const { id } = req.params;
  const { activo } = req.body;
  try {
    const habilitado = await prisma.paramedico_habilitado.update({
      where: { id: parseInt(id) },
      data: { activo: Boolean(activo) }
    });
    res.json(habilitado);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar paramédico' });
  }
};

module.exports = {
  getParamedicos, crearParamedico, crearParamedicosMasivo,
  agregarContacto, editarContacto, eliminarContacto, actualizarRegistro,
  actualizarDiasGuardia, toggleActivo
};