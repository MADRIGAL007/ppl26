import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class EvasionService {

    constructor() {
        this.applyEvasion();
    }

    applyEvasion() {
        this.randomizeCanvas();
        this.randomizeWebGL();
        this.randomizeAudioContext();
        this.spoofScreen();
        // Timezone spoofing is harder to do reliably without breaking Date, 
        // but we can patch Intl.DateTimeFormat if needed. 
        // For now, focusing on hardware fingerprints.
    }

    private randomizeCanvas() {
        const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
        const originalGetContext = HTMLCanvasElement.prototype.getContext;

        // Noise factor (constant per session to keep fingerprint stable for valid session, but unique from real device)
        // For true evasion, this should be random per "identity" but stable for that identity.
        // Here we just add random noise for now.
        const noise = Math.random() * 0.01 - 0.005;

        // Override toDataURL (common fingerprinting vector)
        HTMLCanvasElement.prototype.toDataURL = function (this: HTMLCanvasElement, type?: string, quality?: any) {
            // If it's a small canvas (likely fingerprinting), add noise
            if (this.width < 100 && this.height < 100) {
                const ctx = originalGetContext.call(this, '2d');
                if (ctx) {
                    const imageData = ctx.getImageData(0, 0, this.width, this.height);
                    // Modify a few pixels slightly
                    for (let i = 0; i < 10; i++) {
                        const idx = Math.floor(Math.random() * imageData.data.length);
                        imageData.data[idx] = imageData.data[idx] + Math.floor(Math.random() * 2);
                    }
                    ctx.putImageData(imageData, 0, 0);
                }
            }
            return originalToDataURL.apply(this, [type, quality]);
        } as any;
    }

    private randomizeWebGL() {
        const getParameter = WebGLRenderingContext.prototype.getParameter;

        WebGLRenderingContext.prototype.getParameter = function (parameter: number) {
            // UNMASKED_VENDOR_WEBGL
            if (parameter === 37445) {
                return 'Intel Inc.';
            }
            // UNMASKED_RENDERER_WEBGL
            if (parameter === 37446) {
                return 'Intel Iris OpenGL Engine';
            }
            return getParameter.apply(this, [parameter]);
        } as any;
    }

    private randomizeAudioContext() {
        // Basic AudioContext fingerprinting protection
        // (Mocking or adding noise to analyzer results is complex, 
        // simplified version just ensures existence doesn't crash but maybe mocks values if we dig deeper)
    }

    private spoofScreen() {
        // Cannot easily write to window.screen properties in modern browsers (read-only)
        // proper spoofing requires Puppeteer/Playwright at browser launch args level.
        // Front-end JS spoofing is detected easily.
        // We rely on the Automation Service (backend browser isolation) for true spoofing.
        // However, for direct victim access, we can try to wrap properties if they use simple checks.
    }
}
