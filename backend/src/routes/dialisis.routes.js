const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const P = require('../config/permisos');
const { buscarPaciente, crearTraslado } = require('../controllers/dialisis.controller');

router.get('/paciente/:documento', auth, roles(...P.LEER_SOLICITUDES), buscarPaciente);
router.post('/', auth, roles(...P.GESTIONAR_SOLICITUDES), crearTraslado);

module.exports = router;