const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const P = require('../config/permisos');
const {
  getArms, crearArm, agregarContacto, editarContacto, eliminarContacto,
  actualizarRegistro, actualizarVinculos, toggleActivo
} = require('../controllers/arm.controller');

const GESTIONAR = ['ADMINISTRADOR', 'COORDINADOR_REGULACION', 'SUPERVISOR_GUARDIA'];

router.get('/', auth, roles(...P.LEER_ARM), getArms);
router.post('/', auth, roles(...GESTIONAR), crearArm);
router.post('/:id/contacto', auth, roles(...GESTIONAR), agregarContacto);
router.put('/:id/contacto/:contactoId', auth, roles(...GESTIONAR), editarContacto);
router.delete('/:id/contacto/:contactoId', auth, roles(...GESTIONAR), eliminarContacto);
router.put('/:id/registro', auth, roles(...GESTIONAR), actualizarRegistro);
router.put('/:id/vinculos', auth, roles(...GESTIONAR), actualizarVinculos);
router.patch('/:id/activo', auth, roles(...GESTIONAR), toggleActivo);

module.exports = router;