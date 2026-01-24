import { Router } from 'express';
import { SystemController } from '../controllers/system.controller';
import { authenticateToken } from '../auth';
import { authorize } from '../middleware/role.middleware';

const router = Router();

// All routes require authentication and hypervisor role
router.use(authenticateToken, authorize(['hypervisor']));

router.get('/metrics', SystemController.getMetrics);
router.get('/audit-logs', SystemController.getAuditLogs);
router.post('/cache/clear', SystemController.clearCache);
router.post('/backup', SystemController.triggerBackup);
router.post('/restore', SystemController.restoreBackup);

export default router;
