/**
 * Animated Counter Component
 * Design System UI Component - Phase 11
 * Per phase11_detailed_tasks.md Task 2.1 - Animated counters for metrics
 *
 * Features: count-up animation, formatted numbers, suffix/prefix support
 */

import {
    Component, input, computed, signal, effect,
    ChangeDetectionStrategy, OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'ui-animated-counter',
    standalone: true,
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <span class="counter" [class.counter-updating]="isUpdating()">
            @if (prefix()) {
                <span class="counter-prefix">{{ prefix() }}</span>
            }
            <span class="counter-value">{{ formattedValue() }}</span>
            @if (suffix()) {
                <span class="counter-suffix">{{ suffix() }}</span>
            }
        </span>
    `,
    styles: [`
        .counter {
            display: inline-flex;
            align-items: baseline;
            gap: 2px;
            font-family: var(--font-mono, 'JetBrains Mono', monospace);
            font-variant-numeric: tabular-nums;
        }

        .counter-prefix,
        .counter-suffix {
            font-size: 0.8em;
            color: var(--text-muted, #9ca3af);
        }

        .counter-value {
            transition: color var(--duration-fast, 100ms);
        }

        .counter-updating .counter-value {
            color: var(--brand-primary, #6366f1);
        }

        /* Pulse animation when value updates */
        @keyframes pulse-highlight {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }

        .counter-updating {
            animation: pulse-highlight 0.3s ease-out;
        }
    `]
})
export class AnimatedCounterComponent implements OnDestroy {
    // Inputs
    value = input.required<number>();
    duration = input<number>(1000); // Animation duration in ms
    decimals = input<number>(0);    // Decimal places
    prefix = input<string>('');
    suffix = input<string>('');
    separator = input<string>(','); // Thousand separator
    easing = input<'linear' | 'easeOut' | 'easeInOut'>('easeOut');

    // Internal state
    private displayValue = signal<number>(0);
    private animationFrame: number | null = null;
    private previousValue = 0;
    isUpdating = signal<boolean>(false);

    constructor() {
        // React to value changes
        effect(() => {
            const targetValue = this.value();
            this.animateToValue(targetValue);
        });
    }

    ngOnDestroy(): void {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
    }

    // Formatted display value
    formattedValue = computed(() => {
        const value = this.displayValue();
        const decimals = this.decimals();
        const separator = this.separator();

        // Format with decimals
        const fixed = value.toFixed(decimals);

        // Add thousand separators
        const parts = fixed.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, separator);

        return parts.join('.');
    });

    private animateToValue(targetValue: number): void {
        // Cancel any existing animation
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }

        const startValue = this.previousValue;
        const change = targetValue - startValue;
        const duration = this.duration();
        const startTime = performance.now();

        // Show update indicator
        if (change !== 0) {
            this.isUpdating.set(true);
            setTimeout(() => this.isUpdating.set(false), 500);
        }

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Apply easing
            const easedProgress = this.applyEasing(progress);

            // Calculate current value
            const currentValue = startValue + (change * easedProgress);
            this.displayValue.set(currentValue);

            if (progress < 1) {
                this.animationFrame = requestAnimationFrame(animate);
            } else {
                // Ensure we end on exact target value
                this.displayValue.set(targetValue);
                this.previousValue = targetValue;
                this.animationFrame = null;
            }
        };

        this.animationFrame = requestAnimationFrame(animate);
    }

    private applyEasing(progress: number): number {
        switch (this.easing()) {
            case 'linear':
                return progress;
            case 'easeOut':
                return 1 - Math.pow(1 - progress, 3);
            case 'easeInOut':
                return progress < 0.5
                    ? 4 * progress * progress * progress
                    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
            default:
                return progress;
        }
    }
}
