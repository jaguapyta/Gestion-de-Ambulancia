const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const P = require('../config/permisos');
const {
  getCatalogos, getSolicitudes, getSolicitudById, crearSolicitud, cambiarEstado,
  incidentesParecidos, agregarLlamada
} = require('../controllers/solicitudes.controller');

// Las rutas fijas van antes de /:id para que no las capture la ruta con parámetro
router.get('/catalogos', auth, roles(...P.LEER_SOLICITUDES), getCatalogos);
router.get('/incidentes-parecidos', auth, roles(...P.LEER_SOLICITUDES), incidentesParecidos);
router.get('/', auth, roles(...P.LEER_SOLICITUDES), getSolicitudes);
router.get('/:id', auth, roles(...P.LEER_SOLICITUDES), getSolicitudById);
router.post('/', auth, roles(...P.GESTIONAR_SOLICITUDES), crearSolicitud);
router.post('/:id/llamada', auth, roles(...P.GESTIONAR_SOLICITUDES), agregarLlamada);
router.patch('/:id/estado', auth, roles(...P.GESTIONAR_SOLICITUDES), cambiarEstado);

module.exports = router;