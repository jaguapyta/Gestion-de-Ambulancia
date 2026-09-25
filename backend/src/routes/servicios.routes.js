const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const { getMisServicios, getServiciosAbiertos, getServicio, cambiarEstado, getCatalogos } = require('../controllers/servicios.controller');

const CREW = ['ADMINISTRADOR', 'PARAMEDICO', 'CONDUCTOR'];
// Dirección: solo lectura (puede abrir el panel de servicios; no cambia estados).
const VER = [...CREW, 'DIRECCION'];
// Monitoreo consolidado de servicios abiertos: Dirección + jefaturas.
const VER_TODOS = ['ADMINISTRADOR', 'DIRECCION', 'COORDINADOR_REGULACION', 'SUPERVISOR_GUARDIA', 'COORDINADOR_OPERATIVO', 'COORDINADOR_TRANSPORTE'];

router.get('/catalogos', auth, roles(...VER), getCatalogos);
router.get('/mios', auth, roles(...VER), getMisServicios);
router.get('/abiertos', auth, roles(...VER_TODOS), getServiciosAbiertos);
router.get('/:id', auth, roles(...VER), getServicio);
router.patch('/:id/estado', auth, roles(...CREW), cambiarEstado);

module.exports = router;