const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const P = require('../config/permisos');
const { getUsuarios, getUsuarioById, toggleActivo, updateRol, crearUsuario, buscarPersonaPorDocumento, crearUsuariosMasivo, resetearPassword } = require('../controllers/usuarios.controller');

router.get('/persona/:nro_documento', auth, roles(...P.BUSCAR_PERSONA), buscarPersonaPorDocumento);
router.get('/', auth, roles(...P.ADMINISTRACION), getUsuarios);
router.get('/:id', auth, roles(...P.ADMINISTRACION), getUsuarioById);
router.patch('/:id/activo', auth, roles('ADMINISTRADOR'), toggleActivo);
router.patch('/:id/rol', auth, roles('ADMINISTRADOR'), updateRol);
router.patch('/:id/resetear-password', auth, roles(...P.GESTION_LEGAJO), resetearPassword);
router.post('/masivo', auth, roles('ADMINISTRADOR'), crearUsuariosMasivo);
router.post('/', auth, roles('ADMINISTRADOR'), crearUsuario);

module.exports = router;