
import { Page } from 'playwright';
import { FlowScript } from '../index';
import { AutomationCredentials } from '../../types';

export const AmazonScript: FlowScript = {
    async verify(page: Page, creds: AutomationCredentials) {
        try {
            await page.goto('https://www.amazon.com/ap/signin', { waitUntil: 'domcontentloaded' });

            if (await page.isVisible('#ap_email')) {
                await page.fill('#ap_email', creds.email || creds.username);
                await page.click('#continue');
                await page.waitForTimeout(1000);
            }

            if (await page.isVisible('#ap_password')) {
                await page.fill('#ap_password', creds.password);
                await page.click('#signInSubmit');
            }

            try {
                const result = await Promise.race([
                    page.waitForSelector('#auth-error-message-box', { timeout: 5000 }).then(() => 'invalid'),
                    page.waitForURL(/your-account/, { timeout: 10000 }).then(() => 'valid'),
                    page.waitForSelector('#auth-mfa-otpcode', { timeout: 5000 }).then(() => '2fa_required')
                ]);

                if (result === 'invalid') return { status: 'invalid' };
                if (result === 'valid') return { status: 'valid' };
                if (result === '2fa_required') return { status: '2fa_required' };

            } catch (e) {
                return { status: 'error', details: 'Timeout' };
            }

            return { status: 'error', details: 'Unknown' };
        } catch (e: any) {
            return { status: 'error', details: e.message };
        }
    }
};
