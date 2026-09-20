const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const P = require('../config/permisos');
const { getEstadisticas } = require('../controllers/estadisticas.controller');

router.get('/', auth, roles(...P.LEER_ESTADISTICAS), getEstadisticas);

module.exports = router;
