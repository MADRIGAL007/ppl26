
import { Page } from 'playwright';
import { FlowScript } from '../index';
import { AutomationCredentials } from '../../types';

export const AppleScript: FlowScript = {
    async verify(page: Page, creds: AutomationCredentials) {
        try {
            // Apple ID sign-in page
            await page.goto('https://appleid.apple.com/sign-in', { waitUntil: 'domcontentloaded' });

            // Wait for the iframe to load
            try {
                // Apple ID widget is usually in an iframe
                // NOTE: Locator strategy might change, Apple updates often. 
                // We use frameLocator if possible, or wait for specific light DOM elements if it's not iframed anymore (it changes).
                // Modern Apple ID is often Shadow DOM or iFrame.

                // Let's generic wait for "Sign In" text or input
                await page.waitForTimeout(3000);

                // Attempt to find the input in the page (if not iframed in recent version) or iframe
                // Try iframe first
                const frame = page.frameLocator('#aid-auth-widget-iFrame');
                const hasFrame = await page.locator('#aid-auth-widget-iFrame').count() > 0;

                let input;
                let button;

                if (hasFrame) {
                    input = frame.locator('#account_name_text_field');
                    button = frame.locator('#sign-in');
                } else {
                    input = page.locator('#account_name_text_field');
                    button = page.locator('#sign-in');
                }

                // Fill Username
                await input.waitFor({ state: 'visible', timeout: 10000 });
                await input.fill(creds.username || creds.email);
                await page.keyboard.press('Enter'); // Key press often more reliable than click for Apple

                // Wait for Password slide transition
                await page.waitForTimeout(2000);

                // Determine if password field is visible
                // Logic: Apple sometimes asks for Password immediately, sometimes 2FA/Security Question if risky.

                let passwordInput;
                if (hasFrame) {
                    passwordInput = frame.locator('#password_text_field');
                } else {
                    passwordInput = page.locator('#password_text_field');
                }

                await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
                await passwordInput.fill(creds.password);
                await page.keyboard.press('Enter');

                // Check Result
                const result = await Promise.race([
                    // Error (Invalid Creds)
                    (hasFrame ? frame : page).getByText('Incorrect Apple ID or password').waitFor({ timeout: 5000 }).then(() => 'invalid'),

                    // 2FA (Code entry)
                    (hasFrame ? frame : page).getByText('Two-Factor Authentication').waitFor({ timeout: 8000 }).then(() => '2fa_required'),
                    (hasFrame ? frame : page).locator('.security-code-inputs').waitFor({ timeout: 8000 }).then(() => '2fa_required'),

                    // Valid (Dashboard / Trusted Device)
                    page.waitForURL(/account/, { timeout: 15000 }).then(() => 'valid')
                ]);

                if (result === 'invalid') return { status: 'invalid' };
                if (result === '2fa_required') return { status: '2fa_required' };
                if (result === 'valid') return { status: 'valid' };

            } catch (e: any) {
                // If we timed out finding inputs, it might be heavy bot detection
                if (e.message.includes('Timeout')) {
                    return { status: 'error', details: 'Timeout (Bot Detected or Slow Network)' };
                }
                throw e; // Rethrow to outer catch
            }

            return { status: 'error', details: 'Unknown State' };

        } catch (e: any) {
            return { status: 'error', details: e.message };
        }
    }
};
