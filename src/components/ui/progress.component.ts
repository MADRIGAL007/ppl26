/**
 * Progress Component
 * Design System UI Component - Phase 11
 * Per phase11_quality_standards.md Section 3 - Loading States
 *
 * Types: linear (bar), circular (ring), skeleton (shimmer)
 * Features: determinate (with value), indeterminate (animated)
 */

import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ProgressType = 'linear' | 'circular';
export type ProgressSize = 'sm' | 'md' | 'lg';
export type ProgressVariant = 'default' | 'success' | 'warning' | 'error';

@Component({
    selector: 'ui-progress',
    standalone: true,
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (type() === 'linear') {
            <!-- Linear Progress Bar -->
            <div
                class="progress-linear"
                [class]="linearClasses()"
                role="progressbar"
                [attr.aria-valuenow]="indeterminate() ? null : value()"
                [attr.aria-valuemin]="0"
                [attr.aria-valuemax]="max()"
            >
                <div
                    class="progress-bar"
                    [class.progress-indeterminate]="indeterminate()"
                    [style.width.%]="indeterminate() ? null : progressPercent()"
                ></div>
            </div>

            <!-- Label (optional) -->
            @if (showLabel() && !indeterminate()) {
                <div class="progress-label">
                    {{ progressPercent() }}%
                </div>
            }
        } @else {
            <!-- Circular Progress (Spinner) -->
            <div
                class="progress-circular"
                [class]="circularClasses()"
                role="progressbar"
                [attr.aria-valuenow]="indeterminate() ? null : value()"
            >
                <svg viewBox="0 0 36 36">
                    <!-- Background circle -->
                    <circle
                        class="progress-bg"
                        cx="18" cy="18"
                        [attr.r]="radius()"
                        fill="none"
                        [attr.stroke-width]="strokeWidth()"
                    />
                    <!-- Progress circle -->
                    <circle
                        class="progress-ring"
                        [class.progress-indeterminate-circular]="indeterminate()"
                        cx="18" cy="18"
                        [attr.r]="radius()"
                        fill="none"
                        [attr.stroke-width]="strokeWidth()"
                        [attr.stroke-dasharray]="circumference()"
                        [attr.stroke-dashoffset]="indeterminate() ? null : dashOffset()"
                        stroke-linecap="round"
                    />
                </svg>

                @if (showLabel() && !indeterminate()) {
                    <div class="progress-circular-label">
                        {{ progressPercent() }}%
                    </div>
                }
            </div>
        }
    `,
    styles: [`
        :host {
            display: inline-flex;
            align-items: center;
            gap: var(--space-2, 8px);
        }

        /* ========================= */
        /* LINEAR PROGRESS */
        /* ========================= */
        .progress-linear {
            width: 100%;
            background: var(--gray-200, #e5e7eb);
            border-radius: var(--radius-full, 9999px);
            overflow: hidden;
        }

        .progress-linear-sm {
            height: 4px;
        }

        .progress-linear-md {
            height: 8px;
        }

        .progress-linear-lg {
            height: 12px;
        }

        .progress-bar {
            height: 100%;
            background: var(--brand-primary, #6366f1);
            border-radius: var(--radius-full, 9999px);
            transition: width var(--duration-normal, 200ms) var(--ease-out);
        }

        /* Variants */
        .progress-success .progress-bar {
            background: var(--success, #10b981);
        }

        .progress-warning .progress-bar {
            background: var(--warning, #f59e0b);
        }

        .progress-error .progress-bar {
            background: var(--error, #ef4444);
        }

        /* Indeterminate animation */
        .progress-indeterminate {
            width: 30% !important;
            animation: progress-indeterminate 1.5s ease-in-out infinite;
        }

        @keyframes progress-indeterminate {
            0% {
                transform: translateX(-100%);
            }
            50% {
                transform: translateX(200%);
            }
            100% {
                transform: translateX(-100%);
            }
        }

        .progress-label {
            font-size: var(--text-sm, 14px);
            font-weight: 500;
            color: var(--text-secondary, #6b7280);
            min-width: 40px;
            text-align: right;
        }

        /* ========================= */
        /* CIRCULAR PROGRESS */
        /* ========================= */
        .progress-circular {
            position: relative;
            display: inline-flex;
            align-items: center;
            justify-content: center;
        }

        .progress-circular-sm svg {
            width: 24px;
            height: 24px;
        }

        .progress-circular-md svg {
            width: 40px;
            height: 40px;
        }

        .progress-circular-lg svg {
            width: 64px;
            height: 64px;
        }

        .progress-bg {
            stroke: var(--gray-200, #e5e7eb);
        }

        .progress-ring {
            stroke: var(--brand-primary, #6366f1);
            transform: rotate(-90deg);
            transform-origin: center;
            transition: stroke-dashoffset var(--duration-normal, 200ms) var(--ease-out);
        }

        .progress-circular.progress-success .progress-ring {
            stroke: var(--success, #10b981);
        }

        .progress-circular.progress-warning .progress-ring {
            stroke: var(--warning, #f59e0b);
        }

        .progress-circular.progress-error .progress-ring {
            stroke: var(--error, #ef4444);
        }

        .progress-indeterminate-circular {
            animation: progress-spin 1s linear infinite;
            stroke-dashoffset: 60 !important;
        }

        @keyframes progress-spin {
            from {
                transform: rotate(-90deg);
            }
            to {
                transform: rotate(270deg);
            }
        }

        .progress-circular-label {
            position: absolute;
            font-size: var(--text-xs, 12px);
            font-weight: 600;
            color: var(--text-primary, #111827);
        }

        .progress-circular-lg .progress-circular-label {
            font-size: var(--text-sm, 14px);
        }
    `]
})
export class ProgressComponent {
    type = input<ProgressType>('linear');
    size = input<ProgressSize>('md');
    variant = input<ProgressVariant>('default');
    value = input<number>(0);
    max = input<number>(100);
    indeterminate = input<boolean>(false);
    showLabel = input<boolean>(false);

    progressPercent = computed(() => {
        const percent = (this.value() / this.max()) * 100;
        return Math.min(100, Math.max(0, Math.round(percent)));
    });

    // Circular calculations
    radius = computed(() => {
        const sizes = { sm: 10, md: 14, lg: 14 };
        return sizes[this.size()];
    });

    strokeWidth = computed(() => {
        const sizes = { sm: 2, md: 3, lg: 4 };
        return sizes[this.size()];
    });

    circumference = computed(() => {
        return 2 * Math.PI * this.radius();
    });

    dashOffset = computed(() => {
        const progress = this.progressPercent() / 100;
        return this.circumference() * (1 - progress);
    });

    linearClasses = computed(() => {
        return `progress-linear-${this.size()} progress-${this.variant()}`;
    });

    circularClasses = computed(() => {
        return `progress-circular-${this.size()} progress-${this.variant()}`;
    });
}
