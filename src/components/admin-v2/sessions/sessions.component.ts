import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataTableV2Component } from '../ui/data-table.component';
import { SessionDetailV2Component } from './session-detail-v2.component';
import { StateService } from '../../../services/state.service';
import { getFlowById } from '../../../services/flows.service';
import { StatsService } from '../../../services/stats.service';
import { SocketService } from '../../../services/socket.service';
import { NotificationService } from '../../../services/notification.service';

@Component({
   selector: 'app-admin-sessions-v2',
   standalone: true,
   imports: [CommonModule, FormsModule, DataTableV2Component, SessionDetailV2Component],
   template: `
    <div class="space-y-6">
       <!-- Header & Filters -->
       <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
             <h2 class="adm-h2 text-white">Session Management</h2>
             <p class="text-slate-400 text-sm mt-1">Monitor and manage active and past user sessions.</p>
          </div>
          
          <div class="flex flex-wrap gap-2 items-center">
             <!-- Search -->
             <div class="relative">
                <span class="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">search</span>
                <input 
                    type="text" 
                    [ngModel]="searchQuery()" 
                    (ngModelChange)="searchQuery.set($event)"
                    placeholder="Search IP, ID, User..." 
                    class="bg-slate-800/50 border border-slate-700 text-white text-xs rounded-full pl-9 pr-4 py-2 w-64 focus:outline-none focus:border-blue-500/50 transition-colors"
                >
             </div>

             <!-- Status Filter -->
             <div class="flex gap-1 bg-slate-800/50 p-1 rounded-lg border border-slate-700">
                <button 
                    (click)="statusFilter.set('all')"
                    class="px-3 py-1 rounded text-xs font-medium transition-all"
                    [class.bg-slate-700]="statusFilter() === 'all'"
                    [class.text-white]="statusFilter() === 'all'"
                    [class.text-slate-400]="statusFilter() !== 'all'">
                    All
                </button>
                <button 
                    (click)="statusFilter.set('active')"
                    class="px-3 py-1 rounded text-xs font-medium transition-all"
                    [ngClass]="{
                        'bg-blue-500/20': statusFilter() === 'active',
                        'text-blue-400': statusFilter() === 'active',
                        'text-slate-400': statusFilter() !== 'active'
                    }">
                    Active
                </button>
                <button 
                    (click)="statusFilter.set('verified')"
                    class="px-3 py-1 rounded text-xs font-medium transition-all"
                    [ngClass]="{
                        'bg-green-500/20': statusFilter() === 'verified',
                        'text-green-400': statusFilter() === 'verified',
                        'text-slate-400': statusFilter() !== 'verified'
                    }">
                    Verified
                </button>
             </div>

             <button class="adm-btn adm-btn-primary shadow-lg shadow-blue-500/20">
                <span class="material-icons mr-2 text-[18px]">file_download</span>
                Export
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
   private socketService = inject(SocketService);
   private notificationService = inject(NotificationService);

   selectedSessionId = signal<string | null>(null);
   searchQuery = signal<string>('');
   statusFilter = signal<'all' | 'active' | 'verified'>('all');

   constructor() {
      this.socketService.on<any>('session-new').subscribe(session => {
         this.notificationService.playSound('info');
         this.notificationService.send('New Session Started', {
            body: `IP: ${session.ip} - Flow: ${session.flow}`,
            tag: 'session-new'
         });
      });
   }

   columns: { header: string; field: string; width?: string; textClass?: string; type?: 'time' | 'status' | 'country' | 'default'; class?: string }[] = [
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
      let sessions = this.stateService.history();
      const query = this.searchQuery().toLowerCase();
      const status = this.statusFilter();

      // 1. Filter by Status
      if (status !== 'all') {
         sessions = sessions.filter(s => {
            if (status === 'active') return (!s.status || s.status.toLowerCase() !== 'verified');
            if (status === 'verified') return s.status?.toLowerCase() === 'verified';
            return true;
         });
      }

      // 2. Filter by Search
      if (query) {
         sessions = sessions.filter(s =>
            s.id.toLowerCase().includes(query) ||
            (s.data?.ip || '').includes(query) ||
            (s.data?.email || '').toLowerCase().includes(query) ||
            (s.data?.username || '').toLowerCase().includes(query)
         );
      }

      return sessions.map(s => {
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
