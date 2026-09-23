const prisma = require('../config/db');

const getConfiguracion = async (req, res) => {
  try {
    const config = await prisma.configuracion.findUnique({ where: { id: 1 } });
    res.json(config);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
};

const updateConfiguracion = async (req, res) => {
  const {
    nombre_sistema, telefono_emergencias, direccion, ciudad,
    tiempo_sesion_minutos, exigir_habilitacion_vigente, jefe_transporte,
    alerta_solicitud_min, alerta_habilitacion_dias, alerta_excepcion_horas, alerta_cama_horas,
    movil_demorado_min,
  } = req.body;
  const num = (v) => (v === undefined || v === null || v === '' ? undefined : parseInt(v));
  try {
    const config = await prisma.configuracion.update({
      where: { id: 1 },
      data: {
        nombre_sistema,
        telefono_emergencias,
        direccion,
        ciudad,
        tiempo_sesion_minutos: parseInt(tiempo_sesion_minutos),
        ...(exigir_habilitacion_vigente !== undefined && {
          exigir_habilitacion_vigente: Boolean(exigir_habilitacion_vigente)
        }),
        ...(jefe_transporte !== undefined && { jefe_transporte }),
        ...(num(alerta_solicitud_min) !== undefined && { alerta_solicitud_min: num(alerta_solicitud_min) }),
        ...(num(alerta_habilitacion_dias) !== undefined && { alerta_habilitacion_dias: num(alerta_habilitacion_dias) }),
        ...(num(alerta_excepcion_horas) !== undefined && { alerta_excepcion_horas: num(alerta_excepcion_horas) }),
        ...(num(alerta_cama_horas) !== undefined && { alerta_cama_horas: num(alerta_cama_horas) }),
        ...(num(movil_demorado_min) !== undefined && { movil_demorado_min: num(movil_demorado_min) }),
      }
    });
    res.json(config);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar configuración' });
  }
};

module.exports = { getConfiguracion, updateConfiguracion };