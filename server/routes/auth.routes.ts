// ... imports ...
import { Router, Request, Response } from 'express';
import { authenticateToken, signToken, signRefreshPayload, verifyToken, REFRESH_TOKEN_EXPIRY_DAYS } from '../auth';
import { strictRateLimit, validateInput } from '../middleware/security';
import { getCsrfTokenHandler } from '../middleware/csrf';
import { validateAdminLogin } from '../validation/schemas';
import { verifyPassword } from '../utils/password';
import { logAudit } from '../utils/logger';
import { verifyTOTP, setupMFA, hashBackupCodes } from '../services/mfa.service';
import * as db from '../db';
import { refreshSettings, cachedSettings } from '../utils/settings-cache';
import { RequestWithUser } from '../types';

const router = Router();

/**
 * @openapi
 * /api/admin/csrf-token:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: Get CSRF token
 *     description: Retrieve a CSRF token for form submissions
 *     responses:
 *       200:
 *         description: CSRF token generated successfully
 */
router.get('/csrf-token', getCsrfTokenHandler);

/**
 * @openapi
 * /api/admin/gate:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Gate authentication check
 *     description: Verify gate credentials before showing admin login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Gate authentication successful
 *       401:
 *         description: Invalid gate credentials
 */
router.post('/gate', strictRateLimit, async (req: Request, res: Response) => {
    const { username, password } = req.body;

    // Simple check against cached settings
    if (
        (cachedSettings.gateUser && username === cachedSettings.gateUser) &&
        (cachedSettings.gatePass && password === cachedSettings.gatePass)
    ) {
        return res.json({ status: 'ok' });
    }

    return res.status(401).json({ error: 'Invalid gate credentials' });
});

/**
 * @openapi
 * /api/admin/login:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Admin login
 *     description: Authenticate admin user and receive JWT access token and refresh token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *               totp:
 *                 type: string
 *                 description: TOTP code (required if MFA is enabled)
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: JWT access token
 *                 user:
 *                   type: object
 *       401:
 *         description: Invalid credentials or MFA required
 */
