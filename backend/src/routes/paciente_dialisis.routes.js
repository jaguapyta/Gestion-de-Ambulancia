const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const P = require('../config/permisos');
const { getPacientes, crearPaciente, actualizarPaciente, toggleActivo } = require('../controllers/paciente_dialisis.controller');

const GESTIONAR = ['ADMINISTRADOR', 'COORDINADOR_REGULACION'];

router.get('/', auth, roles(...P.LEER_DIALIZADOS), getPacientes);
router.post('/', auth, roles(...GESTIONAR), crearPaciente);
router.put('/:id', auth, roles(...GESTIONAR), actualizarPaciente);
router.patch('/:id/activo', auth, roles(...GESTIONAR), toggleActivo);

module.exports = router;