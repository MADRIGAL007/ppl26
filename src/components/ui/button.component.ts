/**
 * Button Component
 * Design System UI Component - Phase 11
 * Per phase11_quality_standards.md Section 4 - Button States & Interactions
 *
 * Variants: primary, secondary, ghost, danger
 * Sizes: sm, md, lg
 * States: default, hover, active, focus, disabled, loading
 */

import { Component, input, output, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
    selector: 'ui-button',
    standalone: true,
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <button
            [type]="type()"
            [class]="buttonClasses()"
            [disabled]="disabled() || loading()"
            [attr.aria-busy]="loading()"
            [attr.aria-label]="ariaLabel()"
            (click)="handleClick($event)"
        >
            <!-- Loading Spinner -->
            @if (loading()) {
                <span class="btn-spinner" aria-hidden="true">
                    <svg class="animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" opacity="0.25"/>
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
                    </svg>
                </span>
            }

            <!-- Icon Left -->
            @if (iconLeft() && !loading()) {
                <span class="btn-icon btn-icon-left" aria-hidden="true">
                    <ng-content select="[slot=icon-left]"/>
                </span>
            }

            <!-- Button Text -->
            <span class="btn-text" [class.btn-text-loading]="loading()">
                <ng-content/>
            </span>

            <!-- Icon Right -->
            @if (iconRight()) {
                <span class="btn-icon btn-icon-right" aria-hidden="true">
                    <ng-content select="[slot=icon-right]"/>
                </span>
            }
        </button>
    `,
    styles: [`
        :host {
            display: inline-block;
        }

        button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: var(--space-2, 8px);
            font-family: var(--font-sans);
            font-weight: 600;
            line-height: 1.25;
            border-radius: var(--radius-lg, 8px);
            border: none;
            cursor: pointer;
            transition: all var(--duration-normal, 200ms) var(--ease-out);
            white-space: nowrap;
            user-select: none;
            position: relative;
            overflow: hidden;
        }

        /* Focus visible - accessibility */
        button:focus-visible {
            outline: 3px solid var(--brand-primary-light, #818cf8);
            outline-offset: 2px;
        }

        /* ========================= */
        /* SIZE VARIANTS */
        /* ========================= */
        .btn-sm {
            padding: 8px 12px;
            font-size: var(--text-xs, 12px);
            min-height: 32px;
        }

        .btn-md {
            padding: 10px 24px;
            font-size: var(--text-sm, 14px);
            min-height: 40px;
        }

        .btn-lg {
            padding: 12px 32px;
            font-size: var(--text-base, 16px);
            min-height: 48px;
        }

        /* ========================= */
        /* PRIMARY VARIANT */
        /* ========================= */
        .btn-primary {
            background: var(--brand-primary, #6366f1);
            color: white;
            box-shadow: var(--shadow-sm);
        }

        .btn-primary:hover:not(:disabled) {
            background: var(--brand-primary-hover, #4f46e5);
            box-shadow: var(--shadow-primary, 0 4px 14px 0 rgba(99, 102, 241, 0.3));
            transform: translateY(-1px);
        }

        .btn-primary:active:not(:disabled) {
            transform: translateY(0);
            box-shadow: var(--shadow-sm);
        }

        /* ========================= */
        /* SECONDARY VARIANT */
        /* ========================= */
        .btn-secondary {
            background: var(--bg-secondary, #f9fafb);
            color: var(--text-primary, #111827);
            border: 1px solid var(--border-default, #e5e7eb);
        }

        .btn-secondary:hover:not(:disabled) {
            background: var(--bg-tertiary, #f3f4f6);
            border-color: var(--border-hover, #d1d5db);
        }

        .btn-secondary:active:not(:disabled) {
            background: var(--gray-200, #e5e7eb);
        }

        /* ========================= */
        /* GHOST VARIANT */
        /* ========================= */
        .btn-ghost {
            background: transparent;
            color: var(--text-secondary, #4b5563);
        }

        .btn-ghost:hover:not(:disabled) {
            background: var(--bg-secondary, #f9fafb);
            color: var(--text-primary, #111827);
        }

        .btn-ghost:active:not(:disabled) {
            background: var(--bg-tertiary, #f3f4f6);
        }

        /* ========================= */
        /* DANGER VARIANT */
        /* ========================= */
        .btn-danger {
            background: var(--error, #ef4444);
            color: white;
        }

        .btn-danger:hover:not(:disabled) {
            background: var(--error-dark, #dc2626);
            box-shadow: var(--shadow-error, 0 4px 14px 0 rgba(239, 68, 68, 0.3));
            transform: translateY(-1px);
        }

        .btn-danger:active:not(:disabled) {
            transform: translateY(0);
        }

        /* ========================= */
        /* DISABLED STATE */
        /* ========================= */
        button:disabled {
            background: var(--gray-300, #d1d5db);
            color: var(--gray-500, #6b7280);
            cursor: not-allowed;
            opacity: 0.6;
            box-shadow: none;
            transform: none;
        }

        .btn-secondary:disabled {
            background: var(--bg-secondary, #f9fafb);
            border-color: var(--gray-200, #e5e7eb);
        }

        .btn-ghost:disabled {
            background: transparent;
        }

        /* ========================= */
        /* LOADING STATE */
        /* ========================= */
        .btn-loading {
            position: relative;
            cursor: wait;
        }

        .btn-spinner {
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .btn-spinner svg {
            width: 16px;
            height: 16px;
        }

        .btn-text-loading {
            opacity: 0.7;
        }

        /* ========================= */
        /* FULL WIDTH */
        /* ========================= */
        .btn-full {
            width: 100%;
        }

        /* ========================= */
        /* ICONS */
        /* ========================= */
        .btn-icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }

        .btn-icon :deep(svg) {
            width: 16px;
            height: 16px;
        }

        .btn-sm .btn-icon :deep(svg) {
            width: 14px;
            height: 14px;
        }

        .btn-lg .btn-icon :deep(svg) {
            width: 20px;
            height: 20px;
        }

        /* Animate spin */
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }

        .animate-spin {
            animation: spin 1s linear infinite;
        }

        /* Ripple Effect */
        :host ::ng-deep .ripple {
            position: absolute;
            border-radius: 50%;
            transform: scale(0);
            animation: ripple 600ms linear;
            background-color: rgba(255, 255, 255, 0.3);
            pointer-events: none;
        }

        @keyframes ripple {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }
    `]
})
export class ButtonComponent {
    // Inputs using Angular signals
    variant = input<ButtonVariant>('primary');
    size = input<ButtonSize>('md');
    type = input<'button' | 'submit' | 'reset'>('button');
    disabled = input<boolean>(false);
    loading = input<boolean>(false);
    fullWidth = input<boolean>(false);
    iconLeft = input<boolean>(false);
    iconRight = input<boolean>(false);
    ariaLabel = input<string | null>(null);

    // Output event
    clicked = output<MouseEvent>();

    // Computed classes
    buttonClasses = computed(() => {
        const classes: string[] = [];

        // Size
        classes.push(`btn-${this.size()}`);

        // Variant
        classes.push(`btn-${this.variant()}`);

        // Loading
        if (this.loading()) {
            classes.push('btn-loading');
        }

        // Full width
        if (this.fullWidth()) {
            classes.push('btn-full');
        }

        return classes.join(' ');
    });

    handleClick(event: MouseEvent): void {
        if (!this.disabled() && !this.loading()) {
            this.createRipple(event);
            this.triggerHaptic();
            this.clicked.emit(event);
        }
    }

    private createRipple(event: MouseEvent): void {
        const button = event.currentTarget as HTMLButtonElement;
        const circle = document.createElement('span');
        const diameter = Math.max(button.clientWidth, button.clientHeight);
        const radius = diameter / 2;

        const rect = button.getBoundingClientRect();

        circle.style.width = circle.style.height = `${diameter}px`;
        circle.style.left = `${event.clientX - rect.left - radius}px`;
        circle.style.top = `${event.clientY - rect.top - radius}px`;
        circle.classList.add('ripple');

        const existingRipple = button.getElementsByClassName('ripple')[0];
        if (existingRipple) {
            existingRipple.remove();
        }

        button.appendChild(circle);

        // Clean up
        setTimeout(() => circle.remove(), 600);
    }

    private triggerHaptic(): void {
        // Haptic feedback for mobile devices (if supported)
        if (navigator.vibrate) {
            navigator.vibrate(10); // 10ms vibration per standard 4.2
        }
    }
}
