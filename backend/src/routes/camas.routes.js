const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const P = require('../config/permisos');
const { getCatalogos, getHistorialPaciente, crearPedidoCama } = require('../controllers/camas.controller');

router.get('/catalogos', auth, roles(...P.LEER_SOLICITUDES), getCatalogos);
router.get('/paciente/:documento', auth, roles(...P.LEER_SOLICITUDES), getHistorialPaciente);
router.post('/', auth, roles(...P.GESTIONAR_SOLICITUDES), crearPedidoCama);

module.exports = router;
