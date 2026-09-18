const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const roles = require('../middlewares/roles');
const {
  getCatalogos, crearEmergencia, sugerirMotivo,
  getSinonimos, getSinonimosPendientes, crearSinonimo, aprobarSinonimo, rechazarSinonimo, toggleSinonimo, borrarSinonimo,
  getMotivosEditor, updatePregunta, updateMotivo,
} = require('../controllers/emergencias.controller');

const REC = ['ADMINISTRADOR', 'COORDINADOR_REGULACION', 'SUPERVISOR_GUARDIA', 'ARM', 'MEDICO_REGULADOR'];
const ABM = ['ADMINISTRADOR', 'COORDINADOR_REGULACION'];

router.get('/catalogos', auth, roles(...REC), getCatalogos);
router.post('/', auth, roles(...REC), crearEmergencia);

// Sugerencia de motivo por IA (a partir del relato del llamante)
router.post('/sugerir-motivo', auth, roles(...REC), sugerirMotivo);

// Editor del protocolo (motivos y preguntas de alarma)
router.get('/motivos-editor', auth, roles(...ABM), getMotivosEditor);
router.patch('/pregunta/:id', auth, roles(...ABM), updatePregunta);
router.patch('/motivo/:id', auth, roles(...ABM), updateMotivo);

// ABM de sinónimos + circuito de aprobación
router.get('/sinonimos', auth, roles(...REC), getSinonimos);
router.get('/sinonimos/pendientes', auth, roles(...ABM), getSinonimosPendientes);
router.post('/sinonimos', auth, roles(...REC), crearSinonimo);   // recepcionista propone (PENDIENTE) · jefatura crea (APROBADO)
router.patch('/sinonimos/:id/aprobar', auth, roles(...ABM), aprobarSinonimo);
router.patch('/sinonimos/:id/rechazar', auth, roles(...ABM), rechazarSinonimo);
router.patch('/sinonimos/:id', auth, roles(...ABM), toggleSinonimo);
router.delete('/sinonimos/:id', auth, roles(...ABM), borrarSinonimo);

module.exports = router;