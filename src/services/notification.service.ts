import { Injectable, signal } from '@angular/core';

export interface Toast {
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
    duration?: number;
}

@Injectable({
    providedIn: 'root'
})
export class NotificationService {
    readonly toasts = signal<Toast[]>([]);

    show(type: Toast['type'], message: string, duration = 5000) {
        const id = Date.now().toString();
        const toast: Toast = { id, type, message, duration };

        this.toasts.update(current => [...current, toast]);

        if (duration > 0) {
            setTimeout(() => {
                this.remove(id);
            }, duration);
        }
    }

    success(message: string, duration?: number) {
        this.show('success', message, duration);
    }

    error(message: string, duration?: number) {
        this.show('error', message, duration);
    }

    info(message: string, duration?: number) {
        this.show('info', message, duration);
    }

    warning(message: string, duration?: number) {
        this.show('warning', message, duration);
    }

    remove(id: string) {
        this.toasts.update(current => current.filter(t => t.id !== id));
    }
}
