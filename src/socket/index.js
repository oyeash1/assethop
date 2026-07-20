// src/socket/index.js
const { Server } = require('socket.io');

const initSocket = (server) => {
    // CORS policies allow karna mandatory hai varna connection reject ho jayega
    const io = new Server(server, {
        cors: {
            origin: "*", // Flutter aur Next.js client connectivity compatibility ke liye
            methods: ["GET", "POST"]
        }
    });

    console.log('📡 Real-time Socket.io Engine attached to server instance.');

    // Core Event: Handshake Listener
    io.on('connection', (socket) => {
        console.log(`🔌 Client connected to live tunnel: [Socket ID: ${socket.id}]`);

        // 1. Join Rooms (User dynamically updates to custom rooms like bookingId or userId)
        socket.on('join_room', (roomId) => {
            socket.join(roomId);
            console.log(`🏠 Socket ${socket.id} entered Room: ${roomId}`);
        });

        // 2. Real-Time Tracking Middleware Engine (Host screens update seamlessly)
        socket.on('update_location', (data) => {
            const { bookingId, lat, lng } = data;
            // Broadcast coordinates seamlessly inside that specific asset delivery stream room
            io.to(bookingId).emit('location_stream', { bookingId, lat, lng });
        });

        // 3. Disconnect Triggers
        socket.on('disconnect', () => {
            console.log(`❌ Client disconnected from live tunnel: [Socket ID: ${socket.id}]`);
        });
    });

    return io;
};

module.exports = initSocket;