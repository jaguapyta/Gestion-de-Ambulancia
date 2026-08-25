const prisma = require('../config/db');

const TIPO_TRASLADO = 2;
const ESTADO_PENDIENTE = 1;
const SERV_IDA = 6;     // 10.56 CONSULTA / INTERNACION (casa → centro)
const SERV_VUELTA = 5;  // 10.54 PACIENTE DE ALTA (centro → casa)
const int = (v) => { const n = parseInt(v); return isNaN(n) ? null : n; };

const canalTelefonoId = async () => {
  const c = await prisma.canal_ingreso.findFirst({ where: { nombre: 'TELEFONO' } });
  return c?.id ?? 1;
};
const edadDe = (fecha) => {
  if (!fecha) return null;
  const anios = Math.floor((Date.now() - new Date(fecha).getTime()) / (365.25 * 24 * 3600 * 1000));
  return anios >= 0 ? String(anios) : null;
};

// Buscar paciente en el padrón por cédula
const buscarPaciente = async (req, res) => {
  const { documento } = req.params;
  try {
    const pd = await prisma.paciente_dialisis.findFirst({
      where: { activo: true, persona: { nro_documento: documento } },
      include: { persona: true },
    });
    if (!pd) return res.json({ existe: false });
    res.json({ existe: true, paciente: pd });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error al buscar el paciente' }); }
};

// Alta de traslado de diálisis (IDA / VUELTA)
const crearTraslado = async (req, res) => {
  const b = req.body;
  try {
    if (!b.paciente_dialisis_id) return res.status(400).json({ error: 'Buscá y elegí un paciente del padrón' });
    if (b.tipo !== 'IDA' && b.tipo !== 'VUELTA') return res.status(400).json({ error: 'Elegí ida o vuelta' });

    const pd = await prisma.paciente_dialisis.findUnique({ where: { id: int(b.paciente_dialisis_id) }, include: { persona: true } });
    if (!pd) return res.status(404).json({ error: 'Paciente no encontrado en el padrón' });

    const canalId = await canalTelefonoId();
    const servicioId = b.tipo === 'IDA' ? SERV_IDA : SERV_VUELTA;
    const per = pd.persona;

    const creada = await prisma.$transaction(async (tx) => {
      const sol = await tx.solicitud.create({
        data: {
          tipo_solicitud_id: TIPO_TRASLADO, tipo_servicio_id: servicioId, canal_ingreso_id: canalId,
          estado_solicitud_id: ESTADO_PENDIENTE, recepcionista_id: req.usuario.id,
          denunciante_telefono: b.denunciante_telefono ?? null, denunciante_nombre: b.denunciante_nombre ?? null,
          direccion: b.direccion ?? null, nro_casa: b.nro_casa ?? null, ciudad: b.ciudad ?? null, barrio: b.barrio ?? null,
          persona_id: per.id,
          paciente_nombre: per.primer_nombre, paciente_apellido: per.primer_apellido, paciente_documento: per.nro_documento,
          paciente_edad: edadDe(per.fecha_nacimiento), paciente_edad_unidad: 'AÑOS DE VIDA', paciente_sexo: per.sexo,
          es_nn: false, observacion: b.observacion ?? null,
        },
      });
      await tx.traslado_dialisis.create({
        data: { solicitud_id: sol.id, paciente_dialisis_id: pd.id, tipo: b.tipo, centro_dialisis: pd.centro_dialisis, hora_turno: pd.hora_turno, observacion: b.observacion ?? null },
      });
      await tx.solicitud_traslado.create({
        data: { solicitud_id: sol.id, fecha_hora_traslado: b.fecha_hora_traslado ? new Date(b.fecha_hora_traslado) : null, origen: b.origen ?? null, destino: b.destino ?? null, ubicacion_paciente: b.ubicacion_paciente ?? null, sexo: per.sexo },
      });
      await tx.historial_solicitud.create({ data: { solicitud_id: sol.id, estado_nuevo_id: ESTADO_PENDIENTE, usuario_id: req.usuario.id, observacion: `Diálisis (${b.tipo}) recepcionada` } });
      return sol;
    });
    res.status(201).json(creada);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error al registrar el traslado de diálisis' }); }
};

module.exports = { buscarPaciente, crearTraslado };