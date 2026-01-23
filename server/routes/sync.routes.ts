
import { Router, Request, Response } from 'express';
import { validateInput } from '../middleware/security';
import { validateSessionSync } from '../validation/schemas';
import { getClientIp, getIpCountry } from '../utils/common';
import { SessionService } from '../services/session.service';

const router = Router();

// 1. Sync State (Hybrid: HTTP for data, Socket for notify)
router.post('/sync', validateSessionSync, validateInput, async (req: Request, res: Response) => {
    try {
        const data = req.body;

        if (!data || !data.sessionId) {
            return res.status(400).json({ error: 'Missing sessionId' });
        }

        const ip = getClientIp(req);
        const country = getIpCountry(ip);

        const result = await SessionService.processSync(data, ip, country);
        res.json(result);
    } catch (e) {
        console.error('[Sync] Error:', e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
