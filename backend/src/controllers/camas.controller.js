const prisma = require('../config/db');

const TIPO_REF_CAMA = 3;   // tipo_solicitud PED_CAMA
const ESTADO_PENDIENTE = 1;
const ESTADOS_CERRADOS = [7, 8, 9, 10, 11]; // FINALIZADA, CERRADA, CANCELADA, FALSA_ALARMA, NO_CONFIRMADA

const num = (v) => (v === '' || v === null || v === undefined ? null : Number(v));
const int = (v) => { const n = parseInt(v); return isNaN(n) ? null : n; };

const canalTelefonoId = async () => {
  const c = await prisma.canal_ingreso.findFirst({ where: { nombre: 'TELEFONO' } });
  return c?.id ?? 1;
};
const nombreUsuario = async (id) => {
  const u = await prisma.usuario.findUnique({ where: { id }, include: { persona: true } });
  return u?.persona ? `${u.persona.primer_nombre} ${u.persona.primer_apellido}`.trim() : `Usuario #${id}`;
};

// Catálogos del formulario de camas
const getCatalogos = async (req, res) => {
  try {
    const [tipos_paciente, tipos_requerimiento, condiciones, tipos_oxigeno, tipos_inotropico, centros] = await Promise.all([
      prisma.tipo_paciente.findMany({ where: { activo: true }, orderBy: { id: 'asc' } }),
      prisma.tipo_requerimiento_cama.findMany({ where: { activo: true }, orderBy: { id: 'asc' } }),
      prisma.condicion_paciente.findMany({ where: { activo: true }, orderBy: { id: 'asc' } }),
      prisma.tipo_oxigeno.findMany({ where: { activo: true }, orderBy: { id: 'asc' } }),
      prisma.tipo_inotripico.findMany({ where: { activo: true }, orderBy: { id: 'asc' } }),
      prisma.hospital.findMany({ where: { activo: true }, orderBy: { nombre: 'asc' } }),
    ]);
    res.json({ tipos_paciente, tipos_requerimiento, condiciones, tipos_oxigeno, tipos_inotropico, centros });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener catálogos' });
  }
};

