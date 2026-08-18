const app = require('./src/app');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

require('./src/socket')(io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Servidor SEME corriendo en puerto ${PORT}`);
});