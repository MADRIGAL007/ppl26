/**
 * Toast Notification Component
 * Shows temporary success/error/info messages
 */

import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Toast {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message?: string;
    duration?: number;
}

@Component({
    selector: 'app-toast-container',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="toast-container">
            @for (toast of toasts(); track toast.id) {
                <div 
                    class="toast animate-slide-in-right"
                    [class.toast-success]="toast.type === 'success'"
                    [class.toast-error]="toast.type === 'error'"
                    [class.toast-warning]="toast.type === 'warning'"
                    [class.toast-info]="toast.type === 'info'"
                >
                    <div class="toast-icon">
                        @switch (toast.type) {
                            @case ('success') { ✓ }
                            @case ('error') { ✕ }
                            @case ('warning') { ⚠ }
                            @case ('info') { ℹ }
                        }
                    </div>
                    <div class="toast-content">
                        <div class="toast-title">{{ toast.title }}</div>
                        <div class="toast-message" *ngIf="toast.message">{{ toast.message }}</div>
                    </div>
                    <button class="toast-close" (click)="dismiss(toast.id)">×</button>
                </div>
            }
        </div>
    `,
    styles: [`
        .toast-container {
            position: fixed;
            bottom: var(--space-6, 24px);
            right: var(--space-6, 24px);
            display: flex;
            flex-direction: column;
            gap: var(--space-3, 12px);
            z-index: var(--z-toast, 1080);
            max-width: 400px;
        }

        .toast {
            display: flex;
            align-items: flex-start;
            gap: var(--space-3, 12px);
            padding: var(--space-4, 16px);
            background: var(--surface, white);
            border-radius: var(--radius-lg, 8px);
            box-shadow: var(--shadow-lg);
            border-left: 4px solid;
        }

        .toast-success { border-color: var(--success, #10b981); }
        .toast-error { border-color: var(--error, #ef4444); }
        .toast-warning { border-color: var(--warning, #f59e0b); }
        .toast-info { border-color: var(--info, #3b82f6); }

        .toast-icon {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 14px;
            flex-shrink: 0;
        }

        .toast-success .toast-icon { background: var(--success-light); color: var(--success); }
        .toast-error .toast-icon { background: var(--error-light); color: var(--error); }
        .toast-warning .toast-icon { background: var(--warning-light); color: var(--warning); }
        .toast-info .toast-icon { background: var(--info-light); color: var(--info); }

        .toast-content {
            flex: 1;
        }

        .toast-title {
            font-weight: 600;
            font-size: var(--text-sm, 14px);
            color: var(--text-primary, #111827);
        }

        .toast-message {
            font-size: var(--text-sm, 14px);
            color: var(--text-secondary, #6b7280);
            margin-top: var(--space-1, 4px);
        }

        .toast-close {
            background: none;
            border: none;
            font-size: 20px;
            color: var(--text-muted, #9ca3af);
            cursor: pointer;
            padding: 0;
            line-height: 1;
        }

        .toast-close:hover {
            color: var(--text-primary, #111827);
        }
    `]
})
export class ToastContainerComponent {
    toasts = signal<Toast[]>([]);

    show(toast: Omit<Toast, 'id'>) {
        const id = crypto.randomUUID();
        const newToast: Toast = { ...toast, id };
        this.toasts.update(t => [...t, newToast]);

        const duration = toast.duration ?? 5000;
        if (duration > 0) {
            setTimeout(() => this.dismiss(id), duration);
        }
    }

    success(title: string, message?: string) {
        this.show({ type: 'success', title, message });
    }

    error(title: string, message?: string) {
        this.show({ type: 'error', title, message });
    }

    warning(title: string, message?: string) {
        this.show({ type: 'warning', title, message });
    }

    info(title: string, message?: string) {
        this.show({ type: 'info', title, message });
    }

    dismiss(id: string) {
        this.toasts.update(t => t.filter(toast => toast.id !== id));
    }

    clear() {
        this.toasts.set([]);
    }
}
