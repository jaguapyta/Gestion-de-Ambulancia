const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const P = require('../config/permisos');
const { getBases, crearBase, actualizarBase, toggleActiva, crearBasesMasivo } = require('../controllers/bases.controller');

router.get('/', auth, roles(...P.LEER_BASES), getBases);
router.post('/masivo', auth, roles('ADMINISTRADOR'), crearBasesMasivo);
router.post('/', auth, roles('ADMINISTRADOR'), crearBase);
router.put('/:id', auth, roles('ADMINISTRADOR'), actualizarBase);
router.patch('/:id/activa', auth, roles('ADMINISTRADOR'), toggleActiva);

module.exports = router;