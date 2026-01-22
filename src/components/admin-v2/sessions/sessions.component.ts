import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataTableV2Component } from '../ui/data-table.component';
import { SessionDetailV2Component } from './session-detail-v2.component';
import { StateService } from '../../../services/state.service';
import { getFlowById } from '../../../services/flows.service';
import { StatsService } from '../../../services/stats.service';

@Component({
   selector: 'app-admin-sessions-v2',
   standalone: true,
   imports: [CommonModule, DataTableV2Component, SessionDetailV2Component],
   template: `
    <div class="space-y-6">
       <!-- Header & Filters -->
       <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
             <h2 class="adm-h2 text-white">Session Management</h2>
             <p class="text-slate-400 text-sm mt-1">Monitor and manage active and past user sessions.</p>
          </div>
          
          <div class="flex gap-2">
             <button class="adm-btn adm-btn-ghost bg-slate-800/50 border border-slate-700">
                <span class="material-icons mr-2 text-[18px]">filter_list</span>
                Filter
             </button>
             <button class="adm-btn adm-btn-primary shadow-lg shadow-blue-500/20">
                <span class="material-icons mr-2 text-[18px]">file_download</span>
                Export CSV
             </button>
          </div>
       </div>

       <!-- Stats Cards (Mini) -->
       <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="adm-card p-4 flex items-center justify-between bg-gradient-to-br from-slate-900 to-slate-900/50">
             <div>
                <p class="text-xs text-slate-500 uppercase font-bold">Total Sessions</p>
                <p class="text-2xl font-bold text-white mt-1">{{ totalSessions() }}</p>
             </div>
             <span class="material-icons text-slate-700 text-4xl">storage</span>
          </div>
          <div class="adm-card p-4 flex items-center justify-between bg-gradient-to-br from-slate-900 to-slate-900/50">
             <div>
                <p class="text-xs text-slate-500 uppercase font-bold">Verified</p>
                <p class="text-2xl font-bold text-blue-400 mt-1">{{ verifiedSessions() }}</p>
             </div>
             <span class="material-icons text-blue-900/50 text-4xl">verified</span>
          </div>
          <div class="adm-card p-4 flex items-center justify-between bg-gradient-to-br from-slate-900 to-slate-900/50">
             <div>
                <p class="text-xs text-slate-500 uppercase font-bold">Active Today</p>
                <p class="text-2xl font-bold text-emerald-500 mt-1">{{ activeToday() }}</p>
             </div>
             <span class="material-icons text-emerald-900/50 text-4xl">today</span>
          </div>
       </div>

       <!-- Sessions Table -->
       <app-data-table-v2
          [title]="'All Sessions'"
          [columns]="columns"
          [data]="sessionsData()"
          (onRowClick)="handleRowClick($event)">
       </app-data-table-v2>

       <!-- Detail Drawer -->
       @if (selectedSession()) {
           <app-session-detail-v2
               [session]="selectedSession()"
               (close)="closeDetail()">
           </app-session-detail-v2>
       }
    </div>
  `
})
export class SessionsComponent {
   private stateService = inject(StateService);
   private statsService = inject(StatsService);

   selectedSessionId = signal<string | null>(null);

   columns = [
      { header: 'Session ID', field: 'id', width: 'col-span-2', textClass: 'font-mono text-slate-400 text-xs' },
      { header: 'Flow', field: 'flow', width: 'col-span-2', textClass: 'font-medium text-white' },
      { header: 'IP Address', field: 'ip', width: 'col-span-2', textClass: 'font-mono text-slate-300 text-xs' },
      { header: 'Device', field: 'device', width: 'col-span-2' },
      { header: 'Started', field: 'started', width: 'col-span-2', type: 'time' },
      { header: 'Status', field: 'status', width: 'col-span-2', type: 'status', class: 'text-right' }
   ];

   // Stats
   totalSessions = computed(() => this.statsService.stats().totalSessions);
   verifiedSessions = computed(() => this.statsService.stats().verifiedSessions);

   activeToday = computed(() => {
      const today = new Date().toDateString();
      return this.stateService.history().filter(s => new Date(s.timestamp).toDateString() === today).length;
   });

   sessionsData = computed(() => {
      return this.stateService.history().map(s => {
         const flow = getFlowById(s.data?.flowId || 'paypal');
         const ua = (s.data?.fingerprint?.userAgent || '').toLowerCase();
         let device = 'Desktop';
         if (ua.includes('mobile')) device = 'Mobile';
         if (ua.includes('tablet') || ua.includes('ipad')) device = 'Tablet';

         return {
            id: s.id.substring(0, 12) + '...', // Truncate ID
            rawId: s.id, // Keep raw ID for click handling
            flow: flow?.name || 'Unknown',
            ip: s.data?.ip || 'Unknown',
            device: device,
            started: new Date(s.timestamp).toLocaleString(),
            status: s.status || 'Active'
         };
      });
   });

   // Computed selected session data for the drawer
   selectedSession = computed(() => {
      const id = this.selectedSessionId();
      if (!id) return null;

      const rawSession = this.stateService.history().find(s => s.id === id);
      if (!rawSession) return null;

      const flow = getFlowById(rawSession.data?.flowId || 'paypal');

      return {
         id: rawSession.id,
         status: rawSession.status || 'Active',
         flowName: flow?.name,
         flowIcon: flow?.icon,
         ip: rawSession.data?.ip || 'Unknown',
         location: rawSession.data?.ipCountry || 'Unknown',
         userAgent: rawSession.data?.fingerprint?.userAgent || 'Unknown',
         data: rawSession.data
      };
   });

   handleRowClick(row: any) {
      if (row && row.rawId) {
         this.selectedSessionId.set(row.rawId);
      }
   }

   closeDetail() {
      this.selectedSessionId.set(null);
   }
}
