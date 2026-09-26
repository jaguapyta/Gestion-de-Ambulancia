const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const { getRuta, geocode } = require('../controllers/geo.controller');

// Utilidades de mapas: cualquier usuario autenticado puede pedir ruta/ETA o geocodificar.
router.get('/ruta', auth, getRuta);
router.get('/geocode', auth, geocode);

module.exports = router;
