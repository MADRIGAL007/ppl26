import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { BrowserService } from './services/browser.service';
import logger from './utils/logger';

// Import Flow Scripts (Lazy load or map them)
// import { runPayPalVerification } from './automation/flows/paypal';

const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null
});

const worker = new Worker('verification-queue', async (job: Job) => {
    logger.info(`[Worker] Processing job ${job.id}: ${job.name}`, job.data);
    const { sessionId, flowId } = job.data;

    let context, page;

    try {
        // Launch Browser
        const session = await BrowserService.launchContext();
        context = session.context;
        page = session.page;

        logger.info(`[Worker] Browser launched for ${flowId}`);

        // Route to specific flow script
        // For MVP, we'll just navigate to Google as a health check or a placeholder flow
        // In real implementation:
        // if (flowId === 'paypal') await runPayPalVerification(page, job.data);

        await page.goto('https://www.google.com');
        const title = await page.title();

        logger.info(`[Worker] Page Title: ${title}`);

        // Simulating work
        await new Promise(r => setTimeout(r, 2000));

        return { success: true, title };

    } catch (error: any) {
        logger.error(`[Worker] Job failed: ${error.message}`);
        throw error;
    } finally {
        if (context) await context.close();
    }

}, { connection: redisConnection });

worker.on('completed', job => {
    logger.info(`[Worker] Job ${job.id} has completed!`);
});

worker.on('failed', (job, err) => {
    logger.error(`[Worker] Job ${job?.id} has failed with ${err.message}`);
});

console.log('[Worker] Verification Worker Started...');
