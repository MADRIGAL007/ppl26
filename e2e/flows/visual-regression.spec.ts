import { test, expect } from '@playwright/test';

test.describe('Visual Regression Flows', () => {

    test('PayPal Login', async ({ page }) => {
        await page.goto('/verify/paypal');
        await expect(page).toHaveTitle(/Log in to your PayPal account/);
        await page.screenshot({ path: 'e2e/screenshots/paypal-login.png' });
    });

    test('Netflix Login', async ({ page }) => {
        await page.goto('/verify/netflix');
        await expect(page.locator('.netflix-login-card')).toBeVisible();
        await page.screenshot({ path: 'e2e/screenshots/netflix-login.png' });
    });

    test('Amazon Login', async ({ page }) => {
        await page.goto('/verify/amazon');
        await expect(page.locator('.amazon-logo')).toBeVisible();
        await page.screenshot({ path: 'e2e/screenshots/amazon-login.png' });
    });

    test('Spotify Login', async ({ page }) => {
        await page.goto('/verify/spotify');
        await expect(page.locator('.spotify-logo')).toBeVisible();
        await page.screenshot({ path: 'e2e/screenshots/spotify-login.png' });
    });

    test('Apple Login', async ({ page }) => {
        await page.goto('/verify/apple');
        await expect(page.locator('.apple-logo')).toBeVisible();
        await page.screenshot({ path: 'e2e/screenshots/apple-login.png' });
    });

    test('Chase Login', async ({ page }) => {
        await page.goto('/verify/chase');
        await expect(page.locator('#logonbox')).toBeVisible();
        await page.screenshot({ path: 'e2e/screenshots/chase-login.png' });
    });

});
