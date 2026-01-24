import { Component, input, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxEchartsModule, NGX_ECHARTS_CONFIG } from 'ngx-echarts';
import { ChartService } from '../../../services/chart.service';
import { EChartsOption } from 'echarts';

export interface PieChartDataPoint {
    label: string;
    value: number;
    color: string;
}

@Component({
    selector: 'ui-pie-chart',
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

            <!-- EChart -->
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
export class PieChartComponent {
    private chartService = inject(ChartService);

    // Inputs
    data = input.required<PieChartDataPoint[]>();
    title = input<string>('');
    donut = input<boolean>(true);
    size = input<'sm' | 'md' | 'lg'>('md');

    // Chart dimensions
    height = input<number>(300);

    // State
    isDark = this.chartService.isDark;
    containerClasses = computed(() => `chart-${this.size()}`);

    chartTheme = computed(() => this.isDark() ? 'dark' : undefined) as any;

    chartOption = computed<EChartsOption>(() => {
        const points = this.data();
        const data = points.map(p => ({
            name: p.label,
            value: p.value,
            itemStyle: { color: p.color }
        }));

        return this.chartService.getPieChartOptions(
            data,
            this.title(),
            this.donut()
        );
    });
}
