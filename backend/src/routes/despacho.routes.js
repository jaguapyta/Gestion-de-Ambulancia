const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const { getCatalogos, getTablero, setUbicacion, asignar, reasignar, cambiarEstado } = require('../controllers/despacho.controller');

const DESP = ['ADMINISTRADOR', 'COORDINADOR_OPERATIVO', 'COORDINADOR_TRANSPORTE', 'ASISTENTE_TRANSPORTE', 'SUPERVISOR_GUARDIA'];

router.get('/catalogos', auth, roles(...DESP), getCatalogos);
router.get('/tablero', auth, roles(...DESP), getTablero);
router.put('/solicitud/:id/ubicacion', auth, roles(...DESP), setUbicacion);
router.post('/asignar', auth, roles(...DESP), asignar);
router.patch('/:id/reasignar', auth, roles(...DESP), reasignar);
router.patch('/:id/estado', auth, roles(...DESP), cambiarEstado);


module.exports = router;