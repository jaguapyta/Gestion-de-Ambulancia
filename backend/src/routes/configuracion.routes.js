const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const P = require('../config/permisos');
const { getConfiguracion, updateConfiguracion } = require('../controllers/configuracion.controller');

router.get('/', auth, roles(...P.ADMINISTRACION), getConfiguracion);
router.put('/', auth, roles('ADMINISTRADOR'), updateConfiguracion);

module.exports = router;