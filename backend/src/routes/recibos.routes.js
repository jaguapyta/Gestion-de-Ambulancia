const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const P = require('../config/permisos');
const { getRecibos, crearRecibo } = require('../controllers/recibos.controller');

const GESTIONAR = ['COORDINADOR_TRANSPORTE', 'ASISTENTE_TRANSPORTE', 'ADMINISTRADOR'];

router.get('/', auth, roles(...P.LEER_ORDENES), getRecibos);
router.post('/', auth, roles(...GESTIONAR), crearRecibo);

module.exports = router;