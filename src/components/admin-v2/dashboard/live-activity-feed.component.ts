/**
 * Live Activity Feed Component
 * Design System UI Component - Phase 11
 * Per phase11_detailed_tasks.md Task 2.2 - Real-time session events
 *
 * Features: Socket.IO integration, filters, auto-scroll, sound notifications
 */

import {
    Component, input, output, signal, computed, OnInit, OnDestroy,
    ElementRef, inject, ViewChild, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface ActivityItem {
    id: string;
    type: 'session_start' | 'session_update' | 'session_complete' | 'session_error' | 'system';
    flow: string;
    status: string;
    ip?: string;
    country?: string;
    countryCode?: string;
    device?: string;
    timestamp: Date;
    message?: string;
}

export type ActivityFilter = {
    flow?: string;
    status?: string;
    type?: string;
};

@Component({
    selector: 'ui-live-activity-feed',
    standalone: true,
    imports: [CommonModule, FormsModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="feed-container">
            <!-- Header -->
            <div class="feed-header">
                <div class="feed-title-row">
                    <h3 class="feed-title">{{ title() }}</h3>
                    <span class="feed-live-badge" [class.active]="isLive()">
                        <span class="live-dot"></span>
                        {{ isLive() ? 'LIVE' : 'PAUSED' }}
                    </span>
                </div>

                <!-- Controls Row -->
                <div class="feed-controls">
                    <!-- Filters -->
                    <div class="filter-group">
                        <select
                            class="filter-select"
                            [ngModel]="selectedFlow()"
                            (ngModelChange)="onFlowChange($event)"
                        >
                            <option value="">All Flows</option>
                            @for (flow of flowOptions(); track flow) {
                                <option [value]="flow">{{ flow }}</option>
                            }
                        </select>

                        <select
                            class="filter-select"
                            [ngModel]="selectedStatus()"
                            (ngModelChange)="onStatusChange($event)"
                        >
                            <option value="">All Status</option>
                            <option value="active">Active</option>
                            <option value="pending">Pending</option>
                            <option value="completed">Completed</option>
                            <option value="error">Error</option>
                        </select>
                    </div>

                    <!-- Action Buttons -->
                    <div class="action-group">
                        <button
                            type="button"
                            class="action-btn"
                            [class.active]="autoScroll()"
                            (click)="toggleAutoScroll()"
                            title="Auto-scroll to latest"
                        >
                            <svg viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L10 14.586l5.293-5.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                            </svg>
                        </button>

                        <button
                            type="button"
                            class="action-btn"
                            [class.active]="soundEnabled()"
                            (click)="toggleSound()"
                            title="Sound notifications"
                        >
                            @if (soundEnabled()) {
                                <svg viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.784L4.5 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.5l3.883-3.784a1 1 0 011-.14zM14.656 5.344a1 1 0 011.414 0 7 7 0 010 9.9 1 1 0 11-1.414-1.414 5 5 0 000-6.072 1 1 0 010-1.414z" clip-rule="evenodd"/>
                                    <path fill-rule="evenodd" d="M12.828 7.172a1 1 0 011.414 0 4 4 0 010 5.656 1 1 0 11-1.414-1.414 2 2 0 000-2.828 1 1 0 010-1.414z" clip-rule="evenodd"/>
                                </svg>
                            } @else {
                                <svg viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.784L4.5 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.5l3.883-3.784a1 1 0 011-.14zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clip-rule="evenodd"/>
                                </svg>
                            }
                        </button>

                        <button
                            type="button"
                            class="action-btn clear-btn"
                            (click)="clearFeed()"
                            title="Clear feed"
                        >
                            <svg viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Activity List -->
            <div class="feed-list" #feedList>
                @for (item of filteredItems(); track item.id) {
                    <div
                        class="feed-item animate-slide-in"
                        [class]="'feed-item-' + item.type"
                    >
                        <!-- Type Indicator -->
                        <div class="item-indicator" [class]="getTypeClass(item.type)">
                            @switch (item.type) {
                                @case ('session_start') { ▶ }
                                @case ('session_update') { ↻ }
                                @case ('session_complete') { ✓ }
                                @case ('session_error') { ✕ }
                                @default { • }
                            }
                        </div>

                        <!-- Content -->
                        <div class="item-content">
                            <div class="item-main">
                                <span class="item-flow">{{ item.flow }}</span>
                                <span class="item-status" [class]="getStatusClass(item.status)">
                                    {{ item.status }}
                                </span>
                            </div>
                            <div class="item-meta">
                                @if (item.country) {
                                    <span class="meta-item">
                                        <span class="country-flag">{{ getCountryFlag(item.countryCode || 'US') }}</span>
                                        {{ item.country }}
                                    </span>
                                }
                                @if (item.device) {
                                    <span class="meta-item">{{ item.device }}</span>
                                }
                                @if (item.message) {
                                    <span class="meta-item message">{{ item.message }}</span>
                                }
                            </div>
                        </div>

                        <!-- Timestamp -->
                        <div class="item-time">
                            {{ formatTime(item.timestamp) }}
                        </div>
                    </div>
                } @empty {
                    <div class="feed-empty">
                        <div class="empty-icon">📡</div>
                        <p>No activity yet</p>
                        <span>Events will appear here in real-time</span>
                    </div>
                }
            </div>

            <!-- Footer -->
            @if (totalItems() > 0) {
                <div class="feed-footer">
                    <span>{{ filteredItems().length }} of {{ totalItems() }} events</span>
                    @if (newItemsCount() > 0 && !autoScroll()) {
                        <button class="new-items-btn" (click)="scrollToTop()">
                            {{ newItemsCount() }} new
                            <svg viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L10 4.414l-5.293 5.293a1 1 0 01-1.414 0z" clip-rule="evenodd"/>
                            </svg>
                        </button>
                    }
                </div>
            }
        </div>
    `,
    styles: [`
        .feed-container {
            display: flex;
            flex-direction: column;
            background: var(--surface, white);
            border: 1px solid var(--border-default, #e5e7eb);
            border-radius: var(--radius-xl, 12px);
            overflow: hidden;
        }

        /* Header */
        .feed-header {
            padding: var(--space-4, 16px);
            border-bottom: 1px solid var(--border-default, #e5e7eb);
        }

        .feed-title-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: var(--space-3, 12px);
        }

        .feed-title {
            font-size: var(--text-base, 16px);
            font-weight: 600;
            color: var(--text-primary, #111827);
            margin: 0;
        }

        .feed-live-badge {
            display: inline-flex;
            align-items: center;
            gap: var(--space-1, 4px);
            font-size: var(--text-xs, 12px);
            font-weight: 600;
            padding: 4px 10px;
            border-radius: var(--radius-full, 9999px);
            background: var(--gray-100, #f3f4f6);
            color: var(--text-muted, #9ca3af);
        }

        .feed-live-badge.active {
            background: var(--error-light, #fee2e2);
            color: var(--error, #ef4444);
        }

        .live-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: currentColor;
        }

        .feed-live-badge.active .live-dot {
            animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
        }

        /* Controls */
        .feed-controls {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: var(--space-3, 12px);
        }

        .filter-group {
            display: flex;
            gap: var(--space-2, 8px);
        }

        .filter-select {
            padding: 6px 10px;
            font-size: var(--text-sm, 14px);
            border: 1px solid var(--border-default, #e5e7eb);
            border-radius: var(--radius-md, 6px);
            background: var(--surface, white);
            color: var(--text-primary, #111827);
            cursor: pointer;
        }

        .filter-select:focus {
            outline: none;
            border-color: var(--brand-primary, #6366f1);
        }

        .action-group {
            display: flex;
            gap: var(--space-1, 4px);
        }

        .action-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            background: transparent;
            border: 1px solid var(--border-default, #e5e7eb);
            border-radius: var(--radius-md, 6px);
            color: var(--text-muted, #9ca3af);
            cursor: pointer;
            transition: all var(--duration-fast, 100ms);
        }

        .action-btn:hover {
            background: var(--bg-secondary, #f9fafb);
            color: var(--text-secondary, #6b7280);
        }

        .action-btn.active {
            background: var(--brand-primary, #6366f1);
            border-color: var(--brand-primary, #6366f1);
            color: white;
        }

        .action-btn svg {
            width: 16px;
            height: 16px;
        }

        .clear-btn:hover {
            border-color: var(--error, #ef4444);
            color: var(--error, #ef4444);
        }

        /* Feed List */
        .feed-list {
            flex: 1;
            min-height: 200px;
            max-height: 400px;
            overflow-y: auto;
            padding: var(--space-2, 8px);
        }

        .feed-item {
            display: flex;
            align-items: flex-start;
            gap: var(--space-3, 12px);
            padding: var(--space-3, 12px);
            border-radius: var(--radius-md, 6px);
            transition: background var(--duration-fast, 100ms);
        }

        .feed-item:hover {
            background: var(--bg-secondary, #f9fafb);
        }

        .animate-slide-in {
            animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(-10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .item-indicator {
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            font-size: 10px;
            flex-shrink: 0;
        }

        .item-indicator.start {
            background: var(--info-light, #dbeafe);
            color: var(--info-dark, #2563eb);
        }

        .item-indicator.update {
            background: var(--warning-light, #fef3c7);
            color: var(--warning-dark, #d97706);
        }

        .item-indicator.complete {
            background: var(--success-light, #d1fae5);
            color: var(--success-dark, #059669);
        }

        .item-indicator.error {
            background: var(--error-light, #fee2e2);
            color: var(--error-dark, #dc2626);
        }

        .item-content {
            flex: 1;
            min-width: 0;
        }

        .item-main {
            display: flex;
            align-items: center;
            gap: var(--space-2, 8px);
            margin-bottom: 2px;
        }

        .item-flow {
            font-size: var(--text-sm, 14px);
            font-weight: 500;
            color: var(--text-primary, #111827);
        }

        .item-status {
            font-size: var(--text-xs, 12px);
            padding: 2px 8px;
            border-radius: var(--radius-full, 9999px);
            font-weight: 500;
        }

        .item-status.active { background: var(--info-light, #dbeafe); color: var(--info-dark, #2563eb); }
        .item-status.pending { background: var(--warning-light, #fef3c7); color: var(--warning-dark, #d97706); }
        .item-status.completed { background: var(--success-light, #d1fae5); color: var(--success-dark, #059669); }
        .item-status.error { background: var(--error-light, #fee2e2); color: var(--error-dark, #dc2626); }

        .item-meta {
            display: flex;
            flex-wrap: wrap;
            gap: var(--space-2, 8px);
        }

        .meta-item {
            font-size: var(--text-xs, 12px);
            color: var(--text-muted, #9ca3af);
        }

        .country-flag {
            margin-right: 2px;
        }

        .item-time {
            font-size: var(--text-xs, 12px);
            color: var(--text-muted, #9ca3af);
            font-family: var(--font-mono);
            white-space: nowrap;
        }

        /* Empty State */
        .feed-empty {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: var(--space-8, 32px);
            text-align: center;
        }

        .empty-icon {
            font-size: 32px;
            margin-bottom: var(--space-2, 8px);
        }

        .feed-empty p {
            font-size: var(--text-sm, 14px);
            font-weight: 500;
            color: var(--text-secondary, #6b7280);
            margin: 0 0 var(--space-1, 4px);
        }

        .feed-empty span {
            font-size: var(--text-xs, 12px);
            color: var(--text-muted, #9ca3af);
        }

        /* Footer */
        .feed-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: var(--space-3, 12px) var(--space-4, 16px);
            border-top: 1px solid var(--border-default, #e5e7eb);
            font-size: var(--text-xs, 12px);
            color: var(--text-muted, #9ca3af);
        }

        .new-items-btn {
            display: inline-flex;
            align-items: center;
            gap: var(--space-1, 4px);
            padding: 4px 10px;
            background: var(--brand-primary, #6366f1);
            color: white;
            border: none;
            border-radius: var(--radius-full, 9999px);
            font-size: var(--text-xs, 12px);
            font-weight: 500;
            cursor: pointer;
        }

        .new-items-btn svg {
            width: 12px;
            height: 12px;
        }

        /* Dark Mode */
        :host-context(.dark) .feed-container {
            background: var(--gray-900);
            border-color: var(--gray-700);
        }

        :host-context(.dark) .feed-header,
        :host-context(.dark) .feed-footer {
            border-color: var(--gray-700);
        }

        :host-context(.dark) .filter-select {
            background: var(--gray-800);
            border-color: var(--gray-700);
            color: var(--gray-100);
        }

        :host-context(.dark) .feed-item:hover {
            background: var(--gray-800);
        }
    `]
})
export class LiveActivityFeedComponent implements OnInit, OnDestroy {
    @ViewChild('feedList') feedListRef!: ElementRef<HTMLDivElement>;

    // Inputs
    title = input<string>('Live Activity Feed');
    maxItems = input<number>(100);
    flowOptions = input<string[]>(['PayPal', 'Apple', 'Chase', 'Netflix', 'Amazon', 'Prime', 'Spotify']);

    // Outputs
    itemClicked = output<ActivityItem>();

    // State
    items = signal<ActivityItem[]>([]);
    selectedFlow = signal<string>('');
    selectedStatus = signal<string>('');
    autoScroll = signal<boolean>(true);
    soundEnabled = signal<boolean>(false);
    isLive = signal<boolean>(true);
    newItemsCount = signal<number>(0);

    private audioContext: AudioContext | null = null;

    totalItems = computed(() => this.items().length);

    filteredItems = computed(() => {
        let result = this.items();

        const flow = this.selectedFlow();
        const status = this.selectedStatus();

        if (flow) {
            result = result.filter(item => item.flow.toLowerCase().includes(flow.toLowerCase()));
        }

        if (status) {
            result = result.filter(item => item.status.toLowerCase() === status.toLowerCase());
        }

        return result;
    });

    ngOnInit(): void {
        // Initialize with some demo data
        this.addDemoData();
    }

    ngOnDestroy(): void {
        // Cleanup
    }

    addItem(item: Omit<ActivityItem, 'id'>): void {
        const newItem: ActivityItem = {
            ...item,
            id: crypto.randomUUID()
        };

        this.items.update(items => {
            const updated = [newItem, ...items];
            // Keep only maxItems
            return updated.slice(0, this.maxItems());
        });

        // Play sound if enabled
        if (this.soundEnabled()) {
            this.playNotificationSound();
        }

        // Auto-scroll if enabled
        if (this.autoScroll()) {
            this.scrollToTop();
        } else {
            this.newItemsCount.update(n => n + 1);
        }
    }

    toggleAutoScroll(): void {
        this.autoScroll.update(v => !v);
        if (this.autoScroll()) {
            this.newItemsCount.set(0);
            this.scrollToTop();
        }
    }

    toggleSound(): void {
        this.soundEnabled.update(v => !v);
    }

    clearFeed(): void {
        this.items.set([]);
        this.newItemsCount.set(0);
    }

    scrollToTop(): void {
        if (this.feedListRef?.nativeElement) {
            this.feedListRef.nativeElement.scrollTop = 0;
        }
        this.newItemsCount.set(0);
    }

    onFlowChange(flow: string): void {
        this.selectedFlow.set(flow);
    }

    onStatusChange(status: string): void {
        this.selectedStatus.set(status);
    }

    getTypeClass(type: string): string {
        switch (type) {
            case 'session_start': return 'start';
            case 'session_update': return 'update';
            case 'session_complete': return 'complete';
            case 'session_error': return 'error';
            default: return '';
        }
    }

    getStatusClass(status: string): string {
        return status.toLowerCase();
    }

    getCountryFlag(countryCode: string): string {
        // Convert country code to flag emoji
        const codePoints = countryCode
            .toUpperCase()
            .split('')
            .map(char => 127397 + char.charCodeAt(0));
        return String.fromCodePoint(...codePoints);
    }

    formatTime(date: Date): string {
        return new Date(date).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    private playNotificationSound(): void {
        try {
            if (!this.audioContext) {
                this.audioContext = new AudioContext();
            }

            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.frequency.value = 880; // High A
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);

            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.1);
        } catch (e) {
            console.warn('Could not play notification sound:', e);
        }
    }

    private addDemoData(): void {
        const demoItems: Omit<ActivityItem, 'id'>[] = [
            { type: 'session_start', flow: 'PayPal', status: 'Active', country: 'United States', countryCode: 'US', device: 'Mobile', timestamp: new Date() },
            { type: 'session_update', flow: 'Apple', status: 'Pending', country: 'Germany', countryCode: 'DE', device: 'Desktop', timestamp: new Date(Date.now() - 60000) },
            { type: 'session_complete', flow: 'Netflix', status: 'Completed', country: 'France', countryCode: 'FR', device: 'Tablet', timestamp: new Date(Date.now() - 120000) },
        ];

        demoItems.forEach((item, i) => {
            setTimeout(() => this.addItem(item), i * 100);
        });
    }
}
