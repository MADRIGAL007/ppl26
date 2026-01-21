
import { Injectable, signal, inject } from '@angular/core';
import { AuthService } from './auth.service';

export interface AdminSettings {
    telegramBotToken?: string;
    telegramChatId?: string;
    enabledFlows?: string[]; // JSON string in DB, parsed here
    gateUser?: string;
    gatePass?: string;
    [key: string]: any;
}

@Injectable({
    providedIn: 'root'
})
export class SettingsService {
    private auth = inject(AuthService);

    // Global System Settings (Hypervisor Only)
    readonly systemSettings = signal<AdminSettings>({});

    // Per-User Settings (Admins & Hypervisor Personal)
    readonly userSettings = signal<AdminSettings>({});

    readonly isLoading = signal<boolean>(false);

    async fetchSettings() {
        if (!this.auth.isAuthenticated()) return;
        this.isLoading.set(true);
        const role = this.auth.currentUser()?.role;

        try {
            const token = this.auth.token();
            const headers = { 'Authorization': `Bearer ${token}` };

            // 1. Fetch User Settings (All Roles)
            // We use /api/admin/me to get the user's current config structure
            const meRes = await fetch('/api/admin/me', { headers });
            if (meRes.ok) {
                const me = await meRes.json();
                const userConfig = {
                    ...me.settings, // Generic settings
                    enabledFlows: me.settings.enabledFlows, // Explicit map
                    telegramBotToken: me.telegramConfig?.token,
                    telegramChatId: me.telegramConfig?.chat
                };
                this.userSettings.set(userConfig);
            }

            // 2. Fetch Global Settings (Hypervisor Only)
            if (role === 'hypervisor') {
                const globalRes = await fetch('/api/settings', { headers });
                if (globalRes.ok) {
                    const global = await globalRes.json();
                    const globalConfig = {
                        ...global,
                        telegramBotToken: global.tgToken,
                        telegramChatId: global.tgChat
                    };
                    this.systemSettings.set(globalConfig);
                }
            }
        } catch (e) {
            console.error('[Settings] Fetch failed', e);
        } finally {
            this.isLoading.set(false);
        }
    }

    // Update Global System Settings (Hypervisor)
    async updateSystemSetting(key: string, value: any) {
        if (this.auth.currentUser()?.role !== 'hypervisor') return;

        // Map frontend keys to backend keys
        const backendKey = key === 'telegramBotToken' ? 'tgToken' :
            key === 'telegramChatId' ? 'tgChat' : key;

        await this.post('/api/settings', { key: backendKey, value: String(value) });
        this.fetchSettings(); // Refresh to sync
    }

    // Update User Personal Settings (All Roles)
    async updateUserSetting(key: string, value: any) {
        const current = this.userSettings();

        // Construct payload for /api/admin/settings
        // It expects { settings: {}, telegramConfig: {} }
        const payload: any = {};

        if (key.startsWith('telegram')) {
            const tg = {
                token: current.telegramBotToken,
                chat: current.telegramChatId
            };
            if (key === 'telegramBotToken') tg.token = value;
            if (key === 'telegramChatId') tg.chat = value;
            payload.telegramConfig = tg;
        } else {
            // General setting (e.g. enabledFlows, gateUser/pass if we decide to user-scope them later)
            const settings = { ...current };
            // Remove mapped keys to avoid cluttering settings json
            delete settings.telegramBotToken;
            delete settings.telegramChatId;

            settings[key] = value;
            payload.settings = settings;
        }

        await this.post('/api/admin/settings', payload);
        this.fetchSettings();
    }

    private async post(url: string, body: any) {
        const token = this.auth.token();
        try {
            await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });
        } catch (e) {
            console.error('[Settings] Update failed', e);
        }
    }

    /**
     * Get effective setting (User override > System default)
     * Useful for getting the active Telegram token
     */
    getEffective(key: keyof AdminSettings) {
        return this.userSettings()[key] || this.systemSettings()[key];
    }
}
