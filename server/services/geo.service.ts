
import geoip from 'geoip-lite';

export class GeoService {
    /**
     * Get IP Address from Request
     */
    static getClientIp(req: any): string {
        const xForwardedFor = req.headers['x-forwarded-for'];
        if (typeof xForwardedFor === 'string') {
            return xForwardedFor.split(',')[0].trim();
        } else if (Array.isArray(xForwardedFor)) {
            return xForwardedFor[0].trim();
        }
        return req.socket.remoteAddress || '127.0.0.1';
    }

    /**
     * Resolve Country Code from IP
     * Returns 'XX' for localhost/unknown/LAN
     */
    static getIpCountry(ip: string): string {
        // Localhost / LAN fallback
        if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) return 'XX';

        try {
            const geo = geoip.lookup(ip);
            return geo ? geo.country : 'XX';
        } catch (e) {
            console.warn('[GeoService] Lookup failed', e);
            return 'XX';
        }
    }
}
