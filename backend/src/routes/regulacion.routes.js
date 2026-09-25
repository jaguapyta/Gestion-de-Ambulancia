const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const { getCatalogos, getCamas, getCaso, guardarGestion, cambiarEstado, agregarLlamada } = require('../controllers/regulacion.controller');

const REG = ['ADMINISTRADOR', 'COORDINADOR_REGULACION', 'SUPERVISOR_GUARDIA', 'MEDICO_REGULADOR'];
// Dirección: solo lectura de la gestión de camas (no gestiona ni cambia estados).
const VER = [...REG, 'DIRECCION'];

router.get('/catalogos', auth, roles(...VER), getCatalogos);
router.get('/', auth, roles(...VER), getCamas);
router.get('/:id', auth, roles(...VER), getCaso);
router.post('/:id/llamada', auth, roles(...REG), agregarLlamada);
router.put('/:id/gestion', auth, roles(...REG), guardarGestion);
router.patch('/:id/estado', auth, roles(...REG), cambiarEstado);

module.exports = router;