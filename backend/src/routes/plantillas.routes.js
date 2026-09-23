const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const P = require('../config/permisos');
const { getPlantillas, getPlantilla, guardarPlantilla, restaurarPlantilla } = require('../controllers/plantillas.controller');

// GET abierto a los roles que imprimen (Transporte + Admin); el editor lo consume el Admin.
router.get('/', auth, roles(...P.LEER_ORDENES), getPlantillas);
router.get('/:clave', auth, roles(...P.LEER_ORDENES), getPlantilla);

// Edición: solo ADMINISTRADOR.
router.put('/:clave', auth, roles('ADMINISTRADOR'), guardarPlantilla);
router.post('/:clave/restaurar', auth, roles('ADMINISTRADOR'), restaurarPlantilla);

module.exports = router;
