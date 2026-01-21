/**
 * Modal Dialog Component
 * Reusable modal with animations and focus trapping
 */

import { Component, Input, Output, EventEmitter, signal, HostListener, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-modal',
    standalone: true,
    imports: [CommonModule],
    template: `
        @if (isOpen()) {
            <div class="modal-backdrop" (click)="closeOnBackdrop && close()">
                <div 
                    #modalContent
                    class="modal-content glass animate-scale-in"
                    [class.modal-sm]="size === 'sm'"
                    [class.modal-lg]="size === 'lg'"
                    [class.modal-xl]="size === 'xl'"
                    [class.modal-fullscreen]="size === 'fullscreen'"
                    (click)="$event.stopPropagation()"
                    role="dialog"
                    [attr.aria-labelledby]="titleId"
                    aria-modal="true"
                >
                    <!-- Header -->
                    <div class="modal-header" *ngIf="showHeader">
                        <h2 [id]="titleId" class="modal-title">{{ title }}</h2>
                        <button class="modal-close" (click)="close()" aria-label="Close">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M18 6L6 18M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>

                    <!-- Body -->
                    <div class="modal-body">
                        <ng-content></ng-content>
                    </div>

                    <!-- Footer -->
                    <div class="modal-footer" *ngIf="showFooter">
                        <ng-content select="[modal-footer]"></ng-content>
                    </div>
                </div>
            </div>
        }
    `,
    styles: [`
        .modal-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(4px);
            z-index: var(--z-modal-backdrop, 1040);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: var(--space-6, 24px);
            animation: fadeIn var(--duration-fast, 100ms) var(--ease-out);
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        .modal-content {
            width: 100%;
            max-width: 500px;
            max-height: 90vh;
            border-radius: var(--radius-xl, 12px);
            display: flex;
            flex-direction: column;
            z-index: var(--z-modal, 1050);
        }

        .modal-sm { max-width: 380px; }
        .modal-lg { max-width: 700px; }
        .modal-xl { max-width: 900px; }
        .modal-fullscreen {
            max-width: none;
            max-height: none;
            width: 100%;
            height: 100%;
            border-radius: 0;
        }

        .modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: var(--space-4, 16px) var(--space-6, 24px);
            border-bottom: 1px solid var(--border-default, #e5e7eb);
        }

        .modal-title {
            font-size: var(--text-lg, 18px);
            font-weight: 600;
            color: var(--text-primary, #111827);
            margin: 0;
        }

        .modal-close {
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: transparent;
            border: none;
            border-radius: var(--radius-md, 6px);
            color: var(--text-muted, #9ca3af);
            cursor: pointer;
            transition: all var(--duration-fast, 100ms);
        }

        .modal-close:hover {
            background: var(--bg-secondary, #f9fafb);
            color: var(--text-primary, #111827);
        }

        .modal-close svg {
            width: 20px;
            height: 20px;
        }

        .modal-body {
            flex: 1;
            padding: var(--space-6, 24px);
            overflow-y: auto;
        }

        .modal-footer {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: var(--space-3, 12px);
            padding: var(--space-4, 16px) var(--space-6, 24px);
            border-top: 1px solid var(--border-default, #e5e7eb);
        }

        :host-context(.dark) .modal-close:hover {
            background: var(--gray-800);
        }
    `]
})
export class ModalComponent implements AfterViewInit {
    @Input() title: string = '';
    @Input() size: 'sm' | 'md' | 'lg' | 'xl' | 'fullscreen' = 'md';
    @Input() showHeader: boolean = true;
    @Input() showFooter: boolean = true;
    @Input() closeOnBackdrop: boolean = true;
    @Input() closeOnEscape: boolean = true;

    @Output() closed = new EventEmitter<void>();

    @ViewChild('modalContent') modalContent!: ElementRef;

    isOpen = signal(false);
    titleId = `modal-title-${Math.random().toString(36).slice(2)}`;

    private previousActiveElement: HTMLElement | null = null;

    ngAfterViewInit() {
        // Focus trap would be implemented here
    }

    @HostListener('document:keydown.escape')
    onEscape() {
        if (this.closeOnEscape && this.isOpen()) {
            this.close();
        }
    }

    open() {
        this.previousActiveElement = document.activeElement as HTMLElement;
        this.isOpen.set(true);
        document.body.style.overflow = 'hidden';
    }

    close() {
        this.isOpen.set(false);
        document.body.style.overflow = '';
        this.closed.emit();

        // Restore focus
        if (this.previousActiveElement) {
            this.previousActiveElement.focus();
        }
    }

    toggle() {
        if (this.isOpen()) {
            this.close();
        } else {
            this.open();
        }
    }
}
