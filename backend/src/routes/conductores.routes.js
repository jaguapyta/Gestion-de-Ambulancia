const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const P = require('../config/permisos');
const {
  getConductores, crearConductor, crearConductoresMasivo,
  agregarContacto, editarContacto, eliminarContacto, actualizarLicencia,
  actualizarDiasGuardia, toggleActivo
} = require('../controllers/conductores.controller');

router.get('/', auth, roles(...P.LEER_CONDUCTORES), getConductores);
router.post('/', auth, roles('COORDINADOR_TRANSPORTE', 'ADMINISTRADOR'), crearConductor);
router.post('/masivo', auth, roles('COORDINADOR_TRANSPORTE', 'ADMINISTRADOR'), crearConductoresMasivo);
router.post('/:id/contacto', auth, roles('COORDINADOR_TRANSPORTE', 'ADMINISTRADOR'), agregarContacto);
router.put('/:id/contacto/:contactoId', auth, roles('COORDINADOR_TRANSPORTE', 'ADMINISTRADOR'), editarContacto);
router.delete('/:id/contacto/:contactoId', auth, roles('COORDINADOR_TRANSPORTE', 'ADMINISTRADOR'), eliminarContacto);
router.put('/:id/licencia', auth, roles('COORDINADOR_TRANSPORTE', 'ADMINISTRADOR'), actualizarLicencia);
router.put('/:id/dias-guardia', auth, roles('COORDINADOR_TRANSPORTE', 'ADMINISTRADOR'), actualizarDiasGuardia);
router.patch('/:id/activo', auth, roles('COORDINADOR_TRANSPORTE', 'ADMINISTRADOR'), toggleActivo);

module.exports = router;
