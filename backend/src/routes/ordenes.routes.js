const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const P = require('../config/permisos');
const { getOrdenes, getOrdenById, crearOrden, cerrarOrden, getDatosGuardiaActiva } = require('../controllers/ordenes.controller');

router.get('/guardia-activa', auth, roles(...P.LEER_ORDENES), getDatosGuardiaActiva);
router.get('/', auth, roles(...P.LEER_ORDENES), getOrdenes);
router.get('/:id', auth, roles(...P.LEER_ORDENES), getOrdenById);
router.post('/', auth, roles('COORDINADOR_TRANSPORTE', 'ASISTENTE_TRANSPORTE', 'ADMINISTRADOR'), crearOrden);
router.patch('/:id/cerrar', auth, roles('COORDINADOR_TRANSPORTE', 'ASISTENTE_TRANSPORTE', 'ADMINISTRADOR'), cerrarOrden);

module.exports = router;