const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const { getMiMovil, reportarUbicacion } = require('../controllers/ubicacion.controller');

// La app de la tripulación (conductor/paramédico) reporta la posición de su móvil.
const CREW = ['ADMINISTRADOR', 'CONDUCTOR', 'PARAMEDICO'];

router.get('/mi-movil', auth, roles(...CREW), getMiMovil);
router.post('/', auth, roles(...CREW), reportarUbicacion);

module.exports = router;
