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
    <div class="dashboard-grid animate-fade-in">
        <!-- Top Metrics -->
        <div class="metrics-row">
            <div class="metric-card">
                <div class="metric-icon">👥</div>
                <div class="metric-data">
                    <span class="metric-value">{{ totalSessions() }}</span>
                    <span class="metric-label">Total Sessions</span>
                </div>
                <span class="metric-trend up">+12%</span>
            </div>
            <div class="metric-card">
                <div class="metric-icon">✅</div>
                <div class="metric-data">
                    <span class="metric-value">{{ verifiedSessions() }}</span>
                    <span class="metric-label">Verified</span>
                </div>
                <span class="metric-trend up">+8%</span>
            </div>
            <div class="metric-card">
                <div class="metric-icon">🔗</div>
                <div class="metric-data">
                    <span class="metric-value">{{ totalLinks() }}</span>
                    <span class="metric-label">Active Links</span>
                </div>
            </div>
            <div class="metric-card">
                <div class="metric-icon">📈</div>
                <div class="metric-data">
                    <span class="metric-value">{{ successRate() }}%</span>
                    <span class="metric-label">Success Rate</span>
                </div>
                <span class="metric-trend down">-2%</span>
            </div>
        </div>

        <!-- Flow Stats -->
        <div class="section-header">
            <h2 class="text-xl font-bold text-white">Active Flows</h2>
            <button class="text-sm text-indigo-400 hover:text-indigo-300" (click)="navigate.emit('flows')">
                View All →
            </button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            @for (flow of enabledFlows(); track flow.id) {
                <app-brand-card 
                    [flow]="flow"
                    [sessions]="getFlowSessions(flow.id)"
                    [successRate]="getFlowSuccessRate(flow.id)"
                    [links]="getFlowLinks(flow.id)"
                    [isActive]="true"
                />
            }
        </div>

        <!-- Recent Activity -->
        <div class="section-header mt-8">
            <h2 class="text-xl font-bold text-white">Recent Sessions</h2>
            <button class="text-sm text-indigo-400 hover:text-indigo-300" (click)="navigate.emit('sessions')">
                View All →
            </button>
        </div>
        <div class="bg-[#12121a] border border-[#2e2e3a] rounded-xl overflow-hidden">
            <table class="w-full text-left">
                <thead>
                    <tr class="text-xs text-slate-500 uppercase bg-[#1a1a24] border-b border-[#2e2e3a]">
                        <th class="px-6 py-4">Flow</th>
                        <th class="px-6 py-4">Session ID</th>
                        <th class="px-6 py-4">Status</th>
                        <th class="px-6 py-4">Location</th>
                        <th class="px-6 py-4">Started</th>
                        <th class="px-6 py-4">Actions</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-[#2e2e3a]">
                    @for (session of recentSessions(); track session.id) {
                        <tr class="hover:bg-[#1a1a24] transition-colors">
                            <td class="px-6 py-4">
                                <div class="flex items-center gap-2" [style.color]="session.flowColor">
                                    <span>{{ session.flowIcon }}</span>
                                    <span class="font-medium text-white">{{ session.flowName }}</span>
                                </div>
                            </td>
                            <td class="px-6 py-4 font-mono text-xs text-slate-400">{{ session.id.substring(0,8) }}...</td>
                            <td class="px-6 py-4">
                                <span class="px-2 py-1 rounded text-xs border"
                                    [class.bg-green-500-10]="session.status === 'Verified'"
                                    [class.text-green-400]="session.status === 'Verified'"
                                    [class.border-green-500-20]="session.status === 'Verified'"
                                    [class.bg-yellow-500-10]="session.status === 'Pending'"
                                    [class.text-yellow-400]="session.status === 'Pending'"
                                    [class.border-yellow-500-20]="session.status === 'Pending'">
                                    {{ session.status }}
                                </span>
                            </td>
                            <td class="px-6 py-4 text-sm text-slate-300">{{ session.location }}</td>
                            <td class="px-6 py-4 text-sm text-slate-500">{{ session.startedAgo }}</td>
                            <td class="px-6 py-4">
                                <button class="text-indigo-400 hover:text-indigo-300 text-sm">View</button>
                            </td>
                        </tr>
                    }
                </tbody>
            </table>
        </div>
    </div>
  `,
    styles: [`
    .metrics-row {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1.5rem;
        margin-bottom: 2rem;
    }
    .metric-card {
        background: #12121a;
        border: 1px solid #2e2e3a;
        border-radius: 0.75rem;
        padding: 1.5rem;
        display: flex;
        align-items: center;
        gap: 1rem;
        position: relative;
    }
    .metric-icon {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        background: rgba(99, 102, 241, 0.1);
        color: #818cf8;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.5rem;
    }
    .metric-data {
        display: flex;
        flex-direction: column;
    }
    .metric-value {
        font-size: 1.5rem;
        font-weight: 700;
        color: white;
    }
    .metric-label {
        font-size: 0.875rem;
        color: #94a3b8;
    }
    .metric-trend {
         font-size: 0.75rem;
         font-weight: 600;
         padding: 2px 6px;
         border-radius: 4px;
         position: absolute;
         top: 1rem;
         right: 1rem;
    }
    .metric-trend.up { background: rgba(16, 185, 129, 0.1); color: #34d399; }
    .metric-trend.down { background: rgba(239, 68, 68, 0.1); color: #f87171; }
    
    .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
    }
  `]
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

    // Flows Logic
    enabledFlowIds = computed(() => this.settings.userSettings().enabledFlows || ['paypal']);

    enabledFlows = computed(() => {
        return this.enabledFlowIds()
            .map(id => getFlowById(id))
            .filter((f): f is FlowConfig => !!f);
    });

    ngOnInit() {
        // Data is fetched by parent layout or service init, but safe to call again
    }

    // Helpers
    getFlowSessions(flowId: string): number {
        return this.stateService.history()
            .filter(s => s.data?.flowId === flowId || (flowId === 'paypal' && !s.data?.flowId))
            .length;
    }

    getFlowSuccessRate(flowId: string): number {
        const sessions = this.stateService.history()
            .filter(s => s.data?.flowId === flowId || (flowId === 'paypal' && !s.data?.flowId));
        if (sessions.length === 0) return 0;
        const verified = sessions.filter(s => s.status === 'Verified' || s.isFlowComplete).length;
        return Math.round((verified / sessions.length) * 100);
    }

    getFlowLinks(flowId: string): number {
        return 0; // TODO: Implement LinkService count
    }

    // Recent Sessions
    recentSessions = computed(() => {
        return this.stateService.history().slice(0, 10).map(s => {
            const flow = getFlowById(s.data?.flowId || 'paypal');
            return {
                id: s.id,
                flowName: flow?.name || 'Unknown',
                flowIcon: flow?.icon || '❓',
                flowColor: flow?.color || '#666',
                status: s.status,
                location: s.data?.ipCountry || 'Unknown',
                startedAgo: this.timeAgo(new Date(s.timestamp))
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
