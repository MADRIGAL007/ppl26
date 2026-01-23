
import { Router, Request, Response } from 'express';
import * as db from '../db';
import { logAudit } from '../utils/logger';
import { refreshSettings, cachedSettings } from '../utils/settings-cache';
import { authenticateToken } from '../auth'; // Ensure only authorized users can post, though legacy code was loose.

const router = Router();

// Settings API
router.get('/', async (req: Request, res: Response) => {
    await refreshSettings();
    const safeSettings = { ...cachedSettings };
    delete safeSettings.admin_password;
    res.json(safeSettings);
});

// Using authenticateToken for write operations to enforce security
// The original code was loose (`app.post('/api/settings')` with no auth!?)
// We will ADD auth here because it's critical.
router.post('/', authenticateToken, async (req: Request, res: Response) => {
    const { tgToken, tgChat, gateUser, gatePass } = req.body;
    const user = (req as any).user;

    // Only Hypervisor can update global settings?
    // Original code: "Hypervisor Only for Gate? No... Assuming this is open for now"
    // Let's enforce that at least they are an authenticated admin with 'hypervisor' role if possible.
    if (user.role !== 'hypervisor') {
        return res.status(403).json({ error: 'Unauthorized: Hypervisor access required' });
    }

    if (tgToken !== undefined) await db.updateSetting('tgToken', tgToken);
    if (tgChat !== undefined) await db.updateSetting('tgChat', tgChat);
    if (gateUser !== undefined) await db.updateSetting('gateUser', gateUser);
    if (gatePass !== undefined) await db.updateSetting('gatePass', gatePass);

    await refreshSettings();
    logAudit('System', 'UpdateSettings', 'Updated global settings');
    res.json({ status: 'ok' });
});

export default router;
