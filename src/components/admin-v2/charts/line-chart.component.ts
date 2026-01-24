/**
 * Line Chart Component
 * Design System UI Component - Phase 11
 * Per phase11_detailed_tasks.md Task 2.3 - Sessions over time chart
 *
 * Features: SVG-based line chart, responsive, tooltips, gradients
 * Using pure SVG - no external dependencies for simple charts
 */

import {
    Component, input, computed, signal, ChangeDetectionStrategy,
    ElementRef, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ChartDataPoint {
    label: string;
    value: number;
}

@Component({
    selector: 'ui-line-chart',
    standalone: true,
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="chart-container" [class]="containerClasses()">
            <!-- Title -->
            @if (title()) {
                <div class="chart-header">
                    <h3 class="chart-title">{{ title() }}</h3>
                    @if (subtitle()) {
                        <p class="chart-subtitle">{{ subtitle() }}</p>
                    }
                </div>
            }

            <!-- SVG Chart -->
            <div class="chart-wrapper">
                <svg
                    [attr.viewBox]="'0 0 ' + width() + ' ' + height()"
                    class="chart-svg"
                    (mousemove)="onMouseMove($event)"
                    (mouseleave)="onMouseLeave()"
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

                    <!-- Gradient Definition -->
                    <defs>
                        <linearGradient [attr.id]="'gradient-' + chartId" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" [attr.stop-color]="color()" stop-opacity="0.3"/>
                            <stop offset="100%" [attr.stop-color]="color()" stop-opacity="0"/>
                        </linearGradient>
                    </defs>

                    <!-- Area Fill -->
                    @if (showArea()) {
                        <path
                            [attr.d]="areaPath()"
                            [attr.fill]="'url(#gradient-' + chartId + ')'"
                            class="chart-area"
                        />
                    }

                    <!-- Line -->
                    <path
                        [attr.d]="linePath()"
                        [attr.stroke]="color()"
                        fill="none"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        class="chart-line"
                    />

                    <!-- Data Points -->
                    @if (showDots()) {
                        @for (point of chartPoints(); track point.x) {
                            <circle
                                [attr.cx]="point.x"
                                [attr.cy]="point.y"
                                r="4"
                                [attr.fill]="color()"
                                class="chart-dot"
                            />
                        }
                    }

                    <!-- X-Axis Labels -->
                    @for (point of chartPoints(); track point.x; let i = $index) {
                        @if (i % xLabelInterval() === 0) {
                            <text
                                [attr.x]="point.x"
                                [attr.y]="height() - padding() + 16"
                                class="chart-axis-label"
                                text-anchor="middle"
                            >
                                {{ data()[i]?.label }}
                            </text>
                        }
                    }

                    <!-- Hover Indicator -->
                    @if (hoveredIndex() >= 0) {
                        <line
                            [attr.x1]="chartPoints()[hoveredIndex()].x"
                            [attr.y1]="padding()"
                            [attr.x2]="chartPoints()[hoveredIndex()].x"
                            [attr.y2]="height() - padding()"
                            class="chart-hover-line"
                        />
                        <circle
                            [attr.cx]="chartPoints()[hoveredIndex()].x"
                            [attr.cy]="chartPoints()[hoveredIndex()].y"
                            r="6"
                            [attr.fill]="color()"
                            class="chart-hover-dot"
                        />
                    }
                </svg>

                <!-- Tooltip -->
                @if (hoveredIndex() >= 0 && showTooltip()) {
                    <div
                        class="chart-tooltip"
                        [style.left.px]="chartPoints()[hoveredIndex()].x"
                        [style.top.px]="chartPoints()[hoveredIndex()].y - 40"
                    >
                        <div class="tooltip-label">{{ data()[hoveredIndex()].label }}</div>
                        <div class="tooltip-value">{{ formatValue(data()[hoveredIndex()].value) }}</div>
                    </div>
                }
            </div>
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

        .chart-subtitle {
            font-size: var(--text-sm, 14px);
            color: var(--text-tertiary, #6b7280);
            margin: var(--space-1, 4px) 0 0;
        }

        .chart-wrapper {
            position: relative;
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

        .chart-line {
            transition: stroke-width 0.2s;
        }

        .chart-area {
            opacity: 0.8;
        }

        .chart-dot {
            opacity: 0;
            transition: opacity 0.2s;
        }

        .chart-container:hover .chart-dot {
            opacity: 1;
        }

        .chart-hover-line {
            stroke: var(--border-default, #e5e7eb);
            stroke-width: 1;
            stroke-dasharray: 4 4;
        }

        .chart-hover-dot {
            stroke: white;
            stroke-width: 2;
        }

        .chart-tooltip {
            position: absolute;
            transform: translateX(-50%);
            background: var(--gray-900, #111827);
            color: white;
            padding: 8px 12px;
            border-radius: var(--radius-md, 6px);
            font-size: var(--text-xs, 12px);
            pointer-events: none;
            z-index: 10;
            white-space: nowrap;
        }

        .tooltip-label {
            color: var(--gray-400);
            margin-bottom: 2px;
        }

        .tooltip-value {
            font-weight: 600;
            font-size: var(--text-sm, 14px);
        }

        /* Dark mode */
        :host-context(.dark) .chart-grid-line {
            stroke: var(--gray-700);
        }

        /* Sizes */
        .chart-sm {
            max-height: 150px;
        }

        .chart-md {
            max-height: 250px;
        }

        .chart-lg {
            max-height: 400px;
        }
    `]
})
export class LineChartComponent {
    private elementRef = inject(ElementRef);

    // Inputs
    data = input.required<ChartDataPoint[]>();
    title = input<string>('');
    subtitle = input<string>('');
    color = input<string>('var(--brand-primary, #6366f1)');
    showArea = input<boolean>(true);
    showDots = input<boolean>(true);
    showTooltip = input<boolean>(true);
    size = input<'sm' | 'md' | 'lg'>('md');

    // Chart dimensions
    width = input<number>(400);
    height = input<number>(200);
    padding = input<number>(40);

    // State
    hoveredIndex = signal<number>(-1);
    chartId = Math.random().toString(36).substring(7);

    containerClasses = computed(() => `chart-${this.size()}`);

    xLabelInterval = computed(() => {
        const dataLength = this.data().length;
        if (dataLength <= 7) return 1;
        if (dataLength <= 14) return 2;
        if (dataLength <= 30) return 5;
        return 7;
    });

    // Calculate chart points
    chartPoints = computed(() => {
        const data = this.data();
        if (data.length === 0) return [];

        const w = this.width();
        const h = this.height();
        const pad = this.padding();
        const chartWidth = w - pad * 2;
        const chartHeight = h - pad * 2;

        const values = data.map(d => d.value);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min || 1;

        return data.map((d, i) => ({
            x: pad + (i / (data.length - 1)) * chartWidth,
            y: pad + chartHeight - ((d.value - min) / range) * chartHeight,
            value: d.value
        }));
    });

    gridLines = computed(() => {
        const h = this.height();
        const pad = this.padding();
        const data = this.data();

        if (data.length === 0) return [];

        const values = data.map(d => d.value);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min || 1;

        const lines = [];
        const steps = 4;

        for (let i = 0; i <= steps; i++) {
            const value = min + (range / steps) * i;
            const y = pad + (h - pad * 2) - ((value - min) / range) * (h - pad * 2);
            lines.push({
                y,
                label: this.formatValue(value)
            });
        }

        return lines;
    });

    linePath = computed(() => {
        const points = this.chartPoints();
        if (points.length === 0) return '';

        return points.reduce((path, point, i) => {
            return path + (i === 0 ? `M ${point.x},${point.y}` : ` L ${point.x},${point.y}`);
        }, '');
    });

    areaPath = computed(() => {
        const points = this.chartPoints();
        if (points.length === 0) return '';

        const h = this.height();
        const pad = this.padding();
        const baseline = h - pad;

        let path = `M ${points[0].x},${baseline}`;
        points.forEach(point => {
            path += ` L ${point.x},${point.y}`;
        });
        path += ` L ${points[points.length - 1].x},${baseline} Z`;

        return path;
    });

    onMouseMove(event: MouseEvent): void {
        const svg = this.elementRef.nativeElement.querySelector('svg');
        if (!svg) return;

        const rect = svg.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const scaleX = this.width() / rect.width;
        const scaledX = x * scaleX;

        const points = this.chartPoints();
        let closestIndex = 0;
        let closestDistance = Infinity;

        points.forEach((point, i) => {
            const distance = Math.abs(point.x - scaledX);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestIndex = i;
            }
        });

        this.hoveredIndex.set(closestIndex);
    }

    onMouseLeave(): void {
        this.hoveredIndex.set(-1);
    }

    formatValue(value: number): string {
        if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
        if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
        return value.toFixed(0);
    }
}
