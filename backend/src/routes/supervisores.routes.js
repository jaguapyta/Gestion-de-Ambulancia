const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const P = require('../config/permisos');
const {
  getSupervisores, crearSupervisor, crearSupervisoresMasivo, agregarContacto, editarContacto,
  eliminarContacto, actualizarRegistro, actualizarVinculos, toggleActivo
} = require('../controllers/supervisores.controller');

// A los supervisores los gestiona SOLO el Coordinador de Regulación (no otro supervisor)
const GESTIONAR = ['ADMINISTRADOR', 'COORDINADOR_REGULACION'];

router.get('/', auth, roles(...P.LEER_SUPERVISORES), getSupervisores);
router.post('/', auth, roles(...GESTIONAR), crearSupervisor);
router.post('/masivo', auth, roles(...GESTIONAR), crearSupervisoresMasivo);
router.post('/:id/contacto', auth, roles(...GESTIONAR), agregarContacto);
router.put('/:id/contacto/:contactoId', auth, roles(...GESTIONAR), editarContacto);
router.delete('/:id/contacto/:contactoId', auth, roles(...GESTIONAR), eliminarContacto);
router.put('/:id/registro', auth, roles(...GESTIONAR), actualizarRegistro);
router.put('/:id/vinculos', auth, roles(...GESTIONAR), actualizarVinculos);
router.patch('/:id/activo', auth, roles(...GESTIONAR), toggleActivo);

module.exports = router;
