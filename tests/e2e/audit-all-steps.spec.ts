import { test, Page, expect } from '@playwright/test';

/**
 * Visual & Functional Integrity Audit
 */

async function capture(page: Page, flow: string, step: string) {
    const filename = `audit-${flow}-${step}.png`;
    console.log(`[${flow}] Capturing ${step}...`);
    await page.waitForTimeout(1000);
    // Simple console log instead of screenshot if directory doesn't exist, 
    // but we'll try to save it.
    await page.screenshot({ path: `tests/e2e/screenshots/audit/${filename}`, fullPage: true }).catch(() => {
        console.log(`Failed to save screenshot for ${flow}-${step}`);
    });
}

test.describe('Ultra-Fidelity Flow Audit', () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    const BRAND_FLOWS = [
        { id: 'paypal', loader: '.animate-spin-slow', next: 'limited' },
        { id: 'netflix', loader: '.netflix-red-spinner', next: 'payment' },
        { id: 'amazon', loader: '.amazon-spinner', next: 'password' },
        { id: 'apple', loader: '.apple-spinner', next: '2fa' },
        { id: 'chase', loader: '.chase-spinner', next: 'questions' },
        { id: 'spotify', loader: '.spotify-dots', next: 'success' }
    ];

    for (const flow of BRAND_FLOWS) {
        test(`Audit: ${flow.id.toUpperCase()} Flow Fidelity`, async ({ page }) => {
            test.setTimeout(60000);
            console.log(`>>> Auditing Flow: ${flow.id}`);

            // 1. Initial Security Check
            await page.goto(`/verify/${flow.id}/login`);

            // Check for brand-specific security check loader
            const securityLoader = page.locator(flow.loader);
            await expect(securityLoader).toBeVisible({ timeout: 10000 });

            await capture(page, flow.id, '0-security-check');

            // 2. Login Page
            // Wait for navigation to login (Security check auto-navigates)
            await page.waitForURL('**/login', { timeout: 15000 });

            // Check branding: Ensure logo exists
            const logo = page.locator(`img[alt*="${flow.id}" i], img[alt*="Secure" i]`).first();
            await expect(logo).toBeVisible();

            // BRAND ISOLATION CHECK: Ensure no "SecureCheck" unless paypal
            if (flow.id !== 'paypal') {
                const bodyText = await page.innerText('body');
                expect(bodyText).not.toContain('SecureCheck');
            }

            // Fill Login
            const emailField = page.locator('input[name="email"], input[id="email"], [formControlName="email"], input[name="username"], input[name="appleId"]').first();
            const passField = page.locator('input[name="password"], input[id="password"], [formControlName="password"]').first();

            await emailField.fill('audit@test.com');
            if (await passField.isVisible()) {
                await passField.fill('Password123!');
            }

            await page.locator('button[type="submit"], button.apple-submit-btn').first().click();

            // 3. Post-Login Loading Screen
            const postLoginLoader = page.locator(flow.loader);
            await expect(postLoginLoader).toBeVisible({ timeout: 5000 });
            await capture(page, flow.id, '2-loading-transition');

            // 4. Next Step Navigation
            await page.waitForTimeout(5000); // Wait for transition
            const currentUrl = page.url();
            console.log(`[${flow.id}] Final URL: ${currentUrl}`);

            expect(currentUrl).toContain(flow.next);
            await capture(page, flow.id, `3-final-step`);
        });
    }
});
