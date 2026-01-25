import { Request, Response, NextFunction } from 'express';
import { PermissionsService, UserPermissions } from '../services/permissions.service';
import { getLinksCountByUserId } from '../db/repos/links';
import { getSessionsCountByUserId } from '../db/repos/sessions';

export const requirePermission = (permission: keyof UserPermissions) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: 'Unauthorized' });

            const hasPerm = await PermissionsService.hasPermission(userId, permission);
            if (!hasPerm) {
                return res.status(403).json({ error: `Missing permission: ${permission}` });
            }
            next();
        } catch (error) {
            next(error);
        }
    };
};

export const checkLinkLimit = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const count = await getLinksCountByUserId(userId);
        const canCreate = await PermissionsService.canCreateLink(userId, count);

        if (!canCreate) {
            return res.status(403).json({
                error: 'Link limit reached. Please upgrade your plan.',
                code: 'LIMIT_REACHED_LINKS'
            });
        }
        next();
    } catch (error) {
        next(error);
    }
};

export const checkFlowAccess = (flowIdParam: string = 'flowId') => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userId = (req as any).user?.id;
            if (!userId) return res.status(401).json({ error: 'Unauthorized' });

            const flowId = req.params[flowIdParam] || req.body.flowId;
            if (!flowId) return next(); // If no flow ID, maybe skip or fail? adapting to context.

            const allowed = await PermissionsService.hasFlowAccess(userId, flowId);
            if (!allowed) {
                return res.status(403).json({
                    error: `Access to flow '${flowId}' denied. Upgrade to access this flow.`,
                    code: 'FLOW_ACCESS_DENIED'
                });
            }
            next();
        } catch (error) {
            next(error);
        }
    };
};
