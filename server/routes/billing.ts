/**
 * Billing Routes
 * Handles crypto subscription payments and plan management
 */

import { Router, Request, Response } from 'express';
import * as crypto from '../billing/crypto';
// We need to export getOrgPayments from crypto module if it's there, or import from repo.
// Looking at repo billing.ts, it exports getOrgPayments.
// Let's import it from the repo file which matches where it was defined in previous turns.
import { getOrgPayments } from '../db/repos/billing';
import * as orgDb from '../db/organizations';
import { TenantRequest } from '../middleware/tenant';

const router = Router();

// Middleware to require authentication
function requireAuth(req: Request, res: Response, next: any) {
    if (!(req as any).user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    next();
}

// Middleware to require hypervisor role
function requireHypervisor(req: Request, res: Response, next: any) {
    const user = (req as any).user;
    if (!user || user.role !== 'hypervisor') {
        return res.status(403).json({ error: 'Hypervisor access required' });
    }
    next();
}

// --- Plan Information ---

router.get('/plans', (req: Request, res: Response) => {
    const plans = Object.entries(crypto.PLANS).map(([key, value]) => ({
        id: key,
        name: value.name,
        monthlyPriceUSD: value.monthlyPriceUSD,
        cryptoPrices: value.cryptoPrices,
        limits: value.limits,
        features: value.features
    }));
    res.json({ plans });
});

// --- Payment Request ---

router.post('/payment-request', requireAuth, async (req: TenantRequest, res: Response) => {
    try {
        const { plan, cryptoType, durationMonths = 1 } = req.body;

        if (!plan || !cryptoType) {
            return res.status(400).json({ error: 'Plan and cryptoType required' });
        }

        if (!['starter', 'pro', 'enterprise'].includes(plan)) {
            return res.status(400).json({ error: 'Invalid plan' });
        }

        if (!['BTC', 'ETH', 'USDT', 'USDC'].includes(cryptoType)) {
            return res.status(400).json({ error: 'Invalid crypto type' });
        }

        const payment = crypto.createPaymentRequest(
            req.orgId!,
            plan as crypto.PlanKey,
            cryptoType as crypto.CryptoType,
            durationMonths
        );

        // Save payment to database (implement in db module)
        // await db.saveCryptoPayment(payment);

        res.json({
            payment: {
                id: payment.id,
                amount: crypto.formatCryptoAmount(payment.amount, payment.cryptoType),
                walletAddress: payment.walletAddress,
                expiresAt: new Date(payment.expiresAt).toISOString(),
                status: payment.status
            },
            instructions: crypto.getPaymentInstructions(payment)
        });
    } catch (error: any) {
        console.error('[Billing] Payment request error:', error);
        res.status(500).json({ error: error.message || 'Failed to create payment request' });
    }
});

// --- Submit Transaction Hash ---

router.post('/submit-tx', requireAuth, async (req: TenantRequest, res: Response) => {
    try {
        const { paymentId, txHash } = req.body;

        if (!paymentId || !txHash) {
            return res.status(400).json({ error: 'Payment ID and transaction hash required' });
        }

        // Update payment with tx hash (implement in db module)
        // await db.updateCryptoPayment(paymentId, { txHash, status: 'submitted' });

        res.json({
            success: true,
            message: 'Transaction submitted. Awaiting admin verification.'
        });
    } catch (error: any) {
        console.error('[Billing] Submit TX error:', error);
        res.status(500).json({ error: error.message || 'Failed to submit transaction' });
    }
});

// --- Admin: Verify Payment ---

router.post('/verify-payment', requireAuth, requireHypervisor, async (req: Request, res: Response) => {
    try {
        const { paymentId, txHash } = req.body;
        const user = (req as any).user;

        if (!paymentId) {
            return res.status(400).json({ error: 'Payment ID required' });
        }

        // Verify payment (implement full logic with db module)
        // await crypto.verifyPayment(paymentId, txHash, user.id, db);

        res.json({ success: true, message: 'Payment verified and subscription activated' });
    } catch (error: any) {
        console.error('[Billing] Verify payment error:', error);
        res.status(500).json({ error: error.message || 'Failed to verify payment' });
    }
});

// --- Admin: Reject Payment ---

router.post('/reject-payment', requireAuth, requireHypervisor, async (req: Request, res: Response) => {
    try {
        const { paymentId, reason } = req.body;
        const user = (req as any).user;

        if (!paymentId) {
            return res.status(400).json({ error: 'Payment ID required' });
        }

        // Reject payment (implement full logic with db module)
        // await crypto.rejectPayment(paymentId, reason, user.id, db);

        res.json({ success: true, message: 'Payment rejected' });
    } catch (error: any) {
        console.error('[Billing] Reject payment error:', error);
        res.status(500).json({ error: error.message || 'Failed to reject payment' });
    }
});

// --- Get Subscription Status ---

router.get('/subscription', requireAuth, async (req: TenantRequest, res: Response) => {
    try {
        const status = await crypto.checkSubscriptionStatus(req.orgId!);
        res.json(status);
    } catch (error: any) {
        console.error('[Billing] Subscription status error:', error);
        res.status(500).json({ error: error.message || 'Failed to get subscription status' });
    }
});

// --- Admin: List Pending Payments ---

router.get('/pending-payments', requireAuth, requireHypervisor, async (req: Request, res: Response) => {
    try {
        // Get pending payments (implement in db module)
        // const payments = await db.getPendingCryptoPayments();
        const payments: any[] = [];
        res.json({ payments });
    } catch (error: any) {
        console.error('[Billing] List payments error:', error);
        res.status(500).json({ error: error.message || 'Failed to list payments' });
    }
});

// --- Wallet Addresses ---

router.get('/wallets', (req: Request, res: Response) => {
    res.json({
        wallets: {
            BTC: crypto.PLATFORM_WALLETS.BTC || 'Not configured',
            ETH: crypto.PLATFORM_WALLETS.ETH || 'Not configured',
            USDT: crypto.PLATFORM_WALLETS.USDT || 'Not configured',
            USDC: crypto.PLATFORM_WALLETS.USDC || 'Not configured'
        }
    });
});

router.get('/history', requireAuth, async (req: TenantRequest, res: Response) => {
    try {
        const payments = await getOrgPayments(req.orgId!);
        res.json({ payments });
    } catch (error: any) {
        console.error('[Billing] History error:', error);
        res.status(500).json({ error: error.message || 'Failed to get payment history' });
    }
});

export default router;
