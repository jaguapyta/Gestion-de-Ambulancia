const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const { getServicioFichas, getFicha, crearFicha, guardarFicha, getAntecedentes } = require('../controllers/ficha.controller');

// La ficha médica es exclusiva del PARAMÉDICO (y admin). El conductor NO accede.
const FICHA = ['ADMINISTRADOR', 'PARAMEDICO'];

// Rutas específicas antes de /:ficha_id para que no las capture.
router.get('/servicio/:solicitud_id', auth, roles(...FICHA), getServicioFichas);
router.post('/servicio/:solicitud_id', auth, roles(...FICHA), crearFicha);
router.get('/antecedentes/:ci', auth, roles(...FICHA), getAntecedentes);
router.get('/:ficha_id', auth, roles(...FICHA), getFicha);
router.put('/:ficha_id', auth, roles(...FICHA), guardarFicha);

module.exports = router;