const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const { getCatalogos, getCamas, getCaso, guardarGestion, cambiarEstado, agregarLlamada } = require('../controllers/regulacion.controller');

const REG = ['ADMINISTRADOR', 'COORDINADOR_REGULACION', 'SUPERVISOR_GUARDIA', 'MEDICO_REGULADOR'];

router.get('/catalogos', auth, roles(...REG), getCatalogos);
router.get('/', auth, roles(...REG), getCamas);
router.get('/:id', auth, roles(...REG), getCaso);
router.post('/:id/llamada', auth, roles(...REG), agregarLlamada);
router.put('/:id/gestion', auth, roles(...REG), guardarGestion);
router.patch('/:id/estado', auth, roles(...REG), cambiarEstado);

module.exports = router;