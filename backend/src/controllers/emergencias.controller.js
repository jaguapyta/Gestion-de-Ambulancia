const prisma = require('../config/db');
const socket = require('../socket');

const int = v => { const n = parseInt(v); return isNaN(n) ? null : n; };
const ORDEN_COLOR = { ROJO: 0, AMARILLO: 1, VERDE: 2, AZUL: 3 };

// Catálogo de motivos con su árbol (preguntas, instrucciones, criterios)
const getCatalogos = async (req, res) => {
  try {
    const motivos = await prisma.motivo_consulta.findMany({
      where: { activo: true },
      include: {
        preguntas: { orderBy: { orden: 'asc' } },
        instrucciones: { orderBy: { orden: 'asc' } },
        criterios: true,
      },
    });
    motivos.sort((a, b) => (ORDEN_COLOR[a.color] ?? 9) - (ORDEN_COLOR[b.color] ?? 9) || a.nombre.localeCompare(b.nombre));
    res.json({ motivos });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error al obtener catálogos' }); }
};

// Crear una emergencia (clasificación por motivo de consulta)
const crearEmergencia = async (req, res) => {
  const b = req.body;
  try {
    const motivoId = int(b.motivo_consulta_id);
    if (!motivoId) return res.status(400).json({ error: 'Elegí el motivo de consulta' });
    const motivo = await prisma.motivo_consulta.findUnique({ where: { id: motivoId } });
    if (!motivo) return res.status(404).json({ error: 'Motivo no encontrado' });

    const base = motivo.color;                          // color base del protocolo
    const prioridad = (b.prioridad || base).toUpperCase();

    const nueva = await prisma.$transaction(async (tx) => {
      const sol = await tx.solicitud.create({
        data: {
          tipo_solicitud_id: 1, estado_solicitud_id: 1,
          canal_ingreso_id: int(b.canal_ingreso_id) || 1, recepcionista_id: req.usuario.id,
          denunciante_nombre: b.denunciante_nombre || null, denunciante_telefono: b.denunciante_telefono || null,
          direccion: b.direccion || null, barrio: b.barrio || null, ciudad: b.ciudad || null,
          latitud: b.latitud ?? null, longitud: b.longitud ?? null,
          paciente_nombre: b.paciente_nombre || null, paciente_apellido: b.paciente_apellido || null,
          paciente_documento: b.paciente_documento || null, paciente_edad: b.paciente_edad || null,
          paciente_edad_unidad: b.paciente_edad_unidad || null, paciente_sexo: b.paciente_sexo || null,
          es_nn: !!b.es_nn, prioridad, observacion: b.observacion || null,
        },
      });
      await tx.solicitud_emergencia.create({
        data: { solicitud_id: sol.id, motivo_consulta_id: motivoId, relato: b.relato || null, cantidad_heridos: int(b.cantidad_heridos) || null },
      });
      await tx.prioridad_log.create({
        data: {
          solicitud_id: sol.id, prioridad_antes: base, prioridad_nueva: prioridad,
          origen: b.origen || (prioridad === base ? 'REGLAS' : 'MANUAL'), usuario_id: req.usuario.id,
          motivo: b.justificacion || (prioridad === base ? 'Color base del motivo (protocolo)' : 'Ajuste del recepcionista'),
        },
      });
      return sol;
    });

    socket.nuevaSolicitud(nueva);
    res.status(201).json({ id: nueva.id, prioridad: nueva.prioridad });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error al crear la emergencia' }); }
};

module.exports = { getCatalogos, crearEmergencia };
