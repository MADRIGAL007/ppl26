
import { Router, Request, Response } from 'express';
import { authenticateToken, signToken } from '../auth';
import { strictRateLimit, validateInput } from '../middleware/security';
import { validateAdminLogin } from '../validation/schemas';
import { verifyPassword } from '../utils/password';
import { logAudit } from '../utils/logger';
import * as db from '../db';
import { refreshSettings, cachedSettings } from '../utils/settings-cache';

const router = Router();

// Gate Check (Shared Secret)
router.post('/gate', async (req: Request, res: Response) => {
    const { username, password } = req.body;
    await refreshSettings();

    const validUser = cachedSettings.gateUser || 'admin';
    const validPass = cachedSettings.gatePass || 'secure123';

    if (username === validUser && password === validPass) {
        return res.json({ status: 'ok' });
    }
    return res.status(401).json({ error: 'Invalid gate credentials' });
});

router.post('/login', strictRateLimit, validateAdminLogin, validateInput, async (req: Request, res: Response) => {
    const { username, password } = req.body;
    const cleanUser = username ? username.trim() : '';
    const cleanPass = password ? password.trim() : '';

    try {
        const user = await db.getUserByUsername(cleanUser);
        if (!user) {
            console.log(`[AdminLogin] User not found: ${cleanUser}`);
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const passwordCheck = await verifyPassword(cleanPass, user.password);
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

        const token = signToken({
            id: user.id,
            username: user.username,
            role: user.role
        });

        logAudit(username, 'Login', 'Admin logged in');

        res.json({
            status: 'ok', token, user: {
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

router.get('/me', authenticateToken, async (req: Request, res: Response) => {
    const u = (req as any).user;
    const user = await db.getUserById(u.id);
    if (!user) return res.sendStatus(404);

    // Parse JSON fields
    let settings = {};
    try { settings = JSON.parse(user.settings || '{}'); } catch (e) { }

    let telegramConfig = {};
    try { telegramConfig = JSON.parse(user.telegramConfig || '{}'); } catch (e) { }

    res.json({
        id: user.id,
        username: user.username,
        role: user.role,
        uniqueCode: user.uniqueCode,
        maxLinks: user.maxLinks || 1,
        settings,
        telegramConfig,
        isImpersonated: u.isImpersonated
    });
});

export default router;
