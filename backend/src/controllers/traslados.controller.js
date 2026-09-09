const prisma = require('../config/db');

const TIPO_TRASLADO = 2;   // tipo_solicitud TRASLADO
const ESTADO_PENDIENTE = 1;

const num = (v) => (v === '' || v === null || v === undefined ? null : Number(v));
const int = (v) => { const n = parseInt(v); return isNaN(n) ? null : n; };

const canalTelefonoId = async () => {
  const c = await prisma.canal_ingreso.findFirst({ where: { nombre: 'TELEFONO' } });
  return c?.id ?? 1;
};

// Catálogos del formulario de traslado
const getCatalogos = async (req, res) => {
  try {
    const [servicios, requerimientos, tipos_oxigeno, tipos_inotropico, canales] = await Promise.all([
      prisma.tipo_servicio.findMany({ where: { activo: true }, orderBy: { id: 'asc' } }),
      prisma.tipo_requerimiento.findMany({ where: { activo: true }, orderBy: { id: 'asc' } }),
      prisma.tipo_oxigeno.findMany({ where: { activo: true }, orderBy: { id: 'asc' } }),
      prisma.tipo_inotripico.findMany({ where: { activo: true }, orderBy: { id: 'asc' } }),
      prisma.canal_ingreso.findMany({ where: { activo: true }, orderBy: { id: 'asc' } }),
    ]);
    res.json({ servicios, requerimientos, tipos_oxigeno, tipos_inotropico, canales });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener catálogos' });
  }
};

// Recepción de un traslado (programado): solicitud + solicitud_traslado + requerimientos + inotrópicos + signos
const crearTraslado = async (req, res) => {
  const b = req.body;
  try {
    if (!b.denunciante_telefono) return res.status(400).json({ error: 'El teléfono es obligatorio' });
    if (!b.tipo_servicio_id) return res.status(400).json({ error: 'Elegí el tipo de traslado' });
    if (b.fecha_hora_traslado && new Date(b.fecha_hora_traslado) <= new Date()) {
      return res.status(400).json({ error: 'La fecha y hora del traslado no puede estar en el pasado' });
    }

    const canalId = b.canal_ingreso_id ? int(b.canal_ingreso_id) : await canalTelefonoId();
    const reqs = await prisma.tipo_requerimiento.findMany();
    const OXI = reqs.find((r) => r.nombre === 'OXIGENO')?.id;
    const INT = reqs.find((r) => r.nombre === 'INTUBADO')?.id;

    const s = b.signos ?? {};
    const haySignos = s.presion_arterial || s.frecuencia_cardiaca || s.frecuencia_respiratoria || s.temperatura || s.glasgow || s.saturacion;

    const creada = await prisma.$transaction(async (tx) => {
      const solicitud = await tx.solicitud.create({
        data: {
          tipo_solicitud_id: TIPO_TRASLADO, tipo_servicio_id: int(b.tipo_servicio_id),
          canal_ingreso_id: canalId, estado_solicitud_id: ESTADO_PENDIENTE, recepcionista_id: req.usuario.id,
          denunciante_telefono: b.denunciante_telefono, denunciante_nombre: b.denunciante_nombre ?? null,
          direccion: b.direccion ?? null, nro_casa: b.nro_casa ?? null, ciudad: b.ciudad ?? null, barrio: b.barrio ?? null,
          paciente_nombre: b.paciente_nombre ?? null, paciente_apellido: b.paciente_apellido ?? null,
          paciente_documento: b.paciente_documento ?? null, paciente_edad: b.paciente_edad ?? null,
          paciente_edad_unidad: b.paciente_edad_unidad ?? null, paciente_sexo: b.paciente_sexo ?? null,
          es_nn: false, observacion: b.observacion ?? null,
        },
      });

      await tx.solicitud_traslado.create({
        data: {
          solicitud_id: solicitud.id,
          fecha_hora_traslado: b.fecha_hora_traslado ? new Date(b.fecha_hora_traslado) : null,
          estudio_procedimiento: b.estudio_procedimiento ?? null,
          origen: b.origen ?? null,
          destino: b.destino ?? null,
          acompana_medico: b.acompana_medico ?? false,
          sexo: b.paciente_sexo ?? null,
          peso: num(b.peso), unidad_peso: b.unidad_peso ?? null,
          diagnostico: b.diagnostico ?? null, ubicacion_paciente: b.ubicacion_paciente ?? null,
          receptor_nombre: b.receptor_nombre ?? null, receptor_lugar: b.receptor_lugar ?? null, receptor_telefono: b.receptor_telefono ?? null,
        },
      });

      // Requerimiento: OXÍGENO (con vía y litros)
      const o = b.oxigeno;
      if (OXI && o && (o.activo || o.tipo_oxigeno_id || o.litros)) {
        await tx.traslado_requerimientos.create({
          data: { solicitud_id: solicitud.id, tipo_requerimiento_id: OXI, tipo_oxigeno_id: o.tipo_oxigeno_id ? int(o.tipo_oxigeno_id) : null, oxigeno_litros: num(o.litros) },
        });
      }
      // Requerimiento: INTUBADO
      if (INT && b.intubado) {
        await tx.traslado_requerimientos.create({ data: { solicitud_id: solicitud.id, tipo_requerimiento_id: INT } });
      }

      // Inotrópicos (con dosis / goteo por cada uno)
      if (Array.isArray(b.inotropicos)) {
        for (const x of b.inotropicos) {
          const tid = int(x.tipo_inotripico_id);
          if (!tid) continue;
          await tx.inotripicos.create({ data: { solicitud_id: solicitud.id, tipo_inotripico_id: tid, dosis: x.dosis || null, goteo: x.goteo || null, usuario_id: req.usuario.id } });
        }
      }

      // Signos vitales
      if (haySignos) {
        await tx.signos_vitales.create({
          data: {
            solicitud_id: solicitud.id,
            presion_arterial: s.presion_arterial ?? null, frecuencia_cardiaca: s.frecuencia_cardiaca ?? null,
            frecuencia_respiratoria: s.frecuencia_respiratoria ?? null, temperatura: num(s.temperatura),
            glasgow: s.glasgow ? int(s.glasgow) : null, saturacion: s.saturacion ?? null, usuario_id: req.usuario.id,
          },
        });
      }

      await tx.historial_solicitud.create({ data: { solicitud_id: solicitud.id, estado_nuevo_id: ESTADO_PENDIENTE, usuario_id: req.usuario.id, observacion: 'Traslado recepcionado' } });
      return solicitud;
    });

    res.status(201).json(creada);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear el traslado' });
  }
};

module.exports = { getCatalogos, crearTraslado };