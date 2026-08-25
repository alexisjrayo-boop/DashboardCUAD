const { Server } = require('socket.io');

let io = null;

function initSocket(server) {
    io = new Server(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        }
    });

    io.on('connection', (socket) => {
        console.log(`[WebSocket] Cliente conectado: ${socket.id}`);

        socket.on('disconnect', () => {
            console.log(`[WebSocket] Cliente desconectado: ${socket.id}`);
        });
    });

    console.log('✓ Servidor WebSocket (Socket.io) inicializado');
    return io;
}

function broadcastCdrUpdate(data) {
    if (io) {
        console.log('[WebSocket] Emitiendo cdrs_updated a clientes conectados...', data);
        io.emit('cdrs_updated', data);
    }
}

function getIo() {
    return io;
}

module.exports = {
    initSocket,
    broadcastCdrUpdate,
    getIo
};
