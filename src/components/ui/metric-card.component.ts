/**
 * Metric Card Component
 * Displays KPIs with optional trend indicators and sparklines
 */

import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-metric-card',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="metric-card" [class.metric-card-loading]="loading()">
            <div class="metric-header">
                <span class="metric-label">{{ label }}</span>
                <span class="metric-icon" *ngIf="icon">{{ icon }}</span>
            </div>
            
            <div class="metric-value-row">
                <span class="metric-value" *ngIf="!loading()">{{ formattedValue() }}</span>
                <div class="skeleton metric-value-skeleton" *ngIf="loading()"></div>
                
                <span 
                    class="metric-change" 
                    *ngIf="change !== undefined && !loading()"
                    [class.positive]="change > 0"
                    [class.negative]="change < 0"
                >
                    <span class="change-arrow">{{ change > 0 ? '↑' : change < 0 ? '↓' : '→' }}</span>
                    {{ Math.abs(change) }}%
                </span>
            </div>

            <div class="metric-footer" *ngIf="subtitle">
                <span class="metric-subtitle">{{ subtitle }}</span>
            </div>

            <!-- Mini Sparkline -->
            <svg class="metric-sparkline" *ngIf="sparklineData.length > 0" viewBox="0 0 100 30">
                <polyline
                    [attr.points]="sparklinePoints()"
                    fill="none"
                    [attr.stroke]="sparklineColor()"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                />
            </svg>
        </div>
    `,
    styles: [`
        .metric-card {
            padding: var(--space-5, 20px);
            background: var(--surface, white);
            border: 1px solid var(--border-default, #e5e7eb);
            border-radius: var(--radius-xl, 12px);
            position: relative;
            overflow: hidden;
            transition: all var(--duration-normal, 200ms) var(--ease-out);
        }

        .metric-card:hover {
            border-color: var(--border-hover, #d1d5db);
            box-shadow: var(--shadow-md);
        }

        .metric-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: var(--space-2, 8px);
        }

        .metric-label {
            font-size: var(--text-sm, 14px);
            font-weight: 500;
            color: var(--text-secondary, #6b7280);
        }

        .metric-icon {
            font-size: 18px;
        }

        .metric-value-row {
            display: flex;
            align-items: baseline;
            gap: var(--space-3, 12px);
        }

        .metric-value {
            font-size: var(--text-3xl, 30px);
            font-weight: 700;
            color: var(--text-primary, #111827);
            letter-spacing: var(--tracking-tight, -0.025em);
        }

        .metric-value-skeleton {
            width: 100px;
            height: 36px;
            border-radius: var(--radius-md, 6px);
        }

        .metric-change {
            display: inline-flex;
            align-items: center;
            gap: var(--space-1, 4px);
            padding: var(--space-1, 4px) var(--space-2, 8px);
            font-size: var(--text-xs, 12px);
            font-weight: 600;
            border-radius: var(--radius-full, 9999px);
        }

        .metric-change.positive {
            color: var(--success-dark, #059669);
            background: var(--success-light, #d1fae5);
        }

        .metric-change.negative {
            color: var(--error-dark, #dc2626);
            background: var(--error-light, #fee2e2);
        }

        .change-arrow {
            font-size: 10px;
        }

        .metric-footer {
            margin-top: var(--space-2, 8px);
        }

        .metric-subtitle {
            font-size: var(--text-xs, 12px);
            color: var(--text-muted, #9ca3af);
        }

        .metric-sparkline {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 40px;
            opacity: 0.5;
        }

        .metric-card-loading {
            pointer-events: none;
        }

        :host-context(.dark) .metric-card {
            background: var(--gray-900);
            border-color: var(--gray-700);
        }
    `]
})
export class MetricCardComponent {
    @Input() label: string = '';
    @Input() value: number | string = 0;
    @Input() icon?: string;
    @Input() change?: number;
    @Input() subtitle?: string;
    @Input() format: 'number' | 'currency' | 'percent' | 'compact' = 'number';
    @Input() sparklineData: number[] = [];
    @Input() loading = signal(false);

    protected Math = Math;

    formattedValue = computed(() => {
        const val = typeof this.value === 'string' ? parseFloat(this.value) : this.value;

        if (isNaN(val)) return this.value;

        switch (this.format) {
            case 'currency':
                return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
            case 'percent':
                return `${val.toFixed(1)}%`;
            case 'compact':
                return new Intl.NumberFormat('en-US', { notation: 'compact' }).format(val);
            default:
                return new Intl.NumberFormat('en-US').format(val);
        }
    });

    sparklinePoints = computed(() => {
        if (this.sparklineData.length === 0) return '';

        const width = 100;
        const height = 30;
        const padding = 2;

        const min = Math.min(...this.sparklineData);
        const max = Math.max(...this.sparklineData);
        const range = max - min || 1;

        return this.sparklineData.map((val, i) => {
            const x = (i / (this.sparklineData.length - 1)) * width;
            const y = height - padding - ((val - min) / range) * (height - 2 * padding);
            return `${x},${y}`;
        }).join(' ');
    });

    sparklineColor = computed(() => {
        if (this.sparklineData.length < 2) return 'var(--brand-primary)';
        const first = this.sparklineData[0];
        const last = this.sparklineData[this.sparklineData.length - 1];
        return last >= first ? 'var(--success)' : 'var(--error)';
    });
}
