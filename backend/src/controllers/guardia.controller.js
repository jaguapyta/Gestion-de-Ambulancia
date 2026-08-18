const prisma = require('../config/db');
const { exigeVigencia, comoParamedico, comoConductor, aptoPara } = require('../services/habilitaciones');

const getGuardias = async (req, res) => {
  try {
    const guardias = await prisma.rol_guardia.findMany({
      include: {
        usuario: { include: { persona: true } },
        rol_guardia_movil: {
          include: {
            movil: true,
            base: true,
            tipo_soporte: true,
            tripulacion: {
              include: { usuario: { include: { persona: true } } }
            }
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });
    res.json(guardias);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener guardias' });
  }
};

const getGuardiaActiva = async (req, res) => {
  try {
    const guardia = await prisma.rol_guardia.findFirst({
      where: { estado: 'ACTIVO' },
      include: {
        usuario: { include: { persona: true } },
        rol_guardia_movil: {
          include: {
            movil: true,
            base: true,
            tipo_soporte: true,
            tripulacion: {
              include: { usuario: { include: { persona: true } } }
            }
          }
        }
      }
    });
    res.json(guardia);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener guardia activa' });
  }
};

const getGuardiaById = async (req, res) => {
  const { id } = req.params;
  try {
    const guardia = await prisma.rol_guardia.findUnique({
      where: { id: parseInt(id) },
      include: {
        usuario: { include: { persona: true } },
        rol_guardia_movil: {
          include: {
            movil: true,
            base: true,
            tipo_soporte: true,
            tripulacion: {
              include: { usuario: { include: { persona: true } } }
            }
          }
        }
      }
    });
    if (!guardia) return res.status(404).json({ error: 'Guardia no encontrada' });
    res.json(guardia);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener guardia' });
  }
};

const crearGuardia = async (req, res) => {
  const { tipo, nombre, coordinador_id, fecha_inicio, fecha_fin, observacion } = req.body;
  try {
    // Generar código
    const ultima = await prisma.rol_guardia.findFirst({ orderBy: { id: 'desc' } });
    const numero = ultima ? parseInt(ultima.codigo.split('-')[1]) + 1 : 1;
    const codigo = `G-${String(numero).padStart(4, '0')}`;

    const guardia = await prisma.rol_guardia.create({
      data: {
        codigo,
        tipo,
        nombre: nombre || null,
        coordinador_id: parseInt(coordinador_id),
        fecha_inicio: new Date(fecha_inicio),
        fecha_fin: new Date(fecha_fin),
        observacion: observacion || null,
        estado: 'PLANIFICADO'
      }
    });
    res.status(201).json(guardia);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear guardia' });
  }
};

const cambiarEstado = async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;
  try {
    const guardia = await prisma.rol_guardia.update({
      where: { id: parseInt(id) },
      data: { estado }
    });
    res.json(guardia);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cambiar estado' });
  }
};

const agregarMovil = async (req, res) => {
  const { id } = req.params;
  const { vehiculo_id, base_id, tipo_soporte_id } = req.body;
  try {
    // Verificar que el móvil no esté ya en esta guardia
    const yaAsignado = await prisma.rol_guardia_movil.findFirst({
      where: {
        rol_guardia_id: parseInt(id),
        vehiculo_id: parseInt(vehiculo_id)
      }
    });
    if (yaAsignado) {
      return res.status(400).json({ error: 'Este móvil ya está asignado a esta guardia' });
    }

    const movilGuardia = await prisma.rol_guardia_movil.create({
      data: {
        rol_guardia_id: parseInt(id),
        vehiculo_id: parseInt(vehiculo_id),
        base_id: parseInt(base_id),
        tipo_soporte_id: parseInt(tipo_soporte_id),
        estado: 'DISPONIBLE'
      },
      include: {
        movil: true,
        base: true,
        tipo_soporte: true
      }
    });
    res.status(201).json(movilGuardia);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al agregar móvil' });
  }
};

const agregarTripulante = async (req, res) => {
  const { movil_id } = req.params;
  const { usuario_id, funcion } = req.body;
  try {
    // Verificar límites de tripulación
    const tripulacionActual = await prisma.tripulacion.findMany({
      where: { rol_guardia_movil_id: parseInt(movil_id) }
    });

    const conductores = tripulacionActual.filter(t => t.funcion === 'CONDUCTOR');
    const paramedicos = tripulacionActual.filter(t => t.funcion === 'PARAMÉDICO');

    if (funcion === 'CONDUCTOR' && conductores.length >= 1) {
      return res.status(400).json({ error: 'Ya existe un conductor asignado a este móvil' });
    }

    if (funcion === 'PARAMÉDICO' && paramedicos.length >= 2) {
      return res.status(400).json({ error: 'Ya hay 2 paramédicos asignados a este móvil (máximo permitido)' });
    }

    // Verificar que el usuario no esté ya en este móvil
    const yaAsignado = tripulacionActual.find(t => t.usuario_id === parseInt(usuario_id));
    if (yaAsignado) {
      return res.status(400).json({ error: 'Este funcionario ya está asignado a este móvil' });
    }

    // Nadie sube a un móvil sin la habilitación vigente para la función que va a
    // cumplir. Se valida acá porque es el único punto donde se conoce la función.
    if (await exigeVigencia()) {
      const funcionario = await prisma.usuario.findUnique({
        where: { id: parseInt(usuario_id) },
        include: {
          persona: true,
          paramedico_habilitado_usuario: true,
          conductor_habilitado_usuario: true
        }
      });
      if (!funcionario) return res.status(404).json({ error: 'Funcionario no encontrado' });

      const estado = aptoPara(funcionario, funcion);
      if (!estado.apto) {
        return res.status(400).json({
          error: `${funcionario.persona.primer_nombre} ${funcionario.persona.primer_apellido} no puede asignarse como ${funcion}: ${estado.motivo}`
        });
      }
    }

    const tripulante = await prisma.tripulacion.create({
      data: {
        rol_guardia_movil_id: parseInt(movil_id),
        usuario_id: parseInt(usuario_id),
        funcion,
        activo: true
      },
      include: {
        usuario: { include: { persona: true } }
      }
    });
    res.status(201).json(tripulante);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al agregar tripulante' });
  }
};

const actualizarEstadoMovil = async (req, res) => {
  const { movilId } = req.params;
  const { estado } = req.body;
  try {
    const movilGuardia = await prisma.rol_guardia_movil.update({
      where: { id: parseInt(movilId) },
      data: { estado }
    });
    res.json(movilGuardia);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar estado del móvil' });
  }
};

const getPersonalDisponible = async (req, res) => {
  const { guardia_id } = req.params;
  try {
    const guardia = await prisma.rol_guardia.findUnique({
      where: { id: parseInt(guardia_id) }
    });
    if (!guardia) return res.status(404).json({ error: 'Guardia no encontrada' });

    const fecha = new Date(guardia.fecha_inicio);
    const diaSemana = fecha.getDay() === 0 ? 7 : fecha.getDay();

    // Funcionarios ya asignados a algún móvil de esta guardia
    const movilesGuardia = await prisma.rol_guardia_movil.findMany({
      where: { rol_guardia_id: parseInt(guardia_id) },
      include: { tripulacion: true }
    });
    const usuariosEnGuardia = movilesGuardia.flatMap(m => m.tripulacion.map(t => t.usuario_id));

    // Estados temporales vigentes que se solapan con el rango de la guardia
    const estados = await prisma.estado_temporal_personal.findMany({
      where: {
        activo: true,
        fecha_inicio: { lte: new Date(guardia.fecha_fin) },
        fecha_fin: { gte: new Date(guardia.fecha_inicio) }
      },
      include: { usuario: { include: { persona: true } } }
    });

    // VACACIONES y EN_REPOSO sacan al funcionario de la grilla.
    // CAMBIO_GUARDIA_TEMPORAL lo saca de su día habitual, salvo que el día nuevo sea justo este.
    const idsNoDisponibles = [];
    // CAMBIO_GUARDIA_TEMPORAL y REEMPLAZO lo incorporan en el día que indica dia_semana_nuevo
    const idsIncorporados = [];

    for (const e of estados) {
      if (e.tipo === 'VACACIONES' || e.tipo === 'EN_REPOSO') {
        idsNoDisponibles.push(e.usuario_id);
      } else if (e.tipo === 'CAMBIO_GUARDIA_TEMPORAL') {
        if (e.dia_semana_nuevo === diaSemana) idsIncorporados.push(e.usuario_id);
        else idsNoDisponibles.push(e.usuario_id);
      } else if (e.tipo === 'REEMPLAZO') {
        if (e.dia_semana_nuevo === diaSemana) idsIncorporados.push(e.usuario_id);
      }
    }

    const excluidos = [...new Set([...usuariosEnGuardia, ...idsNoDisponibles])];

    const exigir = await exigeVigencia();

    const personalCrudo = await prisma.usuario.findMany({
      where: {
        activo: true,
        id: { notIn: excluidos.length > 0 ? excluidos : [0] },
        OR: [
          // Le toca por su horario habitual
          { horario_guardia: { some: { dia_semana: diaSemana, activo: true } } },
          // O fue incorporado por un cambio de guardia o un reemplazo
          { id: { in: idsIncorporados.length > 0 ? idsIncorporados : [0] } }
        ]
      },
      include: {
        persona: true,
        rol: true,
        paramedico_habilitado_usuario: true,
        conductor_habilitado_usuario: true
      }
    });

    // El estado de las habilitaciones se informa siempre, para que la UI pueda
    // advertir. Solo se filtra cuando la configuración exige vigencia.
    const personalConEstado = personalCrudo.map(u => ({
      ...u,
      habilitacion: {
        paramedico: comoParamedico(u),
        conductor: comoConductor(u)
      }
    }));

    const personal = exigir
      ? personalConEstado.filter(u => u.habilitacion.paramedico.apto || u.habilitacion.conductor.apto)
      : personalConEstado;

    // Se devuelve también a los excluidos por estado temporal, para que la UI
    // pueda mostrar el motivo en vez de que el funcionario "desaparezca" sin explicación
    const noDisponibles = estados
      .filter(e => idsNoDisponibles.includes(e.usuario_id))
      .map(e => ({
        usuario_id: e.usuario_id,
        nombre: `${e.usuario.persona.primer_nombre} ${e.usuario.persona.primer_apellido}`,
        tipo: e.tipo,
        fecha_inicio: e.fecha_inicio,
        fecha_fin: e.fecha_fin
      }));

    res.json({ dia_semana: diaSemana, personal, no_disponibles: noDisponibles, exige_habilitacion_vigente: exigir });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener personal disponible' });
  }
};

const eliminarTripulante = async (req, res) => {
  const { tripulante_id } = req.params;
  try {
    await prisma.tripulacion.delete({
      where: { id: parseInt(tripulante_id) }
    });
    res.json({ mensaje: 'Tripulante eliminado correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar tripulante' });
  }
};

const eliminarMovilGuardia = async (req, res) => {
  const { movil_id } = req.params;
  try {
    // Verificar que no tenga tripulación asignada
    const tripulacion = await prisma.tripulacion.findMany({
      where: { rol_guardia_movil_id: parseInt(movil_id) }
    });
    if (tripulacion.length > 0) {
      return res.status(400).json({ error: 'El móvil tiene tripulación asignada. Eliminá primero los tripulantes.' });
    }

    await prisma.rol_guardia_movil.delete({
      where: { id: parseInt(movil_id) }
    });
    res.json({ mensaje: 'Móvil eliminado de la guardia correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar móvil de la guardia' });
  }
};

module.exports = { getGuardias, getGuardiaActiva, getGuardiaById, crearGuardia, cambiarEstado, agregarMovil, agregarTripulante, actualizarEstadoMovil, getPersonalDisponible, eliminarTripulante, eliminarMovilGuardia };