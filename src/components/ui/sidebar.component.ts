/**
 * Dark Sidebar Component
 * Modern dark-themed navigation sidebar
 */

import { Component, signal, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface NavItem {
    id: string;
    label: string;
    icon: string;
    route?: string;
    badge?: number | string;
    children?: NavItem[];
}

@Component({
    selector: 'app-dark-sidebar',
    standalone: true,
    imports: [CommonModule, RouterModule],
    template: `
        <aside class="dark-sidebar" [class.collapsed]="collapsed()">
            <!-- Brand -->
            <div class="sidebar-brand">
                <div class="brand-logo">
                    <span class="logo-icon">⚡</span>
                    <span class="logo-text" *ngIf="!collapsed()">PhishPanel</span>
                </div>
                <button class="collapse-btn" (click)="toggleCollapse()">
                    {{ collapsed() ? '→' : '←' }}
                </button>
            </div>

            <!-- Navigation -->
            <nav class="sidebar-nav">
                <!-- Main Section -->
                <div class="nav-section">
                    <span class="nav-section-label" *ngIf="!collapsed()">Main</span>
                    @for (item of mainNav; track item.id) {
                        <a 
                            class="nav-item"
                            [class.active]="activeItem() === item.id"
                            (click)="selectItem(item.id)"
                        >
                            <span class="nav-icon">{{ item.icon }}</span>
                            <span class="nav-label" *ngIf="!collapsed()">{{ item.label }}</span>
                            <span class="nav-badge" *ngIf="item.badge && !collapsed()">{{ item.badge }}</span>
                        </a>
                    }
                </div>

                <!-- Flows Section -->
                <div class="nav-section">
                    <span class="nav-section-label" *ngIf="!collapsed()">Flows</span>
                    @for (item of flowNav; track item.id) {
                        <a 
                            class="nav-item"
                            [class.active]="activeItem() === item.id"
                            (click)="selectItem(item.id)"
                        >
                            <span class="nav-icon">{{ item.icon }}</span>
                            <span class="nav-label" *ngIf="!collapsed()">{{ item.label }}</span>
                            <span class="nav-badge" *ngIf="item.badge && !collapsed()">{{ item.badge }}</span>
                        </a>
                    }
                </div>

                <!-- Settings Section -->
                <div class="nav-section">
                    <span class="nav-section-label" *ngIf="!collapsed()">Settings</span>
                    @for (item of settingsNav; track item.id) {
                        <a 
                            class="nav-item"
                            [class.active]="activeItem() === item.id"
                            (click)="selectItem(item.id)"
                        >
                            <span class="nav-icon">{{ item.icon }}</span>
                            <span class="nav-label" *ngIf="!collapsed()">{{ item.label }}</span>
                        </a>
                    }
                </div>
            </nav>

            <!-- User Section -->
            <div class="sidebar-footer">
                <div class="user-info" *ngIf="!collapsed()">
                    <div class="user-avatar">{{ userInitials }}</div>
                    <div class="user-details">
                        <span class="user-name">{{ userName }}</span>
                        <span class="user-role">{{ userRole }}</span>
                    </div>
                </div>
                <button class="logout-btn" (click)="onLogout()">
                    <span class="nav-icon">🚪</span>
                    <span *ngIf="!collapsed()">Logout</span>
                </button>
            </div>
        </aside>
    `,
    styles: [`
        .dark-sidebar {
            width: 260px;
            height: 100vh;
            background: var(--bg-secondary, #12121a);
            border-right: 1px solid var(--border-default, #2e2e3a);
            display: flex;
            flex-direction: column;
            position: fixed;
            left: 0;
            top: 0;
            z-index: 100;
            transition: width 0.2s ease;
        }

        .dark-sidebar.collapsed {
            width: 72px;
        }

        .sidebar-brand {
            padding: 1.25rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid var(--border-default, #2e2e3a);
        }

        .brand-logo {
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }

        .logo-icon {
            font-size: 1.5rem;
        }

        .logo-text {
            font-size: 1.25rem;
            font-weight: 700;
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .collapse-btn {
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--bg-tertiary, #1a1a24);
            border: 1px solid var(--border-default, #2e2e3a);
            border-radius: 6px;
            color: var(--text-muted, #64748b);
            cursor: pointer;
            font-size: 0.75rem;
            transition: all 0.15s ease;
        }

        .collapse-btn:hover {
            background: var(--bg-hover, #2a2a38);
            color: var(--text-primary, #f8fafc);
        }

        .sidebar-nav {
            flex: 1;
            padding: 1rem 0;
            overflow-y: auto;
        }

        .nav-section {
            margin-bottom: 1.5rem;
        }

        .nav-section-label {
            display: block;
            padding: 0.5rem 1.25rem;
            font-size: 0.65rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: var(--text-dimmed, #475569);
        }

        .nav-item {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.75rem 1.25rem;
            color: var(--text-muted, #64748b);
            text-decoration: none;
            font-size: 0.875rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s ease;
            border-left: 3px solid transparent;
        }

        .nav-item:hover {
            background: var(--bg-hover, #2a2a38);
            color: var(--text-primary, #f8fafc);
        }

        .nav-item.active {
            background: rgba(99, 102, 241, 0.1);
            color: #818cf8;
            border-left-color: #6366f1;
        }

        .nav-icon {
            width: 20px;
            text-align: center;
            font-size: 1rem;
        }

        .nav-label {
            flex: 1;
        }

        .nav-badge {
            padding: 0.125rem 0.5rem;
            font-size: 0.7rem;
            font-weight: 600;
            background: rgba(239, 68, 68, 0.15);
            color: #ef4444;
            border-radius: 10px;
        }

        .sidebar-footer {
            padding: 1rem 1.25rem;
            border-top: 1px solid var(--border-default, #2e2e3a);
        }

        .user-info {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            margin-bottom: 0.75rem;
        }

        .user-avatar {
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            border-radius: 8px;
            font-size: 0.875rem;
            font-weight: 600;
            color: white;
        }

        .user-details {
            display: flex;
            flex-direction: column;
        }

        .user-name {
            font-size: 0.875rem;
            font-weight: 500;
            color: var(--text-primary, #f8fafc);
        }

        .user-role {
            font-size: 0.75rem;
            color: var(--text-muted, #64748b);
        }

        .logout-btn {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            width: 100%;
            padding: 0.625rem;
            background: var(--bg-tertiary, #1a1a24);
            border: 1px solid var(--border-default, #2e2e3a);
            border-radius: 8px;
            color: var(--text-muted, #64748b);
            font-size: 0.875rem;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .logout-btn:hover {
            background: rgba(239, 68, 68, 0.1);
            border-color: rgba(239, 68, 68, 0.3);
            color: #ef4444;
        }

        .collapsed .nav-item {
            justify-content: center;
            padding: 0.75rem;
        }

        .collapsed .sidebar-footer {
            padding: 1rem 0.75rem;
        }

        .collapsed .logout-btn {
            justify-content: center;
        }
    `]
})
export class DarkSidebarComponent {
    @Input() userName: string = 'Admin';
    @Input() userRole: string = 'Hypervisor';
    @Output() navigate = new EventEmitter<string>();
    @Output() logout = new EventEmitter<void>();

    collapsed = signal(false);
    activeItem = signal('dashboard');

    mainNav: NavItem[] = [
        { id: 'dashboard', label: 'Dashboard', icon: '📊' },
        { id: 'sessions', label: 'Sessions', icon: '👥', badge: 'Live' },
        { id: 'links', label: 'Links', icon: '🔗' },
        { id: 'analytics', label: 'Analytics', icon: '📈' }
    ];

    flowNav: NavItem[] = [
        { id: 'flows', label: 'Flow Marketplace', icon: '🏪' },
        { id: 'templates', label: 'Templates', icon: '📄' },
        { id: 'customize', label: 'Customization', icon: '🎨' }
    ];

    settingsNav: NavItem[] = [
        { id: 'billing', label: 'Billing', icon: '💳' },
        { id: 'api', label: 'API Keys', icon: '🔑' },
        { id: 'team', label: 'Team', icon: '👤' },
        { id: 'settings', label: 'Settings', icon: '⚙️' }
    ];

    get userInitials(): string {
        return this.userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }

    toggleCollapse() {
        this.collapsed.update(c => !c);
    }

    selectItem(id: string) {
        this.activeItem.set(id);
        this.navigate.emit(id);
    }

    onLogout() {
        this.logout.emit();
    }
}
