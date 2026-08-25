const prisma = require('../config/db');

const horaToDate = (h) => (h ? new Date(`1970-01-01T${h}:00Z`) : null);

const getPacientes = async (req, res) => {
  try {
    const pacientes = await prisma.paciente_dialisis.findMany({
      include: { persona: true },
      orderBy: { id: 'desc' },
    });
    res.json(pacientes);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error al obtener el padrón' }); }
};

const crearPaciente = async (req, res) => {
  const {
    primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
    nro_documento, tipo_documento, sexo, fecha_nacimiento, persona_id,
    centro_dialisis, dias_semana, hora_turno, observacion,
  } = req.body;
  try {
    if (!centro_dialisis) return res.status(400).json({ error: 'El centro de diálisis es obligatorio' });

    let personaId = persona_id ? parseInt(persona_id) : null;
    if (!personaId) {
      const existe = await prisma.persona.findFirst({ where: { nro_documento } });
      if (existe) personaId = existe.id;
      else {
        if (!primer_nombre || !primer_apellido || !nro_documento) return res.status(400).json({ error: 'Faltan datos del paciente' });
        const persona = await prisma.persona.create({
          data: {
            primer_nombre: primer_nombre.toUpperCase(),
            segundo_nombre: segundo_nombre ? segundo_nombre.toUpperCase() : null,
            primer_apellido: primer_apellido.toUpperCase(),
            segundo_apellido: segundo_apellido ? segundo_apellido.toUpperCase() : null,
            nro_documento, tipo_documento: parseInt(tipo_documento) || 1, sexo: sexo || 'M',
            fecha_nacimiento: fecha_nacimiento ? new Date(fecha_nacimiento) : new Date('1900-01-01'),
          },
        });
        personaId = persona.id;
      }
    }

    const ya = await prisma.paciente_dialisis.findFirst({ where: { persona_id: personaId } });
    if (ya) return res.status(400).json({ error: 'Esta persona ya está en el padrón de dializados' });

    const pd = await prisma.paciente_dialisis.create({
      data: { persona_id: personaId, centro_dialisis, dias_semana: dias_semana ?? '', hora_turno: horaToDate(hora_turno), observacion: observacion ?? null, activo: true },
    });
    res.status(201).json(pd);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error al registrar el paciente' }); }
};

const actualizarPaciente = async (req, res) => {
  const { id } = req.params;
  const { centro_dialisis, dias_semana, hora_turno, observacion } = req.body;
  try {
    const pd = await prisma.paciente_dialisis.update({
      where: { id: parseInt(id) },
      data: {
        centro_dialisis: centro_dialisis ?? undefined,
        dias_semana: dias_semana ?? undefined,
        hora_turno: hora_turno !== undefined ? horaToDate(hora_turno) : undefined,
        observacion: observacion ?? undefined,
      },
    });
    res.json(pd);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error al actualizar' }); }
};

const toggleActivo = async (req, res) => {
  const { id } = req.params;
  const { activo } = req.body;
  try {
    const pd = await prisma.paciente_dialisis.update({ where: { id: parseInt(id) }, data: { activo: Boolean(activo) } });
    res.json(pd);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error al actualizar' }); }
};

module.exports = { getPacientes, crearPaciente, actualizarPaciente, toggleActivo };