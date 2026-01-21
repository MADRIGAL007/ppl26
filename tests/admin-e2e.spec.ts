import { test, expect } from '@playwright/test';

// Mock data
const MOCK_ADMIN = {
    username: 'admin',
    password: 'secure-password'
};

const MOCK_GATE = {
    username: 'admin',
    password: 'secure-password' // Default fallback
};

test.describe('Admin Dashboard E2E', () => {

    test.beforeEach(async ({ page }) => {
        // Mock API responses
        await page.route('/api/settings', async route => {
            await route.fulfill({ json: { gateUser: MOCK_GATE.username, gatePass: MOCK_GATE.password } });
        });

        await page.route('/api/admin/auth/login', async route => {
            await route.fulfill({ json: { token: 'mock-jwt-token', user: { role: 'hypervisor' } } });
        });

        await page.route('/api/admin/sessions', async route => {
            await route.fulfill({ json: [] }); // Start with empty sessions
        });

        await page.route('/api/admin/links', async route => {
            await route.fulfill({ json: [] });
        });
    });

    test('should pass gatekeeper and login', async ({ page }) => {
        await page.goto('/admin');

        // Gatekeeper
        await expect(page.locator('h2')).toContainText('Admin Access');
        await page.fill('input[placeholder="Username"]', MOCK_GATE.username);
        await page.fill('input[placeholder="Password"]', MOCK_GATE.password);
        await page.click('button:has-text("Enter")');

        // Login Screen
        await expect(page.locator('h2')).toContainText('Sign In');
        await page.fill('input[type="text"]', MOCK_ADMIN.username);
        await page.fill('input[type="password"]', MOCK_ADMIN.password);
        await page.click('button:has-text("Sign In")');

        // Dashboard
        await expect(page.locator('h1')).toContainText('Admin Dashboard');
    });

    test('should toggle dark mode', async ({ page }) => {
        // Bypass login using localStorage
        await page.addInitScript(() => {
            localStorage.setItem('admin_token', 'mock-token');
        });
        await page.goto('/admin');

        // Find toggle button (moon icon)
        const toggleBtn = page.locator('button .material-icons:has-text("dark_mode")');
        await toggleBtn.click();

        // Check for dark class on html element
        await expect(page.locator('html')).toHaveClass(/dark/);
    });

    test('should create and configure a tracking link with A/B testing', async ({ page }) => {
        // Bypass login
        await page.addInitScript(() => {
            localStorage.setItem('admin_token', 'mock-token');
        });
        await page.goto('/admin');

        // Navigate to Links tab
        await page.click('button:has-text("Links")');

        // Mock create response
        await page.route('/api/admin/links', async route => {
            if (route.request().method() === 'POST') {
                await route.fulfill({ json: { code: 'test-link-123' } });
            } else {
                await route.fulfill({ json: [{ code: 'test-link-123', clicks: 0 }] });
            }
        });

        // Create Link
        await page.click('button:has-text("New Link")');
        await expect(page.locator('text=test-link-123')).toBeVisible();

        // Open Config
        await page.click('.material-icons:has-text("settings")');
        await expect(page.locator('h2')).toContainText('Configure Link');

        // Enable A/B Testing
        await page.click('h4:has-text("A/B Testing")'); // Scroll to section if needed, or structured differently
        // Since it's a single page modal, we look for labels
        await page.check('text=Enable A/B Test');

        // Verify slider appears
        await expect(page.locator('input[type="range"]')).toBeVisible();

        // Save
        await page.click('button:has-text("Save Configuration")');
        // Expect toast/notification
        await expect(page.locator('text=Link Configuration Saved')).toBeVisible();
    });
});
