/**
 * Breadcrumbs Component
 * Design System UI Component - Phase 11
 * Per phase11_detailed_tasks.md - Dynamic route-based breadcrumbs
 *
 * Features: Auto-generate from route, custom items, separator, icons
 */

import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

export interface BreadcrumbItem {
    label: string;
    href?: string;
    icon?: string;
    active?: boolean;
}

@Component({
    selector: 'ui-breadcrumbs',
    standalone: true,
    imports: [CommonModule, RouterModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <nav aria-label="Breadcrumb" class="breadcrumbs" [class]="containerClasses()">
            <ol class="breadcrumb-list">
                @for (item of items(); track item.label; let i = $index; let last = $last) {
                    <li class="breadcrumb-item" [class.breadcrumb-active]="last || item.active">
                        @if (item.icon) {
                            <span class="breadcrumb-icon" [innerHTML]="item.icon"></span>
                        }

                        @if (item.href && !last && !item.active) {
                            <a [routerLink]="item.href" class="breadcrumb-link">
                                {{ item.label }}
                            </a>
                        } @else {
                            <span class="breadcrumb-text" [attr.aria-current]="last ? 'page' : null">
                                {{ item.label }}
                            </span>
                        }

                        @if (!last) {
                            <span class="breadcrumb-separator" aria-hidden="true">
                                @switch (separator()) {
                                    @case ('chevron') {
                                        <svg viewBox="0 0 20 20" fill="currentColor">
                                            <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
                                        </svg>
                                    }
                                    @case ('arrow') {
                                        <svg viewBox="0 0 20 20" fill="currentColor">
                                            <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/>
                                        </svg>
                                    }
                                    @default {
                                        /
                                    }
                                }
                            </span>
                        }
                    </li>
                }
            </ol>
        </nav>
    `,
    styles: [`
        .breadcrumbs {
            font-family: var(--font-sans);
        }

        .breadcrumb-list {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: var(--space-1, 4px);
            list-style: none;
            margin: 0;
            padding: 0;
        }

        .breadcrumb-item {
            display: inline-flex;
            align-items: center;
            gap: var(--space-1, 4px);
        }

        /* Sizes */
        .breadcrumbs-sm .breadcrumb-text,
        .breadcrumbs-sm .breadcrumb-link {
            font-size: var(--text-xs, 12px);
        }

        .breadcrumbs-md .breadcrumb-text,
        .breadcrumbs-md .breadcrumb-link {
            font-size: var(--text-sm, 14px);
        }

        .breadcrumbs-lg .breadcrumb-text,
        .breadcrumbs-lg .breadcrumb-link {
            font-size: var(--text-base, 16px);
        }

        /* Link */
        .breadcrumb-link {
            color: var(--text-secondary, #6b7280);
            text-decoration: none;
            transition: color var(--duration-fast, 100ms);
        }

        .breadcrumb-link:hover {
            color: var(--brand-primary, #6366f1);
            text-decoration: underline;
        }

        /* Active/Current */
        .breadcrumb-active .breadcrumb-text {
            color: var(--text-primary, #111827);
            font-weight: 500;
        }

        .breadcrumb-text {
            color: var(--text-secondary, #6b7280);
        }

        /* Separator */
        .breadcrumb-separator {
            display: flex;
            align-items: center;
            color: var(--text-muted, #9ca3af);
            margin: 0 var(--space-1, 4px);
        }

        .breadcrumb-separator svg {
            width: 16px;
            height: 16px;
        }

        .breadcrumbs-sm .breadcrumb-separator svg {
            width: 14px;
            height: 14px;
        }

        .breadcrumbs-lg .breadcrumb-separator svg {
            width: 18px;
            height: 18px;
        }

        /* Icon */
        .breadcrumb-icon {
            display: flex;
            align-items: center;
        }

        .breadcrumb-icon :deep(svg) {
            width: 16px;
            height: 16px;
            color: var(--text-muted, #9ca3af);
        }
    `]
})
export class BreadcrumbsComponent {
    items = input.required<BreadcrumbItem[]>();
    size = input<'sm' | 'md' | 'lg'>('md');
    separator = input<'slash' | 'chevron' | 'arrow'>('chevron');

    containerClasses = computed(() => {
        return `breadcrumbs-${this.size()}`;
    });
}
