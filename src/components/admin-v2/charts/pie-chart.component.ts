/**
 * Pie Chart Component
 * Design System UI Component - Phase 11
 * Per phase11_detailed_tasks.md Task 2.3 - Device breakdown chart
 *
 * Features: SVG-based donut/pie chart, responsive, legend, tooltips
 */

import {
    Component, input, computed, signal, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface PieChartDataPoint {
    label: string;
    value: number;
    color: string;
}

@Component({
    selector: 'ui-pie-chart',
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

            <div class="chart-content">
                <!-- SVG Donut Chart -->
                <div class="chart-wrapper">
                    <svg [attr.viewBox]="'-1 -1 2 2'" class="chart-svg">
                        @for (segment of segments(); track segment.label; let i = $index) {
                            <path
                                [attr.d]="segment.path"
                                [attr.fill]="segment.color"
                                class="pie-segment"
                                [class.segment-hovered]="hoveredIndex() === i"
                                (mouseenter)="hoveredIndex.set(i)"
                                (mouseleave)="hoveredIndex.set(-1)"
                            />
                        }

                        <!-- Center Hole (for donut) -->
                        @if (donut()) {
                            <circle cx="0" cy="0" [attr.r]="donutRadius()" fill="var(--surface, white)"/>
                        }

                        <!-- Center Label -->
                        @if (showCenterLabel()) {
                            <text x="0" y="0" class="center-label" text-anchor="middle" dominant-baseline="middle">
                                @if (hoveredIndex() >= 0) {
                                    <tspan x="0" dy="-0.1em" class="center-value">{{ segments()[hoveredIndex()].percentage }}%</tspan>
                                    <tspan x="0" dy="0.25em" class="center-text">{{ segments()[hoveredIndex()].label }}</tspan>
                                } @else {
                                    <tspan x="0" dy="0" class="center-total">{{ total() }}</tspan>
                                }
                            </text>
                        }
                    </svg>
                </div>

                <!-- Legend -->
                @if (showLegend()) {
                    <div class="chart-legend">
                        @for (segment of segments(); track segment.label; let i = $index) {
                            <div
                                class="legend-item"
                                [class.legend-hovered]="hoveredIndex() === i"
                                (mouseenter)="hoveredIndex.set(i)"
                                (mouseleave)="hoveredIndex.set(-1)"
                            >
                                <span class="legend-dot" [style.background]="segment.color"></span>
                                <span class="legend-label">{{ segment.label }}</span>
                                <span class="legend-value">{{ segment.percentage }}%</span>
                            </div>
                        }
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

        .chart-content {
            display: flex;
            align-items: center;
            gap: var(--space-6, 24px);
        }

        .chart-wrapper {
            position: relative;
            width: 160px;
            height: 160px;
            flex-shrink: 0;
        }

        .chart-svg {
            width: 100%;
            height: 100%;
            transform: rotate(-90deg);
        }

        .pie-segment {
            transition: opacity 0.2s, transform 0.2s;
            transform-origin: center;
            cursor: pointer;
        }

        .pie-segment:hover,
        .segment-hovered {
            opacity: 0.8;
        }

        .center-label {
            transform: rotate(90deg);
            font-family: var(--font-sans);
        }

        .center-value {
            font-size: 0.2px;
            font-weight: 700;
            fill: var(--text-primary, #111827);
        }

        .center-text {
            font-size: 0.08px;
            fill: var(--text-muted, #9ca3af);
        }

        .center-total {
            font-size: 0.15px;
            font-weight: 700;
            fill: var(--text-primary, #111827);
        }

        /* Legend */
        .chart-legend {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: var(--space-2, 8px);
        }

        .legend-item {
            display: flex;
            align-items: center;
            gap: var(--space-2, 8px);
            padding: var(--space-1, 4px) var(--space-2, 8px);
            border-radius: var(--radius-md, 6px);
            cursor: pointer;
            transition: background 0.2s;
        }

        .legend-item:hover,
        .legend-hovered {
            background: var(--bg-secondary, #f9fafb);
        }

        .legend-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            flex-shrink: 0;
        }

        .legend-label {
            flex: 1;
            font-size: var(--text-sm, 14px);
            color: var(--text-secondary, #6b7280);
        }

        .legend-value {
            font-size: var(--text-sm, 14px);
            font-weight: 600;
            color: var(--text-primary, #111827);
            font-family: var(--font-mono);
        }

        :host-context(.dark) .legend-item:hover,
        :host-context(.dark) .legend-hovered {
            background: var(--gray-800);
        }

        :host-context(.dark) .chart-svg circle {
            fill: var(--gray-900);
        }
    `]
})
export class PieChartComponent {
    // Inputs
    data = input.required<PieChartDataPoint[]>();
    title = input<string>('');
    donut = input<boolean>(true);
    donutRadius = input<number>(0.6);
    showLegend = input<boolean>(true);
    showCenterLabel = input<boolean>(true);

    // State
    hoveredIndex = signal<number>(-1);

    total = computed(() => {
        return this.data().reduce((sum, d) => sum + d.value, 0);
    });

    segments = computed(() => {
        const data = this.data();
        const total = this.total();
        if (total === 0) return [];

        let currentAngle = 0;

        return data.map(d => {
            const percentage = Math.round((d.value / total) * 100);
            const angle = (d.value / total) * 2 * Math.PI;

            const startX = Math.cos(currentAngle);
            const startY = Math.sin(currentAngle);
            const endX = Math.cos(currentAngle + angle);
            const endY = Math.sin(currentAngle + angle);

            const largeArc = angle > Math.PI ? 1 : 0;

            const path = [
                `M ${startX} ${startY}`,
                `A 1 1 0 ${largeArc} 1 ${endX} ${endY}`,
                `L 0 0`,
                'Z'
            ].join(' ');

            currentAngle += angle;

            return {
                ...d,
                percentage,
                path
            };
        });
    });
}
