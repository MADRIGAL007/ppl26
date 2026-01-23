/**
 * CSRF Protection Middleware
 * Implements Double Submit Cookie pattern
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_TOKEN_LENGTH = 32;

/**
 * Generate a new CSRF token
 */
export const generateCsrfToken = (): string => {
    return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
};

/**
 * Middleware to set CSRF token cookie on response
 * Call this on initial page load or login
 */
export const setCsrfToken = (req: Request, res: Response, next: NextFunction) => {
    // Only set if not already present
    if (!req.cookies[CSRF_COOKIE_NAME]) {
        const token = generateCsrfToken();
        res.cookie(CSRF_COOKIE_NAME, token, {
            httpOnly: false, // Must be readable by JS
            secure: process.env['NODE_ENV'] === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });
    }
    next();
};

/**
 * Middleware to validate CSRF token on state-changing requests
 * Compares cookie value with header value (Double Submit Cookie pattern)
 */
export const validateCsrfToken = (req: Request, res: Response, next: NextFunction) => {
    // Skip for safe methods
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (safeMethods.includes(req.method)) {
        return next();
    }

    // Skip for API endpoints that use Bearer auth (they have their own protection)
    // but apply to session-based auth endpoints
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
        // API calls with JWT are protected against CSRF by the token itself
        return next();
    }

    const cookieToken = req.cookies[CSRF_COOKIE_NAME];
    const headerToken = req.headers[CSRF_HEADER_NAME] as string;

    if (!cookieToken || !headerToken) {
        console.warn('[CSRF] Missing token - cookie:', !!cookieToken, 'header:', !!headerToken);
        return res.status(403).json({ error: 'CSRF token missing' });
    }

    // Timing-safe comparison
    if (!timingSafeEqual(cookieToken, headerToken)) {
        console.warn('[CSRF] Token mismatch');
        return res.status(403).json({ error: 'CSRF token invalid' });
    }

    next();
};

/**
 * Timing-safe string comparison to prevent timing attacks
 */
const timingSafeEqual = (a: string, b: string): boolean => {
    if (a.length !== b.length) {
        return false;
    }

    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);

    return crypto.timingSafeEqual(bufA, bufB);
};

/**
 * Middleware to refresh CSRF token (rotate on sensitive actions)
 */
export const rotateCsrfToken = (req: Request, res: Response, next: NextFunction) => {
    const token = generateCsrfToken();
    res.cookie(CSRF_COOKIE_NAME, token, {
        httpOnly: false,
        secure: process.env['NODE_ENV'] === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000
    });

    // Attach new token to response for client to update
    res.setHeader('X-New-CSRF-Token', token);
    next();
};

/**
 * Get CSRF token endpoint handler
 * Returns current CSRF token for SPA to use
 */
export const getCsrfTokenHandler = (req: Request, res: Response) => {
    let token = req.cookies[CSRF_COOKIE_NAME];

    if (!token) {
        token = generateCsrfToken();
        res.cookie(CSRF_COOKIE_NAME, token, {
            httpOnly: false,
            secure: process.env['NODE_ENV'] === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000
        });
    }

    res.json({ csrfToken: token });
};
