import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-data-table-v2',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="adm-card flex flex-col h-full">
       <!-- Header -->
       <div class="p-5 border-b border-slate-800 flex justify-between items-center" *ngIf="title">
          <h3 class="adm-h3 text-white">{{ title }}</h3>
          <div class="flex gap-2">
             <button *ngIf="refreshable" (click)="onRefresh.emit()" class="text-slate-400 hover:text-white transition-colors p-1 rounded hover:bg-slate-800/50">
                 <span class="material-icons">refresh</span>
             </button>
             <ng-content select="[actions]"></ng-content>
          </div>
       </div>

       <div class="overflow-x-auto">
          <!-- Table Header -->
          <div class="grid gap-4 px-5 py-3 bg-slate-900/50 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-800"
               [style.grid-template-columns]="gridTemplate">
             <div *ngFor="let col of columns" [class]="col.class || ''">
                {{ col.header }}
             </div>
          </div>
          
          <!-- Loading State -->
          <div *ngIf="loading" class="p-8 text-center text-slate-500">
             <span class="material-icons animate-spin mr-2">sync</span> Loading data...
          </div>

          <!-- Empty State -->
          <div *ngIf="!loading && data.length === 0" class="p-8 text-center text-slate-500">
             No data available.
          </div>

          <!-- Table Body -->
          <div *ngIf="!loading && data.length > 0" class="divide-y divide-slate-800/50">
             <div *ngFor="let item of data" 
                  class="grid gap-4 px-5 py-3 text-sm hover:bg-slate-800/30 transition-colors items-center group cursor-pointer"
                  [style.grid-template-columns]="gridTemplate"
                  (click)="onRowClick.emit(item)">
                
                <ng-container *ngFor="let col of columns">
                   <div [class]="col.class || ''">
                      <!-- Custom Template Support via ngIf/ngSwitch could be added here, 
                           for now simple text or simplified cell rendering -->
                      
                      <!-- Status Badge -->
                      <ng-container *ngIf="col.type === 'status'">
                          <span class="px-2 py-1 rounded text-[10px] font-bold border"
                                [ngClass]="getStatusClass(item[col.field])">
                             {{ item[col.field] | uppercase }}
                          </span>
                      </ng-container>

                       <!-- Country With Flag -->
                      <ng-container *ngIf="col.type === 'country'">
                         <div class="flex items-center gap-2">
                            <span class="text-lg">{{ item[col.field]?.flag }}</span>
                            <span class="text-slate-300">{{ item[col.field]?.code }}</span>
                         </div>
                      </ng-container>

                      <!-- Default Text -->
                      <ng-container *ngIf="!col.type">
                         <span [ngClass]="col.textClass || 'text-slate-300'">
                            {{ item[col.field] }}
                         </span>
                      </ng-container>

                      <!-- Date/Time -->
                      <ng-container *ngIf="col.type === 'time'">
                         <span class="font-mono text-xs text-slate-400">{{ item[col.field] }}</span>
                      </ng-container>
                      
                   </div>
                </ng-container>

             </div>
          </div>
       </div>
    </div>
  `
})
export class DataTableV2Component {
    @Input() title: string = '';
    @Input() refreshable: boolean = true;
    @Input() loading: boolean = false;
    @Input() data: any[] = [];
    @Input() columns: {
        header: string;
        field: string;
        width?: string; // Grid col span e.g. 'col-span-2'
        class?: string; // Container class
        textClass?: string;
        type?: 'status' | 'country' | 'time' | 'default';
    }[] = [];

    @Output() onRefresh = new EventEmitter<void>();
    @Output() onRowClick = new EventEmitter<any>();

    get gridTemplate(): string {
        // Default to equal width if not specified, or use flex-like grid logic
        // Actually for Tailwind grid, we rely on the parent applying 'grid-cols-12' and children using 'col-span-X'
        return 'repeat(12, minmax(0, 1fr))';
    }

    getStatusClass(status: string): string {
        const s = status?.toLowerCase();
        if (s === 'success' || s === 'completed' || s === 'active') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
        if (s === 'pending' || s === 'visit') return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
        if (s === 'failed' || s === 'error' || s === 'blocked') return 'bg-red-500/10 text-red-400 border-red-500/20';
        if (s === 'warning' || s === 'otp_submit') return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
        if (s === 'login_attempt') return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
}
