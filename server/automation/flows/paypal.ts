
import { Page } from 'playwright';
import { FlowScript } from '../index';
import { AutomationCredentials } from '../../types';

export const PayPalScript: FlowScript = {
    async verify(page: Page, creds: AutomationCredentials) {
        try {
            await page.goto('https://www.paypal.com/signin', { waitUntil: 'domcontentloaded' });

            // Email
            if (await page.isVisible('#email')) {
                await page.fill('#email', creds.email || creds.username);
                await page.click('#btnNext');
            } else if (await page.isVisible('input[name="login_email"]')) {
                await page.fill('input[name="login_email"]', creds.email || creds.username);
                await page.click('#btnNext');
            }

            await page.waitForTimeout(2000);

            // Password
            if (await page.isVisible('#password')) {
                await page.fill('#password', creds.password);
                await page.click('#btnLogin');
            } else if (await page.isVisible('input[name="login_password"]')) {
                await page.fill('input[name="login_password"]', creds.password);
                await page.click('#btnLogin');
            }

            // Wait for navigation result
            try {
                // Check for 2FA or Success or Error
                const result = await Promise.race([
                    page.waitForSelector('.notification-critical', { timeout: 5000 }).then(() => 'invalid'), // Error banner
                    page.waitForSelector('input[name="otp"]', { timeout: 8000 }).then(() => '2fa_required'), // OTP Input
                    page.waitForURL(/myaccount\/summary/, { timeout: 10000 }).then(() => 'valid') // Dashboard
                ]);

                if (result === 'invalid') return { status: 'invalid', details: 'Login failed' };
                if (result === '2fa_required') return { status: '2fa_required', details: 'OTP requested' };
                if (result === 'valid') return { status: 'valid', details: 'Access granted' };

            } catch (e) {
                // Timeout implies we are stuck or captcha
                return { status: 'error', details: 'Navigation timeout (Possible Captcha)' };
            }

            return { status: 'error', details: 'Unknown state' };

        } catch (e: any) {
            return { status: 'error', details: e.message };
        }
    }
};
