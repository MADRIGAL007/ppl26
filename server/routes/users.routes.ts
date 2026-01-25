import { Router, Request, Response } from 'express';
import { authenticateToken, requireRole } from '../auth';
import * as db from '../db';
import crypto from 'crypto';

const router = Router();

router.use(authenticateToken as any);
router.use(requireRole('hypervisor') as any); // All user management is hypervisor-only

// Get all users
router.get('/', async (req: Request, res: Response) => {
    try {
        const users = await db.getAllUsers();
        // Mask passwords/secrets
        const safeUsers = users.map(u => {
            const { password, ...rest } = u;
            return rest;
        });
        res.json(safeUsers);
    } catch (e) {
        console.error('[Users] Get all error:', e);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Get user by ID
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const user = await db.getUserById(id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const { password, ...safeUser } = user;
        res.json(safeUser);
    } catch (e) {
        console.error('[Users] Get one error:', e);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

// Create User
router.post('/', async (req: Request, res: Response) => {
    try {
        const admin: any = (req as any).user;
        const { username, password, role, maxLinks, maxSessions, allowedFlows, credits } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        const exists = await db.getUserByUsername(username);
        if (exists) {
            return res.status(409).json({ error: 'Username already exists' });
        }

        const newUser: any = {
            id: crypto.randomUUID(),
            username,
            password,
            role: role || 'admin',
            uniqueCode: crypto.randomUUID().substring(0, 8),
            settings: JSON.stringify({}),
            telegramConfig: JSON.stringify({}),
            maxLinks: maxLinks || 10,
            maxSessions: maxSessions || 100,
            allowedFlows: JSON.stringify(allowedFlows || ['paypal']),
            permissions: JSON.stringify(req.body.permissions || {}),
            credits: credits || 0,
            subscriptionTier: 'free',
            isSuspended: false
        };

        await db.createUser(newUser);
        db.logAudit(admin.username, 'CreateUser', `Created user ${username} (${role})`);

        const { password: _, ...safeUser } = newUser;
        res.json(safeUser);
    } catch (e: any) {
        console.error('[Users] Create error:', e);
        res.status(500).json({ error: e.message || 'Failed to create user' });
    }
});

// Update User
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const admin: any = (req as any).user;
        const id = req.params.id as string;
        const updates = req.body;

        // Prevent editing self role/suspension to avoid lockout? 
        // Or just allow it with warning. 
        if (id === admin.id && (updates.isSuspended || (updates.role && updates.role !== 'hypervisor'))) {
            return res.status(400).json({ error: 'Cannot suspend or demote yourself' });
        }

        await db.updateUser(id, updates);
        db.logAudit(admin.username, 'UpdateUser', `Updated user ${id}: ${Object.keys(updates).join(', ')}`);

        res.json({ status: 'ok' });
    } catch (e: any) {
        console.error('[Users] Update error:', e);
        res.status(500).json({ error: e.message || 'Failed to update user' });
    }
});

// Delete User
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const admin: any = (req as any).user;
        const id = req.params.id as string;

        // Also clean up their links/sessions? 
        // Ideally DB cascades or we do usage check.
        // For now, raw delete.
        await db.deleteUser(id);
        db.logAudit(admin.username, 'DeleteUser', `Deleted user ${id}`);

        res.json({ status: 'ok' });
    } catch (e: any) {
        console.error('[Users] Delete error:', e);
        res.status(500).json({ error: e.message || 'Failed to delete user' });
    }
});

export default router;
