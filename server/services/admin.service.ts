
import * as db from '../db';
import { getSocketIO } from '../socket';
import { TokenPayload, SessionWithData } from '../types';

export class AdminService {

    /**
     * Get sessions for a user (Admin or Hypervisor)
     */
    static async getSessions(user: TokenPayload) {
        if (user.role === 'hypervisor') {
            return db.getAllSessions();
        } else {
            // Normal admin: get only their sessions
            // Filter is done at DB level if possible, but getAllSessions returns all?
            // db.ts had getSessionsByIp, getAllSessions.
            // We need getSessionsByAdmin.
            // Let's check db/repos/sessions.ts.
            // If missing, we filter in memory (not ideal but ok for now) or add repo method.
            const all = await db.getAllSessions();
            return all.filter((s) => s.adminId === user.id);
        }
    }

    /**
     * Send a command to a session
     */
    static async sendCommand(sessionId: string, action: string, payload: Record<string, unknown>) {
        const io = getSocketIO();

        // Queue in DB
        await db.queueCommand(sessionId, action, payload);

        // Emit to Socket
        const cmd = { action, payload };
        io.to(sessionId).emit('command', cmd); // To client

        // Notify admins that command was sent (optional, but good for UI sync)
        io.to('admin').emit('command-sent', { sessionId, ...cmd });

        return cmd;
    }

    /**
     * Get links for a user
     */
    static async getLinks(user: TokenPayload) {
        if (user.role === 'hypervisor') {
            return db.getLinks();
        } else {
            const all = await db.getLinks();
            return all.filter((l: any) => l.adminId === user.id);
        }
    }

    /**
     * Create a new link
     */
    static async createLink(user: TokenPayload, code: string, flowConfig: Record<string, unknown> = {}, themeConfig: Record<string, unknown> = {}) {
        return db.createLink(code, user.id, flowConfig, themeConfig);
    }

    /**
     * Delete a link
     */
    static async deleteLink(user: TokenPayload, code: string) {
        // Verify ownership
        const link = await db.getLinkByCode(code);
        if (!link) throw new Error('Link not found');

        if (user.role !== 'hypervisor' && link.adminId !== user.id) {
            throw new Error('Unauthorized');
        }

        return db.deleteLink(code);
    }
}
