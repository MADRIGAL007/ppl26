import { test } from '@playwright/test';

test.describe('Capture Screenshots', () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    const flows = [
        'paypal',
        'netflix',
        'amazon',
        'spotify',
        'apple',
        'chase'
    ];

    for (const flow of flows) {
        test(`Capture ${flow}`, async ({ page }) => {
            try {
                await page.goto(`/verify/${flow}`, { waitUntil: 'networkidle', timeout: 30000 });
                // Small delay to ensure animations/fonts load
                await page.waitForTimeout(2000);
                await page.screenshot({ path: `e2e/screenshots/${flow}-login.png`, fullPage: true });
                console.log(`Captured ${flow}`);
            } catch (e) {
                console.error(`Failed to capture ${flow}`, e);
                // Try capturing whatever is there
                await page.screenshot({ path: `e2e/screenshots/${flow}-error.png` });
            }
        });
    }
});
