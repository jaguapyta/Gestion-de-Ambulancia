const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const { getSolicitudes, getSolicitudById, crearSolicitud, updateEstado } = require('../controllers/solicitudes.controller');

router.get('/', auth, getSolicitudes);
router.get('/:id', auth, getSolicitudById);
router.post('/', auth, crearSolicitud);
router.patch('/:id/estado', auth, updateEstado);

module.exports = router;