const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const { getCatalogos, crearEmergencia, getSinonimos, crearSinonimo, toggleSinonimo, borrarSinonimo, getMotivosEditor, updatePregunta, updateMotivo } = require('../controllers/emergencias.controller');

const REC = ['ADMINISTRADOR', 'COORDINADOR_REGULACION', 'SUPERVISOR_GUARDIA', 'ARM', 'MEDICO_REGULADOR'];
const ABM = ['ADMINISTRADOR', 'COORDINADOR_REGULACION'];

router.get('/catalogos', auth, roles(...REC), getCatalogos);
router.post('/', auth, roles(...REC), crearEmergencia);

// Editor del protocolo (motivos y preguntas de alarma)
router.get('/motivos-editor', auth, roles(...ABM), getMotivosEditor);
router.patch('/pregunta/:id', auth, roles(...ABM), updatePregunta);
router.patch('/motivo/:id', auth, roles(...ABM), updateMotivo);

// ABM de sinónimos
router.get('/sinonimos', auth, roles(...REC), getSinonimos);
router.post('/sinonimos', auth, roles(...REC), crearSinonimo);   // cualquier recepcionista puede sumar (atajo "aprender")
router.patch('/sinonimos/:id', auth, roles(...ABM), toggleSinonimo);
router.delete('/sinonimos/:id', auth, roles(...ABM), borrarSinonimo);

module.exports = router;
