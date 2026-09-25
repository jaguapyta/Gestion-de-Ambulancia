const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const { getCatalogos, getTablero, getHistorial, setUbicacion, asignar, reasignar, cambiarEstado, cancelarAsignacion, cambiarPrioridad } = require('../controllers/despacho.controller');

const DESP = ['ADMINISTRADOR', 'COORDINADOR_OPERATIVO', 'COORDINADOR_TRANSPORTE', 'ASISTENTE_TRANSPORTE', 'SUPERVISOR_GUARDIA'];
// Dirección: solo lectura (ve el tablero y el historial, no opera).
const VER = [...DESP, 'DIRECCION'];

router.get('/catalogos', auth, roles(...VER), getCatalogos);
router.get('/tablero', auth, roles(...VER), getTablero);
router.get('/historial', auth, roles(...VER), getHistorial);
router.put('/solicitud/:id/ubicacion', auth, roles(...DESP), setUbicacion);
router.post('/asignar', auth, roles(...DESP), asignar);
router.patch('/:id/reasignar', auth, roles(...DESP), reasignar);
router.patch('/:id/prioridad', auth, roles(...DESP), cambiarPrioridad);
router.patch('/:id/cancelar-asignacion', auth, roles(...DESP), cancelarAsignacion);
router.patch('/:id/estado', auth, roles(...DESP), cambiarEstado);

module.exports = router;