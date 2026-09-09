const prisma = require('../config/db');
const { exigeVigencia, comoParamedico, comoConductor, aptoPara } = require('../services/habilitaciones');

// Tipos de rol de guardia. El rol es solo un AGRUPADOR; la disponibilidad la da la vigencia del móvil.
// Se aceptan los valores viejos por compatibilidad y se normalizan a los nuevos.
const TIPOS_GUARDIA = {
  ESTANDAR: 'ESTANDAR', ESPECIAL: 'ESPECIAL',
  TURNO_REGULAR: 'ESTANDAR', COBERTURA_ESPECIAL: 'ESPECIAL',
};

const parseFecha = (v) => { if (!v) return null; const d = new Date(v); return isNaN(d.getTime()) ? null : d; };

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
    const tipoNorm = TIPOS_GUARDIA[tipo];
    if (!tipoNorm) return res.status(400).json({ error: 'Tipo de guardia inválido (Estándar por fecha o Especial por evento)' });
    if (tipoNorm === 'ESPECIAL' && !nombre) return res.status(400).json({ error: 'El nombre del evento es obligatorio para una guardia Especial' });

    const ini = parseFecha(fecha_inicio), fin = parseFecha(fecha_fin);
    if (!ini || !fin) return res.status(400).json({ error: 'Fecha de inicio y fecha de cierre son obligatorias' });
    if (fin <= ini) return res.status(400).json({ error: 'La fecha de cierre debe ser posterior a la de inicio' });
    if (fin <= new Date()) return res.status(400).json({ error: 'No se puede crear una guardia que ya finalizó (fecha en el pasado)' });

    // Generar código
    const ultima = await prisma.rol_guardia.findFirst({ orderBy: { id: 'desc' } });
    const numero = ultima ? parseInt(ultima.codigo.split('-')[1]) + 1 : 1;
    const codigo = `G-${String(numero).padStart(4, '0')}`;

    const guardia = await prisma.rol_guardia.create({
      data: {
        codigo,
        tipo: tipoNorm,
        nombre: nombre || null,
        coordinador_id: parseInt(coordinador_id),
        fecha_inicio: ini,
        fecha_fin: fin,
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
  const { vehiculo_id, base_id, tipo_soporte_id, vigencia_inicio, vigencia_fin } = req.body;
  try {
    const vId = parseInt(vehiculo_id);
    const ini = parseFecha(vigencia_inicio), fin = parseFecha(vigencia_fin);
    if (!vId || !base_id || !tipo_soporte_id) return res.status(400).json({ error: 'Móvil, base y tipo de soporte son obligatorios' });
    if (!ini || !fin) return res.status(400).json({ error: 'La fecha/hora de inicio y de cierre del móvil son obligatorias' });
    if (fin <= ini) return res.status(400).json({ error: 'La fecha/hora de cierre debe ser posterior a la de inicio' });
    if (fin <= new Date()) return res.status(400).json({ error: 'No se puede programar un móvil con horario ya vencido (fecha en el pasado)' });

    // Superposición del vehículo: ventana semiabierta [inicio, fin).
    // Cruzan si (existente.inicio < nueva.fin) Y (existente.fin > nueva.inicio).
    const cruce = await prisma.rol_guardia_movil.findFirst({
      where: {
        vehiculo_id: vId,
        activo: true,
        vigencia_inicio: { lt: fin },
        vigencia_fin: { gt: ini },
      },
      include: { movil: true, rol_guardia: true },
    });
    if (cruce) {
      return res.status(409).json({
        error: `El móvil ${cruce.movil?.cod_movil ?? ''} ya está de guardia entre ${new Date(cruce.vigencia_inicio).toLocaleString('es-PY')} y ${new Date(cruce.vigencia_fin).toLocaleString('es-PY')} (guardia ${cruce.rol_guardia?.codigo ?? ''}). Hay superposición horaria.`
      });
    }

    const movilGuardia = await prisma.rol_guardia_movil.create({
      data: {
        rol_guardia_id: parseInt(id),
        vehiculo_id: vId,
        base_id: parseInt(base_id),
        tipo_soporte_id: parseInt(tipo_soporte_id),
        vigencia_inicio: ini,
        vigencia_fin: fin,
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
    const mId = parseInt(movil_id), uId = parseInt(usuario_id);

    const movil = await prisma.rol_guardia_movil.findUnique({ where: { id: mId } });
    if (!movil) return res.status(404).json({ error: 'Móvil de guardia no encontrado' });

    // Verificar límites de tripulación
    const tripulacionActual = await prisma.tripulacion.findMany({
      where: { rol_guardia_movil_id: mId }
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
    const yaAsignado = tripulacionActual.find(t => t.usuario_id === uId);
    if (yaAsignado) {
      return res.status(400).json({ error: 'Este funcionario ya está asignado a este móvil' });
    }

    // Superposición horaria del funcionario en OTRO móvil (semiabierta [inicio, fin)).
    if (movil.vigencia_inicio && movil.vigencia_fin) {
      const cruce = await prisma.tripulacion.findFirst({
        where: {
          usuario_id: uId,
          activo: true,
          rol_guardia_movil_id: { not: mId },
          rol_guardia_movil: {
            activo: true,
            vigencia_inicio: { lt: movil.vigencia_fin },
            vigencia_fin: { gt: movil.vigencia_inicio },
          },
        },
        include: { rol_guardia_movil: { include: { movil: true } } },
      });
      if (cruce) {
        return res.status(409).json({
          error: `El funcionario ya está asignado al móvil ${cruce.rol_guardia_movil?.movil?.cod_movil ?? ''} en un horario que se superpone. No puede tripular dos móviles a la vez.`
        });
      }
    }

    // Nadie sube a un móvil sin la habilitación vigente para la función que va a
    // cumplir. Se valida acá porque es el único punto donde se conoce la función.
    if (await exigeVigencia()) {
      const funcionario = await prisma.usuario.findUnique({
        where: { id: uId },
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
        rol_guardia_movil_id: mId,
        usuario_id: uId,
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
  const movilId = req.query.movil_id ? parseInt(req.query.movil_id) : null;
  try {
    const guardia = await prisma.rol_guardia.findUnique({
      where: { id: parseInt(guardia_id) }
    });
    if (!guardia) return res.status(404).json({ error: 'Guardia no encontrada' });

    // Ventana de disponibilidad: la del MÓVIL si se indica, si no la del rol.
    let ini = new Date(guardia.fecha_inicio);
    let fin = new Date(guardia.fecha_fin);
    if (movilId) {
      const mv = await prisma.rol_guardia_movil.findUnique({ where: { id: movilId } });
      if (mv?.vigencia_inicio && mv?.vigencia_fin) { ini = new Date(mv.vigencia_inicio); fin = new Date(mv.vigencia_fin); }
    }
    const diaSemana = ini.getDay() === 0 ? 7 : ini.getDay();

    // Funcionarios con tripulación en cualquier móvil cuyo horario se superponga
    // con esta ventana -> no disponibles (evita superposición de personal).
    const movilesSuperpuestos = await prisma.rol_guardia_movil.findMany({
      where: {
        activo: true,
        vigencia_inicio: { lt: fin },
        vigencia_fin: { gt: ini },
      },
      include: { tripulacion: { where: { activo: true } } },
    });
    const usuariosOcupados = movilesSuperpuestos.flatMap(m => m.tripulacion.map(t => t.usuario_id));

    // Estados temporales vigentes que se solapan con el rango
    const estados = await prisma.estado_temporal_personal.findMany({
      where: {
        activo: true,
        fecha_inicio: { lte: fin },
        fecha_fin: { gte: ini }
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

    const excluidos = [...new Set([...usuariosOcupados, ...idsNoDisponibles])];

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