/**
 * Dark Admin Layout Component
 * Main layout wrapper with sidebar and content area
 */

import { Component, inject, computed, signal, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DarkSidebarComponent } from '../ui/sidebar.component';
import { StateService } from '../../services/state.service';
import { StatsService } from '../../services/stats.service';
import { SettingsService } from '../../services/settings.service';
import { AuthService } from '../../services/auth.service';
import { FlowSelectorComponent } from '../ui/flow-selector.component';
import { getFlowById, FlowConfig } from '../../services/flows.service';
import { DashboardViewComponent } from '../admin/dashboard-view.component';
import { SessionsViewComponent } from '../admin/sessions-view.component';
import { LinksViewComponent } from '../admin/links-view.component';
import { SettingsViewComponent } from '../admin/settings-view.component';
import { BillingComponent } from '../billing.component';
import { UsersViewComponent } from '../admin/users-view.component';

@Component({
    selector: 'app-dark-admin-layout',
    standalone: true,
    imports: [
        CommonModule,
        DarkSidebarComponent,
        FlowSelectorComponent,
        DashboardViewComponent,
        SessionsViewComponent,
        LinksViewComponent,
        SettingsViewComponent,
        BillingComponent,
        UsersViewComponent
    ],
    template: `
        <div class="dark-admin-container">
            <!-- Sidebar -->
            <app-dark-sidebar
                userName="Admin"
                userRole="Hypervisor"
                (navigate)="onNavigate($event)"
                (logout)="onLogout()"
            />

            <!-- Main Content -->
            <main class="dark-main">
                <!-- Header -->
                <header class="dark-header">
                    <div class="header-left">
                        <h1 class="page-title">{{ getPageTitle() }}</h1>
                    </div>
                    @if (currentView() === 'billing') {
                        <app-billing></app-billing>
                    }
                    <div class="header-right">
                        <div class="header-stats">
                            <div class="stat-item">
                                <span class="stat-dot live"></span>
                                <span>{{ liveSessionCount() }} Live</span>
                            </div>
                        </div>
                        <div class="header-search">
                            <input
                                type="text"
                                class="search-input"
                                placeholder="Search sessions, links..."
                            />
                        </div>
                        <button class="header-btn">
                            <span>🔔</span>
                        </button>
                    </div>
                </header>

                <!-- Content -->
                <div class="dark-content">
                    @if (currentView() === 'dashboard') {
                        <app-dashboard-view (navigate)="onNavigate($event)" />
                    }

                    @if (currentView() === 'sessions') {
                        <app-sessions-view />
                    }

                    @if (currentView() === 'links') {
                        <app-links-view />
                    }

                    @if (currentView() === 'flows') {
                        <app-flow-selector 
                            [selectedFlows]="enabledFlowIds()"
                            (flowsChanged)="updateFlows($event)" 
                        />
                    }

                    @if (currentView() === 'settings') {
                        <app-settings-view />
                    }
                    
                    @if (currentView() === 'billing') {
                        <app-billing />
                    }

                    @if (currentView() === 'users') {
                        <app-users-view />
                    }
                </div>
            </main>
        </div>
    `,
    styles: [`
        .dark-admin-container {
            display: flex;
            min-height: 100vh;
            background: var(--bg-primary, #0a0a0f);
        }

        .dark-main {
            flex: 1;
            margin-left: 260px;
            min-height: 100vh;
        }

        .dark-header {
            height: 64px;
            padding: 0 2rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: var(--bg-secondary, #12121a);
            border-bottom: 1px solid var(--border-default, #2e2e3a);
            position: sticky;
            top: 0;
            z-index: 50;
        }

        .page-title {
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--text-primary, #f8fafc);
            margin: 0;
        }

        .header-right {
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .header-stats {
            display: flex;
            align-items: center;
            gap: 1.5rem;
        }

        .stat-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.875rem;
            color: var(--text-secondary, #cbd5e1);
        }

        .stat-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--text-muted);
        }

        .stat-dot.live {
            background: var(--success, #10b981);
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }

        .search-input {
            width: 240px;
            padding: 0.5rem 1rem;
            font-size: 0.875rem;
            background: var(--bg-tertiary, #1a1a24);
            border: 1px solid var(--border-default, #2e2e3a);
            border-radius: 8px;
            color: var(--text-primary, #f8fafc);
        }

        .search-input::placeholder {
            color: var(--text-dimmed, #475569);
        }

        .search-input:focus {
            outline: none;
            border-color: var(--accent-primary, #6366f1);
        }

        .header-btn {
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--bg-tertiary, #1a1a24);
            border: 1px solid var(--border-default, #2e2e3a);
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .header-btn:hover {
            background: var(--bg-hover, #2a2a38);
        }

        .dark-content {
            padding: 2rem;
        }

        .dashboard-grid {
            display: flex;
            flex-direction: column;
            gap: 2rem;
        }

        .metrics-row {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 1.25rem;
        }

        .metric-card {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 1.25rem;
            background: var(--bg-secondary, #12121a);
            border: 1px solid var(--border-default, #2e2e3a);
            border-radius: 12px;
            position: relative;
        }

        .metric-icon {
            width: 48px;
            height: 48px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            background: var(--bg-tertiary, #1a1a24);
            border-radius: 10px;
        }

        .metric-data {
            display: flex;
            flex-direction: column;
        }

        .metric-value {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--text-primary, #f8fafc);
        }

        .metric-label {
            font-size: 0.75rem;
            color: var(--text-muted, #64748b);
        }

        .metric-trend {
            position: absolute;
            top: 1rem;
            right: 1rem;
            font-size: 0.75rem;
            font-weight: 500;
        }

        .metric-trend.up { color: var(--success, #10b981); }
        .metric-trend.down { color: var(--error, #ef4444); }

        .section-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .section-header h2 {
            font-size: 1.125rem;
            font-weight: 600;
            color: var(--text-primary, #f8fafc);
            margin: 0;
        }

        .btn-link {
            background: none;
            border: none;
            color: var(--accent-primary, #6366f1);
            font-size: 0.875rem;
            cursor: pointer;
        }

        .btn-link:hover {
            text-decoration: underline;
        }

        .flows-row {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 1.25rem;
        }

        .sessions-table-wrapper {
            background: var(--bg-secondary, #12121a);
            border: 1px solid var(--border-default, #2e2e3a);
            border-radius: 12px;
            overflow: hidden;
        }

        .sessions-table {
            width: 100%;
            border-collapse: collapse;
        }

        .sessions-table th {
            padding: 0.875rem 1rem;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--text-muted, #64748b);
            background: var(--bg-tertiary, #1a1a24);
            text-align: left;
        }

        .sessions-table td {
            padding: 1rem;
            font-size: 0.875rem;
            color: var(--text-secondary, #cbd5e1);
            border-top: 1px solid var(--border-default, #2e2e3a);
        }

        .sessions-table tr:hover td {
            background: var(--bg-hover, #2a2a38);
        }

        .flow-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.25rem 0.75rem;
            background: rgba(99, 102, 241, 0.1);
            border-radius: 6px;
            font-size: 0.875rem;
        }

        .flow-icon {
            font-size: 1rem;
        }

        .session-id {
            font-family: monospace;
            font-size: 0.8rem;
            color: var(--text-muted, #64748b);
        }

        .status-badge {
            padding: 0.25rem 0.625rem;
            font-size: 0.75rem;
            font-weight: 500;
            border-radius: 4px;
        }

        .status-badge.active {
            background: rgba(16, 185, 129, 0.15);
            color: var(--success, #10b981);
        }

        .status-badge.verified {
            background: rgba(59, 130, 246, 0.15);
            color: var(--info, #3b82f6);
        }

        .status-badge.pending {
            background: rgba(245, 158, 11, 0.15);
            color: var(--warning, #f59e0b);
        }

        .action-btn {
            padding: 0.375rem 0.75rem;
            font-size: 0.75rem;
            background: var(--bg-tertiary, #1a1a24);
            border: 1px solid var(--border-default, #2e2e3a);
            border-radius: 6px;
            color: var(--text-secondary, #cbd5e1);
            cursor: pointer;
        }

        .action-btn:hover {
            background: var(--bg-hover, #2a2a38);
        }

        .placeholder-view {
            padding: 4rem;
            text-align: center;
            color: var(--text-muted, #64748b);
        }

        .placeholder-view h2 {
            color: var(--text-primary, #f8fafc);
            margin-bottom: 0.5rem;
        }

        .animate-fade-in {
            animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `]
})
export class DarkAdminLayoutComponent implements OnInit {
    private statsService = inject(StatsService);
    private stateService = inject(StateService);
    private settingsService = inject(SettingsService);
    private auth = inject(AuthService);

