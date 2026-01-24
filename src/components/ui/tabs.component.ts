/**
 * Tabs Component
 * Design System UI Component - Phase 11
 * Per phase11_detailed_tasks.md - Horizontal/vertical tabs with icon support
 *
 * Features: horizontal/vertical orientation, icons, lazy content loading
 */

import { Component, input, output, signal, computed, ChangeDetectionStrategy, contentChildren } from '@angular/core';
import { CommonModule } from '@angular/common';

// Tab Item Interface
export interface TabItem {
    id: string;
    label: string;
    icon?: string;
    disabled?: boolean;
}

@Component({
    selector: 'ui-tabs',
    standalone: true,
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="tabs-container" [class.tabs-vertical]="orientation() === 'vertical'">
            <!-- Tab List -->
            <div
                class="tabs-list"
                [class]="tabListClasses()"
                role="tablist"
                [attr.aria-orientation]="orientation()"
            >
                @for (tab of tabs(); track tab.id) {
                    <button
                        type="button"
                        role="tab"
                        class="tab-item"
                        [class.tab-active]="activeTab() === tab.id"
                        [class.tab-disabled]="tab.disabled"
                        [attr.aria-selected]="activeTab() === tab.id"
                        [attr.aria-controls]="'panel-' + tab.id"
                        [attr.tabindex]="activeTab() === tab.id ? 0 : -1"
                        [disabled]="tab.disabled"
                        (click)="selectTab(tab.id)"
                        (keydown)="handleKeydown($event, tab.id)"
                    >
                        @if (tab.icon) {
                            <span class="tab-icon" [innerHTML]="tab.icon"></span>
                        }
                        <span class="tab-label">{{ tab.label }}</span>
                    </button>
                }
                <!-- Active indicator -->
                <div class="tab-indicator" [style]="indicatorStyle()"></div>
            </div>

            <!-- Tab Panels -->
            <div class="tabs-panels">
                <ng-content/>
            </div>
        </div>
    `,
    styles: [`
        .tabs-container {
            width: 100%;
        }

        .tabs-vertical {
            display: flex;
            gap: var(--space-6, 24px);
        }

        /* ========================= */
        /* TAB LIST */
        /* ========================= */
        .tabs-list {
            position: relative;
            display: flex;
            gap: var(--space-1, 4px);
        }

        .tabs-list-horizontal {
            flex-direction: row;
            border-bottom: 1px solid var(--border-default, #e5e7eb);
        }

        .tabs-list-vertical {
            flex-direction: column;
            border-right: 1px solid var(--border-default, #e5e7eb);
            min-width: 180px;
        }

        .tabs-list-sm .tab-item {
            padding: 8px 12px;
            font-size: var(--text-xs, 12px);
        }

        .tabs-list-md .tab-item {
            padding: 10px 16px;
            font-size: var(--text-sm, 14px);
        }

        .tabs-list-lg .tab-item {
            padding: 12px 20px;
            font-size: var(--text-base, 16px);
        }

        /* ========================= */
        /* TAB ITEM */
        /* ========================= */
        .tab-item {
            display: inline-flex;
            align-items: center;
            gap: var(--space-2, 8px);
            font-weight: 500;
            color: var(--text-secondary, #6b7280);
            background: transparent;
            border: none;
            cursor: pointer;
            transition: all var(--duration-fast, 100ms) var(--ease-out);
            white-space: nowrap;
            position: relative;
            z-index: 1;
        }

        .tab-item:hover:not(:disabled):not(.tab-active) {
            color: var(--text-primary, #111827);
            background: var(--bg-secondary, #f9fafb);
        }

        .tab-item:focus-visible {
            outline: 2px solid var(--brand-primary, #6366f1);
            outline-offset: -2px;
            border-radius: var(--radius-md, 6px);
        }

        .tab-active {
            color: var(--brand-primary, #6366f1);
        }

        .tab-disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        /* ========================= */
        /* TAB INDICATOR */
        /* ========================= */
        .tab-indicator {
            position: absolute;
            background: var(--brand-primary, #6366f1);
            transition: all var(--duration-normal, 200ms) var(--ease-out-expo);
            z-index: 0;
        }

        .tabs-list-horizontal .tab-indicator {
            bottom: -1px;
            height: 2px;
        }

        .tabs-list-vertical .tab-indicator {
            right: -1px;
            width: 2px;
        }

        /* ========================= */
        /* TAB ICON */
        /* ========================= */
        .tab-icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
        }

        .tab-icon :deep(svg) {
            width: 16px;
            height: 16px;
        }

        /* ========================= */
        /* TAB PANELS */
        /* ========================= */
        .tabs-panels {
            flex: 1;
            padding-top: var(--space-4, 16px);
        }

        .tabs-vertical .tabs-panels {
            padding-top: 0;
            padding-left: var(--space-4, 16px);
        }
    `]
})
export class TabsComponent {
    tabs = input.required<TabItem[]>();
    defaultTab = input<string>('');
    orientation = input<'horizontal' | 'vertical'>('horizontal');
    size = input<'sm' | 'md' | 'lg'>('md');

    activeTab = signal<string>('');
    tabChanged = output<string>();

    constructor() {
        // Set default tab on init
        setTimeout(() => {
            if (!this.activeTab() && this.tabs().length > 0) {
                const defaultId = this.defaultTab() || this.tabs()[0]?.id;
                if (defaultId) {
                    this.activeTab.set(defaultId);
                }
            }
        });
    }

    tabListClasses = computed(() => {
        return `tabs-list-${this.orientation()} tabs-list-${this.size()}`;
    });

    indicatorStyle = computed(() => {
        const tabs = this.tabs();
        const activeIndex = tabs.findIndex(t => t.id === this.activeTab());

        if (activeIndex === -1) return {};

        if (this.orientation() === 'horizontal') {
            // Approximate position based on index
            const width = 100 / tabs.length;
            return {
                left: `${activeIndex * width}%`,
                width: `${width}%`
            };
        } else {
            const height = 100 / tabs.length;
            return {
                top: `${activeIndex * height}%`,
                height: `${height}%`
            };
        }
    });

    selectTab(tabId: string): void {
        const tab = this.tabs().find(t => t.id === tabId);
        if (tab && !tab.disabled) {
            this.activeTab.set(tabId);
            this.tabChanged.emit(tabId);
        }
    }

    handleKeydown(event: KeyboardEvent, currentId: string): void {
        const tabs = this.tabs().filter(t => !t.disabled);
        const currentIndex = tabs.findIndex(t => t.id === currentId);

        let nextIndex = currentIndex;

        switch (event.key) {
            case 'ArrowRight':
            case 'ArrowDown':
                event.preventDefault();
                nextIndex = (currentIndex + 1) % tabs.length;
                break;
            case 'ArrowLeft':
            case 'ArrowUp':
                event.preventDefault();
                nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
                break;
            case 'Home':
                event.preventDefault();
                nextIndex = 0;
                break;
            case 'End':
                event.preventDefault();
                nextIndex = tabs.length - 1;
                break;
        }

        if (nextIndex !== currentIndex && tabs[nextIndex]) {
            this.selectTab(tabs[nextIndex].id);
        }
    }
}

/**
 * Tab Panel Component
 * Content container for individual tab
 */
@Component({
    selector: 'ui-tab-panel',
    standalone: true,
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (isActive()) {
            <div
                role="tabpanel"
                [id]="'panel-' + tabId()"
                [attr.aria-labelledby]="tabId()"
                class="tab-panel animate-fade-in"
            >
                <ng-content/>
            </div>
        }
    `,
    styles: [`
        .tab-panel {
            animation: fadeIn 0.2s ease-out;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
    `]
})
export class TabPanelComponent {
    tabId = input.required<string>();
    activeTab = input.required<string>();

    isActive = computed(() => this.tabId() === this.activeTab());
}
