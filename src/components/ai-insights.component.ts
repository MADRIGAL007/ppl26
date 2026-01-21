/**
 * AI Insights Panel Component
 * Displays session risk analysis and AI-generated insights
 */

import { Component, Input, signal, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

interface SessionAnalysis {
    riskScore: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    fraudSignals: { type: string; confidence: number; description: string }[];
    behavioralInsights: string[];
    recommendations: { action: string; priority: string; reason: string }[];
    summary: string;
}

@Component({
    selector: 'app-ai-insights',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="ai-panel card">
            <div class="ai-header">
                <div class="ai-title">
                    <span class="ai-icon">🤖</span>
                    <h3>AI Session Analysis</h3>
                </div>
                <button 
                    class="btn btn-sm btn-ghost"
                    [disabled]="loading()"
                    (click)="analyze()"
                >
                    {{ loading() ? 'Analyzing...' : 'Refresh' }}
                </button>
            </div>

            <!-- Loading State -->
            <div class="ai-loading" *ngIf="loading()">
                <div class="loading-spinner"></div>
                <span>Analyzing session with AI...</span>
            </div>

            <!-- Analysis Results -->
            <div class="ai-content" *ngIf="!loading() && analysis()">
                <!-- Risk Score -->
                <div class="risk-score-wrapper">
                    <div 
                        class="risk-score"
                        [class.risk-low]="analysis()?.riskLevel === 'low'"
                        [class.risk-medium]="analysis()?.riskLevel === 'medium'"
                        [class.risk-high]="analysis()?.riskLevel === 'high'"
                        [class.risk-critical]="analysis()?.riskLevel === 'critical'"
                    >
                        <div class="risk-value">{{ analysis()?.riskScore }}</div>
                        <div class="risk-label">Risk Score</div>
                    </div>
                    <div class="risk-level-badge badge" [ngClass]="'badge-' + getRiskBadgeClass()">
                        {{ analysis()?.riskLevel | titlecase }}
                    </div>
                </div>

                <!-- Summary -->
                <div class="ai-summary">
                    <p>{{ analysis()?.summary }}</p>
                </div>

                <!-- Fraud Signals -->
                <div class="ai-section" *ngIf="analysis()?.fraudSignals?.length">
                    <h4 class="section-title">⚠️ Fraud Signals</h4>
                    <div class="signal-list">
                        @for (signal of analysis()?.fraudSignals; track signal.type) {
                            <div class="signal-item">
                                <div class="signal-header">
                                    <span class="signal-type">{{ formatSignalType(signal.type) }}</span>
                                    <span class="signal-confidence">{{ (signal.confidence * 100).toFixed(0) }}%</span>
                                </div>
                                <div class="signal-desc">{{ signal.description }}</div>
                            </div>
                        }
                    </div>
                </div>

                <!-- Behavioral Insights -->
                <div class="ai-section" *ngIf="analysis()?.behavioralInsights?.length">
                    <h4 class="section-title">📊 Insights</h4>
                    <ul class="insight-list">
                        @for (insight of analysis()?.behavioralInsights; track insight) {
                            <li>{{ insight }}</li>
                        }
                    </ul>
                </div>

                <!-- Recommendations -->
                <div class="ai-section" *ngIf="analysis()?.recommendations?.length">
                    <h4 class="section-title">💡 Recommendations</h4>
                    <div class="recommendation-list">
                        @for (rec of analysis()?.recommendations; track rec.action) {
                            <div class="recommendation-item">
                                <span class="rec-priority badge" [ngClass]="'badge-' + getPriorityClass(rec.priority)">
                                    {{ rec.priority }}
                                </span>
                                <div class="rec-content">
                                    <div class="rec-action">{{ rec.action }}</div>
                                    <div class="rec-reason">{{ rec.reason }}</div>
                                </div>
                            </div>
                        }
                    </div>
                </div>
            </div>

            <!-- Empty State -->
            <div class="ai-empty" *ngIf="!loading() && !analysis() && !error()">
                <span class="ai-empty-icon">🔍</span>
                <span>Click "Refresh" to analyze this session</span>
            </div>

            <!-- Error State -->
            <div class="ai-error" *ngIf="error()">
                <span class="error-icon">❌</span>
                <span>{{ error() }}</span>
            </div>
        </div>
    `,
    styles: [`
        .ai-panel {
            padding: var(--space-4, 16px);
        }

        .ai-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: var(--space-4, 16px);
        }

        .ai-title {
            display: flex;
            align-items: center;
            gap: var(--space-2, 8px);
        }

        .ai-title h3 {
            margin: 0;
            font-size: var(--text-base, 16px);
            font-weight: 600;
        }

        .ai-icon {
            font-size: 20px;
        }

        .ai-loading {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: var(--space-3, 12px);
            padding: var(--space-8, 32px);
            color: var(--text-muted, #9ca3af);
        }

        .loading-spinner {
            width: 20px;
            height: 20px;
            border: 2px solid var(--border-default, #e5e7eb);
            border-top-color: var(--brand-primary, #6366f1);
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        .risk-score-wrapper {
            display: flex;
            align-items: center;
            gap: var(--space-4, 16px);
            margin-bottom: var(--space-4, 16px);
        }

        .risk-score {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            border: 4px solid;
        }

        .risk-low { border-color: var(--success, #10b981); }
        .risk-medium { border-color: var(--warning, #f59e0b); }
        .risk-high { border-color: var(--error, #ef4444); }
        .risk-critical { border-color: #7f1d1d; background: rgba(127, 29, 29, 0.1); }

        .risk-value {
            font-size: var(--text-2xl, 24px);
            font-weight: 700;
            color: var(--text-primary, #111827);
        }

        .risk-label {
            font-size: var(--text-xs, 12px);
            color: var(--text-muted, #9ca3af);
        }

        .ai-summary {
            padding: var(--space-3, 12px);
            background: var(--bg-secondary, #f9fafb);
            border-radius: var(--radius-md, 6px);
            margin-bottom: var(--space-4, 16px);
        }

        .ai-summary p {
            margin: 0;
            font-size: var(--text-sm, 14px);
            color: var(--text-secondary, #6b7280);
        }

        .ai-section {
            margin-bottom: var(--space-4, 16px);
        }

        .section-title {
            font-size: var(--text-sm, 14px);
            font-weight: 600;
            margin: 0 0 var(--space-2, 8px);
            color: var(--text-primary, #111827);
        }

        .signal-list {
            display: flex;
            flex-direction: column;
            gap: var(--space-2, 8px);
        }

        .signal-item {
            padding: var(--space-3, 12px);
            background: var(--error-light, #fee2e2);
            border-radius: var(--radius-md, 6px);
            border-left: 3px solid var(--error, #ef4444);
        }

        .signal-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: var(--space-1, 4px);
        }

        .signal-type {
            font-weight: 600;
            font-size: var(--text-sm, 14px);
            color: var(--error-dark, #dc2626);
        }

        .signal-confidence {
            font-size: var(--text-xs, 12px);
            color: var(--text-muted, #9ca3af);
        }

        .signal-desc {
            font-size: var(--text-sm, 14px);
            color: var(--text-secondary, #6b7280);
        }

        .insight-list {
            margin: 0;
            padding-left: var(--space-5, 20px);
        }

        .insight-list li {
            font-size: var(--text-sm, 14px);
            color: var(--text-secondary, #6b7280);
            margin-bottom: var(--space-1, 4px);
        }

        .recommendation-list {
            display: flex;
            flex-direction: column;
            gap: var(--space-2, 8px);
        }

        .recommendation-item {
            display: flex;
            gap: var(--space-3, 12px);
            padding: var(--space-3, 12px);
            background: var(--bg-secondary, #f9fafb);
            border-radius: var(--radius-md, 6px);
        }

        .rec-priority {
            flex-shrink: 0;
        }

        .rec-action {
            font-weight: 500;
            font-size: var(--text-sm, 14px);
            color: var(--text-primary, #111827);
        }

        .rec-reason {
            font-size: var(--text-xs, 12px);
            color: var(--text-muted, #9ca3af);
        }

        .ai-empty, .ai-error {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: var(--space-2, 8px);
            padding: var(--space-8, 32px);
            text-align: center;
            color: var(--text-muted, #9ca3af);
        }

        .ai-empty-icon, .error-icon {
            font-size: 32px;
        }

        .ai-error {
            color: var(--error, #ef4444);
        }

        .badge-success { background: var(--success-light); color: var(--success-dark); }
        .badge-warning { background: var(--warning-light); color: var(--warning-dark); }
        .badge-error { background: var(--error-light); color: var(--error-dark); }
    `]
})
export class AiInsightsComponent implements OnChanges {
    @Input() sessionId: string = '';

    analysis = signal<SessionAnalysis | null>(null);
    loading = signal(false);
    error = signal<string | null>(null);

    constructor(private http: HttpClient) { }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['sessionId'] && this.sessionId) {
            this.analyze();
        }
    }

    analyze() {
        if (!this.sessionId) return;

        this.loading.set(true);
        this.error.set(null);

        this.http.get<SessionAnalysis>(`/api/sessions/${this.sessionId}/analyze`).subscribe({
            next: (result) => {
                this.analysis.set(result);
                this.loading.set(false);
            },
            error: (err) => {
                this.error.set(err.error?.message || 'Analysis failed');
                this.loading.set(false);
            }
        });
    }

    getRiskBadgeClass(): string {
        switch (this.analysis()?.riskLevel) {
            case 'low': return 'success';
            case 'medium': return 'warning';
            case 'high':
            case 'critical': return 'error';
            default: return 'info';
        }
    }

    getPriorityClass(priority: string): string {
        switch (priority) {
            case 'high': return 'error';
            case 'medium': return 'warning';
            default: return 'info';
        }
    }

    formatSignalType(type: string): string {
        return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
}
