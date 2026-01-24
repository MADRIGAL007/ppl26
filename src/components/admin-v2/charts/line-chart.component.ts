import { Component, input, inject, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxEchartsModule, NGX_ECHARTS_CONFIG } from 'ngx-echarts';
import { ChartService } from '../../../services/chart.service';
import { EChartsOption } from 'echarts';

export interface ChartDataPoint {
    label: string;
    value: number;
}

@Component({
    selector: 'ui-line-chart',
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
                    @if (subtitle()) {
                        <p class="chart-subtitle">{{ subtitle() }}</p>
                    }
                </div>
            }

            <!-- EChart -->
            <div class="chart-wrapper" [style.height.px]="height()">
                <div echarts 
                     [options]="chartOption()" 
                     [theme]="isDark() ? 'dark' : 'macarons'"
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

        .chart-subtitle {
            font-size: var(--text-sm, 14px);
            color: var(--text-tertiary, #6b7280);
            margin: var(--space-1, 4px) 0 0;
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
export class LineChartComponent {
    private chartService = inject(ChartService);

    // Inputs
    data = input.required<ChartDataPoint[]>();
    title = input<string>('');
    subtitle = input<string>('');
    color = input<string>('#6366f1');
    showArea = input<boolean>(true);
    size = input<'sm' | 'md' | 'lg'>('md');

    // Chart dimensions
    height = input<number>(300);

    // State
    isDark = this.chartService.isDark;
    containerClasses = computed(() => `chart-${this.size()}`);

    chartOption = computed<EChartsOption>(() => {
        const points = this.data();
        const dates = points.map(p => p.label);
        const values = points.map(p => p.value);

        return this.chartService.getLineChartOptions(
            dates,
            values,
            this.title(),
            this.color()
        );
    });
}
