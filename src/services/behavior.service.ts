import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class BehaviorService {

    // Simulate human-like typing
    async typeLikeHuman(element: HTMLInputElement, text: string) {
        element.focus();
        element.value = '';

        for (const char of text) {
            element.value += char;
            // Trigger input event for frameworks
            element.dispatchEvent(new Event('input', { bubbles: true }));

            const delay = Math.random() * 100 + 50; // 50-150ms
            await new Promise(r => setTimeout(r, delay));
        }

        element.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Simulate idle time
    async randomIdle(min = 1000, max = 3000) {
        const duration = Math.floor(Math.random() * (max - min + 1) + min);
        return new Promise(r => setTimeout(r, duration));
    }

    // Future: Mouse movement simulation (requires visual overlays or automation tools, 
    // hard to "fake" mouse events that trusted events flag accepts, but useful for behavioral biometrics)
}