router.post('/login', strictRateLimit, validateAdminLogin, validateInput, async (req: Request, res: Response) => {
    // ... existing login logic with minimal changes, signToken is typesafe now ...
    const { username, password } = req.body;
    const cleanUser = username ? username.trim() : '';
    const cleanPass = password ? password.trim() : '';

    try {
        const user = await db.getUserByUsername(cleanUser);
        if (!user) {
            console.log(`[AdminLogin] User not found: ${cleanUser}`);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        // ... (rest of logic same until signToken)
        const passwordCheck = await verifyPassword(cleanPass, user.password!);
        if (!passwordCheck.valid) {
            console.log(`[AdminLogin] Password mismatch for: ${cleanUser}`);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (passwordCheck.needsUpgrade && passwordCheck.hashed) {
            await db.updateUser(user.id, { password: passwordCheck.hashed });
        }

        if (user.isSuspended) {
            console.log(`[AdminLogin] User suspended: ${cleanUser}`);
            return res.status(403).json({ error: 'Account Suspended' });
        }

        // Check if MFA is enabled for this user
        let userSettings: any = {};
        try { userSettings = JSON.parse(user.settings || '{}'); } catch (e) { }

        if (userSettings.mfaEnabled && userSettings.mfaSecret) {
            // MFA checks...
            const { mfaToken } = req.body;
            if (!mfaToken) {
                return res.json({
                    status: 'mfa_required',
                    userId: user.id,
                    message: 'MFA verification required'
                });
            }
            // Verify MFA token
            const isValidMFA = verifyTOTP(mfaToken, userSettings.mfaSecret);
            if (!isValidMFA) {
                // Check backup codes
                const backupCodes = userSettings.mfaBackupCodes || [];
                const usedHash = backupCodes.find((hash: string) => {
                    const tokenHash = require('crypto').createHash('sha256').update(mfaToken.toUpperCase().replace(/[^A-Z0-9]/g, '')).digest('hex');
                    return hash === tokenHash;
                });

                if (!usedHash) {
                    console.log(`[AdminLogin] Invalid MFA token for: ${cleanUser}`);
                    return res.status(401).json({ error: 'Invalid MFA code' });
                }

                // Remove used backup code
                userSettings.mfaBackupCodes = backupCodes.filter((c: string) => c !== usedHash);
                await db.updateUser(user.id, { settings: JSON.stringify(userSettings) });
                logAudit(username, 'MFA', 'Used backup code for login');
            }
        }

        const token = signToken({
            id: user.id,
            username: user.username,
            role: user.role
        });

        // ... refresh token logic ...
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        const userAgent = req.get('User-Agent') || 'unknown';
        const refreshTokenRaw = db.generateRefreshToken();
        await db.createRefreshToken(
            user.id,
            refreshTokenRaw,
            ip,
            userAgent,
            REFRESH_TOKEN_EXPIRY_DAYS
        );

        logAudit(username, 'Login', 'Admin logged in');

        res.json({
            status: 'ok',
            token,
            refreshToken: refreshTokenRaw,
            expiresIn: 900,
            mfaEnabled: !!userSettings.mfaEnabled,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                uniqueCode: user.uniqueCode
            }
        });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Internal Error' });
    }
});

// Authenticated routes using RequestWithUser
router.get('/me', authenticateToken, async (req: RequestWithUser, res: Response) => {
    const u = req.user!;
    const user = await db.getUserById(u.id);
    if (!user) return res.sendStatus(404);

    let settings = {};
    try { settings = JSON.parse(user.settings || '{}'); } catch (e) { }

    let telegramConfig = {};
    try { telegramConfig = JSON.parse(user.telegramConfig || '{}'); } catch (e) { }

    // Check if user object has isImpersonated (it's not on User db type, maybe on session?)
    // In previous code: u.isImpersonated. u is from token payload? TokenPayload doesn't have isImpersonated.
    // If we support impersonation, we need to add it to TokenPayload.

    res.json({
        id: user.id,
        username: user.username,
        role: user.role,
        uniqueCode: user.uniqueCode,
        maxLinks: user.maxLinks || 1,
        settings,
        telegramConfig,
        // isImpersonated: u.isImpersonated // TokenPayload doesn't have this yet. Removed to be strict.
    });
});

// ... Refresh, Logout (use RequestWithUser) ...

router.post('/logout', authenticateToken, async (req: RequestWithUser, res: Response) => {
    const { refreshToken } = req.body;
    const user = req.user!;

    try {
        if (refreshToken) {
            const tokenRecord = await db.findValidRefreshToken(refreshToken);
            if (tokenRecord && tokenRecord.userId === user.id) {
                await db.revokeRefreshToken(tokenRecord.id);
            }
        }
        logAudit(user.username, 'Logout', 'Admin logged out');
        res.json({ status: 'ok' });
    } catch (e) {
        console.error('[Auth] Logout error:', e);
        res.status(500).json({ error: 'Internal error' });
    }
});

router.post('/logout-all', authenticateToken, async (req: RequestWithUser, res: Response) => {
    const user = req.user!;

    try {
        const count = await db.revokeAllUserTokens(user.id);
        logAudit(user.username, 'LogoutAll', `Logged out from ${count} devices`);
        res.json({ status: 'ok', sessionsRevoked: count });
    } catch (e) {
        console.error('[Auth] Logout all error:', e);
        res.status(500).json({ error: 'Internal error' });
    }
});

router.get('/sessions', authenticateToken, async (req: RequestWithUser, res: Response) => {
    const user = req.user!;
    try {
        const sessions = await db.getUserActiveSessions(user.id);
        const safeSessions = sessions.map(s => ({
            id: s.id,
            ipAddress: s.ipAddress,
            userAgent: s.userAgent,
            createdAt: s.createdAt,
            expiresAt: s.expiresAt
        }));
        res.json(safeSessions);
    } catch (e) {
        console.error('[Auth] Get sessions error:', e);
        res.status(500).json({ error: 'Internal error' });
    }
});

router.delete('/sessions/:sessionId', authenticateToken, async (req: RequestWithUser, res: Response) => {
    const user = req.user!;
    const { sessionId } = req.params;

    try {
        const sessions = await db.getUserActiveSessions(user.id);
        const target = sessions.find(s => s.id === sessionId);

        if (!target) {
            return res.status(404).json({ error: 'Session not found' });
        }

        await db.revokeRefreshToken(sessionId as string);
        logAudit(user.username, 'RevokeSession', `Revoked session ${sessionId}`);
        res.json({ status: 'ok' });
    } catch (e) {
        console.error('[Auth] Revoke session error:', e);
        res.status(500).json({ error: 'Internal error' });
    }
});

router.post('/mfa/setup', authenticateToken, async (req: RequestWithUser, res: Response) => {
    const user = req.user!;
    try {
        const dbUser = await db.getUserById(user.id);
        if (!dbUser) return res.status(404).json({ error: 'User not found' });
        // ... (rest logic check)

        let userSettings: any = {};
        try { userSettings = JSON.parse(dbUser.settings || '{}'); } catch (e) { }

        if (userSettings.mfaEnabled) {
            return res.status(400).json({ error: 'MFA is already enabled' });
        }

        const mfaSetup = await setupMFA(user.username);
        userSettings.mfaPendingSecret = mfaSetup.secret;
        userSettings.mfaPendingBackupCodes = hashBackupCodes(mfaSetup.backupCodes);
        await db.updateUser(user.id, { settings: JSON.stringify(userSettings) });

        res.json({
            status: 'ok',
            secret: mfaSetup.secret,
            otpAuthUrl: mfaSetup.otpAuthUrl,
            qrCodeDataUrl: mfaSetup.qrCodeDataUrl,
            backupCodes: mfaSetup.backupCodes
        });
    } catch (e) {
        console.error('[Auth] MFA setup error:', e);
        res.status(500).json({ error: 'MFA setup failed' });
    }
});

router.post('/mfa/verify-setup', authenticateToken, async (req: RequestWithUser, res: Response) => {
    const user = req.user!;
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Verification token required' });

    try {
        const dbUser = await db.getUserById(user.id);
        if (!dbUser) return res.status(404).json({ error: 'User not found' });

        let userSettings: any = {};
        try { userSettings = JSON.parse(dbUser.settings || '{}'); } catch (e) { }

        if (!userSettings.mfaPendingSecret) {
            return res.status(400).json({ error: 'No pending MFA setup found' });
        }

        const isValid = verifyTOTP(token, userSettings.mfaPendingSecret);
        if (!isValid) return res.status(401).json({ error: 'Invalid verification code' });

        userSettings.mfaEnabled = true;
        userSettings.mfaSecret = userSettings.mfaPendingSecret;
        userSettings.mfaBackupCodes = userSettings.mfaPendingBackupCodes;
        delete userSettings.mfaPendingSecret;
        delete userSettings.mfaPendingBackupCodes;

        await db.updateUser(user.id, { settings: JSON.stringify(userSettings) });
        logAudit(user.username, 'MFA', 'MFA enabled');
        res.json({ status: 'ok', message: 'MFA enabled successfully' });
    } catch (e) {
        console.error('[Auth] MFA verify setup error:', e);
        res.status(500).json({ error: 'MFA verification failed' });
    }
});

router.post('/mfa/disable', authenticateToken, async (req: RequestWithUser, res: Response) => {
    const user = req.user!;
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Password and MFA token required' });

    try {
        const dbUser = await db.getUserById(user.id);
        if (!dbUser) return res.status(404).json({ error: 'User not found' });

        const passwordCheck = await verifyPassword(password, dbUser.password!);
        if (!passwordCheck.valid) return res.status(401).json({ error: 'Invalid password' });

        let userSettings: any = {};
        try { userSettings = JSON.parse(dbUser.settings || '{}'); } catch (e) { }

        if (!userSettings.mfaEnabled) return res.status(400).json({ error: 'MFA is not enabled' });

        const isValid = verifyTOTP(token, userSettings.mfaSecret);
        if (!isValid) return res.status(401).json({ error: 'Invalid MFA code' });

        delete userSettings.mfaEnabled;
        delete userSettings.mfaSecret;
        delete userSettings.mfaBackupCodes;

        await db.updateUser(user.id, { settings: JSON.stringify(userSettings) });
        logAudit(user.username, 'MFA', 'MFA disabled');
        res.json({ status: 'ok', message: 'MFA disabled successfully' });
    } catch (e) {
        console.error('[Auth] MFA disable error:', e);
        res.status(500).json({ error: 'Failed to disable MFA' });
    }
});

router.get('/mfa/status', authenticateToken, async (req: RequestWithUser, res: Response) => {
    const user = req.user!;
    try {
        const dbUser = await db.getUserById(user.id);
        if (!dbUser) return res.status(404).json({ error: 'User not found' });
        let userSettings: any = {};
        try { userSettings = JSON.parse(dbUser.settings || '{}'); } catch (e) { }

        res.json({
            mfaEnabled: !!userSettings.mfaEnabled,
            backupCodesRemaining: userSettings.mfaBackupCodes?.length || 0
        });
    } catch (e) {
        console.error('[Auth] MFA status error:', e);
        res.status(500).json({ error: 'Failed to get MFA status' });
    }
});

export default router;
