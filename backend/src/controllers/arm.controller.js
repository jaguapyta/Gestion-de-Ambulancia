const prisma = require('../config/db');
const { normalizarVinculosArm } = require('../services/turnos-regulacion');

const getArms = async (req, res) => {
  try {
    const arms = await prisma.arm_habilitado.findMany({
      include: {
        usuario: {
          include: {
            persona: { include: { contacto: { include: { tipo_contacto: true } } } },
            rol: true,
            turno_regulacion: true
          }
        },
        habilitador: { include: { persona: true } }
      }
    });
    res.json(arms);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener ARM' });
  }
};

const crearArm = async (req, res) => {
  const {
    primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
    nro_documento, tipo_documento, sexo, fecha_nacimiento,
    persona_id, vinculos, contactos, nro_registro, fecha_vencimiento
  } = req.body;

  try {
    const { filas, error: errorVinc } = normalizarVinculosArm(vinculos);
    if (errorVinc) return res.status(400).json({ error: errorVinc });

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
      const yaHab = await prisma.arm_habilitado.findFirst({ where: { usuario_id: usuarioExiste.id } });
      if (yaHab) return res.status(400).json({ error: 'Esta persona ya está registrada como ARM' });

      await prisma.arm_habilitado.create({
        data: {
          usuario_id: usuarioExiste.id,
          nro_registro: nro_registro || null,
          fecha_vencimiento: fecha_vencimiento ? new Date(fecha_vencimiento) : null,
          habilitado_por: req.usuario.id,
          fecha_habilitacion: new Date(),
          activo: true
        }
      });
      if (filas.length > 0) {
        await prisma.turno_regulacion.createMany({ data: filas.map(f => ({ usuario_id: usuarioExiste.id, ...f })) });
      }
      return res.status(201).json({ mensaje: 'Usuario habilitado como ARM correctamente' });
    }

    const rol = await prisma.rol.findFirst({ where: { nombre: 'ARM' } });
    if (!rol) return res.status(400).json({ error: 'Rol ARM no encontrado' });

    const persona = await prisma.persona.findUnique({ where: { id: personaId } });
    const iniciales = `${persona.primer_nombre[0]}${persona.primer_apellido[0]}`.toUpperCase();
    const password = `${iniciales}${persona.nro_documento}`;

    const usuario = await prisma.usuario.create({
      data: { persona_id: personaId, rol_id: rol.id, password, activo: true, debe_cambiar_password: true }
    });

    await prisma.arm_habilitado.create({
      data: {
        usuario_id: usuario.id,
        nro_registro: nro_registro || null,
        fecha_vencimiento: fecha_vencimiento ? new Date(fecha_vencimiento) : null,
        habilitado_por: req.usuario.id,
        fecha_habilitacion: new Date(),
        activo: true
      }
    });

    if (filas.length > 0) {
      await prisma.turno_regulacion.createMany({ data: filas.map(f => ({ usuario_id: usuario.id, ...f })) });
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
    res.status(500).json({ error: 'Error al crear ARM' });
  }
};

const agregarContacto = async (req, res) => {
  const { id } = req.params;
  const { tipo_contacto_id, valor, principal } = req.body;
  try {
    const hab = await prisma.arm_habilitado.findUnique({
      where: { id: parseInt(id) },
      include: { usuario: { include: { persona: true } } }
    });
    if (!hab) return res.status(404).json({ error: 'ARM no encontrado' });
    const contacto = await prisma.contacto.create({
      data: { persona_id: hab.usuario.persona_id, tipo_contacto_id: parseInt(tipo_contacto_id), valor, principal: principal ?? false, activo: true },
      include: { tipo_contacto: true }
    });
    res.status(201).json(contacto);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error al agregar contacto' }); }
};

const editarContacto = async (req, res) => {
  const { id, contactoId } = req.params;
  const { tipo_contacto_id, valor, principal } = req.body;
  try {
    const hab = await prisma.arm_habilitado.findUnique({ where: { id: parseInt(id) }, include: { usuario: true } });
    if (!hab) return res.status(404).json({ error: 'ARM no encontrado' });
    const contacto = await prisma.contacto.findUnique({ where: { id: parseInt(contactoId) } });
    if (!contacto || contacto.persona_id !== hab.usuario.persona_id) return res.status(404).json({ error: 'Contacto no encontrado' });
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
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error al editar contacto' }); }
};

const eliminarContacto = async (req, res) => {
  const { id, contactoId } = req.params;
  try {
    const hab = await prisma.arm_habilitado.findUnique({ where: { id: parseInt(id) }, include: { usuario: true } });
    if (!hab) return res.status(404).json({ error: 'ARM no encontrado' });
    const contacto = await prisma.contacto.findUnique({ where: { id: parseInt(contactoId) } });
    if (!contacto || contacto.persona_id !== hab.usuario.persona_id) return res.status(404).json({ error: 'Contacto no encontrado' });
    await prisma.contacto.delete({ where: { id: parseInt(contactoId) } });
    res.json({ mensaje: 'Contacto eliminado' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error al eliminar contacto' }); }
};

const actualizarRegistro = async (req, res) => {
  const { id } = req.params;
  const { nro_registro, fecha_vencimiento } = req.body;
  try {
    const hab = await prisma.arm_habilitado.findUnique({ where: { id: parseInt(id) } });
    if (!hab) return res.status(404).json({ error: 'ARM no encontrado' });
    const actualizado = await prisma.arm_habilitado.update({
      where: { id: parseInt(id) },
      data: {
        nro_registro: nro_registro !== undefined ? (nro_registro || null) : hab.nro_registro,
        fecha_vencimiento: fecha_vencimiento ? new Date(fecha_vencimiento) : hab.fecha_vencimiento
      }
    });
    res.json({ mensaje: 'Datos actualizados', habilitado: actualizado });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error al actualizar' }); }
};

// Reemplazo total de los vínculos (turnos de 12h agrupados) del ARM
const actualizarVinculos = async (req, res) => {
  const { id } = req.params;
  const { vinculos } = req.body;
  try {
    const hab = await prisma.arm_habilitado.findUnique({ where: { id: parseInt(id) } });
    if (!hab) return res.status(404).json({ error: 'ARM no encontrado' });
    const { filas, error } = normalizarVinculosArm(vinculos);
    if (error) return res.status(400).json({ error });
    await prisma.turno_regulacion.deleteMany({ where: { usuario_id: hab.usuario_id } });
    if (filas.length > 0) {
      await prisma.turno_regulacion.createMany({ data: filas.map(f => ({ usuario_id: hab.usuario_id, ...f })) });
    }
    res.json({ mensaje: 'Vínculos actualizados', turnos: filas });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error al actualizar vínculos' }); }
};

const toggleActivo = async (req, res) => {
  const { id } = req.params;
  const { activo } = req.body;
  try {
    const hab = await prisma.arm_habilitado.update({ where: { id: parseInt(id) }, data: { activo: Boolean(activo) } });
    res.json(hab);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error al actualizar ARM' }); }
};

module.exports = {
  getArms, crearArm, agregarContacto, editarContacto, eliminarContacto,
  actualizarRegistro, actualizarVinculos, toggleActivo
};