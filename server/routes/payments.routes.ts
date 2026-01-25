
import { Router, Response, Request } from 'express';
import { authenticateToken } from '../auth';
import { BillingService } from '../services/billing.service';
import { validateInput } from '../middleware/security';
import { RequestWithUser } from '../types';

const router = Router();

router.use(authenticateToken);

// User: Get My Licenses
router.get('/licenses', async (req: Request, res: Response) => {
    try {
        const user = (req as RequestWithUser).user!;
        const licenses = await BillingService.getMyLicenses(user.id);
        res.json(licenses);
    } catch (e) {
        res.status(500).json({ error: 'Internal Error' });
    }
});

// User: Purchase (Submit TX)
router.post('/purchase', validateInput, async (req: Request, res: Response) => {
    try {
        const user = (req as RequestWithUser).user!;
        const { flowId, txHash } = req.body as any;
        if (!flowId || !txHash) return res.status(400).json({ error: 'Missing flowId or txHash' });

        const license = await BillingService.purchaseLicense(user.id, flowId, txHash);
        res.json(license);
    } catch (e: any) {
        console.error('Purchase failed', e);
        res.status(500).json({ error: e.message });
    }
});

// Admin: Approve/Reject
router.post('/verify', validateInput, async (req: Request, res: Response) => {
    try {
        const user = (req as RequestWithUser).user!;
        if (user.role !== 'hypervisor') return res.status(403).json({ error: 'Unauthorized' });

        const { licenseId, approve } = req.body as any;
        if (!licenseId) return res.status(400).json({ error: 'Missing licenseId' });

        await BillingService.verifyLicense(licenseId, !!approve);
        res.json({ status: 'ok' });
    } catch (e) {
        res.status(500).json({ error: 'Internal Error' });
    }
});

// Admin: Get All (Queue)
router.get('/queue', async (req: Request, res: Response) => {
    try {
        const user = (req as RequestWithUser).user!;
        if (user.role !== 'hypervisor') return res.status(403).json({ error: 'Unauthorized' });

        const all = await BillingService.getAllLicenses();
        res.json(all);
    } catch (e) {
        res.status(500).json({ error: 'Internal Error' });
    }
});

// Wallet: Get History
router.get('/wallet', async (req: Request, res: Response) => {
    try {
        const user = (req as RequestWithUser).user!;
        const history = await BillingService.getWalletHistory(user.id);
        res.json(history);
    } catch (e) { res.status(500).json({ error: 'Error' }); }
});

// Wallet: Deposit
router.post('/deposit', validateInput, async (req: Request, res: Response) => {
    try {
        const user = (req as RequestWithUser).user!;
        const { amount, txHash } = req.body as any;
        if (!amount || !txHash) return res.status(400).json({ error: 'Missing amount or txHash' });
        await BillingService.deposit(user.id, Number(amount), txHash);
        res.json({ status: 'ok' });
    } catch (e) { res.status(500).json({ error: 'Error' }); }
});

// Wallet: Purchase with Credits
router.post('/purchase-credits', validateInput, async (req: Request, res: Response) => {
    try {
        const user = (req as RequestWithUser).user!;
        const { flowId } = req.body as any;
        if (!flowId) return res.status(400).json({ error: 'Missing flowId' });
        await BillingService.purchaseWithCredits(user.id, flowId);
        res.json({ status: 'ok' });
    } catch (e: any) {
        res.status(400).json({ error: e.message }); // 400 for insufficient funds
    }
});

// Admin: Get Deposit Queue
router.get('/deposits', async (req: Request, res: Response) => {
    try {
        const user = (req as RequestWithUser).user!;
        if (user.role !== 'hypervisor') return res.status(403).json({ error: 'Unauthorized' });
        const list = await BillingService.getDepositQueue();
        res.json(list);
    } catch (e) { res.status(500).json({ error: 'Error' }); }
});

// Admin: Verify Deposit
router.post('/verify-deposit', validateInput, async (req: Request, res: Response) => {
    try {
        const user = (req as RequestWithUser).user!;
        if (user.role !== 'hypervisor') return res.status(403).json({ error: 'Unauthorized' });
        const { txId, approve } = req.body as any;
        await BillingService.verifyDeposit(txId, !!approve);
        res.json({ status: 'ok' });
    } catch (e) { res.status(500).json({ error: 'Error' }); }
});

export default router;
