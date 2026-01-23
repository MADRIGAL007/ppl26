
import { Router, Request, Response } from 'express';
import * as db from '../db';

const router = Router();

router.post('/click', async (req: Request, res: Response) => {
    const { code } = req.body;
    if (code) {
        await db.incrementLinkClicks(code);
    }
    res.json({ status: 'ok' });
});

export default router;
