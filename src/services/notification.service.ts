import { Injectable, signal, computed } from '@angular/core';

export type NotificationPermissionStatus = 'default' | 'granted' | 'denied';

export interface Toast {
    id: number;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
}

@Injectable({
    providedIn: 'root'
})
export class NotificationService {
    // --- Desktop Notifications State ---
    private _permissionStatus = signal<NotificationPermissionStatus>('default');

    public permissionStatus = computed(() => this._permissionStatus());
    public isGranted = computed(() => this._permissionStatus() === 'granted');

    private audioCtx: AudioContext | null = null;

    // --- Toast Notifications State ---
    private _toasts = signal<Toast[]>([]);
    public toasts = computed(() => this._toasts());
    private counter = 0;

    constructor() {
        this.checkPermission();
    }

    // --- Desktop Notification Methods ---

    checkPermission() {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            this._permissionStatus.set(Notification.permission as NotificationPermissionStatus);
        }
    }

    requestPermission() {
        if (typeof window === 'undefined' || !('Notification' in window)) {
            console.warn('This browser does not support desktop notification');
            return;
        }

        Notification.requestPermission().then((permission) => {
            this._permissionStatus.set(permission as NotificationPermissionStatus);
        });
    }

    send(title: string, options?: NotificationOptions) {
        if (this.isGranted()) {
            const notification = new Notification(title, {
                icon: '/assets/icons/icon-192x192.png', // Fallback icon path
                ...options
            });

            notification.onclick = () => {
                window.focus();
                notification.close();
            };
        } else {
            // Fallback or log if permission not granted
            console.log('[NotificationService] Permission not granted/available', { title, options });
            // Fallback to toast if desktop not allowed?
            // this.info(`${title}: ${options?.body || ''}`);
        }
    }

    playSound(type: 'success' | 'warning' | 'error' | 'info' = 'info') {
        if (typeof window === 'undefined') return;

        // Simple beep implementation using AudioContext to avoid external assets for now
        try {
            if (!this.audioCtx) this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

            const oscillator = this.audioCtx.createOscillator();
            const gainNode = this.audioCtx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioCtx.destination);

            let freq = 440; // A4
            let typeShape: OscillatorType = 'sine';
            let duration = 0.5;

            switch (type) {
                case 'success': freq = 880; typeShape = 'triangle'; duration = 0.2; break;
                case 'warning': freq = 300; typeShape = 'square'; duration = 0.4; break;
                case 'error': freq = 150; typeShape = 'sawtooth'; duration = 0.6; break;
            }

            oscillator.type = typeShape;
            oscillator.frequency.value = freq;
            gainNode.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);

            oscillator.start();
            oscillator.stop(this.audioCtx.currentTime + duration);

        } catch (e) {
            console.error('Audio play failed', e);
        }
    }

    // --- Toast Notification Methods ---

    show(type: Toast['type'], message: string, duration = 5000) {
        const id = ++this.counter;
        this._toasts.update(t => [...t, { id, type, message }]);
        if (duration > 0) {
            setTimeout(() => this.remove(id), duration);
        }
    }

    success(message: string) { this.show('success', message); }
    error(message: string) { this.show('error', message); }
    info(message: string) { this.show('info', message); }
    warning(message: string) { this.show('warning', message); }

    remove(id: number) {
        this._toasts.update(t => t.filter(x => x.id !== id));
    }
}
