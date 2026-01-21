import { Injectable } from '@angular/core';

export interface DeviceFingerprint {
    userAgent: string;
    language: string;
    platform: string;
    screenResolution: string;
    timezone: string;
    colorDepth: number;
    hardwareConcurrency: number;
    deviceMemory: number;
    touchSupport: boolean;
    cookiesEnabled: boolean;
    canvasHash: string;
    timestamp: number;
}

@Injectable({
    providedIn: 'root'
})
export class DataCaptureService {

    async collect(): Promise<DeviceFingerprint> {
        return {
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: (navigator as any).userAgentData?.platform || navigator.platform,
            screenResolution: `${window.screen.width}x${window.screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            colorDepth: window.screen.colorDepth,
            hardwareConcurrency: navigator.hardwareConcurrency || 0,
            deviceMemory: (navigator as any).deviceMemory || 0,
            touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
            cookiesEnabled: navigator.cookieEnabled,
            canvasHash: await this.getCanvasFingerprint(),
            timestamp: Date.now()
        };
    }

    private async getCanvasFingerprint(): Promise<string> {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return '';

            canvas.width = 200;
            canvas.height = 50;

            // Text with varying fonts and styles
            ctx.textBaseline = 'top';
            ctx.font = '14px "Arial"';
            ctx.textBaseline = 'alphabetic';
            ctx.fillStyle = '#f60';
            ctx.fillRect(125, 1, 62, 20);
            ctx.fillStyle = '#069';
            ctx.fillText('AntiGravity', 2, 15);
            ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
            ctx.fillText('AntiGravity', 4, 17);

            // Hashing logic (simple djb2 for demo)
            const dataUrl = canvas.toDataURL();
            let hash = 0;
            for (let i = 0; i < dataUrl.length; i++) {
                const char = dataUrl.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            return hash.toString(16);
        } catch (e) {
            return '';
        }
    }
}
