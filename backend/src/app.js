const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middlewares globales
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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

module.exports = app;