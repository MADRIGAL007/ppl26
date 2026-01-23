/**
 * System Routes - Admin System Management API
 * Provides server health, audit logs, and system configuration endpoints
 */

import { Router, Request, Response } from 'express';
import { authenticateToken, requireRole } from '../auth';
import * as db from '../db';
import os from 'os';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticateToken);

// --- Health & Metrics ---

router.get('/health', async (req: Request, res: Response) => {
    try {
        const uptime = process.uptime();
        const memoryUsage = process.memoryUsage();
        const cpuUsage = os.loadavg();

        // Database health check
        let dbStatus = 'unknown';
        try {
            await db.getSettings();
            dbStatus = 'connected';
        } catch (e) {
            dbStatus = 'disconnected';
        }

        res.json({
            status: 'ok',
            uptime: Math.floor(uptime),
            uptimeFormatted: formatUptime(uptime),
            memory: {
                used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
                total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
                rss: Math.round(memoryUsage.rss / 1024 / 1024)
            },
            cpu: {
                loadAvg1: cpuUsage[0].toFixed(2),
                loadAvg5: cpuUsage[1].toFixed(2),
                loadAvg15: cpuUsage[2].toFixed(2)
            },
            database: dbStatus,
            nodeVersion: process.version,
            platform: os.platform(),
            hostname: os.hostname(),
            timestamp: Date.now()
        });
    } catch (e) {
        console.error('[System] Health check error:', e);
        res.status(500).json({ error: 'Health check failed' });
    }
});

// --- Audit Logs (Hypervisor only) ---

router.get('/audit-logs', requireRole('hypervisor'), async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
        const action = req.query.action as string;
        const actor = req.query.actor as string;
        const startDate = req.query.startDate ? parseInt(req.query.startDate as string) : undefined;
        const endDate = req.query.endDate ? parseInt(req.query.endDate as string) : undefined;

        const logs = await db.getAuditLogs({
            page,
            limit,
            action,
            actor,
            startDate,
            endDate
        });

        res.json(logs);
    } catch (e) {
        console.error('[System] Get audit logs error:', e);
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
});

// --- Stats Overview ---

router.get('/stats', async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const isHypervisor = user.role === 'hypervisor';

        const stats = await db.getStats(isHypervisor ? undefined : user.id);

        // Count active users (admins)
        let activeUsers = 0;
        if (isHypervisor) {
            const allUsers = await db.getAllUsers();
            activeUsers = allUsers.filter((u: any) => !u.isSuspended).length;
        }

        res.json({
            ...stats,
            activeUsers: isHypervisor ? activeUsers : undefined,
            timestamp: Date.now()
        });
    } catch (e) {
        console.error('[System] Get stats error:', e);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// --- Pending Crypto Payments (Hypervisor only) ---

router.get('/payments', requireRole('hypervisor'), async (req: Request, res: Response) => {
    try {
        const status = req.query.status as string || 'pending';
        const payments = await db.getCryptoPaymentsByStatus(status);
        res.json(payments);
    } catch (e) {
        console.error('[System] Get payments error:', e);
        res.status(500).json({ error: 'Failed to fetch payments' });
    }
});

router.post('/payments/:id/verify', requireRole('hypervisor'), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { txHash } = req.body;
        const user = (req as any).user;

        if (!txHash) {
            return res.status(400).json({ error: 'Transaction hash required' });
        }

        // Import crypto module to use verifyPayment
        const { verifyPayment } = await import('../billing/crypto');
        await verifyPayment(id as string, txHash, user.username, db);

        db.logAudit(user.username, 'VerifyPayment', `Verified payment ${id}`);
        res.json({ status: 'ok' });
    } catch (e: any) {
        console.error('[System] Verify payment error:', e);
        res.status(500).json({ error: e.message || 'Failed to verify payment' });
    }
});

router.post('/payments/:id/reject', requireRole('hypervisor'), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const user = (req as any).user;

        const { rejectPayment } = await import('../billing/crypto');
        await rejectPayment(id as string, reason || 'Rejected by admin', user.username, db);

        db.logAudit(user.username, 'RejectPayment', `Rejected payment ${id}: ${reason}`);
        res.json({ status: 'ok' });
    } catch (e: any) {
        console.error('[System] Reject payment error:', e);
        res.status(500).json({ error: e.message || 'Failed to reject payment' });
    }
});

// --- Cleanup Tasks (Hypervisor only) ---

router.post('/cleanup/tokens', requireRole('hypervisor'), async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const count = await db.cleanupExpiredTokens();
        db.logAudit(user.username, 'CleanupTokens', `Cleaned up ${count} expired tokens`);
        res.json({ status: 'ok', cleaned: count });
    } catch (e) {
        console.error('[System] Cleanup tokens error:', e);
        res.status(500).json({ error: 'Cleanup failed' });
    }
});

// --- Backup & Restore (Hypervisor only) ---

router.get('/backup', requireRole('hypervisor'), async (req: Request, res: Response) => {
    try {
        const { createBackup } = await import('../services/backup.service');
        const backup = await createBackup();
        const filename = `backup-${new Date().toISOString().split('T')[0]}.json`;

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.json(backup);

        const user = (req as any).user;
        db.logAudit(user.username, 'CreateBackup', `Created system backup`);
    } catch (e) {
        console.error('[System] Backup error:', e);
        res.status(500).json({ error: 'Backup failed' });
    }
});

router.post('/restore', requireRole('hypervisor'), async (req: Request, res: Response) => {
    try {
        const { restoreBackup } = await import('../services/backup.service');
        const backupData = req.body;
        const user = (req as any).user;

        if (!backupData || !backupData.data) {
            return res.status(400).json({ error: 'Invalid backup data' });
        }

        // Check backup version/type if needed

        await restoreBackup(backupData);
        db.logAudit(user.username, 'RestoreBackup', `Restored system from backup (Epoch: ${backupData.timestamp})`);

        res.json({ status: 'ok', message: 'System restored successfully' });
    } catch (e: any) {
        console.error('[System] Restore error:', e);
        res.status(500).json({ error: 'Restore failed: ' + e.message });
    }
});

// --- Helper Functions ---

function formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

export default router;
