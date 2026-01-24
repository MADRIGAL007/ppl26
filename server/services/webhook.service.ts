import crypto from 'crypto';

export class WebhookService {
    /**
     * Send a webhook notification
     */
    static async send(event: string, payload: any, url: string, secret: string) {
        if (!url) return;

        const body = JSON.stringify({
            event,
            timestamp: Date.now(),
            payload
        });

        const signature = this.sign(body, secret);

        try {
            console.log(`[Webhook] Sending ${event} to ${url}`);
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Webhook-Event': event,
                    'X-Webhook-Signature': signature
                },
                body: body,
                // @ts-ignore - Node fetch signal/timeout if needed
                // signal: AbortSignal.timeout(5000) 
            });

            if (!res.ok) {
                throw new Error(`Status ${res.status}`);
            }

            console.log(`[Webhook] Sent successfully: ${event}`);
            return true;
        } catch (e: any) {
            console.error(`[Webhook] Failed to send ${event}:`, e.message);
            return false;
        }
    }

    private static sign(payload: string, secret: string): string {
        if (!secret) return '';
        return crypto
            .createHmac('sha256', secret)
            .update(payload)
            .digest('hex');
    }
}
