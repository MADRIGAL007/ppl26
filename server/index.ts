import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import * as db from './db';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Adjust for production if known
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 8080;
const MASTER_PASSWORD = process.env.MASTER_PASSWORD; // Use env var

// --- Middleware ---
app.use(helmet({
    contentSecurityPolicy: false // Disable CSP for simplicity in this demo, enable in strict prod
}));
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Rate Limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500 // Limit each IP to 500 requests per windowMs
});
app.use('/api/', apiLimiter);

// --- Socket.IO ---
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

// --- API Routes ---

// 1. Sync State (Hybrid: HTTP for data, Socket for notify)
app.post('/api/sync', async (req, res) => {
    try {
        const data = req.body;
        if (!data || !data.sessionId) {
            return res.status(400).json({ error: 'Missing sessionId' });
        }

        const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || 'Unknown';

        await db.upsertSession(data.sessionId, data, ip);

        // Notify Admin Room (broadcast to all admins if we had separate admin rooms)
        // For now, simply broadcast to everyone listening for 'session-update'
        io.emit('sessions-updated');

        // Check for pending commands
        const cmd = await db.getCommand(data.sessionId);
        if (cmd) {
            // Also emit directly to socket if connected
            io.to(data.sessionId).emit('command', cmd);
            return res.json({ status: 'ok', command: cmd });
        }

        res.json({ status: 'ok' });
    } catch (e) {
        console.error('[Sync] Error:', e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 2. Fetch Sessions (Admin)
app.get('/api/sessions', async (req, res) => {
    try {
        const sessions = await db.getAllSessions();
        res.json(sessions);
    } catch (e) {
        res.status(500).json([]);
    }
});

// 3. Admin Command
app.post('/api/command', async (req, res) => {
    try {
        const { sessionId, action, payload } = req.body;
        if (!sessionId || !action) {
            return res.status(400).send('Invalid Command');
        }

        await db.queueCommand(sessionId, action, payload);

        // Real-time Push
        io.to(sessionId).emit('command', { action, payload });

        res.json({ status: 'queued' });
    } catch (e) {
        res.status(500).send('Error queuing command');
    }
});

// 4. Gate Unlock
app.post('/api/gate-unlock', (req, res) => {
    const { password } = req.body;
    if (!MASTER_PASSWORD) {
        // This case should ideally not be reached if the startup check is in place.
        // However, as a defense-in-depth measure, we handle it.
        console.warn('[Server] Gate unlock endpoint called, but MASTER_PASSWORD is not set.');
        return res.status(503).json({ success: false, error: 'Service Unavailable: Not configured.' });
    }
    if (password === MASTER_PASSWORD) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false });
    }
});

// --- Static Files (Frontend) ---
const staticPath = path.join(__dirname, '../static');
// Note: In Docker, we copy dist/ to static/. In dev, we might not have it.
app.use(express.static(staticPath));

// Fallback for SPA (Angular Router)
app.get('*', (req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'), (err) => {
        if (err) {
            // If index.html doesn't exist (e.g., dev mode without build), send basic info
            res.status(404).send('Frontend not built. Run npm run build.');
        }
    });
});

// --- Start Server ---
if (!MASTER_PASSWORD) {
    console.error('[Server] ❌ FATAL ERROR: MASTER_PASSWORD environment variable not set.');
    console.error('[Server] ❌ The application cannot start without a secure master password.');
    process.exit(1);
}

httpServer.listen(PORT, () => {
    console.log(`[Server] ✅ Express + Socket.IO running on port ${PORT}`);
});
