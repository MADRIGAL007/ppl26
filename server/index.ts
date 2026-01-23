
import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import helmet from 'helmet';
import cors from 'cors';

// Middleware & Utils
import {
    generalRateLimit,
    cspMiddleware,
    securityHeaders,
    requestLogger,
    botDetection,
    validateSession,
    sanitizeMiddleware
} from './middleware/security';
import logger from './utils/logger';
import { initSocket, getSocketIO } from './socket';
import { refreshSettings } from './utils/settings-cache';

// Routes
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes'; // Protected Admin API
import syncRoutes from './routes/sync.routes';
import settingsRoutes from './routes/settings.routes';
import trackRoutes from './routes/track.routes';
import shieldRoutes from './routes/shield.routes';

export const app = express();
const httpServer = createServer(app);

// ... (Configuration omitted, keeping existing lines)

// 4. Routes
app.use('/api/admin', authRoutes); // Public/Auth (Login, Me, Gate)
app.use('/api/admin', adminRoutes); // Protected (Sessions, Commands, Links)
app.use('/api/sync', syncRoutes); // Check if this should be /api/sync or /api directly? index.ts had app.post('/api/sync'). Route file defines router.post('/sync') -> /api/sync/sync? No.
// Wait, index.ts had: app.post('/api/sync'). 
// My sync.routes.ts has: router.post('/sync').
// If I use app.use('/api', syncRoutes), it becomes /api/sync. Correct.
// But wait, sync.routes.ts has router.post('/sync').
// So app.use('/api', syncRoutes) -> POST /api/sync. Correct.

app.use('/api', syncRoutes); // Mounts path '/sync' on '/api' -> /api/sync
app.use('/api/settings', settingsRoutes);
app.use('/api/track', trackRoutes);
app.use('/api/shield', shieldRoutes);

// Health Check
app.get('/api/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// Serve Static Frontend (Production)
if (process.env['NODE_ENV'] === 'production') {
    const staticPath = process.cwd() + '/static'; // Adjust if needed
    // Actually typically served from 'dist/app/browser' or similar.
    // Ensure we serve files correctly.
    // Looking at package.json: "build:copy-assets": "mkdir -p static && cp -r dist/app/browser/* static/"
    // So static files are in /static/.

    app.use(express.static('static'));

    // SPA Fallback
    app.get('*', (req, res) => {
        if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not Found' });
        res.sendFile('index.html', { root: 'static' });
    });
}

const PORT = process.env['PORT'] || 8080;
httpServer.listen(PORT, () => {
    console.log(`[Server] Running on port ${PORT}`);
});
