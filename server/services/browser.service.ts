import { chromium } from 'playwright-extra';
import { BrowserContext, Page } from 'playwright';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';

// Register plugins
chromium.use(stealthPlugin());

export interface BrowserConfig {
    userAgent?: string;
    viewport?: { width: number; height: number };
    locale?: string;
    timezone?: string;
}

export class BrowserService {
    private static browser: any; // Browser instance

    static async launchContext(config?: BrowserConfig): Promise<{ context: BrowserContext; page: Page }> {
        if (!this.browser) {
            this.browser = await chromium.launch({
                headless: true, // Configurable via env if needed
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
        }

        const context = await this.browser.newContext({
            userAgent: config?.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport: config?.viewport || { width: 1366, height: 768 },
            locale: config?.locale || 'en-US',
            timezoneId: config?.timezone || 'America/New_York',
            permissions: ['geolocation'],
        });

        const page = await context.newPage();
        return { context, page };
    }

    static async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }
}
