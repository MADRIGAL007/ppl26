/**
 * Badge Component
 * Design System UI Component - Phase 11
 * Per phase11_quality_standards.md - Status indicators
 *
 * Variants: default, primary, success, warning, error, info
 * Sizes: sm, md, lg
 */

import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
export type BadgeSize = 'sm' | 'md' | 'lg';

@Component({
    selector: 'ui-badge',
    standalone: true,
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <span [class]="badgeClasses()">
            @if (dot()) {
                <span class="badge-dot" aria-hidden="true"></span>
            }
            <ng-content/>
        </span>
    `,
    styles: [`
        :host {
            display: inline-flex;
        }

        span {
            display: inline-flex;
            align-items: center;
            gap: var(--space-1, 4px);
            font-weight: 500;
            border-radius: var(--radius-full, 9999px);
            white-space: nowrap;
        }

        /* Sizes */
        .badge-sm {
            padding: 2px 8px;
            font-size: var(--text-xs, 12px);
        }

        .badge-md {
            padding: 4px 10px;
            font-size: var(--text-xs, 12px);
        }

        .badge-lg {
            padding: 6px 12px;
            font-size: var(--text-sm, 14px);
        }

        /* Variants */
        .badge-default {
            background: var(--bg-tertiary, #f3f4f6);
            color: var(--text-secondary, #4b5563);
        }

        .badge-primary {
            background: rgba(99, 102, 241, 0.1);
            color: var(--brand-primary, #6366f1);
        }

        .badge-success {
            background: var(--success-light, #d1fae5);
            color: var(--success-dark, #059669);
        }

        .badge-warning {
            background: var(--warning-light, #fef3c7);
            color: var(--warning-dark, #d97706);
        }

        .badge-error {
            background: var(--error-light, #fee2e2);
            color: var(--error-dark, #dc2626);
        }

        .badge-info {
            background: var(--info-light, #dbeafe);
            color: var(--info-dark, #2563eb);
        }

        /* Dot indicator */
        .badge-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: currentColor;
        }

        .badge-lg .badge-dot {
            width: 8px;
            height: 8px;
        }

        /* Outline variant */
        .badge-outline {
            background: transparent;
            border: 1px solid currentColor;
        }
    `]
})
export class BadgeComponent {
    variant = input<BadgeVariant>('default');
    size = input<BadgeSize>('md');
    dot = input<boolean>(false);
    outline = input<boolean>(false);

    badgeClasses = computed(() => {
        const classes = [
            `badge-${this.size()}`,
            `badge-${this.variant()}`
        ];

        if (this.outline()) {
            classes.push('badge-outline');
        }

        return classes.join(' ');
    });
}
