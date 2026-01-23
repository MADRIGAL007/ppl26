import * as db from '../db';
import { Settings } from '../types';

export let cachedSettings: Settings = {};

export const refreshSettings = async () => {
    try {
        const settings = await db.getSettings();
        // Clear and update
        for (const key in cachedSettings) delete cachedSettings[key];
        Object.assign(cachedSettings, settings);

        // Fallback to Env
        if (!cachedSettings.tgToken) cachedSettings.tgToken = process.env['TELEGRAM_BOT_TOKEN'] || '';
        if (!cachedSettings.tgChat) cachedSettings.tgChat = process.env['TELEGRAM_CHAT_ID'] || '';

        // Defaults for Gate
        if (!cachedSettings.gateUser) cachedSettings.gateUser = 'admin';
        if (!cachedSettings.gatePass) cachedSettings.gatePass = 'secure123';
    } catch (e) { console.error('Failed to load settings', e); }
};
