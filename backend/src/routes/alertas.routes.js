const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const { getAlertas } = require('../controllers/alertas.controller');

router.get('/', auth, getAlertas);

module.exports = router;