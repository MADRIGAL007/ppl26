/**
 * API Key Authentication Middleware
 * Validates API keys and enforces permissions
 */

import crypto from 'crypto';
import * as orgDb from '../db/organizations';
import { securityLog } from '../services/logger';

export interface ApiKeyContext {
    keyId: string;
    orgId: string;
    permissions: string[];
}

declare global {
    namespace Express {
        interface Request {
            apiKey?: ApiKeyContext;
        }
    }
}

/**
 * Hash an API key for lookup
 */
export function hashApiKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * API Key authentication middleware
 * Checks Authorization header for Bearer token starting with 'ppl_'
 */
export function authenticateApiKey() {
    return async (req: any, res: any, next: any) => {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return next(); // No API key provided, continue (may use session auth)
        }

        // Check for Bearer token
        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
            return next();
        }

        const token = parts[1];

        // Check if it's an API key (starts with ppl_)
        if (!token.startsWith('ppl_')) {
            return next(); // Not an API key, continue with other auth methods
        }

        try {
            const keyHash = hashApiKey(token);
            const apiKey = await orgDb.getApiKeyByHash(keyHash);

            if (!apiKey) {
                securityLog('invalid_api_key', {
                    ip: req.ip,
                    userAgent: req.headers['user-agent']
                });
                return res.status(401).json({ error: 'Invalid API key' });
            }

            // Check expiration
            if (apiKey.expiresAt && Date.now() > apiKey.expiresAt) {
                return res.status(401).json({ error: 'API key expired' });
            }

            // Attach API key context to request
            req.apiKey = {
                keyId: apiKey.id,
                orgId: apiKey.orgId,
                permissions: apiKey.permissions
            };

            // Also set org context for tenant middleware
            req.orgId = apiKey.orgId;

            // Update last used timestamp
            await orgDb.updateApiKeyLastUsed(apiKey.id);

            next();
        } catch (error) {
            console.error('[API Key Auth] Error:', error);
            return res.status(500).json({ error: 'Authentication error' });
        }
    };
}

/**
 * Check if request has specific API permission
 */
export function requireApiPermission(permission: string) {
    return (req: any, res: any, next: any) => {
        if (!req.apiKey) {
            // Not using API key auth, skip this check
            return next();
        }

        const permissions = req.apiKey.permissions || [];

        // Check for wildcard or specific permission
        if (permissions.includes('*') || permissions.includes(permission)) {
            return next();
        }

        // Check for category permissions (e.g., 'read:*' matches 'read:sessions')
        const [category] = permission.split(':');
        if (permissions.includes(`${category}:*`)) {
            return next();
        }

        securityLog('permission_denied', {
            keyId: req.apiKey.keyId,
            requiredPermission: permission,
            actualPermissions: permissions
        });

        return res.status(403).json({
            error: 'Insufficient permissions',
            required: permission
        });
    };
}

/**
 * Rate limiting per API key
 */
const rateLimits = new Map<string, { count: number; resetAt: number }>();

export function apiKeyRateLimit(maxRequests: number = 100, windowMs: number = 60000) {
    return (req: any, res: any, next: any) => {
        if (!req.apiKey) {
            return next();
        }

        const keyId = req.apiKey.keyId;
        const now = Date.now();

        let limit = rateLimits.get(keyId);

        if (!limit || now > limit.resetAt) {
            limit = { count: 0, resetAt: now + windowMs };
            rateLimits.set(keyId, limit);
        }

        limit.count++;

        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', maxRequests);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - limit.count));
        res.setHeader('X-RateLimit-Reset', Math.ceil(limit.resetAt / 1000));

        if (limit.count > maxRequests) {
            securityLog('rate_limit_exceeded', {
                keyId,
                count: limit.count,
                limit: maxRequests
            });

            return res.status(429).json({
                error: 'Rate limit exceeded',
                retryAfter: Math.ceil((limit.resetAt - now) / 1000)
            });
        }

        next();
    };
}

// Cleanup old rate limit entries periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimits.entries()) {
        if (now > value.resetAt) {
            rateLimits.delete(key);
        }
    }
}, 60000);

/**
 * Standard API permissions
 */
export const API_PERMISSIONS = {
    // Read permissions
    READ_SESSIONS: 'read:sessions',
    READ_LINKS: 'read:links',
    READ_ANALYTICS: 'read:analytics',
    READ_USERS: 'read:users',

    // Write permissions
    WRITE_SESSIONS: 'write:sessions',
    WRITE_LINKS: 'write:links',
    WRITE_USERS: 'write:users',

    // Admin permissions
    ADMIN_BILLING: 'admin:billing',
    ADMIN_SETTINGS: 'admin:settings',
    ADMIN_USERS: 'admin:users',

    // Wildcards
    READ_ALL: 'read:*',
    WRITE_ALL: 'write:*',
    ADMIN_ALL: 'admin:*',
    FULL_ACCESS: '*'
};
