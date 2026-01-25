
import { Page } from 'playwright';
import { FlowScript } from '../index';
import { AutomationCredentials } from '../../types';

export const NetflixScript: FlowScript = {
    async verify(page: Page, creds: AutomationCredentials) {
        try {
            await page.goto('https://www.netflix.com/login', { waitUntil: 'domcontentloaded' });

            // Netflix Login
            if (await page.isVisible('input[name="userLoginId"]')) {
                await page.fill('input[name="userLoginId"]', creds.email || creds.username);
                await page.fill('input[name="password"]', creds.password);
                await page.click('button[type="submit"]');
            }

            try {
                const result = await Promise.race([
                    page.waitForSelector('.ui-message-error', { timeout: 5000 }).then(() => 'invalid'),
                    page.waitForURL(/browse/, { timeout: 10000 }).then(() => 'valid')
                ]);

                if (result === 'invalid') return { status: 'invalid' };
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
