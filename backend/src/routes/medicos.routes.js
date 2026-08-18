const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const P = require('../config/permisos');
const {
  getMedicos, crearMedico, agregarContacto, editarContacto, eliminarContacto,
  actualizarRegistro, actualizarTurnos, toggleActivo
} = require('../controllers/medicos.controller');

// Potestad sobre el médico regulador: coordinador de regulación y supervisor
const GESTIONAR = ['ADMINISTRADOR', 'COORDINADOR_REGULACION', 'SUPERVISOR_GUARDIA'];

const {
  getMedicos, crearMedico, crearMedicosMasivo, agregarContacto, editarContacto, eliminarContacto,
  actualizarRegistro, actualizarTurnos, toggleActivo
} = require('../controllers/medicos.controller');

router.get('/', auth, roles(...P.LEER_MEDICOS), getMedicos);
router.post('/', auth, roles(...GESTIONAR), crearMedico);
router.post('/:id/contacto', auth, roles(...GESTIONAR), agregarContacto);
router.put('/:id/contacto/:contactoId', auth, roles(...GESTIONAR), editarContacto);
router.delete('/:id/contacto/:contactoId', auth, roles(...GESTIONAR), eliminarContacto);
router.put('/:id/registro', auth, roles(...GESTIONAR), actualizarRegistro);
router.put('/:id/turnos', auth, roles(...GESTIONAR), actualizarTurnos);
router.patch('/:id/activo', auth, roles(...GESTIONAR), toggleActivo);
router.post('/masivo', auth, roles(...GESTIONAR), crearMedicosMasivo);

module.exports = router;