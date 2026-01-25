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
          
          <!-- Loading State (Skeleton) -->
          <div *ngIf="loading" class="animate-pulse space-y-3 p-5">
              <div *ngFor="let i of [1,2,3,4,5]" class="h-12 bg-slate-800/50 rounded flex items-center px-4">
                  <div class="h-4 bg-slate-700 rounded w-1/4"></div>
                  <div class="h-4 bg-slate-700 rounded w-1/3 mx-4"></div>
                  <div class="h-4 bg-slate-700 rounded w-1/6"></div>
              </div>
          </div>

          <!-- Empty State (Compliant) -->
          <div *ngIf="!loading && data.length === 0" class="flex flex-col items-center justify-center p-12 text-center">
             <div class="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <svg class="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
                </svg>
             </div>
             <h4 class="text-white font-medium mb-1">No data available</h4>
             <p class="text-slate-500 text-sm max-w-xs">There are no records to display at this time.</p>
          </div>

          <!-- Table Body -->
          <div *ngIf="!loading && data.length > 0" class="divide-y divide-slate-800/50">
             <div *ngFor="let item of paginatedData" 
                  class="grid gap-4 px-5 py-3 text-sm hover:bg-slate-800/30 transition-colors items-center group cursor-pointer"
                  [style.grid-template-columns]="gridTemplate"
                  (click)="onRowClick.emit(item)">
                
                <ng-container *ngFor="let col of columns">
                   <div [class]="col.class || ''">
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

                      <!-- Actions Column -->
                      <ng-container *ngIf="col.type === 'actions'">
                           <div class="flex items-center justify-end gap-2" (click)="$event.stopPropagation()">
                               <ng-container *ngTemplateOutlet="actionTemplate; context: { $implicit: item }"></ng-container>
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

       <!-- Pagination Footer -->
       <div *ngIf="!loading && data.length > 0" class="p-3 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
          <span>Showing {{ (currentPage - 1) * pageSize + 1 }} - {{ (currentPage * pageSize) > data.length ? data.length : (currentPage * pageSize) }} of {{ data.length }}</span>
          <div class="flex gap-2">
             <button (click)="prevPage()" [disabled]="currentPage === 1" class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed">Previous</button>
             <span class="py-1">Page {{ currentPage }} of {{ totalPages }}</span>
             <button (click)="nextPage()" [disabled]="currentPage === totalPages" class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
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
   @Input() pageSize: number = 10;
   @Input() actionTemplate: any = null;
   @Input() columns: {
      header: string;
      field: string;
      width?: string;
      class?: string;
      textClass?: string;
      type?: 'status' | 'country' | 'time' | 'actions' | 'default';
   }[] = [];

   @Output() onRefresh = new EventEmitter<void>();
   @Output() onRowClick = new EventEmitter<any>();

   currentPage = 1;

   get totalPages(): number {
      return Math.ceil(this.data.length / this.pageSize);
   }

   get paginatedData(): any[] {
      const start = (this.currentPage - 1) * this.pageSize;
      return this.data.slice(start, start + this.pageSize);
   }

   nextPage() {
      if (this.currentPage < this.totalPages) this.currentPage++;
   }

   prevPage() {
      if (this.currentPage > 1) this.currentPage--;
   }

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
