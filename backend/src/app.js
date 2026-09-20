const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middlewares globales
// Orígenes permitidos (coma-separados). En producción same-origin no lo necesita,
// pero se deja configurable por CORS_ORIGIN.
app.use(cors({
  origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
  credentials: true
}));
// Límite alto: las fichas llevan firmas en base64 (PNG) que superan el default de 100kb.
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use('/api/supervisores', require('./routes/supervisores.routes'));

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ mensaje: 'API SEME funcionando correctamente' });
});

// Rutas
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/solicitudes', require('./routes/solicitudes.routes'));
app.use('/api/camas', require('./routes/camas.routes'));
app.use('/api/traslados', require('./routes/traslados.routes'));
app.use('/api/pacientes-dializados', require('./routes/paciente_dialisis.routes'));
app.use('/api/ambulancias', require('./routes/ambulancias.routes'));
app.use('/api/despacho', require('./routes/despacho.routes'));
app.use('/api/usuarios', require('./routes/usuarios.routes'));
app.use('/api/roles', require('./routes/roles.routes'));
app.use('/api/configuracion', require('./routes/configuracion.routes'));
app.use('/api/bases', require('./routes/bases.routes'));
app.use('/api/guardias', require('./routes/guardia.routes'));
app.use('/api/paramedicos', require('./routes/paramedicos.routes'));
app.use('/api/conductores', require('./routes/conductores.routes'));
app.use('/api/medicos', require('./routes/medicos.routes'));
app.use('/api/arm', require('./routes/arm.routes'));
app.use('/api/estados-temporales', require('./routes/estados-temporales.routes'));
app.use('/api/ordenes', require('./routes/ordenes.routes'));
app.use('/api/dialisis', require('./routes/dialisis.routes'));
app.use('/api/regulacion/camas', require('./routes/regulacion.routes'));
app.use('/api/emergencias', require('./routes/emergencias.routes'));
app.use('/api/servicios', require('./routes/servicios.routes'));
app.use('/api/fichas', require('./routes/ficha.routes'));
app.use('/api/estadisticas', require('./routes/estadisticas.routes'));
app.use('/api/auditoria', require('./routes/auditoria.routes'));
app.use('/api/excepciones-acceso', require('./routes/excepciones-acceso.routes'));
app.use('/api/alertas', require('./routes/alertas.routes'));

module.exports = app;