const prisma = require('../config/db');
const { normalizarTurnosMedico } = require('../services/turnos-regulacion');

const getMedicos = async (req, res) => {
  try {
    const medicos = await prisma.medico_habilitado.findMany({
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
    res.json(medicos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener médicos reguladores' });
  }
};

const crearMedico = async (req, res) => {
  const {
    primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
    nro_documento, tipo_documento, sexo, fecha_nacimiento,
    persona_id, turnos, contactos, nro_registro, fecha_vencimiento
  } = req.body;

  try {
    // Se valida antes de escribir nada, para no dejar datos a medio crear
    const { filas, error: errorTurnos } = normalizarTurnosMedico(turnos);
    if (errorTurnos) return res.status(400).json({ error: errorTurnos });

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
      const yaHab = await prisma.medico_habilitado.findFirst({ where: { usuario_id: usuarioExiste.id } });
      if (yaHab) return res.status(400).json({ error: 'Esta persona ya está registrada como médico regulador' });

      await prisma.medico_habilitado.create({
        data: {
          usuario_id: usuarioExiste.id,
          nro_registro: nro_registro ?? '',
          fecha_vencimiento: fecha_vencimiento ? new Date(fecha_vencimiento) : new Date(),
          habilitado_por: req.usuario.id,
          fecha_habilitacion: new Date(),
          activo: true
        }
      });
      if (filas.length > 0) {
        await prisma.turno_regulacion.createMany({ data: filas.map(f => ({ usuario_id: usuarioExiste.id, ...f })) });
      }
      return res.status(201).json({ mensaje: 'Usuario habilitado como médico regulador correctamente' });
    }

    const rol = await prisma.rol.findFirst({ where: { nombre: 'MEDICO_REGULADOR' } });
    if (!rol) return res.status(400).json({ error: 'Rol MEDICO_REGULADOR no encontrado' });

    const persona = await prisma.persona.findUnique({ where: { id: personaId } });
    const iniciales = `${persona.primer_nombre[0]}${persona.primer_apellido[0]}`.toUpperCase();
    const password = `${iniciales}${persona.nro_documento}`;

    const usuario = await prisma.usuario.create({
      data: { persona_id: personaId, rol_id: rol.id, password, activo: true, debe_cambiar_password: true }
    });

    await prisma.medico_habilitado.create({
      data: {
        usuario_id: usuario.id,
        nro_registro: nro_registro ?? '',
        fecha_vencimiento: fecha_vencimiento ? new Date(fecha_vencimiento) : new Date(),
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
    res.status(500).json({ error: 'Error al crear médico regulador' });
  }
};

const agregarContacto = async (req, res) => {
  const { id } = req.params;
  const { tipo_contacto_id, valor, principal } = req.body;
  try {
    const hab = await prisma.medico_habilitado.findUnique({
      where: { id: parseInt(id) },
      include: { usuario: { include: { persona: true } } }
    });
    if (!hab) return res.status(404).json({ error: 'Médico no encontrado' });
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
    const hab = await prisma.medico_habilitado.findUnique({ where: { id: parseInt(id) }, include: { usuario: true } });
    if (!hab) return res.status(404).json({ error: 'Médico no encontrado' });
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
    const hab = await prisma.medico_habilitado.findUnique({ where: { id: parseInt(id) }, include: { usuario: true } });
    if (!hab) return res.status(404).json({ error: 'Médico no encontrado' });
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
    const hab = await prisma.medico_habilitado.findUnique({ where: { id: parseInt(id) } });
    if (!hab) return res.status(404).json({ error: 'Médico no encontrado' });
    const actualizado = await prisma.medico_habilitado.update({
      where: { id: parseInt(id) },
      data: {
        nro_registro: nro_registro !== undefined ? String(nro_registro) : hab.nro_registro,
        fecha_vencimiento: fecha_vencimiento ? new Date(fecha_vencimiento) : hab.fecha_vencimiento
      }
    });
    res.json({ mensaje: 'Registro profesional actualizado', habilitado: actualizado });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error al actualizar el registro' }); }
};

// Reemplazo total de los turnos de 12h del médico
const actualizarTurnos = async (req, res) => {
  const { id } = req.params;
  const { turnos } = req.body;
  try {
    const hab = await prisma.medico_habilitado.findUnique({ where: { id: parseInt(id) } });
    if (!hab) return res.status(404).json({ error: 'Médico no encontrado' });
    const { filas, error } = normalizarTurnosMedico(turnos);
    if (error) return res.status(400).json({ error });
    await prisma.turno_regulacion.deleteMany({ where: { usuario_id: hab.usuario_id } });
    if (filas.length > 0) {
      await prisma.turno_regulacion.createMany({ data: filas.map(f => ({ usuario_id: hab.usuario_id, ...f })) });
    }
    res.json({ mensaje: 'Turnos actualizados', turnos: filas });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error al actualizar turnos' }); }
};

const toggleActivo = async (req, res) => {
  const { id } = req.params;
  const { activo } = req.body;
  try {
    const hab = await prisma.medico_habilitado.update({ where: { id: parseInt(id) }, data: { activo: Boolean(activo) } });
    res.json(hab);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error al actualizar médico' }); }
};

module.exports = {
  getMedicos, crearMedico, agregarContacto, editarContacto, eliminarContacto,
  actualizarRegistro, actualizarTurnos, toggleActivo
};