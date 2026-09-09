// Reasignar el móvil de un despacho.
//  - EMERGENCIA: solo mientras el móvil no llegó al lugar (estado_despacho DESPACHADO=1).
//                Cuando la tripulación marca "en el lugar" (2) ya no se puede cambiar.
//  - TRASLADO / CAMA: se puede reasignar mientras el servicio no esté cerrado (4 FINALIZADO / 5 CANCELADO).
const reasignar = async (req, res) => {
  const { id } = req.params;                       // id del despacho
  const { rol_guardia_movil_id, observacion } = req.body;
  try {
    const did = int(id), nuevoMovil = int(rol_guardia_movil_id);
    if (!did || !nuevoMovil) return res.status(400).json({ error: 'Falta despacho o móvil nuevo' });

    const d = await prisma.despacho.findUnique({ where: { id: did }, include: { solicitud: true } });
    if (!d) return res.status(404).json({ error: 'Despacho no encontrado' });

    const esEmergencia = d.solicitud?.tipo_solicitud_id === 1;
    if (esEmergencia && d.estado_despacho_id !== 1) {
      return res.status(409).json({ error: 'La emergencia ya está en el lugar: no se puede reasignar el móvil' });
    }
    if (!esEmergencia && [4, 5].includes(d.estado_despacho_id)) {
      return res.status(409).json({ error: 'El servicio ya está cerrado: no se puede reasignar el móvil' });
    }
    if (d.rol_guardia_movil_id === nuevoMovil) {
      return res.status(400).json({ error: 'Es el mismo móvil' });
    }
    const movilNuevo = await prisma.rol_guardia_movil.findUnique({ where: { id: nuevoMovil } });
    if (!movilNuevo || !movilNuevo.activo) return res.status(404).json({ error: 'Móvil no disponible' });

    const upd = await prisma.$transaction(async (tx) => {
      const anterior = d.rol_guardia_movil_id;
      const r = await tx.despacho.update({ where: { id: did }, data: { rol_guardia_movil_id: nuevoMovil } });
      await tx.rol_guardia_movil.update({ where: { id: anterior }, data: { estado: 'DISPONIBLE' } });
      await tx.rol_guardia_movil.update({ where: { id: nuevoMovil }, data: { estado: 'OCUPADO' } });
      await tx.historial_solicitud.create({
        data: {
          solicitud_id: d.solicitud_id,
          estado_anterior_id: d.solicitud.estado_solicitud_id,
          estado_nuevo_id: d.solicitud.estado_solicitud_id,
          usuario_id: req.usuario.id, observacion: observacion || 'Reasignación de móvil',
        },
      });
      return r;
    });
    socket.ambulanciaAsignada(upd);
    socket.cambioEstadoVehiculo({ rol_guardia_movil_id: d.rol_guardia_movil_id, estado: 'DISPONIBLE' });
    socket.cambioEstadoVehiculo({ rol_guardia_movil_id: nuevoMovil, estado: 'OCUPADO' });
    res.json(upd);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Error al reasignar el móvil' }); }
};