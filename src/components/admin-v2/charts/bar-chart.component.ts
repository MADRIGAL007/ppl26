/**
 * Bar Chart Component
 * Design System UI Component - Phase 11
 * Per phase11_detailed_tasks.md Task 2.3 - Success by flow chart
 *
 * Features: SVG-based bar chart, responsive, tooltips, animations
 */

import {
    Component, input, computed, signal, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface BarChartDataPoint {
    label: string;
    value: number;
    color?: string;
}

@Component({
    selector: 'ui-bar-chart',
    standalone: true,
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="chart-container">
            @if (title()) {
                <div class="chart-header">
                    <h3 class="chart-title">{{ title() }}</h3>
                </div>
            }

            <svg
                [attr.viewBox]="'0 0 ' + width() + ' ' + height()"
                class="chart-svg"
            >
                <!-- Grid Lines -->
                @for (line of gridLines(); track line.y) {
                    <line
                        [attr.x1]="padding()"
                        [attr.y1]="line.y"
                        [attr.x2]="width() - padding()"
                        [attr.y2]="line.y"
                        class="chart-grid-line"
                    />
                    <text
                        [attr.x]="padding() - 8"
                        [attr.y]="line.y + 4"
                        class="chart-axis-label"
                        text-anchor="end"
                    >
                        {{ line.label }}
                    </text>
                }

                <!-- Bars -->
                @for (bar of bars(); track bar.x; let i = $index) {
                    <g
                        class="bar-group"
                        (mouseenter)="hoveredIndex.set(i)"
                        (mouseleave)="hoveredIndex.set(-1)"
                    >
                        <!-- Bar Background -->
                        <rect
                            [attr.x]="bar.x"
                            [attr.y]="padding()"
                            [attr.width]="bar.width"
                            [attr.height]="height() - padding() * 2"
                            class="bar-background"
                            rx="4"
                        />

                        <!-- Bar Value -->
                        <rect
                            [attr.x]="bar.x"
                            [attr.y]="bar.y"
                            [attr.width]="bar.width"
                            [attr.height]="bar.height"
                            [attr.fill]="bar.color"
                            class="bar-value"
                            [class.bar-hovered]="hoveredIndex() === i"
                            rx="4"
                        />

                        <!-- Label -->
                        <text
                            [attr.x]="bar.x + bar.width / 2"
                            [attr.y]="height() - padding() + 16"
                            class="chart-axis-label"
                            text-anchor="middle"
                        >
                            {{ bar.label }}
                        </text>

                        <!-- Hover Value -->
                        @if (hoveredIndex() === i) {
                            <text
                                [attr.x]="bar.x + bar.width / 2"
                                [attr.y]="bar.y - 8"
                                class="bar-value-label"
                                text-anchor="middle"
                            >
                                {{ bar.value }}
                            </text>
                        }
                    </g>
                }
            </svg>
        </div>
    `,
    styles: [`
        .chart-container {
            width: 100%;
        }

        .chart-header {
            margin-bottom: var(--space-4, 16px);
        }

        .chart-title {
            font-size: var(--text-lg, 18px);
            font-weight: 600;
            color: var(--text-primary, #111827);
            margin: 0;
        }

        .chart-svg {
            width: 100%;
            height: auto;
        }

        .chart-grid-line {
            stroke: var(--border-default, #e5e7eb);
            stroke-dasharray: 4 4;
        }

        .chart-axis-label {
            font-size: 10px;
            fill: var(--text-muted, #9ca3af);
            font-family: var(--font-sans);
        }

        .bar-group {
            cursor: pointer;
        }

        .bar-background {
            fill: var(--bg-secondary, #f9fafb);
        }

        .bar-value {
            transition: opacity 0.2s, transform 0.2s;
        }

        .bar-hovered {
            opacity: 0.8;
        }

        .bar-value-label {
            font-size: 12px;
            font-weight: 600;
            fill: var(--text-primary, #111827);
        }

        :host-context(.dark) .bar-background {
            fill: var(--gray-800);
        }

        :host-context(.dark) .chart-grid-line {
            stroke: var(--gray-700);
        }
    `]
})
export class BarChartComponent {
    // Inputs
    data = input.required<BarChartDataPoint[]>();
    title = input<string>('');
    defaultColor = input<string>('var(--brand-primary, #6366f1)');

    // Chart dimensions
    width = input<number>(400);
    height = input<number>(200);
    padding = input<number>(40);
    barPadding = input<number>(0.2); // Percentage of bar width as gap

    // State
    hoveredIndex = signal<number>(-1);

    bars = computed(() => {
        const data = this.data();
        if (data.length === 0) return [];

        const w = this.width();
        const h = this.height();
        const pad = this.padding();
        const chartWidth = w - pad * 2;
        const chartHeight = h - pad * 2;

        const barWidth = chartWidth / data.length;
        const actualBarWidth = barWidth * (1 - this.barPadding());
        const barOffset = (barWidth - actualBarWidth) / 2;

        const values = data.map(d => d.value);
        const max = Math.max(...values) || 1;

        return data.map((d, i) => ({
            x: pad + i * barWidth + barOffset,
            y: pad + chartHeight - (d.value / max) * chartHeight,
            width: actualBarWidth,
            height: (d.value / max) * chartHeight,
            label: d.label,
            value: d.value,
            color: d.color || this.defaultColor()
        }));
    });

    gridLines = computed(() => {
        const h = this.height();
        const pad = this.padding();
        const data = this.data();

        if (data.length === 0) return [];

        const values = data.map(d => d.value);
        const max = Math.max(...values) || 1;

        const lines = [];
        const steps = 4;

        for (let i = 0; i <= steps; i++) {
            const value = (max / steps) * i;
            const y = pad + (h - pad * 2) - (value / max) * (h - pad * 2);
            lines.push({
                y,
                label: this.formatValue(value)
            });
        }

        return lines;
    });

    formatValue(value: number): string {
        if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
        return value.toFixed(0);
    }
}
