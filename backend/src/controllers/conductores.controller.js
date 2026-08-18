const prisma = require('../config/db');

// Reglas del rol de guardia (tope, sin repetidos, sin correlativos)
const { normalizarDias } = require('../services/dias-guardia');

const parseFecha = (valor) => {
  if (!valor) return null;
  if (typeof valor === 'number') {
    return new Date((valor - 25569) * 86400 * 1000);
  }
  const fecha = new Date(valor);
  if (!isNaN(fecha.getTime())) return fecha;
  const partes = String(valor).split('/');
  if (partes.length === 3) {
    return new Date(`${partes[2]}-${partes[1].padStart(2,'0')}-${partes[0].padStart(2,'0')}`);
  }
  return null;
};

// Obtener todos los conductores habilitados
const getConductores = async (req, res) => {
  try {
    const conductores = await prisma.conductor_habilitado.findMany({
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
            // Permite mostrar los vínculos: quién es además paramédico habilitado
            paramedico_habilitado_usuario: true
          }
        },
        habilitador: {
          include: { persona: true }
        }
      }
    });
    res.json(conductores);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener conductores' });
  }
};

// Crear conductor
const crearConductor = async (req, res) => {
  const {
    primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
    nro_documento, tipo_documento, sexo, fecha_nacimiento,
    persona_id, dias_guardia, contactos,
    nro_licencia, categoria, fecha_vencimiento
  } = req.body;

  try {
    let personaId = persona_id ? parseInt(persona_id) : null;

    if (!personaId) {
      const existe = await prisma.persona.findFirst({ where: { nro_documento } });
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

    const usuarioExiste = await prisma.usuario.findFirst({ where: { persona_id: personaId } });
    if (usuarioExiste) {
      const yaHabilitado = await prisma.conductor_habilitado.findFirst({ where: { usuario_id: usuarioExiste.id } });
      if (yaHabilitado) return res.status(400).json({ error: 'Esta persona ya está registrada como conductor habilitado' });

      const habilitadoPor = req.usuario.id;
      await prisma.conductor_habilitado.create({
        data: {
          usuario_id: usuarioExiste.id,
          nro_licencia: nro_licencia ?? '',
          categoria: categoria ?? '',
          fecha_vencimiento: fecha_vencimiento ? new Date(fecha_vencimiento) : new Date(),
          habilitado_por: habilitadoPor,
          fecha_habilitacion: new Date(),
          activo: true
        }
      });
      return res.status(201).json({ mensaje: 'Usuario habilitado como conductor correctamente' });
    }

    const rol = await prisma.rol.findFirst({ where: { nombre: 'CONDUCTOR' } });
    if (!rol) return res.status(400).json({ error: 'Rol CONDUCTOR no encontrado' });

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

    const habilitadoPor = req.usuario.id;
    await prisma.conductor_habilitado.create({
      data: {
        usuario_id: usuario.id,
        nro_licencia: nro_licencia ?? '',
        categoria: categoria ?? '',
        fecha_vencimiento: fecha_vencimiento ? new Date(fecha_vencimiento) : new Date(),
        habilitado_por: habilitadoPor,
        fecha_habilitacion: new Date(),
        activo: true
      }
    });

    if (dias_guardia && dias_guardia.length > 0) {
      await prisma.horario_guardia.createMany({
        data: dias_guardia.map(dia => ({ usuario_id: usuario.id, dia_semana: dia, activo: true }))
      });
    }

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
    res.status(500).json({ error: 'Error al crear conductor' });
  }
};

// Crear conductores masivamente
const crearConductoresMasivo = async (req, res) => {
  const { conductores } = req.body;
  if (!Array.isArray(conductores) || conductores.length === 0) {
    return res.status(400).json({ error: 'No se enviaron conductores' });
  }

  const rol = await prisma.rol.findFirst({ where: { nombre: 'CONDUCTOR' } });
  if (!rol) return res.status(400).json({ error: 'Rol CONDUCTOR no encontrado' });

  const habilitadoPor = req.usuario.id;
  const resultados = { creados: 0, errores: [] };

  for (const c of conductores) {
    try {
      if (!c.nro_documento || !c.primer_nombre || !c.primer_apellido) {
        resultados.errores.push({ documento: c.nro_documento ?? '?', motivo: 'Datos incompletos' });
        continue;
      }

      let personaId = null;
      const existe = await prisma.persona.findFirst({ where: { nro_documento: String(c.nro_documento) } });

      if (existe) {
        personaId = existe.id;
      } else {
        const persona = await prisma.persona.create({
          data: {
            primer_nombre: String(c.primer_nombre).toUpperCase(),
            segundo_nombre: c.segundo_nombre ? String(c.segundo_nombre).toUpperCase() : null,
            primer_apellido: String(c.primer_apellido).toUpperCase(),
            segundo_apellido: c.segundo_apellido ? String(c.segundo_apellido).toUpperCase() : null,
            nro_documento: String(c.nro_documento),
            tipo_documento: c.tipo_documento ? parseInt(c.tipo_documento) : 1,
            sexo: c.sexo ?? 'M',
            fecha_nacimiento: parseFecha(c.fecha_nacimiento) ?? new Date('1900-01-01')
          }
        });
        personaId = persona.id;
      }

      let usuarioId = null;
      const usuarioExiste = await prisma.usuario.findFirst({ where: { persona_id: personaId } });

      if (usuarioExiste) {
        usuarioId = usuarioExiste.id;
        const yaHabilitado = await prisma.conductor_habilitado.findFirst({ where: { usuario_id: usuarioId } });
        if (yaHabilitado) {
          resultados.errores.push({ documento: c.nro_documento, motivo: 'Ya está habilitado como conductor' });
          continue;
        }
      } else {
        const persona = await prisma.persona.findUnique({ where: { id: personaId } });
        const iniciales = `${persona.primer_nombre[0]}${persona.primer_apellido[0]}`.toUpperCase();
        const password = `${iniciales}${persona.nro_documento}`;
        const usuario = await prisma.usuario.create({
          data: { persona_id: personaId, rol_id: rol.id, password, activo: true, debe_cambiar_password: true }
        });
        usuarioId = usuario.id;
      }

      await prisma.conductor_habilitado.create({
        data: {
          usuario_id: usuarioId,
          nro_licencia: c.nro_licencia ? String(c.nro_licencia) : '',
          categoria: c.categoria ? String(c.categoria) : '',
          fecha_vencimiento: parseFecha(c.fecha_vencimiento) ?? new Date(),
          habilitado_por: habilitadoPor,
          fecha_habilitacion: new Date(),
          activo: true
        }
      });

      if (c.dias_guardia) {
        const dias = String(c.dias_guardia).split(',').map(d => parseInt(d.trim())).filter(d => d >= 1 && d <= 7);
        if (dias.length > 0) {
          await prisma.horario_guardia.createMany({
            data: dias.map(dia => ({ usuario_id: usuarioId, dia_semana: dia, activo: true }))
          });
        }
      }

      if (c.celulares) {
        const nums = String(c.celulares).split(',').map(n => n.trim()).filter(Boolean);
        for (let i = 0; i < nums.length; i++) {
          await prisma.contacto.create({ data: { persona_id: personaId, tipo_contacto_id: 1, valor: nums[i], principal: i === 0, activo: true } });
        }
      }

      if (c.whatsapps) {
        const nums = String(c.whatsapps).split(',').map(n => n.trim()).filter(Boolean);
        for (const num of nums) {
          await prisma.contacto.create({ data: { persona_id: personaId, tipo_contacto_id: 3, valor: num, principal: false, activo: true } });
        }
      }

      if (c.emails) {
        const mails = String(c.emails).split(',').map(m => m.trim()).filter(Boolean);
        for (let i = 0; i < mails.length; i++) {
          await prisma.contacto.create({ data: { persona_id: personaId, tipo_contacto_id: 4, valor: mails[i], principal: i === 0, activo: true } });
        }
      }

      resultados.creados++;
    } catch (err) {
      console.error(err);
      resultados.errores.push({ documento: c.nro_documento, motivo: 'Error interno' });
    }
  }

  res.json(resultados);
};

// Agregar contacto
const agregarContacto = async (req, res) => {
  const { id } = req.params;
  const { tipo_contacto_id, valor, principal } = req.body;
  try {
    const habilitado = await prisma.conductor_habilitado.findUnique({
      where: { id: parseInt(id) },
      include: { usuario: { include: { persona: true } } }
    });
    if (!habilitado) return res.status(404).json({ error: 'Conductor no encontrado' });
    const contacto = await prisma.contacto.create({
      data: { persona_id: habilitado.usuario.persona_id, tipo_contacto_id: parseInt(tipo_contacto_id), valor, principal: principal ?? false, activo: true },
      include: { tipo_contacto: true }
    });
    res.status(201).json(contacto);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al agregar contacto' });
  }
};

// Editar un contacto existente. El :id es del conductor_habilitado; se verifica
// que el contacto pertenezca a esa persona para no editar el de otra.
const editarContacto = async (req, res) => {
  const { id, contactoId } = req.params;
  const { tipo_contacto_id, valor, principal } = req.body;
  try {
    const habilitado = await prisma.conductor_habilitado.findUnique({
      where: { id: parseInt(id) },
      include: { usuario: true }
    });
    if (!habilitado) return res.status(404).json({ error: 'Conductor no encontrado' });

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

// Eliminar un contacto de la persona del conductor
const eliminarContacto = async (req, res) => {
  const { id, contactoId } = req.params;
  try {
    const habilitado = await prisma.conductor_habilitado.findUnique({
      where: { id: parseInt(id) },
      include: { usuario: true }
    });
    if (!habilitado) return res.status(404).json({ error: 'Conductor no encontrado' });

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

// Actualizar la licencia de conducir (número, categoría y vencimiento)
const actualizarLicencia = async (req, res) => {
  const { id } = req.params;
  const { nro_licencia, categoria, fecha_vencimiento } = req.body;
  try {
    const habilitado = await prisma.conductor_habilitado.findUnique({ where: { id: parseInt(id) } });
    if (!habilitado) return res.status(404).json({ error: 'Conductor no encontrado' });

    const actualizado = await prisma.conductor_habilitado.update({
      where: { id: parseInt(id) },
      data: {
        nro_licencia: nro_licencia !== undefined ? String(nro_licencia) : habilitado.nro_licencia,
        categoria: categoria !== undefined ? String(categoria) : habilitado.categoria,
        fecha_vencimiento: fecha_vencimiento ? new Date(fecha_vencimiento) : habilitado.fecha_vencimiento
      }
    });
    res.json({ mensaje: 'Licencia actualizada', habilitado: actualizado });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar la licencia' });
  }
};

// Actualizar días de guardia
const actualizarDiasGuardia = async (req, res) => {
  const { id } = req.params;
  const { dias_guardia } = req.body;
  try {
    const habilitado = await prisma.conductor_habilitado.findUnique({
      where: { id: parseInt(id) },
      include: { usuario: { include: { rol: true } } }
    });
    if (!habilitado) return res.status(404).json({ error: 'Conductor no encontrado' });

    // Los días de guardia de un paramédico los gestiona Coordinación Operativa,
    // aunque esté habilitado para conducir. Transporte solo maneja a los conductores.
    if (habilitado.usuario.rol.nombre !== 'CONDUCTOR' && req.usuario.rol !== 'ADMINISTRADOR') {
      return res.status(403).json({
        error: 'Los días de guardia de un paramédico los gestiona Coordinación Operativa'
      });
    }

    const { dias, error: errorDias } = normalizarDias(dias_guardia);
    if (errorDias) return res.status(400).json({ error: errorDias });

    await prisma.horario_guardia.deleteMany({ where: { usuario_id: habilitado.usuario_id } });
    if (dias.length > 0) {
      await prisma.horario_guardia.createMany({
        data: dias.map(dia => ({ usuario_id: habilitado.usuario_id, dia_semana: dia, activo: true }))
      });
    }
    res.json({ mensaje: 'Días de guardia actualizados', dias });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar días de guardia' });
  }
};

// Activar/desactivar conductor
const toggleActivo = async (req, res) => {
  const { id } = req.params;
  const { activo } = req.body;
  try {
    const habilitado = await prisma.conductor_habilitado.update({
      where: { id: parseInt(id) },
      data: { activo: Boolean(activo) }
    });
    res.json(habilitado);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar conductor' });
  }
};

module.exports = {
  getConductores, crearConductor, crearConductoresMasivo,
  agregarContacto, editarContacto, eliminarContacto, actualizarLicencia,
  actualizarDiasGuardia, toggleActivo
};