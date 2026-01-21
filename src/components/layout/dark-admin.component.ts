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
            background: var(--cyber-bg-deep);
            color: var(--cyber-text-main);
            font-family: var(--font-cyber);
        }

        .dark-main {
            flex: 1;
            margin-left: 260px;
            min-height: 100vh;
            background-color: var(--cyber-bg-deep);
            background-image: 
                linear-gradient(rgba(0, 243, 255, 0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0, 243, 255, 0.03) 1px, transparent 1px);
            background-size: 30px 30px;
        }

        .dark-header {
            height: 64px;
            padding: 0 2rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: rgba(3, 3, 3, 0.8);
            backdrop-filter: blur(8px);
            border-bottom: 1px solid rgba(0, 243, 255, 0.2);
            position: sticky;
            top: 0;
            z-index: 50;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
        }

        .page-title {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--cyber-text-main);
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 2px;
            text-shadow: 0 0 10px rgba(0, 243, 255, 0.4);
            font-family: var(--font-mono);
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
            color: var(--cyber-text-muted);
            font-family: var(--font-mono);
        }

        .stat-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--cyber-accent-cyan);
            box-shadow: 0 0 8px var(--cyber-accent-cyan);
        }

        .stat-dot.live {
            background: #10b981;
            box-shadow: 0 0 8px #10b981;
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; box-shadow: 0 0 8px #10b981; }
            50% { opacity: 0.5; box-shadow: 0 0 2px #10b981; }
        }

        .search-input {
            width: 240px;
            padding: 0.5rem 1rem;
            font-size: 0.875rem;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(0, 243, 255, 0.2);
            border-radius: 4px;
            color: var(--cyber-text-main);
            font-family: var(--font-mono);
        }

        .search-input::placeholder {
            color: var(--cyber-text-dimmed);
        }

        .search-input:focus {
            outline: none;
            border-color: var(--cyber-accent-cyan);
            box-shadow: 0 0 8px rgba(0, 243, 255, 0.3);
        }

        .header-btn {
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(0, 243, 255, 0.2);
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s ease;
            color: var(--cyber-accent-cyan);
        }

        .header-btn:hover {
            background: var(--cyber-bg-hover);
            box-shadow: 0 0 8px rgba(0, 243, 255, 0.4);
        }

        .dark-content {
            padding: 2rem;
        }

        /* Metric Cards Override for Cyberpunk */
        .metric-card {
            background: rgba(10, 10, 10, 0.6) !important;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(0, 243, 255, 0.2) !important;
            border-radius: 8px !important;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .metric-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 0 15px rgba(0, 243, 255, 0.2) !important;
            border-color: var(--cyber-accent-cyan) !important;
        }

        .metric-value {
            color: var(--cyber-text-main) !important;
            text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
            font-family: var(--font-mono);
        }

        .metric-label {
            color: var(--cyber-text-muted) !important;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            font-size: 0.7rem !important;
        }

        .metric-icon {
            background: rgba(0, 243, 255, 0.1) !important;
            color: var(--cyber-accent-cyan) !important;
            border-radius: 4px !important;
            border: 1px solid rgba(0, 243, 255, 0.2);
        }

        /* Table Overrides */
        ::ng-deep .sessions-table-wrapper {
            background: rgba(10, 10, 10, 0.8) !important;
            border: 1px solid rgba(0, 243, 255, 0.2) !important;
            backdrop-filter: blur(5px);
            border-radius: 8px !important;
        }

        ::ng-deep .sessions-table th {
            background: rgba(0, 243, 255, 0.05) !important;
            color: var(--cyber-accent-cyan) !important;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            font-family: var(--font-mono);
            border-bottom: 1px solid rgba(0, 243, 255, 0.1) !important;
        }

        ::ng-deep .sessions-table td {
            border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
            color: var(--cyber-text-muted) !important;
            font-family: var(--font-mono);
        }

        ::ng-deep .sessions-table tr:hover td {
            background: rgba(0, 243, 255, 0.05) !important;
            color: var(--cyber-text-main) !important;
        }

        .placeholder-view {
            padding: 4rem;
            text-align: center;
            color: var(--cyber-text-muted);
            border: 1px dashed rgba(0, 243, 255, 0.3);
            border-radius: 8px;
            background: rgba(0, 0, 0, 0.3);
        }

        .placeholder-view h2 {
            color: var(--cyber-accent-cyan);
            text-shadow: 0 0 10px rgba(0, 243, 255, 0.5);
        }

        .animate-fade-in {
            animation: fadeIn 0.4s ease;
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
