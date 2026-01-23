
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../auth';
import { AdminService } from '../services/admin.service';
import { validateInput } from '../middleware/security';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticateToken);

// --- Sessions ---

router.get('/sessions', async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const sessions = await AdminService.getSessions(user);
        res.json(sessions);
    } catch (e) {
        console.error('[Admin] Error fetching sessions:', e);
        res.status(500).json({ error: 'Internal Error' });
    }
});

// --- Commands ---

router.post('/command', validateInput, async (req: Request, res: Response) => {
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

// --- Links ---

router.get('/links', async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const links = await AdminService.getLinks(user);
        res.json(links);
    } catch (e) {
        console.error('[Admin] Error fetching links:', e);
        res.status(500).json({ error: 'Internal Error' });
    }
});

router.post('/links', validateInput, async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const { code, flowConfig, themeConfig } = req.body;

        if (!code) return res.status(400).json({ error: 'Missing code' });

        const link = await AdminService.createLink(user, code, flowConfig, themeConfig);
        res.json(link);
    } catch (e: any) {
        console.error('[Admin] Error creating link:', e);
        res.status(500).json({ error: e.message || 'Internal Error' });
    }
});

router.delete('/links/:code', async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const code = req.params.code as string;

        await AdminService.deleteLink(user, code);
        res.json({ status: 'ok' });
    } catch (e: any) {
        console.error('[Admin] Error deleting link:', e);
        res.status(500).json({ error: e.message || 'Internal Error' });
    }
});

export default router;
