const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const { getMisServicios, getServicio, cambiarEstado, getCatalogos } = require('../controllers/servicios.controller');

const CREW = ['ADMINISTRADOR', 'PARAMEDICO', 'CONDUCTOR'];
// Dirección: solo lectura (puede abrir el panel de servicios; no cambia estados).
const VER = [...CREW, 'DIRECCION'];

router.get('/catalogos', auth, roles(...VER), getCatalogos);
router.get('/mios', auth, roles(...VER), getMisServicios);
router.get('/:id', auth, roles(...VER), getServicio);
router.patch('/:id/estado', auth, roles(...CREW), cambiarEstado);

module.exports = router;