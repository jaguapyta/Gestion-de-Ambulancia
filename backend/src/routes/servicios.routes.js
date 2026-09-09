const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const { getMisServicios, getServicio, cambiarEstado } = require('../controllers/servicios.controller');

const CREW = ['ADMINISTRADOR', 'PARAMEDICO', 'CONDUCTOR'];

router.get('/mios', auth, roles(...CREW), getMisServicios);
router.get('/:id', auth, roles(...CREW), getServicio);
router.patch('/:id/estado', auth, roles(...CREW), cambiarEstado);

module.exports = router;