const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const P = require('../config/permisos');
const { getRoles } = require('../controllers/roles.controller');

router.get('/', auth, roles(...P.ADMINISTRACION), getRoles);

module.exports = router;