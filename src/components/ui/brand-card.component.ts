/**
 * Brand Card Component
 * Individual flow/brand card for quick stats
 */

import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { FlowConfig } from '../../services/flows.service';

@Component({
    selector: 'app-brand-card',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="brand-card" [style.--brand-color]="flow.color">
            <div class="brand-header">
                <div class="brand-icon">{{ flow.icon }}</div>
                <div class="brand-info">
                    <h4 class="brand-name">{{ flow.name }}</h4>
                    <span class="brand-status" [class.active]="isActive">
                        {{ isActive ? 'Active' : 'Inactive' }}
                    </span>
                </div>
            </div>
            
            <div class="brand-stats">
                <div class="stat">
                    <span class="stat-value">{{ sessions }}</span>
                    <span class="stat-label">Sessions</span>
                </div>
                <div class="stat">
                    <span class="stat-value">{{ successRate }}%</span>
                    <span class="stat-label">Success</span>
                </div>
                <div class="stat">
                    <span class="stat-value">{{ links }}</span>
                    <span class="stat-label">Links</span>
                </div>
            </div>

            <div class="brand-bar">
                <div class="brand-progress" [style.width.%]="successRate"></div>
            </div>
        </div>
    `,
    styles: [`
        .brand-card {
            background: var(--bg-secondary, #12121a);
            border: 1px solid var(--border-default, #2e2e3a);
            border-radius: var(--radius-lg, 12px);
            padding: 1.25rem;
            transition: all 0.2s ease;
            position: relative;
            overflow: hidden;
        }

        .brand-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 4px;
            height: 100%;
            background: var(--brand-color);
            opacity: 0.5;
            transition: opacity 0.2s ease;
        }

        .brand-card:hover {
            border-color: var(--border-hover, #3e3e4a);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .brand-card:hover::before {
            opacity: 1;
        }

        .brand-header {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            margin-bottom: 1rem;
        }

        .brand-icon {
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.25rem;
            background: linear-gradient(135deg, var(--brand-color), rgba(255,255,255,0.1));
            border-radius: 8px;
        }

        .brand-name {
            font-size: 1rem;
            font-weight: 600;
            color: var(--text-primary, #f8fafc);
            margin: 0;
        }

        .brand-status {
            font-size: 0.7rem;
            font-weight: 500;
            color: var(--text-muted, #64748b);
        }

        .brand-status.active {
            color: var(--success, #10b981);
        }

        .brand-stats {
            display: flex;
            justify-content: space-between;
            margin-bottom: 1rem;
        }

        .stat {
            text-align: center;
        }

        .stat-value {
            display: block;
            font-size: 1.125rem;
            font-weight: 700;
            color: var(--text-primary, #f8fafc);
        }

        .stat-label {
            font-size: 0.7rem;
            color: var(--text-muted, #64748b);
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .brand-bar {
            height: 4px;
            background: var(--bg-tertiary, #1a1a24);
            border-radius: 2px;
            overflow: hidden;
        }

        .brand-progress {
            height: 100%;
            background: var(--brand-color);
            border-radius: 2px;
            transition: width 0.3s ease;
        }
    `]
})
export class BrandCardComponent {
    @Input() flow!: FlowConfig;
    @Input() sessions: number = 0;
    @Input() successRate: number = 0;
    @Input() links: number = 0;
    @Input() isActive: boolean = true;
}
