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
                    <span class="logo-text" *ngIf="!collapsed()">MADRIGALS</span>
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
            background: var(--cyber-bg-deep);
            border-right: var(--cyber-border);
            box-shadow: var(--cyber-glow-cyan);
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
            border-bottom: 1px solid rgba(0, 243, 255, 0.1);
            background: linear-gradient(180deg, rgba(0,243,255,0.05) 0%, transparent 100%);
        }

        .brand-logo {
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }

        .logo-icon {
            font-size: 1.5rem;
            filter: drop-shadow(0 0 5px var(--cyber-accent-cyan));
        }

        .logo-text {
            font-size: 1.25rem;
            font-weight: 700;
            font-family: var(--font-mono);
            color: var(--cyber-accent-cyan);
            letter-spacing: 1px;
            text-shadow: 0 0 10px rgba(0, 243, 255, 0.5);
        }

        .collapse-btn {
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 4px;
            color: var(--cyber-text-muted);
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .collapse-btn:hover {
            color: var(--cyber-accent-cyan);
            border-color: var(--cyber-accent-cyan);
            box-shadow: 0 0 8px rgba(0, 243, 255, 0.3);
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
            letter-spacing: 0.15em;
            color: var(--cyber-accent-purple);
            text-shadow: 0 0 5px rgba(188, 19, 254, 0.5);
        }

        .nav-item {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.75rem 1.25rem;
            color: var(--cyber-text-muted);
            text-decoration: none;
            font-size: 0.875rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            border-left: 2px solid transparent;
            font-family: var(--font-mono);
        }

        .nav-item:hover {
            background: var(--cyber-bg-hover);
            color: var(--cyber-text-main);
            padding-left: 1.5rem; /* Slide effect */
        }

        .nav-item.active {
            background: linear-gradient(90deg, rgba(0,243,255,0.1) 0%, transparent 100%);
            color: var(--cyber-accent-cyan);
            border-left-color: var(--cyber-accent-cyan);
            text-shadow: 0 0 8px rgba(0,243,255,0.4);
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
            font-size: 0.65rem;
            font-weight: 600;
            background: rgba(255, 0, 255, 0.2);
            color: var(--cyber-accent-pink);
            border: 1px solid rgba(255, 0, 255, 0.4);
            border-radius: 2px;
            box-shadow: 0 0 5px rgba(255, 0, 255, 0.4);
        }

        .sidebar-footer {
            padding: 1rem 1.25rem;
            border-top: 1px solid rgba(255,255,255,0.05);
            background: rgba(0,0,0,0.2);
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
            background: linear-gradient(135deg, #00f3ff, #bc13fe);
            border-radius: 4px; /* Squarer for cyberpunk */
            font-size: 0.875rem;
            font-weight: 700;
            color: #000;
            box-shadow: 0 0 8px rgba(0, 243, 255, 0.4);
        }

        .user-details {
            display: flex;
            flex-direction: column;
        }

        .user-name {
            font-size: 0.875rem;
            font-weight: 600;
            color: var(--cyber-text-main);
            font-family: var(--font-mono);
        }

        .user-role {
            font-size: 0.7rem;
            color: var(--cyber-accent-purple);
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .logout-btn {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            width: 100%;
            padding: 0.625rem;
            background: transparent;
            border: 1px solid var(--cyber-text-dimmed);
            border-radius: 4px;
            color: var(--cyber-text-muted);
            font-size: 0.75rem;
            cursor: pointer;
            transition: all 0.2s ease;
            font-family: var(--font-mono);
            text-transform: uppercase;
        }

        .logout-btn:hover {
            border-color: var(--cyber-accent-pink);
            color: var(--cyber-accent-pink);
            box-shadow: var(--cyber-glow-pink);
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
