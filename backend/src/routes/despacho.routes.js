const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const { getDespachos, asignarAmbulancia } = require('../controllers/despacho.controller');

router.get('/', auth, getDespachos);
router.post('/asignar', auth, asignarAmbulancia);

module.exports = router;