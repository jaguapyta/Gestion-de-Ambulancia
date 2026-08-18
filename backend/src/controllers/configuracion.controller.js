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
    tiempo_sesion_minutos, exigir_habilitacion_vigente
  } = req.body;
  try {
    const config = await prisma.configuracion.update({
      where: { id: 1 },
      data: {
        nombre_sistema,
        telefono_emergencias,
        direccion,
        ciudad,
        tiempo_sesion_minutos: parseInt(tiempo_sesion_minutos),
        // Si el campo no viene en el body se conserva el valor actual, para que
        // la pantalla de Configuración pueda actualizarse sin pisarlo.
        ...(exigir_habilitacion_vigente !== undefined && {
          exigir_habilitacion_vigente: Boolean(exigir_habilitacion_vigente)
        })
      }
    });
    res.json(config);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar configuración' });
  }
};

module.exports = { getConfiguracion, updateConfiguracion };
