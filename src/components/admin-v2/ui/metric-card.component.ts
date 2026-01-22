import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-metric-card-v2',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="adm-card p-5 relative overflow-hidden group h-full">
      <!-- Background Icon -->
      <div class="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <span class="material-icons text-6xl" [ngClass]="colorClass">
            {{ icon }}
        </span>
      </div>
      
      <!-- Content -->
      <div class="relative z-10">
        <p class="text-slate-400 text-sm font-medium uppercase tracking-wider">{{ title }}</p>
        <div class="mt-2 flex items-baseline gap-2">
          <span class="text-3xl font-bold text-white">{{ value }}</span>
          
          <span *ngIf="trend" class="text-xs font-medium flex items-center" 
                [ngClass]="trend === 'up' ? 'text-emerald-500' : 'text-red-500'">
            <span class="material-icons text-[14px]">
                {{ trend === 'up' ? 'arrow_upward' : 'arrow_downward' }}
            </span> 
            {{ trendValue }}
          </span>
        </div>
      </div>
      
      <!-- Progress Bar (Optional) -->
      <div *ngIf="progress !== undefined" class="mt-4 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
        <div class="h-full rounded-full transition-all duration-500"
             [style.width.%]="progress"
             [ngClass]="bgColorClass"
             [style.boxShadow]="'0 0 10px ' + shadowColor">
        </div>
      </div>
    </div>
  `,
    styles: []
})
export class MetricCardV2Component {
    @Input() title: string = '';
    @Input() value: string = '';
    @Input() icon: string = 'analytics';
    @Input() color: 'blue' | 'purple' | 'emerald' | 'amber' | 'red' | 'pink' = 'blue';
    @Input() trend?: 'up' | 'down';
    @Input() trendValue?: string;
    @Input() progress?: number;

    get colorClass(): string {
        const colors = {
            blue: 'text-blue-500',
            purple: 'text-purple-500',
            emerald: 'text-emerald-500',
            amber: 'text-amber-500',
            red: 'text-red-500',
            pink: 'text-pink-500'
        };
        return colors[this.color] || colors['blue'];
    }

    get bgColorClass(): string {
        const bgColors = {
            blue: 'bg-blue-500',
            purple: 'bg-purple-500',
            emerald: 'bg-emerald-500',
            amber: 'bg-amber-500',
            red: 'bg-red-500',
            pink: 'bg-pink-500'
        };
        return bgColors[this.color] || bgColors['blue'];
    }

    get shadowColor(): string {
        const hexColors = {
            blue: 'rgba(59,130,246,0.5)',
            purple: 'rgba(168,85,247,0.5)',
            emerald: 'rgba(16,185,129,0.5)',
            amber: 'rgba(245,158,11,0.5)',
            red: 'rgba(239,68,68,0.5)',
            pink: 'rgba(236,72,153,0.5)'
        };
        return hexColors[this.color] || hexColors['blue'];
    }
}
