const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const P = require('../config/permisos');
const {
  getEstadosTemporales,
  crearEstadoTemporal,
  cancelarEstadoTemporal
} = require('../controllers/estados-temporales.controller');

router.get('/', auth, roles(...P.LEER_ESTADOS), getEstadosTemporales);

router.post(
  '/',
  auth,
  roles(...P.LEER_ESTADOS),
  crearEstadoTemporal
);

router.patch(
  '/:id/cancelar',
  auth,
  roles(...P.LEER_ESTADOS),
  cancelarEstadoTemporal
);

module.exports = router;