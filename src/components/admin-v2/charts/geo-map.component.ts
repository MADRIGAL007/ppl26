import { Component, input, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxEchartsModule, NGX_ECHARTS_CONFIG } from 'ngx-echarts';
import { ChartService } from '../../../services/chart.service';
import { EChartsOption } from 'echarts';

export interface GeoMapDataPoint {
    name: string;
    value: number;
}

@Component({
    selector: 'ui-geo-map',
    standalone: true,
    imports: [CommonModule, NgxEchartsModule],
    providers: [
        {
            provide: NGX_ECHARTS_CONFIG,
            useFactory: () => ({ echarts: () => import('echarts') })
        }
    ],
    template: `
        <div class="chart-container" [class]="containerClasses()">
            <!-- Title -->
            @if (title()) {
                <div class="chart-header">
                    <h3 class="chart-title">{{ title() }}</h3>
                </div>
            }

            <!-- EChart (Using Bar Chart as fallback for Geo Map for now) -->
            <div class="chart-wrapper" [style.height.px]="height()">
                <div echarts 
                     [options]="chartOption()" 
                     [theme]="chartTheme()"
                     class="chart-instance"
                     [autoResize]="true">
                </div>
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

        .chart-wrapper {
            position: relative;
            width: 100%;
            overflow: hidden;
            border-radius: var(--radius-lg, 8px);
        }
        
        .chart-instance {
            width: 100%;
            height: 100%;
        }
    `]
})
export class GeoMapComponent {
    private chartService = inject(ChartService);

    // Inputs
    data = input.required<GeoMapDataPoint[]>();
    title = input<string>('');
    size = input<'sm' | 'md' | 'lg'>('md');
    height = input<number>(400);

    // State
    isDark = this.chartService.isDark;
    containerClasses = computed(() => `chart-${this.size()}`);

    chartTheme = computed(() => this.isDark() ? 'dark' : undefined) as any;

    // Currently implementing as a horizontal bar chart "Top Countries" view
    // until we have the world map JSON file registered.
    chartOption = computed<EChartsOption>(() => {
        const points = this.data();
        // Sort by value descending
        const sorted = [...points].sort((a, b) => a.value - b.value); // Ascending for bar chart y-axis

        const labels = sorted.map(p => p.name);
        const values = sorted.map(p => p.value);

        const isDark = this.isDark();
        const textColor = isDark ? '#9ca3af' : '#6b7280';

        return {
            ...this.chartService.baseOptions,
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' }
            },
            grid: {
                top: 20,
                right: 30,
                bottom: 20,
                left: 20,
                containLabel: true
            },
            xAxis: {
                type: 'value',
                axisLabel: { color: textColor },
                splitLine: { show: false }
            } as any,
            yAxis: {
                type: 'category',
                data: labels,
                axisLabel: { color: textColor },
                axisTick: { show: false },
                axisLine: { show: false }
            } as any,
            series: [
                {
                    name: this.title(),
                    type: 'bar',
                    data: values,
                    itemStyle: {
                        color: '#3b82f6',
                        borderRadius: [0, 4, 4, 0]
                    },
                    barWidth: '60%'
                }
            ]
        };
    });
}
