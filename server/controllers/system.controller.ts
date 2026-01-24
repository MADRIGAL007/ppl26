import { Request, Response } from 'express';
import os from 'os';
import { pgPool } from '../db/core';
import { redisClient } from '../services/redis.service';
import logger from '../utils/logger';

export class SystemController {

    static async getMetrics(req: Request, res: Response) {
        try {
            const memoryUsage = process.memoryUsage();
            const cpuUsage = process.cpuUsage();

            const metrics = {
                uptime: process.uptime(),
                memory: {
                    rss: memoryUsage.rss,
                    heapTotal: memoryUsage.heapTotal,
                    heapUsed: memoryUsage.heapUsed,
                    external: memoryUsage.external,
                },
                cpu: cpuUsage,
                os: {
                    totalMem: os.totalmem(),
                    freeMem: os.freemem(),
                    loadAvg: os.loadavg(),
                    platform: os.platform(),
                    release: os.release(),
                }
            };

            res.json(metrics);
        } catch (error) {
            logger.error('Error fetching system metrics', error);
            res.status(500).json({ error: 'Failed to fetch metrics' });
        }
    }

    static async getAuditLogs(req: Request, res: Response) {
        try {
            const limit = parseInt(req.query.limit as string) || 50;
            const offset = parseInt(req.query.offset as string) || 0;

            if (!pgPool) {
                res.status(503).json({ error: 'Database not initialized' });
                return;
            }

            const result = await pgPool.query(
                'SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2',
                [limit, offset]
            );

            const total = await pgPool.query('SELECT COUNT(*) FROM audit_logs');

            res.json({
                logs: result.rows,
                total: parseInt(total.rows[0].count),
            });
        } catch (error) {
            logger.error('Error fetching audit logs', error);
            res.status(500).json({ error: 'Failed to fetch audit logs' });
        }
    }

    static async clearCache(req: Request, res: Response) {
        try {
            await redisClient?.flushall();
            logger.info('Redis cache cleared by admin');
            res.json({ message: 'Cache cleared successfully' });
        } catch (error) {
            logger.error('Error clearing cache', error);
            res.status(500).json({ error: 'Failed to clear cache' });
        }
    }

    static async triggerBackup(req: Request, res: Response) {
        // Mock backup functionality for now
        // Real implementation would dump PG database
        try {
            logger.info('Backup triggered by admin');
            // Simulate backup delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            res.json({
                message: 'Backup started',
                backupId: `backup-${Date.now()}`
            });
        } catch (error) {
            logger.error('Backup failed', error);
            res.status(500).json({ error: 'Backup failed' });
        }
    }

    static async restoreBackup(req: Request, res: Response) {
        // Mock restore functionality
        res.json({ message: 'Restore functionality restricted in this environment' });
    }
}
