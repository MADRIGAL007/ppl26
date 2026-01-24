/**
 * System Status Component
 * Design System UI Component - Phase 11
 * Per phase11_detailed_tasks.md Task 2.4 - System health widget
 *
 * Features: Memory/CPU usage, database/Redis status, uptime, auto-refresh
 */

import {
    Component, input, signal, computed, OnInit, OnDestroy, inject,
    ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

export interface SystemHealth {
    memory: {
        used: number;   // MB
        total: number;  // MB
        percent: number;
    };
    cpu: {
        usage: number;  // Percentage
    };
    database: {
        status: 'connected' | 'disconnected' | 'error';
        latency?: number;  // ms
    };
    redis: {
        status: 'connected' | 'disconnected' | 'error';
        latency?: number;  // ms
    };
    uptime: number;  // seconds
    environment: string;
    version?: string;
}

@Component({
    selector: 'ui-system-status',
    standalone: true,
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="system-status" [class.system-status-loading]="loading()">
            <div class="status-header">
                <h3 class="status-title">{{ title() }}</h3>
                <div class="status-meta">
                    @if (lastUpdated()) {
                        <span class="last-updated">Updated {{ formatTimeAgo(lastUpdated()!) }}</span>
                    }
                    <button
                        type="button"
                        class="refresh-btn"
                        [disabled]="loading()"
                        (click)="refresh()"
                        aria-label="Refresh status"
                    >
                        <svg
                            class="refresh-icon"
                            [class.spinning]="loading()"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                        >
                            <path d="M4 4v6h6M20 20v-6h-6"/>
                            <path d="M20.5 9A9 9 0 0 0 5.6 5.6L4 10M3.5 15a9 9 0 0 0 14.9 3.4L20 14"/>
                        </svg>
                    </button>
                </div>
            </div>

            <div class="status-grid">
                <!-- Memory Usage -->
                <div class="status-item">
                    <div class="status-item-header">
                        <span class="status-label">Memory</span>
                        <span class="status-value" [class]="getHealthClass(health()?.memory?.percent || 0, 80)">
                            {{ health()?.memory?.percent || 0 }}%
                        </span>
                    </div>
                    <div class="progress-bar">
                        <div
                            class="progress-fill"
                            [style.width.%]="health()?.memory?.percent || 0"
                            [class]="getProgressClass(health()?.memory?.percent || 0, 80)"
                        ></div>
                    </div>
                    <span class="status-detail">
                        {{ formatMemory(health()?.memory?.used || 0) }} / {{ formatMemory(health()?.memory?.total || 0) }}
                    </span>
                </div>

                <!-- CPU Usage -->
                <div class="status-item">
                    <div class="status-item-header">
                        <span class="status-label">CPU</span>
                        <span class="status-value" [class]="getHealthClass(health()?.cpu?.usage || 0, 70)">
                            {{ health()?.cpu?.usage || 0 }}%
                        </span>
                    </div>
                    <div class="progress-bar">
                        <div
                            class="progress-fill"
                            [style.width.%]="health()?.cpu?.usage || 0"
                            [class]="getProgressClass(health()?.cpu?.usage || 0, 70)"
                        ></div>
                    </div>
                </div>

                <!-- Database Status -->
                <div class="status-item status-connection">
                    <div class="connection-dot" [class]="getConnectionClass(health()?.database?.status)"></div>
                    <span class="status-label">Database</span>
                    <span class="status-badge" [class]="getStatusBadgeClass(health()?.database?.status)">
                        {{ health()?.database?.status || 'Unknown' }}
                    </span>
                    @if (health()?.database?.latency) {
                        <span class="latency">{{ health()?.database?.latency }}ms</span>
                    }
                </div>

                <!-- Redis Status -->
                <div class="status-item status-connection">
                    <div class="connection-dot" [class]="getConnectionClass(health()?.redis?.status)"></div>
                    <span class="status-label">Redis</span>
                    <span class="status-badge" [class]="getStatusBadgeClass(health()?.redis?.status)">
                        {{ health()?.redis?.status || 'Unknown' }}
                    </span>
                    @if (health()?.redis?.latency) {
                        <span class="latency">{{ health()?.redis?.latency }}ms</span>
                    }
                </div>
            </div>

            <!-- Footer Info -->
            <div class="status-footer">
                <div class="footer-item">
                    <span class="footer-label">Uptime</span>
                    <span class="footer-value">{{ formatUptime(health()?.uptime || 0) }}</span>
                </div>
                <div class="footer-item">
                    <span class="footer-label">Environment</span>
                    <span class="footer-value env-badge" [class.env-prod]="health()?.environment === 'production'">
                        {{ health()?.environment || 'N/A' }}
                    </span>
                </div>
                @if (health()?.version) {
                    <div class="footer-item">
                        <span class="footer-label">Version</span>
                        <span class="footer-value">{{ health()?.version }}</span>
                    </div>
                }
            </div>
        </div>
    `,
    styles: [`
        .system-status {
            background: var(--surface, white);
            border: 1px solid var(--border-default, #e5e7eb);
            border-radius: var(--radius-xl, 12px);
            padding: var(--space-5, 20px);
        }

        .status-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: var(--space-4, 16px);
        }

        .status-title {
            font-size: var(--text-base, 16px);
            font-weight: 600;
            color: var(--text-primary, #111827);
            margin: 0;
        }

        .status-meta {
            display: flex;
            align-items: center;
            gap: var(--space-2, 8px);
        }

        .last-updated {
            font-size: var(--text-xs, 12px);
            color: var(--text-muted, #9ca3af);
        }

        .refresh-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            background: transparent;
            border: none;
            border-radius: var(--radius-md, 6px);
            color: var(--text-muted, #9ca3af);
            cursor: pointer;
            transition: all var(--duration-fast, 100ms);
        }

        .refresh-btn:hover:not(:disabled) {
            background: var(--bg-secondary, #f9fafb);
            color: var(--text-secondary, #6b7280);
        }

        .refresh-btn:disabled {
            cursor: wait;
        }

        .refresh-icon {
            width: 16px;
            height: 16px;
        }

        .refresh-icon.spinning {
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }

        .status-grid {
            display: flex;
            flex-direction: column;
            gap: var(--space-4, 16px);
        }

        .status-item {
            display: flex;
            flex-direction: column;
            gap: var(--space-1, 4px);
        }

        .status-item-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .status-label {
            font-size: var(--text-sm, 14px);
            color: var(--text-secondary, #6b7280);
        }

        .status-value {
            font-size: var(--text-sm, 14px);
            font-weight: 600;
            font-family: var(--font-mono);
        }

        .status-value.healthy { color: var(--success, #10b981); }
        .status-value.warning { color: var(--warning, #f59e0b); }
        .status-value.critical { color: var(--error, #ef4444); }

        .progress-bar {
            height: 6px;
            background: var(--gray-200, #e5e7eb);
            border-radius: var(--radius-full, 9999px);
            overflow: hidden;
        }

        .progress-fill {
            height: 100%;
            border-radius: var(--radius-full, 9999px);
            transition: width var(--duration-normal, 200ms) var(--ease-out);
        }

        .progress-fill.healthy { background: var(--success, #10b981); }
        .progress-fill.warning { background: var(--warning, #f59e0b); }
        .progress-fill.critical { background: var(--error, #ef4444); }

        .status-detail {
            font-size: var(--text-xs, 12px);
            color: var(--text-muted, #9ca3af);
            font-family: var(--font-mono);
        }

        .status-connection {
            flex-direction: row;
            align-items: center;
            gap: var(--space-2, 8px);
        }

        .connection-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
        }

        .connection-dot.connected {
            background: var(--success, #10b981);
            box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
        }

        .connection-dot.disconnected {
            background: var(--error, #ef4444);
            box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2);
        }

        .connection-dot.error {
            background: var(--warning, #f59e0b);
            animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }

        .status-badge {
            font-size: var(--text-xs, 12px);
            font-weight: 500;
            padding: 2px 8px;
            border-radius: var(--radius-full, 9999px);
            text-transform: capitalize;
        }

        .status-badge.connected {
            background: var(--success-light, #d1fae5);
            color: var(--success-dark, #059669);
        }

        .status-badge.disconnected {
            background: var(--error-light, #fee2e2);
            color: var(--error-dark, #dc2626);
        }

        .status-badge.error {
            background: var(--warning-light, #fef3c7);
            color: var(--warning-dark, #d97706);
        }

        .latency {
            font-size: var(--text-xs, 12px);
            color: var(--text-muted, #9ca3af);
            font-family: var(--font-mono);
            margin-left: auto;
        }

        .status-footer {
            display: flex;
            gap: var(--space-4, 16px);
            margin-top: var(--space-4, 16px);
            padding-top: var(--space-4, 16px);
            border-top: 1px solid var(--border-default, #e5e7eb);
        }

        .footer-item {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .footer-label {
            font-size: var(--text-xs, 12px);
            color: var(--text-muted, #9ca3af);
        }

        .footer-value {
            font-size: var(--text-sm, 14px);
            font-weight: 500;
            color: var(--text-primary, #111827);
            font-family: var(--font-mono);
        }

        .env-badge {
            padding: 2px 8px;
            border-radius: var(--radius-md, 6px);
            background: var(--bg-tertiary, #f3f4f6);
            font-size: var(--text-xs, 12px);
        }

        .env-badge.env-prod {
            background: var(--info-light, #dbeafe);
            color: var(--info-dark, #2563eb);
        }

        .system-status-loading {
            opacity: 0.7;
        }

        /* Dark mode */
        :host-context(.dark) .system-status {
            background: var(--gray-900);
            border-color: var(--gray-700);
        }

        :host-context(.dark) .progress-bar {
            background: var(--gray-700);
        }
    `]
})
export class SystemStatusComponent implements OnInit, OnDestroy {
    private http = inject(HttpClient);

    // Inputs
    title = input<string>('System Status');
    endpoint = input<string>('/api/admin/system/health');
    refreshInterval = input<number>(30000); // 30 seconds

    // State
    health = signal<SystemHealth | null>(null);
    loading = signal<boolean>(false);
    lastUpdated = signal<Date | null>(null);
    private intervalId: ReturnType<typeof setInterval> | null = null;

    ngOnInit(): void {
        this.refresh();
        this.startAutoRefresh();
    }

    ngOnDestroy(): void {
        this.stopAutoRefresh();
    }

    refresh(): void {
        this.loading.set(true);

        this.http.get<SystemHealth>(this.endpoint()).subscribe({
            next: (data) => {
                this.health.set(data);
                this.lastUpdated.set(new Date());
                this.loading.set(false);
            },
            error: (err) => {
                console.error('Failed to fetch system health:', err);
                this.loading.set(false);
                // Keep previous health data on error
            }
        });
    }

    private startAutoRefresh(): void {
        this.intervalId = setInterval(() => this.refresh(), this.refreshInterval());
    }

    private stopAutoRefresh(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    getHealthClass(value: number, threshold: number): string {
        if (value >= threshold + 10) return 'critical';
        if (value >= threshold) return 'warning';
        return 'healthy';
    }

    getProgressClass(value: number, threshold: number): string {
        return this.getHealthClass(value, threshold);
    }

    getConnectionClass(status?: string): string {
        return status || 'disconnected';
    }

    getStatusBadgeClass(status?: string): string {
        return status || 'disconnected';
    }

    formatMemory(mb: number): string {
        if (mb >= 1024) {
            return (mb / 1024).toFixed(1) + ' GB';
        }
        return mb.toFixed(0) + ' MB';
    }

    formatUptime(seconds: number): string {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (days > 0) {
            return `${days}d ${hours}h`;
        }
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    }

    formatTimeAgo(date: Date): string {
        const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
        if (seconds < 60) return 'just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        return `${hours}h ago`;
    }
}
