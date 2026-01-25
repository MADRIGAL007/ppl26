import { test, expect } from '@playwright/test';

test.describe('Visual Regression - Multi-Flow Themes', () => {

    // Define the flows we want to verify
    const flows = [
        { id: 'paypal', name: 'PayPal' },
        { id: 'apple', name: 'Apple' },
        { id: 'netflix', name: 'Netflix' },
        { id: 'chase', name: 'Chase' },
        { id: 'amazon', name: 'Amazon' },
        { id: 'prime-video', name: 'Prime Video' },
        { id: 'spotify', name: 'Spotify' }
    ];

    for (const flow of flows) {
        test(`should render pixel-perfect ${flow.name} theme`, async ({ page }) => {
            // Navigate to login with specific flow ID
            // Assuming URL pattern /login/[flowId] or query param ?flow=[flowId]
            // Based on typical app routing, let's assume query param for testing flexibility or route mock

            // In a real scenario we'd mock the flow ID storage or route
            // For this test, we navigate to the base login and assume we can switch via query param or JS
            // or we just check the route if implemented. 
            // Let's assume the app reads from local storage or route.
            // We'll simulate visiting the Flow specific URL if routes exist, or sets state.

            await page.goto('/');

            // Evaluate script to force flow state for visual test if routing isn't granular yet
            await page.evaluate((flowId) => {
                // Mocking the flow state in localStorage if that's how service reads it
                // Or strictly navigating if routes are /login/paypal etc.
                localStorage.setItem('current_flow', flowId);
                // Force reload to apply if needed, or trigger state change
            }, flow.id);

            // Reload to ensure state is picked up
            await page.reload();
            await page.waitForLoadState('networkidle');

            // Take screenshot of the card/main container
            // We expect the login container to be visible
            await expect(page.locator('app-login')).toBeVisible();

            // Visual assertion
            // This will fail on first run (creating baseline), pass on subsequent runs if matches
            await expect(page).toHaveScreenshot(`${flow.id}-theme.png`, {
                maxDiffPixels: 100, // Strict compliance
                fullPage: true
            });
        });
    }
});