// Historial de pedidos de cama de un paciente (por cédula).
// ?abierto=1 → solo pedidos NO cerrados (para decidir NUEVO vs REITERACIÓN en recepción).
const getHistorialPaciente = async (req, res) => {
  const { documento } = req.params;
  const soloAbiertos = req.query.abierto === '1';
  try {
    const pedidos = await prisma.solicitud.findMany({
      where: {
        tipo_solicitud_id: TIPO_REF_CAMA,
        paciente_documento: documento,
        ...(soloAbiertos ? { estado_solicitud_id: { notIn: ESTADOS_CERRADOS } } : {}),
      },
      include: {
        estado_solicitud: true, canal_ingreso: true, usuario: { include: { persona: true } },
        solicitud_ref_cama: true,
        ref_cama_clinica: { include: { tipo_paciente: true, tipo_requerimiento_cama: true, condicion_paciente: true } },
        ref_cama_obstetrica: true,
        ref_cama_reiteracion: { include: { tipo_requerimiento_cama: true, condicion_paciente: true, usuario: { include: { persona: true } } }, orderBy: { created_at: 'asc' } },
        signos_vitales: { include: { tipo_oxigeno: true }, orderBy: { created_at: 'asc' } },
      },
      orderBy: { created_at: 'asc' },
    });
    const original = pedidos.find((p) => p.solicitud_ref_cama?.tipo_pedido === 'NUEVO') ?? pedidos[0] ?? null;
    res.json({ existe: pedidos.length > 0, original, pedidos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al buscar el paciente' });
  }
};

const crearPedidoCama = async (req, res) => {
  const b = req.body;
  const esReiteracion = b.tipo_pedido === 'REITERACION';
  try {
    if (!b.centro_solicitante || !b.profesional_nombre || !b.especialidad || !b.telefono_contacto) {
      return res.status(400).json({ error: 'Faltan datos del solicitante (centro, profesional, especialidad, teléfono)' });
    }
    const canalId = await canalTelefonoId();
    const operador = await nombreUsuario(req.usuario.id); // automático e inmodificable

    // Inotrópicos con dosis / goteo por cada uno
    const inotroRows = Array.isArray(b.inotropicos)
      ? b.inotropicos.map((x) => (typeof x === 'object'
          ? { tipo_inotripico_id: int(x.tipo_inotripico_id), dosis: x.dosis || null, goteo: x.goteo || null }
          : { tipo_inotripico_id: int(x), dosis: null, goteo: null })).filter((x) => x.tipo_inotripico_id)
      : [];

    const s = b.signos ?? {};
    const haySignos = s.presion_arterial || s.frecuencia_cardiaca || s.frecuencia_respiratoria || s.temperatura || s.glasgow || s.saturacion;

    // ---------- REITERACIÓN ----------
    if (esReiteracion) {
      if (!b.paciente_documento) return res.status(400).json({ error: 'Falta la cédula del paciente para la reiteración' });
      if (!b.tipo_requerimiento_id || !b.condicion_id) return res.status(400).json({ error: 'La reiteración requiere el requerimiento y la condición' });

      const previos = await prisma.solicitud.findMany({
        where: { tipo_solicitud_id: TIPO_REF_CAMA, paciente_documento: b.paciente_documento, estado_solicitud_id: { notIn: ESTADOS_CERRADOS } },
        include: { solicitud_ref_cama: true }, orderBy: { created_at: 'asc' },
      });
      if (previos.length === 0) return res.status(400).json({ error: 'No hay un pedido abierto para esa cédula. Cargalo como NUEVO.' });
      const original = previos.find((p) => p.solicitud_ref_cama?.tipo_pedido === 'NUEVO') ?? previos[0];
      const nroReit = previos.filter((p) => p.solicitud_ref_cama?.tipo_pedido === 'REITERACION').length + 1;

      const creada = await prisma.$transaction(async (tx) => {
        const solicitud = await tx.solicitud.create({
          data: {
            tipo_solicitud_id: TIPO_REF_CAMA, tipo_servicio_id: null, canal_ingreso_id: canalId,
            estado_solicitud_id: ESTADO_PENDIENTE, recepcionista_id: req.usuario.id, denunciante_telefono: b.telefono_contacto ?? null,
            persona_id: original.persona_id,
            paciente_nombre: original.paciente_nombre, paciente_apellido: original.paciente_apellido,
            paciente_documento: original.paciente_documento, paciente_edad: original.paciente_edad,
            paciente_edad_unidad: original.paciente_edad_unidad, paciente_sexo: original.paciente_sexo,
            observacion: b.observacion ?? null,
          },
        });
        await tx.solicitud_ref_cama.create({
          data: {
            solicitud_id: solicitud.id, tipo_pedido: 'REITERACION', nro_pedido_anterior: original.solicitud_ref_cama?.id ?? null,
            centro_solicitante: b.centro_solicitante, profesional_nombre: b.profesional_nombre,
            especialidad: b.especialidad, telefono_contacto: b.telefono_contacto, operador_medico: operador,
          },
        });
        await tx.ref_cama_reiteracion.create({
          data: {
            solicitud_id: solicitud.id, nro_reiteracion: nroReit,
            tipo_requerimiento_id: int(b.tipo_requerimiento_id), condicion_id: int(b.condicion_id),
            en_uti: b.en_uti ?? false, tratamiento: b.tratamiento ?? null, observacion: b.observacion ?? null, usuario_id: req.usuario.id,
          },
        });
        if (haySignos) await tx.signos_vitales.create({ data: signosData(s, solicitud.id, req.usuario.id) });
        if (inotroRows.length) await tx.inotripicos.createMany({ data: inotroRows.map((r) => ({ solicitud_id: solicitud.id, usuario_id: req.usuario.id, ...r })) });
        await tx.historial_solicitud.create({ data: { solicitud_id: solicitud.id, estado_nuevo_id: ESTADO_PENDIENTE, usuario_id: req.usuario.id, observacion: `Reiteración #${nroReit} recepcionada` } });
        return solicitud;
      });
      return res.status(201).json({ ...creada, tipo_pedido: 'REITERACION' });
    }

    // ---------- NUEVO ----------
    if (!b.tipo_paciente_id) return res.status(400).json({ error: 'Falta el tipo de paciente' });
    if (!b.diagnostico) return res.status(400).json({ error: 'El diagnóstico es obligatorio' });

    const creada = await prisma.$transaction(async (tx) => {
      const solicitud = await tx.solicitud.create({
        data: {
          tipo_solicitud_id: TIPO_REF_CAMA, tipo_servicio_id: null, canal_ingreso_id: canalId,
          estado_solicitud_id: ESTADO_PENDIENTE, recepcionista_id: req.usuario.id, denunciante_telefono: b.telefono_contacto ?? null,
          persona_id: b.persona_id ? int(b.persona_id) : null,
          paciente_nombre: b.paciente_nombre ?? null, paciente_apellido: b.paciente_apellido ?? null,
          paciente_documento: b.paciente_documento ?? null, paciente_edad: b.paciente_edad ?? null,
          paciente_edad_unidad: b.paciente_edad_unidad ?? null, paciente_sexo: b.paciente_sexo ?? null,
          es_nn: b.es_nn ?? false, observacion: b.observacion ?? null,
        },
      });
      await tx.solicitud_ref_cama.create({
        data: {
          solicitud_id: solicitud.id, tipo_pedido: 'NUEVO', nro_pedido_anterior: null,
          centro_solicitante: b.centro_solicitante, profesional_nombre: b.profesional_nombre,
          especialidad: b.especialidad, telefono_contacto: b.telefono_contacto, operador_medico: operador,
        },
      });
      await tx.ref_cama_clinica.create({
        data: {
          solicitud_id: solicitud.id, tipo_paciente_id: int(b.tipo_paciente_id),
          peso: num(b.peso), unidad_peso: b.unidad_peso ?? null, seguro_medico: b.seguro_medico ?? null,
          antecedentes: b.antecedentes ?? null, diagnostico: b.diagnostico,
          tiempo_evolucion: b.tiempo_evolucion ?? null, tiempo_internacion: b.tiempo_internacion ?? null,
          laboratorio: b.laboratorio ?? null, imagenes: b.imagenes ?? null, otros_datos: b.otros_datos ?? null,
          en_uti: b.en_uti ?? false, tratamiento: b.tratamiento ?? null,
          tipo_requerimiento_id: b.tipo_requerimiento_id ? int(b.tipo_requerimiento_id) : null,
          condicion_id: b.condicion_id ? int(b.condicion_id) : null,
        },
      });
      const o = b.obstetrica;
      if (o && (o.edad_gestacional || o.controles_prenatales || o.edad_materna || o.via_parto || o.apgar || o.maduracion_pulmonar)) {
        await tx.ref_cama_obstetrica.create({
          data: {
            solicitud_id: solicitud.id, edad_gestacional: o.edad_gestacional ?? null,
            controles_prenatales: o.controles_prenatales ? int(o.controles_prenatales) : null,
            edad_materna: o.edad_materna ? int(o.edad_materna) : null, via_parto: o.via_parto ?? null,
            apgar: o.apgar ?? null, maduracion_pulmonar: o.maduracion_pulmonar ?? null,
          },
        });
      }
      if (haySignos) await tx.signos_vitales.create({ data: signosData(s, solicitud.id, req.usuario.id) });
      if (inotroRows.length) await tx.inotripicos.createMany({ data: inotroRows.map((r) => ({ solicitud_id: solicitud.id, usuario_id: req.usuario.id, ...r })) });
      await tx.historial_solicitud.create({ data: { solicitud_id: solicitud.id, estado_nuevo_id: ESTADO_PENDIENTE, usuario_id: req.usuario.id, observacion: 'Pedido de cama recepcionado' } });
      return solicitud;
    });
    res.status(201).json({ ...creada, tipo_pedido: 'NUEVO' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear el pedido de cama' });
  }
};

const signosData = (s, solicitud_id, usuario_id) => ({
  solicitud_id,
  presion_arterial: s.presion_arterial ?? null, frecuencia_cardiaca: s.frecuencia_cardiaca ?? null,
  frecuencia_respiratoria: s.frecuencia_respiratoria ?? null, temperatura: num(s.temperatura),
  glasgow: s.glasgow ? int(s.glasgow) : null, saturacion: s.saturacion ?? null,
  tipo_oxigeno_id: s.tipo_oxigeno_id ? int(s.tipo_oxigeno_id) : null, oxigeno_flujo: num(s.oxigeno_flujo),
  usuario_id,
});

module.exports = { getCatalogos, getHistorialPaciente, crearPedidoCama };
