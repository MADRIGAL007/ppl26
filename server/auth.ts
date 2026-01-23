import jwt from 'jsonwebtoken';
import { Response, NextFunction } from 'express';
import { TokenPayload, RequestWithUser, RefreshTokenPayload } from './types';

// SECURITY: Enforce JWT secret configuration
const JWT_SECRET_FROM_ENV = process.env['JWT_SECRET'];
const MIN_SECRET_LENGTH = 32;

if (!JWT_SECRET_FROM_ENV || JWT_SECRET_FROM_ENV.length < MIN_SECRET_LENGTH) {
    if (process.env['NODE_ENV'] === 'production') {
        console.error('[Auth] ❌ FATAL: JWT_SECRET must be set and at least 32 characters in production');
        console.error('[Auth] ❌ Set JWT_SECRET environment variable with a secure random string');
        process.exit(1);
    } else {
        console.warn('[Auth] ⚠️  WARNING: JWT_SECRET not set or too short. Using insecure default for development.');
        console.warn('[Auth] ⚠️  Never deploy to production without setting JWT_SECRET!');
    }
}

const JWT_SECRET = JWT_SECRET_FROM_ENV || 'dev-only-insecure-secret-do-not-use-in-prod';

// Token expiry constants
export const ACCESS_TOKEN_EXPIRY = '15m'; // Short-lived access tokens
export const REFRESH_TOKEN_EXPIRY_DAYS = 30;

export const signToken = (payload: Omit<TokenPayload, 'iat' | 'exp'>) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
};

export const signRefreshPayload = (userId: string, tokenId: string) => {
    const payload: Omit<RefreshTokenPayload, 'iat' | 'exp'> = { userId, tokenId, type: 'refresh' };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
};

export const verifyToken = (token: string): TokenPayload | null => {
    try {
        return jwt.verify(token, JWT_SECRET) as TokenPayload;
    } catch (e) {
        return null;
    }
};

export const authenticateToken = (req: RequestWithUser, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    const user = verifyToken(token);
    if (!user) return res.sendStatus(403);

    req.user = user;
    next();
};

export const requireRole = (role: 'admin' | 'hypervisor') => {
    return (req: RequestWithUser, res: Response, next: NextFunction) => {
        const user = req.user;
        if (!user || user.role !== role) {
            return res.sendStatus(403);
        }
        next();
    };
};
