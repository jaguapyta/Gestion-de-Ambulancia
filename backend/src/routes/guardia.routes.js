const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const P = require('../config/permisos');
const { getGuardias, getGuardiaActiva, getGuardiaById, crearGuardia, cambiarEstado, agregarMovil, agregarTripulante, actualizarEstadoMovil, getPersonalDisponible, eliminarTripulante, eliminarMovilGuardia } = require('../controllers/guardia.controller');

router.get('/activa', auth, roles(...P.LEER_GUARDIAS), getGuardiaActiva);
router.get('/', auth, roles(...P.LEER_GUARDIAS), getGuardias);
router.get('/:id', auth, roles(...P.LEER_GUARDIAS), getGuardiaById);
router.get('/:guardia_id/personal-disponible', auth, roles(...P.LEER_GUARDIAS), getPersonalDisponible);
router.delete('/tripulante/:tripulante_id', auth, eliminarTripulante);
router.delete('/movil/:movil_id', auth, roles('COORDINADOR_OPERATIVO', 'ADMINISTRADOR'), eliminarMovilGuardia);
router.post('/', auth, roles('COORDINADOR_OPERATIVO', 'ADMINISTRADOR'), crearGuardia);
router.patch('/:id/estado', auth, roles('COORDINADOR_OPERATIVO', 'ADMINISTRADOR'), cambiarEstado);
router.post('/:id/movil', auth, roles('COORDINADOR_OPERATIVO', 'ADMINISTRADOR'), agregarMovil);
router.post('/movil/:movil_id/tripulante', auth, roles('COORDINADOR_OPERATIVO', 'ADMINISTRADOR'), agregarTripulante);
// Sacar de servicio un móvil durante la guardia: solo Coordinación Operativa.
router.patch('/movil/:movil_id/estado', auth, roles('COORDINADOR_OPERATIVO'), actualizarEstadoMovil);

module.exports = router;