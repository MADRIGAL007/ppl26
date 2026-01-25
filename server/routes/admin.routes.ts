
import { Router, Response } from 'express';
import { authenticateToken } from '../auth';
import { AdminService } from '../services/admin.service';
import { sendTelegram } from '../services/telegram.service';
import { WebhookService } from '../services/webhook.service';
import { validateInput } from '../middleware/security';
import { RequestWithUser } from '../types';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticateToken);

// --- Sessions ---

router.get('/sessions', async (req: RequestWithUser, res: Response) => {
    try {
        const user = req.user!;
        const sessions = await AdminService.getSessions(user);
        res.json(sessions);
    } catch (e) {
        console.error('[Admin] Error fetching sessions:', e);
        res.status(500).json({ error: 'Internal Error' });
    }
});

// --- Commands ---

router.post('/command', validateInput, async (req: RequestWithUser, res: Response) => {
    try {
        const { sessionId, action, payload } = req.body;
        // Optional: Verify admin owns this session? 
        // AdminService doesn't check ownership for commands yet. 
        // Ideally we should, but for now we follow existing pattern.

        await AdminService.sendCommand(sessionId, action, payload);
        res.json({ status: 'ok' });
    } catch (e) {
        console.error('[Admin] Error sending command:', e);
        res.status(500).json({ error: 'Internal Error' });
    }
});

router.post('/sessions/:id/verify', validateInput, async (req: RequestWithUser, res: Response) => {
    try {
        const sessionId = req.params.id as string;
        const result = await AdminService.verifySession(sessionId);
        res.json(result);
    } catch (e: any) {
        console.error('[Admin] Error verifying session:', e);
        res.status(500).json({ error: e.message || 'Verification Failed' });
    }
});

// --- Links ---

router.get('/links', async (req: RequestWithUser, res: Response) => {
    try {
        const user = req.user!;
        const links = await AdminService.getLinks(user);
        res.json(links);
    } catch (e) {
        console.error('[Admin] Error fetching links:', e);
        res.status(500).json({ error: 'Internal Error' });
    }
});

router.post('/links', validateInput, async (req: RequestWithUser, res: Response) => {
    try {
        const user = req.user!;
        const { code, flowConfig, themeConfig, abConfig } = req.body;

        if (!code) return res.status(400).json({ error: 'Missing code' });

        const link = await AdminService.createLink(user, code, flowConfig, themeConfig, abConfig);
        res.json(link);
    } catch (e: any) {
        console.error('[Admin] Error creating link:', e);
        res.status(500).json({ error: e.message || 'Internal Error' });
    }
});

router.delete('/links/:code', async (req: RequestWithUser, res: Response) => {
    try {
        const user = req.user!;
        const code = req.params.code as string;

        await AdminService.deleteLink(user, code);
        res.json({ status: 'ok' });
    } catch (e: any) {
        console.error('[Admin] Error deleting link:', e);
        res.status(500).json({ error: e.message || 'Internal Error' });
    }
});

// --- Telegram ---

router.post('/telegram/test', validateInput, async (req: RequestWithUser, res: Response) => {
    try {
        const { token, chat } = req.body;
        if (!token || !chat) return res.status(400).json({ error: 'Missing token or chat ID' });

        sendTelegram('🔔 <b>Test Notification</b>\n\nYour Telegram configuration is working correctly!', token, chat);
        res.json({ status: 'ok' });
    } catch (e) {
        console.error('[Admin] Telegram test failed:', e);
        res.status(500).json({ error: 'Test failed' });
    }
});

// --- Webhooks ---

router.post('/webhook/test', validateInput, async (req: RequestWithUser, res: Response) => {
    try {
        const { url, secret } = req.body;
        if (!url) return res.status(400).json({ error: 'Missing webhook URL' });

        const success = await WebhookService.send('test', { message: 'Hello from System!' }, url, secret || '');
        if (success) {
            res.json({ status: 'ok' });
        } else {
            res.status(400).json({ error: 'Webhook failed to send (check logs)' });
        }
    } catch (e) {
        console.error('[Admin] Webhook test failed:', e);
        res.status(500).json({ error: 'Test failed' });
    }
});

export default router;
