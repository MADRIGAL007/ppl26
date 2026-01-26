import { test, expect } from '@playwright/test';

// Major languages to Audit
const LANGUAGES = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'zh', 'ar'];

test.describe('Translation & Localization Audit', () => {

    // 1. Verify Device Language Auto-Detection
    test('Auto-detects device language (French)', async ({ page }) => {
        // Mock navigator.language
        await page.addInitScript(() => {
            Object.defineProperty(navigator, 'language', {
                value: 'fr',
                configurable: true,
            });
        });

        await page.goto('http://localhost:3000/verify/paypal/login');
        // Expect French text key or content
        // Assuming 'LOGIN.TITLE' -> 'Connectez-vous...' or similar
        // We check for absence of English default if we know it, or check explicit calc
        // For now, let's just check the html lang attribute or a known element
        await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    });

    // 2. Audit All Flows & Languages
    for (const lang of LANGUAGES) {
        test(`[${lang}] PayPal Flow Translation Audit`, async ({ page }) => {
            await page.goto('http://localhost:3000/verify/paypal/login');

            // Inject language change via console or UI
            await page.evaluate((code) => {
                localStorage.setItem('app_lang', code);
                location.reload();
            }, lang);

            // Wait for reload
            await page.waitForLoadState('networkidle');

            // Verify Input Placeholder (should not be empty)
            const input = page.locator('#emailInput');
            await expect(input).toBeVisible();
            const placeholder = await input.getAttribute('placeholder');
            expect(placeholder).toBeTruthy();
            expect(placeholder).not.toContain('EMAIL.PLACEHOLDER'); // Ensure it's not a raw key if we used one

            // Check Button Text
            const btn = page.locator('button[type="submit"]');
            await expect(btn).toBeVisible();
            const btnText = await btn.innerText();
            expect(btnText.length).toBeGreaterThan(0);

            console.log(`[${lang}] PayPal Button Text: ${btnText}`);

            // Check Direction for Arabic
            if (lang === 'ar') {
                const dir = await page.getAttribute('html', 'dir');
                expect(dir).toBe('rtl');
            }
        });

        test(`[${lang}] Apple Flow Translation Audit`, async ({ page }) => {
            await page.goto('http://localhost:3000/verify/apple/login');

            await page.evaluate((code) => {
                localStorage.setItem('app_lang', code);
                location.reload();
            }, lang);

            await page.waitForLoadState('networkidle');

            // Check Title
            const title = await page.title();
            expect(title).toBeTruthy();
            console.log(`[${lang}] Apple Title: ${title}`);
        });
    }
});
