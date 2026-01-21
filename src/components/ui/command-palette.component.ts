/**
 * Command Palette Component
 * Global search and action interface (⌘K / Ctrl+K)
 */

import { Component, signal, computed, HostListener, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

interface CommandItem {
    id: string;
    title: string;
    description?: string;
    icon?: string;
    shortcut?: string;
    category: 'navigation' | 'action' | 'search' | 'recent';
    action: () => void;
}

@Component({
    selector: 'app-command-palette',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
        @if (isOpen()) {
            <div class="command-overlay" (click)="close()">
                <div class="command-palette glass animate-scale-in" (click)="$event.stopPropagation()">
                    <!-- Search Input -->
                    <div class="command-input-wrapper">
                        <svg class="command-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"/>
                            <path d="m21 21-4.35-4.35"/>
                        </svg>
                        <input
                            #searchInput
                            type="text"
                            class="command-input"
                            placeholder="Search commands, sessions, or type a query..."
                            [(ngModel)]="query"
                            (input)="onSearch()"
                            (keydown)="onKeyDown($event)"
                        />
                        <kbd class="command-kbd">ESC</kbd>
                    </div>

                    <!-- Results -->
                    <div class="command-results" *ngIf="filteredItems().length > 0">
                        @for (category of categories(); track category) {
                            <div class="command-category">
                                <div class="command-category-label">{{ category }}</div>
                                @for (item of getItemsByCategory(category); track item.id; let i = $index) {
                                    <button
                                        class="command-item"
                                        [class.selected]="selectedIndex() === getGlobalIndex(item)"
                                        (click)="executeItem(item)"
                                        (mouseenter)="selectedIndex.set(getGlobalIndex(item))"
                                    >
                                        <span class="command-item-icon" *ngIf="item.icon">{{ item.icon }}</span>
                                        <div class="command-item-content">
                                            <span class="command-item-title">{{ item.title }}</span>
                                            <span class="command-item-description" *ngIf="item.description">{{ item.description }}</span>
                                        </div>
                                        <kbd class="command-item-shortcut" *ngIf="item.shortcut">{{ item.shortcut }}</kbd>
                                    </button>
                                }
                            </div>
                        }
                    </div>

                    <!-- Empty State -->
                    <div class="command-empty" *ngIf="filteredItems().length === 0 && query().length > 0">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M9.172 16.172a4 4 0 015.656 0M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
                        </svg>
                        <span>No results for "{{ query() }}"</span>
                    </div>

                    <!-- Footer -->
                    <div class="command-footer">
                        <div class="command-footer-hint">
                            <kbd>↑↓</kbd> Navigate
                            <kbd>↵</kbd> Select
                            <kbd>ESC</kbd> Close
                        </div>
                    </div>
                </div>
            </div>
        }
    `,
    styles: [`
        .command-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(4px);
            z-index: var(--z-command-palette, 1090);
            display: flex;
            align-items: flex-start;
            justify-content: center;
            padding-top: 15vh;
        }

        .command-palette {
            width: 100%;
            max-width: 640px;
            max-height: 70vh;
            border-radius: var(--radius-xl, 12px);
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }

        .command-input-wrapper {
            display: flex;
            align-items: center;
            gap: var(--space-3, 12px);
            padding: var(--space-4, 16px);
            border-bottom: 1px solid var(--border-default, #e5e7eb);
        }

        .command-search-icon {
            width: 20px;
            height: 20px;
            color: var(--text-muted, #9ca3af);
            flex-shrink: 0;
        }

        .command-input {
            flex: 1;
            border: none;
            background: transparent;
            font-size: var(--text-base, 16px);
            color: var(--text-primary, #111827);
            outline: none;
        }

        .command-input::placeholder {
            color: var(--text-muted, #9ca3af);
        }

        .command-kbd {
            padding: var(--space-1, 4px) var(--space-2, 8px);
            font-size: var(--text-xs, 12px);
            font-family: var(--font-mono, monospace);
            background: var(--bg-secondary, #f9fafb);
            border: 1px solid var(--border-default, #e5e7eb);
            border-radius: var(--radius-sm, 4px);
            color: var(--text-secondary, #4b5563);
        }

        .command-results {
            flex: 1;
            overflow-y: auto;
            padding: var(--space-2, 8px);
        }

        .command-category {
            margin-bottom: var(--space-2, 8px);
        }

        .command-category-label {
            padding: var(--space-2, 8px) var(--space-3, 12px);
            font-size: var(--text-xs, 12px);
            font-weight: 500;
            color: var(--text-muted, #9ca3af);
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .command-item {
            width: 100%;
            display: flex;
            align-items: center;
            gap: var(--space-3, 12px);
            padding: var(--space-3, 12px);
            border: none;
            background: transparent;
            border-radius: var(--radius-lg, 8px);
            cursor: pointer;
            text-align: left;
            transition: background var(--duration-fast, 100ms);
        }

        .command-item:hover,
        .command-item.selected {
            background: var(--bg-secondary, #f9fafb);
        }

        .command-item-icon {
            font-size: 18px;
            width: 24px;
            text-align: center;
        }

        .command-item-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .command-item-title {
            font-size: var(--text-sm, 14px);
            font-weight: 500;
            color: var(--text-primary, #111827);
        }

        .command-item-description {
            font-size: var(--text-xs, 12px);
            color: var(--text-secondary, #6b7280);
        }

        .command-item-shortcut {
            padding: var(--space-1, 4px) var(--space-2, 8px);
            font-size: 10px;
            font-family: var(--font-mono, monospace);
            background: var(--bg-tertiary, #f3f4f6);
            border-radius: var(--radius-sm, 4px);
            color: var(--text-muted, #9ca3af);
        }

        .command-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: var(--space-3, 12px);
            padding: var(--space-8, 32px);
            color: var(--text-muted, #9ca3af);
        }

        .command-empty svg {
            width: 48px;
            height: 48px;
        }

        .command-footer {
            padding: var(--space-3, 12px) var(--space-4, 16px);
            border-top: 1px solid var(--border-default, #e5e7eb);
            background: var(--bg-secondary, #f9fafb);
        }

        .command-footer-hint {
            display: flex;
            align-items: center;
            gap: var(--space-4, 16px);
            font-size: var(--text-xs, 12px);
            color: var(--text-muted, #9ca3af);
        }

        .command-footer-hint kbd {
            padding: 2px 6px;
            font-size: 10px;
            background: var(--bg-primary, white);
            border: 1px solid var(--border-default, #e5e7eb);
            border-radius: var(--radius-sm, 4px);
            margin-right: var(--space-1, 4px);
        }

        :host-context(.dark) .command-item.selected,
        :host-context(.dark) .command-item:hover {
            background: var(--gray-800);
        }
    `]
})
export class CommandPaletteComponent implements OnInit, OnDestroy {
    @ViewChild('searchInput') searchInputRef!: ElementRef<HTMLInputElement>;

    isOpen = signal(false);
    query = signal('');
    selectedIndex = signal(0);

    private allItems: CommandItem[] = [];

    constructor(private router: Router) { }

    ngOnInit() {
        this.initializeCommands();
    }

    ngOnDestroy() { }

    @HostListener('document:keydown', ['$event'])
    handleKeyboardShortcut(event: KeyboardEvent) {
        // Open with Cmd/Ctrl + K
        if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
            event.preventDefault();
            this.toggle();
        }

        // Close with Escape
        if (event.key === 'Escape' && this.isOpen()) {
            this.close();
        }
    }

    private initializeCommands() {
        this.allItems = [
            // Navigation
            { id: 'nav-dashboard', title: 'Go to Dashboard', icon: '📊', category: 'navigation', shortcut: 'G D', action: () => this.router.navigate(['/admin']) },
            { id: 'nav-sessions', title: 'View Sessions', icon: '👥', category: 'navigation', shortcut: 'G S', action: () => this.router.navigate(['/admin'], { queryParams: { tab: 'sessions' } }) },
            { id: 'nav-links', title: 'Manage Links', icon: '🔗', category: 'navigation', shortcut: 'G L', action: () => this.router.navigate(['/admin'], { queryParams: { tab: 'links' } }) },
            { id: 'nav-settings', title: 'Settings', icon: '⚙️', category: 'navigation', shortcut: 'G T', action: () => this.router.navigate(['/admin'], { queryParams: { tab: 'settings' } }) },
            { id: 'nav-analytics', title: 'Analytics', icon: '📈', category: 'navigation', action: () => this.router.navigate(['/admin'], { queryParams: { tab: 'analytics' } }) },
            { id: 'nav-billing', title: 'Billing & Plans', icon: '💳', category: 'navigation', action: () => this.router.navigate(['/billing']) },

            // Actions
            { id: 'action-create-link', title: 'Create New Link', icon: '➕', category: 'action', shortcut: 'N', action: () => this.emitAction('create-link') },
            { id: 'action-refresh', title: 'Refresh Data', icon: '🔄', category: 'action', shortcut: 'R', action: () => this.emitAction('refresh') },
            { id: 'action-toggle-dark', title: 'Toggle Dark Mode', icon: '🌙', category: 'action', shortcut: 'T D', action: () => this.toggleDarkMode() },
            { id: 'action-export', title: 'Export Sessions', icon: '📥', category: 'action', action: () => this.emitAction('export') },
            { id: 'action-notifications', title: 'Toggle Notifications', icon: '🔔', category: 'action', action: () => this.emitAction('toggle-notifications') },
        ];
    }

    filteredItems = computed(() => {
        const q = this.query().toLowerCase().trim();
        if (!q) return this.allItems;
        return this.allItems.filter(item =>
            item.title.toLowerCase().includes(q) ||
            (item.description && item.description.toLowerCase().includes(q))
        );
    });

    categories = computed(() => {
        const items = this.filteredItems();
        const cats = new Set(items.map(i => i.category));
        return Array.from(cats).sort((a, b) => {
            const order = ['recent', 'action', 'navigation', 'search'];
            return order.indexOf(a) - order.indexOf(b);
        });
    });

    getItemsByCategory(category: string): CommandItem[] {
        return this.filteredItems().filter(i => i.category === category);
    }

    getGlobalIndex(item: CommandItem): number {
        return this.filteredItems().indexOf(item);
    }

    toggle() {
        this.isOpen.set(!this.isOpen());
        if (this.isOpen()) {
            this.query.set('');
            this.selectedIndex.set(0);
            setTimeout(() => this.searchInputRef?.nativeElement?.focus(), 50);
        }
    }

    open() {
        this.isOpen.set(true);
        this.query.set('');
        this.selectedIndex.set(0);
        setTimeout(() => this.searchInputRef?.nativeElement?.focus(), 50);
    }

    close() {
        this.isOpen.set(false);
    }

    onSearch() {
        this.selectedIndex.set(0);
    }

    onKeyDown(event: KeyboardEvent) {
        const items = this.filteredItems();
        if (items.length === 0) return;

        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                this.selectedIndex.update(i => Math.min(i + 1, items.length - 1));
                break;
            case 'ArrowUp':
                event.preventDefault();
                this.selectedIndex.update(i => Math.max(i - 1, 0));
                break;
            case 'Enter':
                event.preventDefault();
                const selected = items[this.selectedIndex()];
                if (selected) this.executeItem(selected);
                break;
        }
    }

    executeItem(item: CommandItem) {
        this.close();
        item.action();
    }

    private toggleDarkMode() {
        document.documentElement.classList.toggle('dark');
    }

    private emitAction(action: string) {
        window.dispatchEvent(new CustomEvent('command-palette-action', { detail: action }));
    }
}
