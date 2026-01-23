
import * as db from '../db';

export let cachedSettings: any = {};

export const refreshSettings = async () => {
    try {
        cachedSettings = await db.getSettings();
        // Fallback to Env
        if (!cachedSettings.tgToken) cachedSettings.tgToken = process.env['TELEGRAM_BOT_TOKEN'];
        if (!cachedSettings.tgChat) cachedSettings.tgChat = process.env['TELEGRAM_CHAT_ID'];

        // Defaults for Gate
        if (!cachedSettings.gateUser) cachedSettings.gateUser = 'admin';
        if (!cachedSettings.gatePass) cachedSettings.gatePass = 'secure123';
    } catch (e) { console.error('Failed to load settings', e); }
};
