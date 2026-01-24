import { Response, NextFunction } from 'express';
import { RequestWithUser } from '../types';

export const authorize = (allowedRoles: string[]) => {
    return (req: RequestWithUser, res: Response, next: NextFunction) => {
        const user = req.user;
        if (!user) {
            return res.sendStatus(401);
        }

        if (!allowedRoles.includes(user.role)) {
            console.warn(`[Auth] Access denied for user ${user.id} with role ${user.role}. Required: ${allowedRoles.join(', ')}`);
            return res.sendStatus(403);
        }

        next();
    };
};
