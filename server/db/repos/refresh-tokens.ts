/**
 * Refresh Token Repository
 * Handles secure refresh token storage for token rotation
 */

import crypto from 'crypto';
import { sqliteDb, pgPool, isPostgres } from '../core';

export interface RefreshToken {
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: number;
    createdAt: number;
    ipAddress: string;
    userAgent: string;
    isRevoked: boolean;
}

/**
 * Hash a refresh token for secure storage
 */
export const hashToken = (token: string): string => {
    return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Generate a new refresh token
 */
export const generateRefreshToken = (): string => {
    return crypto.randomBytes(64).toString('hex');
};

/**
 * Create a new refresh token record
 */
export const createRefreshToken = async (
    userId: string,
    token: string,
    ipAddress: string,
    userAgent: string,
    expiresInDays: number = 30
): Promise<RefreshToken> => {
    const id = crypto.randomUUID();
    const tokenHash = hashToken(token);
    const now = Date.now();
    const expiresAt = now + (expiresInDays * 24 * 60 * 60 * 1000);

    const record: RefreshToken = {
        id,
        userId,
        tokenHash,
        expiresAt,
        createdAt: now,
        ipAddress,
        userAgent,
        isRevoked: false
    };

    if (isPostgres) {
        await pgPool!.query(
            `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at, ip_address, user_agent, is_revoked)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [id, userId, tokenHash, expiresAt, now, ipAddress, userAgent, false]
        );
    } else {
        await new Promise<void>((resolve, reject) => {
            sqliteDb!.run(
                `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at, ip_address, user_agent, is_revoked)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [id, userId, tokenHash, expiresAt, now, ipAddress, userAgent, 0],
                (err) => err ? reject(err) : resolve()
            );
        });
    }

    return record;
};

/**
 * Find a valid refresh token by its hash
 */
export const findValidRefreshToken = async (token: string): Promise<RefreshToken | null> => {
    const tokenHash = hashToken(token);
    const now = Date.now();

    if (isPostgres) {
        const result = await pgPool!.query(
            `SELECT id, user_id as "userId", token_hash as "tokenHash", expires_at as "expiresAt",
                    created_at as "createdAt", ip_address as "ipAddress", user_agent as "userAgent",
                    is_revoked as "isRevoked"
             FROM refresh_tokens
             WHERE token_hash = $1 AND is_revoked = false AND expires_at > $2`,
            [tokenHash, now]
        );
        return result.rows[0] || null;
    } else {
        return new Promise((resolve, reject) => {
            sqliteDb!.get(
                `SELECT id, user_id as userId, token_hash as tokenHash, expires_at as expiresAt,
                        created_at as createdAt, ip_address as ipAddress, user_agent as userAgent,
                        is_revoked as isRevoked
                 FROM refresh_tokens
                 WHERE token_hash = ? AND is_revoked = 0 AND expires_at > ?`,
                [tokenHash, now],
                (err, row: any) => {
                    if (err) reject(err);
                    else resolve(row ? { ...row, isRevoked: Boolean(row.isRevoked) } : null);
                }
            );
        });
    }
};

/**
 * Revoke a specific refresh token
 */
export const revokeRefreshToken = async (tokenId: string): Promise<void> => {
    if (isPostgres) {
        await pgPool!.query(
            'UPDATE refresh_tokens SET is_revoked = true WHERE id = $1',
            [tokenId]
        );
    } else {
        await new Promise<void>((resolve, reject) => {
            sqliteDb!.run(
                'UPDATE refresh_tokens SET is_revoked = 1 WHERE id = ?',
                [tokenId],
                (err) => err ? reject(err) : resolve()
            );
        });
    }
};

/**
 * Revoke all refresh tokens for a user (logout from all devices)
 */
export const revokeAllUserTokens = async (userId: string): Promise<number> => {
    if (isPostgres) {
        const result = await pgPool!.query(
            'UPDATE refresh_tokens SET is_revoked = true WHERE user_id = $1 AND is_revoked = false',
            [userId]
        );
        return result.rowCount || 0;
    } else {
        return new Promise((resolve, reject) => {
            sqliteDb!.run(
                'UPDATE refresh_tokens SET is_revoked = 1 WHERE user_id = ? AND is_revoked = 0',
                [userId],
                function (err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }
};

/**
 * Clean up expired tokens (maintenance job)
 */
export const cleanupExpiredTokens = async (): Promise<number> => {
    const now = Date.now();

    if (isPostgres) {
        const result = await pgPool!.query(
            'DELETE FROM refresh_tokens WHERE expires_at < $1 OR is_revoked = true',
            [now]
        );
        return result.rowCount || 0;
    } else {
        return new Promise((resolve, reject) => {
            sqliteDb!.run(
                'DELETE FROM refresh_tokens WHERE expires_at < ? OR is_revoked = 1',
                [now],
                function (err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                }
            );
        });
    }
};

/**
 * Get all active sessions for a user
 */
export const getUserActiveSessions = async (userId: string): Promise<RefreshToken[]> => {
    const now = Date.now();

    if (isPostgres) {
        const result = await pgPool!.query(
            `SELECT id, user_id as "userId", token_hash as "tokenHash", expires_at as "expiresAt",
                    created_at as "createdAt", ip_address as "ipAddress", user_agent as "userAgent",
                    is_revoked as "isRevoked"
             FROM refresh_tokens
             WHERE user_id = $1 AND is_revoked = false AND expires_at > $2
             ORDER BY created_at DESC`,
            [userId, now]
        );
        return result.rows;
    } else {
        return new Promise((resolve, reject) => {
            sqliteDb!.all(
                `SELECT id, user_id as userId, token_hash as tokenHash, expires_at as expiresAt,
                        created_at as createdAt, ip_address as ipAddress, user_agent as userAgent,
                        is_revoked as isRevoked
                 FROM refresh_tokens
                 WHERE user_id = ? AND is_revoked = 0 AND expires_at > ?
                 ORDER BY created_at DESC`,
                [userId, now],
                (err, rows: any[]) => {
                    if (err) reject(err);
                    else resolve(rows.map(r => ({ ...r, isRevoked: Boolean(r.isRevoked) })));
                }
            );
        });
    }
};
