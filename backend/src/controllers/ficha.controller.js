const prisma = require('../config/db');

const int = v => { const n = parseInt(v); return isNaN(n) ? null : n; };
const CERRADA = 8;

// Mapea lo ya cargado en recepción a los campos precargados de la ficha (WHO form).
const construirPrecarga = (s) => {
  const sv = (s.signos_vitales && s.signos_vitales[0]) || null;
  const mot = s.solicitud_emergencia?.motivo_consulta || null;
  const ubic = [s.direccion, s.barrio, s.ciudad].filter(Boolean).join(', ');
  return {
    llamante_nombre: s.denunciante_nombre ?? '',
    llamante_telefono: s.denunciante_telefono ?? '',
    paciente_nombre: s.es_nn ? 'N/N' : `${s.paciente_nombre ?? ''} ${s.paciente_apellido ?? ''}`.trim(),
    paciente_documento: s.paciente_documento ?? '',
    paciente_edad: s.paciente_edad ?? '',
    paciente_sexo: s.paciente_sexo ?? '',
    paciente_direccion: ubic,
    lugar_escena: ubic,
    fecha: s.created_at,
    run_number: String(s.id),
    codigo_radial: mot?.codigo_radial ?? s.tipo_servicio?.codigo ?? '',
    motivo_consulta: mot?.nombre ?? '',
    triage: s.prioridad ?? '',
    vs_hr: sv?.frecuencia_cardiaca ?? '',
    vs_rr: sv?.frecuencia_respiratoria ?? '',
    vs_bp: sv?.presion_arterial ?? '',
    vs_temp: sv?.temperatura ?? '',
    vs_spo2: sv?.saturacion ?? '',
    vs_rbs: '',
  };
};

// Devuelve la ficha (si existe) + los datos precargados de recepción.
const getFicha = async (req, res) => {
  try {
    const sid = int(req.params.solicitud_id);
    const s = await prisma.solicitud.findUnique({
      where: { id: sid },
      include: {
        tipo_servicio: true,
        solicitud_emergencia: { include: { motivo_consulta: true } },
        signos_vitales: { orderBy: { created_at: 'asc' }, take: 1 },
        ficha_prehospitalaria: true,
      },
    });
    if (!s) return res.status(404).json({ error: 'Solicitud no encontrada' });

    let ficha = null;
    if (s.ficha_prehospitalaria) {
      let datos = {};
      try { datos = JSON.parse(s.ficha_prehospitalaria.datos || '{}'); } catch (e) {}
      ficha = {
        id: s.ficha_prehospitalaria.id,
        datos,
        firma_entrega: s.ficha_prehospitalaria.firma_entrega,
        firma_prestador: s.ficha_prehospitalaria.firma_prestador,
        updated_at: s.ficha_prehospitalaria.updated_at,
      };
    }
    res.json({ ficha, precarga: construirPrecarga(s), estado_solicitud_id: s.estado_solicitud_id });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error al obtener la ficha' }); }
};

// Crea/actualiza la ficha (upsert). Con cerrar=true, cierra el servicio (estado 8).
const guardarFicha = async (req, res) => {
  try {
    const sid = int(req.params.solicitud_id);
    const { datos, firma_entrega, firma_prestador, cerrar } = req.body;

    const s = await prisma.solicitud.findUnique({
      where: { id: sid },
      include: {
        despacho: {
          where: { estado_despacho_id: { in: [1, 2, 3] } },
          orderBy: { id: 'desc' }, take: 1,
          include: { rol_guardia_movil: { include: { tripulacion: true } } },
        },
      },
    });
    if (!s) return res.status(404).json({ error: 'Solicitud no encontrada' });

    // Solo la tripulación asignada (o admin) puede completar la ficha.
    const trip = s.despacho?.[0]?.rol_guardia_movil?.tripulacion ?? [];
    const enTrip = trip.some(t => t.usuario_id === req.usuario.id && t.activo);
    if (req.usuario.rol !== 'ADMINISTRADOR' && !enTrip) {
      return res.status(403).json({ error: 'Solo la tripulación asignada puede completar la ficha' });
    }

    const datosStr = JSON.stringify(datos ?? {});

    const ficha = await prisma.ficha_prehospitalaria.upsert({
      where: { solicitud_id: sid },
      create: {
        solicitud_id: sid, datos: datosStr,
        firma_entrega: firma_entrega ?? null, firma_prestador: firma_prestador ?? null,
        creado_por: req.usuario.id,
      },
      update: {
        datos: datosStr,
        firma_entrega: firma_entrega ?? null, firma_prestador: firma_prestador ?? null,
      },
    });

    if (cerrar) {
      await prisma.$transaction(async (tx) => {
        const d = s.despacho?.[0];
        if (d && d.estado_despacho_id !== 4 && d.estado_despacho_id !== 5) {
          await tx.despacho.update({ where: { id: d.id }, data: { estado_despacho_id: 4, hora_fin: new Date() } });
          await tx.rol_guardia_movil.update({ where: { id: d.rol_guardia_movil_id }, data: { estado: 'DISPONIBLE' } });
        }
        await tx.solicitud.update({ where: { id: sid }, data: { estado_solicitud_id: CERRADA } });
        await tx.historial_solicitud.create({
          data: {
            solicitud_id: sid, estado_anterior_id: s.estado_solicitud_id, estado_nuevo_id: CERRADA,
            usuario_id: req.usuario.id, observacion: 'Servicio cerrado con ficha prehospitalaria',
          },
        });
      });
    }

    res.status(201).json({ ok: true, ficha_id: ficha.id, cerrada: !!cerrar });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error al guardar la ficha' }); }
};

module.exports = { getFicha, guardarFicha };