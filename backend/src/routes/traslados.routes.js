const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const P = require('../config/permisos');
const { getCatalogos, crearTraslado } = require('../controllers/traslados.controller');

router.get('/catalogos', auth, roles(...P.LEER_SOLICITUDES), getCatalogos);
router.post('/', auth, roles(...P.GESTIONAR_SOLICITUDES), crearTraslado);

module.exports = router;
