const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const { listar, crear, revocar } = require('../controllers/excepciones-acceso.controller');

const GESTIONAR = ['ADMINISTRADOR', 'COORDINADOR_REGULACION', 'SUPERVISOR_GUARDIA'];
// Dirección: solo lectura del listado de excepciones de acceso (no crea ni revoca).
const VER = [...GESTIONAR, 'DIRECCION'];

router.get('/', auth, roles(...VER), listar);
router.post('/', auth, roles(...GESTIONAR), crear);
router.patch('/:id/revocar', auth, roles(...GESTIONAR), revocar);

module.exports = router;