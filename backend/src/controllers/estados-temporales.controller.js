const prisma = require('../config/db');
const { tienePotestad } = require('../config/permisos');

const TIPOS_VALIDOS = ['VACACIONES', 'EN_REPOSO', 'CAMBIO_GUARDIA_TEMPORAL', 'REEMPLAZO'];

// Tipos que requieren indicar el día de semana al que se mueve / que cubre
const TIPOS_CON_DIA = ['CAMBIO_GUARDIA_TEMPORAL', 'REEMPLAZO'];

// Listar estados temporales. Filtros opcionales por query:
//   ?usuario_id=5  ?tipo=VACACIONES  ?vigentes=true  ?incluir_cancelados=true
const getEstadosTemporales = async (req, res) => {
  const { usuario_id, tipo, vigentes, incluir_cancelados } = req.query;
  try {
    const where = {};

    if (incluir_cancelados !== 'true') where.activo = true;
    if (usuario_id) where.usuario_id = parseInt(usuario_id);
    if (tipo) where.tipo = String(tipo).toUpperCase();

    // vigentes = estados que cubren el día de hoy
    if (vigentes === 'true') {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      where.fecha_inicio = { lte: hoy };
      where.fecha_fin = { gte: hoy };
    }

    const estados = await prisma.estado_temporal_personal.findMany({
      where,
      include: {
        usuario: { include: { persona: true, rol: true } },
        usuario_relacionado: { include: { persona: true } },
        registrador: { include: { persona: true } }
      },
      orderBy: { fecha_inicio: 'desc' }
    });

    res.json(estados);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener estados temporales' });
  }
};

// Registrar un estado temporal
const crearEstadoTemporal = async (req, res) => {
  const {
    usuario_id, tipo, fecha_inicio, fecha_fin,
    dia_semana_nuevo, usuario_relacionado_id, observacion
  } = req.body;

  try {
    // --- Validaciones de forma ---
    if (!usuario_id || !tipo || !fecha_inicio || !fecha_fin) {
      return res.status(400).json({ error: 'Funcionario, tipo, fecha de inicio y fecha de fin son obligatorios' });
    }

    const tipoNormalizado = String(tipo).toUpperCase();
    if (!TIPOS_VALIDOS.includes(tipoNormalizado)) {
      return res.status(400).json({ error: `Tipo inválido. Valores permitidos: ${TIPOS_VALIDOS.join(', ')}` });
    }

    const inicio = new Date(fecha_inicio);
    const fin = new Date(fecha_fin);
    if (isNaN(inicio) || isNaN(fin)) {
      return res.status(400).json({ error: 'Fechas inválidas' });
    }
    if (fin < inicio) {
      return res.status(400).json({ error: 'La fecha de fin no puede ser anterior a la de inicio' });
    }

    // --- Validaciones propias de cada tipo ---
    let diaNuevo = null;
    if (TIPOS_CON_DIA.includes(tipoNormalizado)) {
      diaNuevo = parseInt(dia_semana_nuevo);
      if (!diaNuevo || diaNuevo < 1 || diaNuevo > 7) {
        return res.status(400).json({ error: `El tipo ${tipoNormalizado} requiere indicar el día de semana (1 a 7)` });
      }
    }

    let relacionadoId = null;
    if (tipoNormalizado === 'REEMPLAZO') {
      if (!usuario_relacionado_id) {
        return res.status(400).json({ error: 'El reemplazo requiere indicar a qué funcionario reemplaza' });
      }
      relacionadoId = parseInt(usuario_relacionado_id);
      if (relacionadoId === parseInt(usuario_id)) {
        return res.status(400).json({ error: 'Un funcionario no puede reemplazarse a sí mismo' });
      }
      const relacionado = await prisma.usuario.findUnique({ where: { id: relacionadoId } });
      if (!relacionado) return res.status(404).json({ error: 'El funcionario reemplazado no existe' });
    }

    // --- El funcionario debe existir y estar activo ---
    const funcionario = await prisma.usuario.findUnique({
      where: { id: parseInt(usuario_id) },
      include: { rol: true, persona: true }
    });
    if (!funcionario) return res.status(404).json({ error: 'Funcionario no encontrado' });
    if (!funcionario.activo) return res.status(400).json({ error: 'El funcionario está inactivo' });

    // --- Potestad: depende del rol del funcionario afectado, no solo del rol de quien pide ---
    if (!tienePotestad(funcionario.rol.nombre, req.usuario.rol)) {
      return res.status(403).json({
        error: `No tenés potestad sobre funcionarios con rol ${funcionario.rol.nombre}`
      });
    }

    // --- No puede haber dos estados activos solapados para el mismo funcionario ---
    const solapado = await prisma.estado_temporal_personal.findFirst({
      where: {
        usuario_id: parseInt(usuario_id),
        activo: true,
        fecha_inicio: { lte: fin },
        fecha_fin: { gte: inicio }
      }
    });
    if (solapado) {
      return res.status(400).json({
        error: `El funcionario ya tiene un estado ${solapado.tipo} entre ${solapado.fecha_inicio.toISOString().slice(0, 10)} y ${solapado.fecha_fin.toISOString().slice(0, 10)}`
      });
    }

    const estado = await prisma.estado_temporal_personal.create({
      data: {
        usuario_id: parseInt(usuario_id),
        tipo: tipoNormalizado,
        fecha_inicio: inicio,
        fecha_fin: fin,
        dia_semana_nuevo: diaNuevo,
        usuario_relacionado_id: relacionadoId,
        observacion: observacion ?? null,
        registrado_por: req.usuario.id,
        activo: true
      },
      include: {
        usuario: { include: { persona: true, rol: true } },
        usuario_relacionado: { include: { persona: true } },
        registrador: { include: { persona: true } }
      }
    });

    res.status(201).json(estado);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al registrar estado temporal' });
  }
};

// Cancelar un estado temporal (baja lógica, conserva el registro)
const cancelarEstadoTemporal = async (req, res) => {
  const { id } = req.params;
  try {
    const existente = await prisma.estado_temporal_personal.findUnique({
      where: { id: parseInt(id) },
      include: { usuario: { include: { rol: true } } }
    });
    if (!existente) return res.status(404).json({ error: 'Estado temporal no encontrado' });
    if (!existente.activo) return res.status(400).json({ error: 'El estado ya estaba cancelado' });

    if (!tienePotestad(existente.usuario.rol.nombre, req.usuario.rol)) {
      return res.status(403).json({
        error: `No tenés potestad sobre funcionarios con rol ${existente.usuario.rol.nombre}`
      });
    }

    const estado = await prisma.estado_temporal_personal.update({
      where: { id: parseInt(id) },
      data: { activo: false }
    });
    res.json({ mensaje: 'Estado temporal cancelado', estado });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al cancelar estado temporal' });
  }
};

module.exports = {
  getEstadosTemporales,
  crearEstadoTemporal,
  cancelarEstadoTemporal,
  TIPOS_VALIDOS
};