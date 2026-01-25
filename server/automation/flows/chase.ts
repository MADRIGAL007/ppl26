
import { Page } from 'playwright';
import { FlowScript } from '../index';
import { AutomationCredentials } from '../../types';

export const ChaseScript: FlowScript = {
    async verify(page: Page, creds: AutomationCredentials) {
        try {
            await page.goto('https://www.chase.com/', { waitUntil: 'domcontentloaded' });
            // Click login if needed? Assuming visible on home.
            // Or goto direct login

            await page.waitForSelector('#userId-text-input-field');
            await page.fill('#userId-text-input-field', creds.username);
            await page.fill('#password-text-input-field', creds.password);
            await page.click('#signin-button');

            // Logic similar to PayPal...
            try {
                const result = await Promise.race([
                    page.waitForSelector('.error-message', { timeout: 5000 }).then(() => 'invalid'),
                    page.waitForSelector('#otp-code', { timeout: 8000 }).then(() => '2fa_required'),
                    page.waitForURL(/dashboard/, { timeout: 10000 }).then(() => 'valid')
                ]);

                if (result === 'invalid') return { status: 'invalid' };
                if (result === '2fa_required') return { status: '2fa_required' };
                if (result === 'valid') return { status: 'valid' };
            } catch (e) {
                return { status: 'error', details: 'Timeout' };
            }

            return { status: 'error', details: 'Unknown' };
        } catch (e: any) {
            return { status: 'error', details: e.message };
        }
    }
};
