/**
 * Card Component
 * Design System UI Component - Phase 11
 * Per phase11_detailed_tasks.md - Card with header/body/footer slots
 *
 * Features: header, body, footer slots, interactive state, elevated variant
 */

import { Component, input, output, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export type CardVariant = 'default' | 'elevated' | 'bordered' | 'ghost';

@Component({
    selector: 'ui-card',
    standalone: true,
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <article
            [class]="cardClasses()"
            [attr.role]="interactive() ? 'button' : null"
            [attr.tabindex]="interactive() ? 0 : null"
            (click)="handleClick($event)"
            (keydown.enter)="handleClick($event)"
            (keydown.space)="handleClick($event)"
        >
            <!-- Header -->
            @if (hasHeader) {
                <header class="card-header">
                    <ng-content select="[slot=header]"/>
                </header>
            }

            <!-- Body -->
            <div class="card-body" [class.card-body-no-padding]="noPadding()">
                <ng-content/>
            </div>

            <!-- Footer -->
            @if (hasFooter) {
                <footer class="card-footer">
                    <ng-content select="[slot=footer]"/>
                </footer>
            }
        </article>
    `,
    styles: [`
        :host {
            display: block;
        }

        article {
            display: flex;
            flex-direction: column;
            background: var(--surface, white);
            border-radius: var(--radius-xl, 12px);
            overflow: hidden;
            transition: all var(--duration-normal, 200ms) var(--ease-out);
        }

        /* Variants */
        .card-default {
            border: 1px solid var(--border-default, #e5e7eb);
            box-shadow: var(--shadow-sm);
        }

        .card-elevated {
            box-shadow: var(--shadow-lg);
        }

        .card-bordered {
            border: 1px solid var(--border-default, #e5e7eb);
        }

        .card-ghost {
            background: transparent;
        }

        /* Interactive */
        .card-interactive {
            cursor: pointer;
        }

        .card-interactive:hover {
            border-color: var(--border-hover, #d1d5db);
            box-shadow: var(--shadow-md);
            transform: translateY(-2px);
        }

        .card-interactive:active {
            transform: translateY(0);
        }

        .card-interactive:focus-visible {
            outline: 2px solid var(--brand-primary, #6366f1);
            outline-offset: 2px;
        }

        /* Header */
        .card-header {
            padding: var(--space-4, 16px) var(--space-6, 24px);
            border-bottom: 1px solid var(--border-default, #e5e7eb);
        }

        /* Body */
        .card-body {
            flex: 1;
            padding: var(--space-6, 24px);
        }

        .card-body-no-padding {
            padding: 0;
        }

        /* Footer */
        .card-footer {
            padding: var(--space-4, 16px) var(--space-6, 24px);
            border-top: 1px solid var(--border-default, #e5e7eb);
            background: var(--bg-secondary, #f9fafb);
        }

        /* Dark mode */
        :host-context(.dark) article {
            background: var(--surface);
        }

        :host-context(.dark) .card-footer {
            background: var(--bg-tertiary);
        }
    `]
})
export class CardComponent {
    variant = input<CardVariant>('default');
    interactive = input<boolean>(false);
    noPadding = input<boolean>(false);

    clicked = output<Event>();

    // Slot detection flags
    hasHeader = false;
    hasFooter = false;

    cardClasses = computed(() => {
        const classes = [`card-${this.variant()}`];

        if (this.interactive()) {
            classes.push('card-interactive');
        }

        return classes.join(' ');
    });

    handleClick(event: Event): void {
        if (this.interactive()) {
            this.clicked.emit(event);
        }
    }
}