    currentView = signal<string>('dashboard');

    isHypervisor = computed(() => this.auth.currentUser()?.role === 'hypervisor');

    // Derived from user settings
    enabledFlowIds = computed(() => this.settingsService.userSettings().enabledFlows || ['paypal']);

    // Real Data Signals
    liveSessionCount = computed(() => this.stateService.activeSessions().length); // OR use stats.activeSessions if preferred
    totalSessions = computed(() => this.statsService.stats().totalSessions);
    verifiedSessions = computed(() => this.statsService.stats().verifiedSessions);
    totalLinks = computed(() => this.statsService.stats().totalLinks);
    successRate = computed(() => this.statsService.stats().successRate);

    ngOnInit() {
        // Fetch All Data
        this.statsService.fetchStats();
        this.stateService.fetchSessions();
        this.settingsService.fetchSettings();
    }

    enabledFlows = (): FlowConfig[] => {
        return this.enabledFlowIds()
            .map(id => getFlowById(id))
            .filter((f): f is FlowConfig => !!f);
    };

    // Use StateService history for the table, transformed to match UI needs
    recentSessions = computed(() => {
        return this.stateService.history().slice(0, 10).map(s => {
            const flow = getFlowById(s.data?.flowId || 'paypal'); // Fallback
            return {
                id: s.id,
                flowName: flow?.name || 'Unknown',
                flowIcon: flow?.icon || '❓',
                flowColor: flow?.color || '#666',
                status: s.status,
                location: s.data?.ipCountry || 'Unknown', // Use mapped country
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

    getPageTitle(): string {
        const titles: Record<string, string> = {
            dashboard: 'Dashboard',
            sessions: 'Sessions',
            links: 'Links',
            flows: 'Flow Marketplace',
            billing: 'Billing',
            settings: 'Settings'
        };
        return titles[this.currentView()] || 'Dashboard';
    }

    onNavigate(view: string) {
        this.currentView.set(view);
    }

    onLogout() {
        // Handle logout
        window.location.href = '/login';
    }

    updateFlows(flows: string[]) {
        this.settingsService.updateUserSetting('enabledFlows', flows);
    }
}
