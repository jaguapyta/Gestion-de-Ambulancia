let io;

module.exports = (socketIo) => {
  io = socketIo;

  io.on('connection', (socket) => {
    console.log('Cliente conectado:', socket.id);

    // Unirse a sala por rol
    socket.on('join_sala', (rol) => {
      socket.join(rol);
      console.log(`Socket ${socket.id} se unió a sala: ${rol}`);
    });

    // Unirse a sala de solicitud específica
    socket.on('join_solicitud', (solicitud_id) => {
      socket.join(`solicitud_${solicitud_id}`);
      console.log(`Socket ${socket.id} siguiendo solicitud: ${solicitud_id}`);
    });

    socket.on('disconnect', () => {
      console.log('Cliente desconectado:', socket.id);
    });
  });
};

// Emitir nueva solicitud a recepcionistas y despachantes
const nuevaSolicitud = (solicitud) => {
  if (!io) return;
  io.to('RECEPCIONISTA').emit('nueva_solicitud', solicitud);
  io.to('DESPACHANTE').emit('nueva_solicitud', solicitud);
  io.to('ADMINISTRADOR').emit('nueva_solicitud', solicitud);
};

// Emitir cambio de estado de solicitud
const cambioEstadoSolicitud = (solicitud) => {
  if (!io) return;
  io.emit('cambio_estado_solicitud', solicitud);
};

// Emitir asignación de ambulancia
const ambulanciaAsignada = (despacho) => {
  if (!io) return;
  io.to('DESPACHANTE').emit('ambulancia_asignada', despacho);
  io.to('ADMINISTRADOR').emit('ambulancia_asignada', despacho);
};

// Emitir cambio de estado de vehículo
const cambioEstadoVehiculo = (vehiculo) => {
  if (!io) return;
  io.emit('cambio_estado_vehiculo', vehiculo);
};

module.exports.nuevaSolicitud = nuevaSolicitud;
module.exports.cambioEstadoSolicitud = cambioEstadoSolicitud;
module.exports.ambulanciaAsignada = ambulanciaAsignada;
module.exports.cambioEstadoVehiculo = cambioEstadoVehiculo;