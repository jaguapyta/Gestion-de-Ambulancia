const prisma = require('../config/db');

const TIPO_TRASLADO = 2;   // tipo_solicitud TRASLADO
const ESTADO_PENDIENTE = 1;

const num = (v) => (v === '' || v === null || v === undefined ? null : Number(v));
const int = (v) => { const n = parseInt(v); return isNaN(n) ? null : n; };

// Catálogos del formulario de traslado
const getCatalogos = async (req, res) => {
  try {
    const [servicios, requerimientos, tipos_oxigeno, canales] = await Promise.all([
      prisma.tipo_servicio.findMany({ where: { activo: true }, orderBy: { id: 'asc' } }),
      prisma.tipo_requerimiento.findMany({ where: { activo: true }, orderBy: { id: 'asc' } }),
      prisma.tipo_oxigeno.findMany({ where: { activo: true }, orderBy: { id: 'asc' } }),
      prisma.canal_ingreso.findMany({ where: { activo: true }, orderBy: { id: 'asc' } }),
    ]);
    res.json({ servicios, requerimientos, tipos_oxigeno, canales });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener catálogos' });
  }
};

// Recepción de un traslado: solicitud (TRASLADO) + solicitud_traslado + requerimientos + signos
const crearTraslado = async (req, res) => {
  const b = req.body;
  try {
    if (!b.denunciante_telefono) return res.status(400).json({ error: 'El teléfono del denunciante es obligatorio' });
    if (!b.tipo_servicio_id) return res.status(400).json({ error: 'Elegí el servicio' });
    if (!b.canal_ingreso_id) return res.status(400).json({ error: 'Falta el canal de ingreso' });

    const creada = await prisma.$transaction(async (tx) => {
      const solicitud = await tx.solicitud.create({
        data: {
          tipo_solicitud_id: TIPO_TRASLADO, tipo_servicio_id: int(b.tipo_servicio_id),
          canal_ingreso_id: int(b.canal_ingreso_id), estado_solicitud_id: ESTADO_PENDIENTE,
          recepcionista_id: req.usuario.id,
          denunciante_telefono: b.denunciante_telefono, denunciante_nombre: b.denunciante_nombre ?? null,
          direccion: b.direccion ?? null, nro_casa: b.nro_casa ?? null, ciudad: b.ciudad ?? null, barrio: b.barrio ?? null,
          paciente_nombre: b.paciente_nombre ?? null, paciente_apellido: b.paciente_apellido ?? null,
          paciente_documento: b.paciente_documento ?? null, paciente_edad: b.paciente_edad ?? null,
          paciente_edad_unidad: b.paciente_edad_unidad ?? null, paciente_sexo: b.paciente_sexo ?? null,
          es_nn: b.es_nn ?? false, observacion: b.observacion ?? null,
        },
      });

      await tx.solicitud_traslado.create({
        data: {
          solicitud_id: solicitud.id,
          sexo: b.paciente_sexo ?? null,
          peso: num(b.peso), unidad_peso: b.unidad_peso ?? null,
          diagnostico: b.diagnostico ?? null,
          ubicacion_paciente: b.ubicacion_paciente ?? null,
          receptor_nombre: b.receptor_nombre ?? null,
          receptor_lugar: b.receptor_lugar ?? null,
          receptor_telefono: b.receptor_telefono ?? null,
        },
      });

      // Requerimientos para el traslado (OXÍGENO / INOTRÓPICO / VENTILADO)
      if (Array.isArray(b.requerimientos)) {
        for (const r of b.requerimientos) {
          const rid = int(typeof r === 'object' ? r.tipo_requerimiento_id : r);
          if (!rid) continue;
          await tx.traslado_requerimientos.create({
            data: {
              solicitud_id: solicitud.id,
              tipo_requerimiento_id: rid,
              tipo_oxigeno_id: (typeof r === 'object' && r.tipo_oxigeno_id) ? int(r.tipo_oxigeno_id) : null,
              oxigeno_litros: (typeof r === 'object') ? num(r.oxigeno_litros) : null,
            },
          });
        }
      }

      // Signos vitales
      const s = b.signos;
      if (s && (s.presion_arterial || s.frecuencia_cardiaca || s.frecuencia_respiratoria || s.temperatura || s.glasgow || s.saturacion)) {
        await tx.signos_vitales.create({
          data: {
            solicitud_id: solicitud.id,
            presion_arterial: s.presion_arterial ?? null, frecuencia_cardiaca: s.frecuencia_cardiaca ?? null,
            frecuencia_respiratoria: s.frecuencia_respiratoria ?? null, temperatura: num(s.temperatura),
            glasgow: s.glasgow ? int(s.glasgow) : null, saturacion: s.saturacion ?? null,
            tipo_oxigeno_id: s.tipo_oxigeno_id ? int(s.tipo_oxigeno_id) : null, oxigeno_flujo: num(s.oxigeno_flujo),
            usuario_id: req.usuario.id,
          },
        });
      }

      await tx.historial_solicitud.create({
        data: { solicitud_id: solicitud.id, estado_nuevo_id: ESTADO_PENDIENTE, usuario_id: req.usuario.id, observacion: 'Traslado recepcionado' },
      });

      return solicitud;
    });

    res.status(201).json(creada);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear el traslado' });
  }
};

module.exports = { getCatalogos, crearTraslado };
