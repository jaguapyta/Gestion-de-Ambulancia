const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const P = require('../config/permisos');
const {
  getParamedicos, crearParamedico, crearParamedicosMasivo,
  agregarContacto, editarContacto, eliminarContacto, actualizarRegistro,
  actualizarDiasGuardia, toggleActivo
} = require('../controllers/paramedicos.controller');

router.get('/', auth, roles(...P.LEER_PARAMEDICOS), getParamedicos);
router.post('/', auth, roles('COORDINADOR_OPERATIVO', 'ADMINISTRADOR'), crearParamedico);
router.post('/masivo', auth, roles('COORDINADOR_OPERATIVO', 'ADMINISTRADOR'), crearParamedicosMasivo);
router.post('/:id/contacto', auth, roles('COORDINADOR_OPERATIVO', 'ADMINISTRADOR'), agregarContacto);
router.put('/:id/contacto/:contactoId', auth, roles('COORDINADOR_OPERATIVO', 'ADMINISTRADOR'), editarContacto);
router.delete('/:id/contacto/:contactoId', auth, roles('COORDINADOR_OPERATIVO', 'ADMINISTRADOR'), eliminarContacto);
router.put('/:id/registro', auth, roles('COORDINADOR_OPERATIVO', 'ADMINISTRADOR'), actualizarRegistro);
router.put('/:id/dias-guardia', auth, roles('COORDINADOR_OPERATIVO', 'ADMINISTRADOR'), actualizarDiasGuardia);
router.patch('/:id/activo', auth, roles('COORDINADOR_OPERATIVO', 'ADMINISTRADOR'), toggleActivo);

module.exports = router;
