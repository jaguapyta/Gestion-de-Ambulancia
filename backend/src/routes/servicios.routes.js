const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const { getMisServicios, getServicio, cambiarEstado, getCatalogos } = require('../controllers/servicios.controller');

const CREW = ['ADMINISTRADOR', 'PARAMEDICO', 'CONDUCTOR'];

router.get('/catalogos', auth, roles(...CREW), getCatalogos);
router.get('/mios', auth, roles(...CREW), getMisServicios);
router.get('/:id', auth, roles(...CREW), getServicio);
router.patch('/:id/estado', auth, roles(...CREW), cambiarEstado);

module.exports = router;