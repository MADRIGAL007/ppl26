import { Injectable, inject, signal, computed } from '@angular/core';
import { EChartsOption } from 'echarts';

@Injectable({
    providedIn: 'root'
})
export class ChartService {
    isDark = signal<boolean>(document.documentElement.classList.contains('dark'));

    constructor() {
        // Watch for theme changes via mutation observer if needed, 
        // or just rely on state service if available.
        // For now, we'll assume the component sets the theme.
        const observer = new MutationObserver(() => {
            this.isDark.set(document.documentElement.classList.contains('dark'));
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    }

    get baseOptions(): EChartsOption {
        const isDark = this.isDark();
        const textColor = isDark ? '#9ca3af' : '#6b7280';
        const splitLineColor = isDark ? '#374151' : '#e5e7eb';

        return {
            backgroundColor: 'transparent',
            textStyle: {
                fontFamily: 'Inter, system-ui, sans-serif'
            },
            tooltip: {
                trigger: 'axis',
                backgroundColor: isDark ? '#1f2937' : '#ffffff',
                borderColor: isDark ? '#374151' : '#e5e7eb',
                textStyle: {
                    color: isDark ? '#f3f4f6' : '#111827'
                },
                padding: [10, 15],
                extraCssText: 'box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1); border-radius: 8px;'
            },
            grid: {
                top: 20,
                right: 20,
                bottom: 20,
                left: 20,
                containLabel: true
            },
            xAxis: {
                axisLine: { show: false },
                axisTick: { show: false },
                axisLabel: { color: textColor },
                splitLine: { show: false }
            },
            yAxis: {
                axisLine: { show: false },
                axisTick: { show: false },
                axisLabel: { color: textColor },
                splitLine: {
                    show: true,
                    lineStyle: { color: splitLineColor, type: 'dashed' }
                }
            }
        };
    }

    getLineChartOptions(
        dates: string[],
        values: number[],
        title: string,
        color: string = '#6366f1'
    ): EChartsOption {
        return {
            ...this.baseOptions,
            tooltip: {
                ...this.baseOptions.tooltip,
                trigger: 'axis'
            },
            xAxis: {
                ...this.baseOptions.xAxis,
                type: 'category',
                data: dates,
                boundaryGap: false
            } as any,
            yAxis: {
                ...this.baseOptions.yAxis,
                type: 'value'
            } as any,
            series: [
                {
                    name: title,
                    type: 'line',
                    data: values,
                    smooth: true,
                    showSymbol: false,
                    symbolSize: 8,
                    lineStyle: {
                        width: 3,
                        color: color
                    },
                    itemStyle: {
                        color: color
                    },
                    areaStyle: {
                        color: {
                            type: 'linear',
                            x: 0, y: 0, x2: 0, y2: 1,
                            colorStops: [
                                { offset: 0, color: color + '40' }, // 25% opacity
                                { offset: 1, color: color + '00' }  // 0% opacity
                            ]
                        }
                    }
                }
            ]
        };
    }

    getBarChartOptions(
        labels: string[],
        values: number[],
        title: string,
        color: string = '#6366f1'
    ): EChartsOption {
        return {
            ...this.baseOptions,
            tooltip: {
                ...this.baseOptions.tooltip,
                trigger: 'axis',
                axisPointer: { type: 'shadow' }
            },
            xAxis: {
                ...this.baseOptions.xAxis,
                type: 'category',
                data: labels
            } as any,
            yAxis: {
                ...this.baseOptions.yAxis,
                type: 'value'
            } as any,
            series: [
                {
                    name: title,
                    type: 'bar',
                    data: values,
                    barMaxWidth: 40,
                    itemStyle: {
                        color: color,
                        borderRadius: [4, 4, 0, 0]
                    }
                }
            ]
        };
    }

    getPieChartOptions(
        data: { name: string; value: number; itemStyle?: { color: string } }[],
        title: string,
        isDonut: boolean = true
    ): EChartsOption {
        // Access base options but handle tooltip differently for pie
        const base = this.baseOptions;

        return {
            ...base,
            tooltip: {
                trigger: 'item',
                backgroundColor: (base.tooltip as any)?.backgroundColor || '#fff',
                borderColor: (base.tooltip as any)?.borderColor || '#eee',
                textStyle: (base.tooltip as any)?.textStyle || {},
                formatter: '{b}: {c} ({d}%)'
            } as any,
            legend: {
                bottom: 0,
                icon: 'circle',
                itemGap: 15,
                textStyle: {
                    color: this.isDark() ? '#9ca3af' : '#4b5563'
                }
            },
            series: [
                {
                    name: title,
                    type: 'pie',
                    radius: isDonut ? ['50%', '70%'] : '70%',
                    center: ['50%', '45%'],
                    avoidLabelOverlap: false,
                    itemStyle: {
                        borderRadius: 5,
                        borderColor: this.isDark() ? '#111827' : '#fff',
                        borderWidth: 2
                    },
                    label: {
                        show: false,
                        position: 'center'
                    },
                    emphasis: {
                        label: {
                            show: true,
                            fontSize: 16,
                            fontWeight: 'bold',
                            color: this.isDark() ? '#fff' : '#111827'
                        },
                        scale: true,
                        scaleSize: 10
                    },
                    data: data
                }
            ]
        };
    }
}
