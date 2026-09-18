const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const { listarAccesos } = require('../controllers/auditoria.controller');

router.get('/accesos', auth, roles('ADMINISTRADOR'), listarAccesos);

module.exports = router;