const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const { login, cambiarPassword, verificarSesion } = require('../controllers/auth.controller');

router.post('/login', login);
router.post('/cambiar-password', auth, cambiarPassword);
router.get('/verificar', auth, verificarSesion);

module.exports = router;
