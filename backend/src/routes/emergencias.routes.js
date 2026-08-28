const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const { getCatalogos, crearEmergencia } = require('../controllers/emergencias.controller');

const REC = ['ADMINISTRADOR', 'COORDINADOR_REGULACION', 'SUPERVISOR_GUARDIA', 'ARM', 'MEDICO_REGULADOR'];

router.get('/catalogos', auth, roles(...REC), getCatalogos);
router.post('/', auth, roles(...REC), crearEmergencia);

module.exports = router;
