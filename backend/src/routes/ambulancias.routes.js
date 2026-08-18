const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const P = require('../config/permisos');
const { getMoviles, getMovilesActivos, crearMovil, actualizarMovil, toggleActivoMovil, crearMovilesMasivo } = require('../controllers/ambulancias.controller');

router.get('/', auth, roles(...P.LEER_MOVILES), getMoviles);
router.get('/activos', auth, roles(...P.LEER_MOVILES), getMovilesActivos);
router.post('/masivo', auth, roles('ADMINISTRADOR'), crearMovilesMasivo);
router.post('/', auth, roles('ADMINISTRADOR'), crearMovil);
router.put('/:id', auth, roles('ADMINISTRADOR'), actualizarMovil);
router.patch('/:id/activo', auth, roles('ADMINISTRADOR'), toggleActivoMovil);

module.exports = router;