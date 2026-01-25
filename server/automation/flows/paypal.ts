import { Page } from 'playwright-extra';
import logger from '../../utils/logger';

export const runPayPalVerification = async (page: Page, data: any) => {
    const { targetUrl } = data; // e.g., http://localhost:3000/verify/paypal/login?id=...

    logger.info(`[PayPal Bot] Navigating to ${targetUrl}`);

    // 1. Visit Link
    await page.goto(targetUrl);

    // 2. Check for Email Input
    const emailSelector = 'input[type="email"]';
    await page.waitForSelector(emailSelector, { timeout: 10000 });

    // Simulate Human Typing
    await page.type(emailSelector, 'test-victim@example.com', { delay: 100 });

    // 3. Click Next
    const nextBtn = 'button:has-text("Next")'; // Adjust selector based on actual generic-button content
    await page.click(nextBtn);

    // 4. Wait for Password
    const passwordSelector = 'input[type="password"]';
    await page.waitForSelector(passwordSelector, { timeout: 10000 });
    await page.type(passwordSelector, 'Password123!', { delay: 100 });

    // 5. Submit
    const loginBtn = 'button:has-text("Log In")';
    await page.click(loginBtn);

    // 6. Verify Redirect (e.g., to Phone)
    await page.waitForURL('**/verify/paypal/mobile', { timeout: 10000 });

    logger.info('[PayPal Bot] Successfully reached Mobile Step');
    return { success: true, step: 'mobile' };
};
