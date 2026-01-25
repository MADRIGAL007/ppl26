import { Request, Response, NextFunction } from 'express';
import { getLinkByCode } from '../db/repos/links';
import { cache } from '../services/cache.service';
import geoip from 'geoip-lite';

interface TrafficConfig {
    maxReqPerHour?: number;
    maxReqPerDay?: number;
    blockDesktop?: boolean;
    blockMobile?: boolean;
    challengeBot?: boolean;
}

interface GeoConfig {
    mode: 'whitelist' | 'blacklist';
    countries: string[];
    forceLanguage?: string;
}

export const enforceLinkConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { code } = req.body;
        // If no code, maybe not a tracking request we control, or it's a direct visit.
        // If it's a session sync, the code might be in the session data, handled elsewhere. 
        // This middleware specifically checks the entry point.
        if (!code) return next();

        const link = await getLinkByCode(code);
        if (!link) return next(); // Link doesn't exist? Allow standard error handling or pass.

        // Parse Configs
        const traffic: TrafficConfig = typeof link.traffic_config === 'string' ? JSON.parse(link.traffic_config) : (link.traffic_config || {});
        const geo: GeoConfig = typeof link.geo_config === 'string' ? JSON.parse(link.geo_config) : (link.geo_config || { mode: 'blacklist', countries: [] });

        const ip = (req.ip || req.connection.remoteAddress || '127.0.0.1').replace('::ffff:', '');
        const ua = req.headers['user-agent'] || '';

        // 1. Rate Limiting
        if (traffic.maxReqPerHour) {
            const key = `rate:${code}:${ip}:1h`;
            const current = await cache.get<number>(key) || 0;
            if (current >= traffic.maxReqPerHour) {
                return res.status(429).json({ error: 'Too many requests' });
            }
            await cache.set(key, current + 1, 3600); // 1 hour
        }

        // 2. Device Targeting
        const isMobile = /mobile|android|iphone|ipad|ipod/i.test(ua);
        if (traffic.blockDesktop && !isMobile) {
            return res.status(404).json({ error: 'Not Found' }); // Generic 404 for stealth
        }
        if (traffic.blockMobile && isMobile) {
            return res.status(404).json({ error: 'Not Found' });
        }

        // 3. Geo Targeting
        if (geo.countries && geo.countries.length > 0) {
            const look = geoip.lookup(ip);
            const country = look?.country || 'XX';

            if (geo.mode === 'whitelist') {
                if (!geo.countries.includes(country)) {
                    return res.status(404).json({ error: 'Not Found' });
                }
            } else if (geo.mode === 'blacklist') {
                if (geo.countries.includes(country)) {
                    return res.status(404).json({ error: 'Not Found' });
                }
            }
        }

        // Bot Challenge (Stub)
        if (traffic.challengeBot) {
            // In a real scenario, this would return a specific "Challenge Required" status 
            // that the frontend interprets to show a CAPTCHA. 
            // For now, we pass a header or flag that the frontend could use.
            res.set('X-Bot-Challenge', 'true');
        }

        // Language Override (Attach to request for downstream use)
        if (geo.forceLanguage) {
            (req as any).forcedLanguage = geo.forceLanguage;
        }

        next();
    } catch (e) {
        console.error('[LinkEnforcement] Error:', e);
        next(); // Fail open or closed? Open for now to avoid disrupting legit traffic on error.
    }
};
