// src/server.js (env updated)
const http = require('http');
const app = require('./app');
const connectDB = require('./config/db.js');
const initSocket = require('./socket/index'); // Socket Engine Import
require('dotenv').config();

const PORT = process.env.PORT || 5000;

// 1. Establish Database Connection Layer
connectDB();

// 2. Instantiate Base Server Wrap Instance
const server = http.createServer(app);

// 3. Mount Real-Time Engine Directly to HTTP Core Stack
const io = initSocket(server);

// Global injection so you can access 'io' in controllers via 'req.app.get("io")' if needed
app.set('io', io);

server.listen(PORT, () => {
    console.log(`🚀 AssetHop Core Engine running on port ${PORT}`);
});