const prisma = require('../config/db');

const ROLES_HORARIO = ['ARM', 'MEDICO_REGULADOR'];

// "YYYY-MM-DDTHH:mm" en hora de Paraguay (UTC-3 todo el año) -> instante Date.
function desdeAsuncion(s) {
  if (!s) return null;
  const base = String(s).slice(0, 16); // YYYY-MM-DDTHH:mm
  const d = new Date(`${base}:00-03:00`);
  return isNaN(d.getTime()) ? null : d;
}

const listar = async (req, res) => {
  try {
    const registros = await prisma.acceso_excepcional.findMany({
      orderBy: { vigencia_inicio: 'desc' },
      take: 200,
      include: {
        usuario: { include: { persona: true, rol: true } },
        autorizador: { include: { persona: true } },
      },
    });
    const ahora = new Date();
    res.json(registros.map((e) => ({
      id: e.id,
      usuario_id: e.usuario_id,
      usuario_nombre: e.usuario ? `${e.usuario.persona.primer_nombre} ${e.usuario.persona.primer_apellido}` : '—',
      rol: e.usuario?.rol?.nombre ?? '—',
      vigencia_inicio: e.vigencia_inicio,
      vigencia_fin: e.vigencia_fin,
      motivo: e.motivo,
      autorizador_nombre: e.autorizador ? `${e.autorizador.persona.primer_nombre} ${e.autorizador.persona.primer_apellido}` : '—',
      activo: e.activo,
      vigente: e.activo && e.vigencia_inicio <= ahora && e.vigencia_fin > ahora,
      created_at: e.created_at,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener las excepciones' });
  }
};

const crear = async (req, res) => {
  const { usuario_id, vigencia_inicio, vigencia_fin, motivo } = req.body;
  try {
    if (!usuario_id || !vigencia_inicio || !vigencia_fin || !motivo || !motivo.trim()) {
      return res.status(400).json({ error: 'Usuario, vigencia y motivo son obligatorios' });
    }
    const ini = desdeAsuncion(vigencia_inicio);
    const fin = desdeAsuncion(vigencia_fin);
    if (!ini || !fin) return res.status(400).json({ error: 'Fechas inválidas' });
    if (fin <= ini) return res.status(400).json({ error: 'La fecha/hora de fin debe ser posterior a la de inicio' });

    const usuario = await prisma.usuario.findUnique({
      where: { id: parseInt(usuario_id) },
      include: { rol: true },
    });
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (!ROLES_HORARIO.includes(usuario.rol.nombre)) {
      return res.status(400).json({ error: 'Las excepciones solo aplican a ARM y médicos reguladores' });
    }

    const creada = await prisma.acceso_excepcional.create({
      data: {
        usuario_id: parseInt(usuario_id),
        vigencia_inicio: ini,
        vigencia_fin: fin,
        motivo: motivo.trim().slice(0, 255),
        autorizado_por: req.usuario.id,
        activo: true,
      },
    });
    res.status(201).json(creada);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear la excepción' });
  }
};

const revocar = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.acceso_excepcional.update({
      where: { id: parseInt(id) },
      data: { activo: false },
    });
    res.json({ mensaje: 'Excepción revocada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al revocar la excepción' });
  }
};

module.exports = { listar, crear, revocar };