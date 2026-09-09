const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const { getFicha, guardarFicha } = require('../controllers/ficha.controller');

// La ficha médica es exclusiva del PARAMÉDICO (y admin). El conductor NO accede.
const FICHA = ['ADMINISTRADOR', 'PARAMEDICO'];

router.get('/:solicitud_id', auth, roles(...FICHA), getFicha);
router.post('/:solicitud_id', auth, roles(...FICHA), guardarFicha);

module.exports = router;