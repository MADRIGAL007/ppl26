/**
 * Flow Selector Component
 * Grid of brand cards for enabling/disabling flows
 */

import { Component, signal, computed, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { FlowConfig } from '../../services/flows.service';
import {
    AVAILABLE_FLOWS,
    FLOW_CATEGORIES,
    getFlowsByCategory,
    calculateTotalPrice
} from '../../services/flows.service';

@Component({
    selector: 'app-flow-selector',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
        <div class="flow-selector">
            <!-- Header -->
            <div class="flow-header">
                <div>
                    <h2 class="flow-title">Flow Marketplace</h2>
                    <p class="flow-subtitle">Select the flows you need for your campaigns</p>
                </div>
                <div class="flow-price-summary">
                    <span class="price-label">Monthly Total</span>
                    <span class="price-value">\${{ totalPrice() }}</span>
                </div>
            </div>

            <!-- Category Filter -->
            <div class="category-filter">
                <button 
                    class="category-btn"
                    [class.active]="selectedCategory() === 'all'"
                    (click)="selectedCategory.set('all')"
                >
                    All
                </button>
                @for (cat of categories; track cat.key) {
                    <button 
                        class="category-btn"
                        [class.active]="selectedCategory() === cat.key"
                        (click)="selectedCategory.set(cat.key)"
                    >
                        <span class="cat-icon">{{ cat.icon }}</span>
                        {{ cat.label }}
                    </button>
                }
            </div>

            <!-- Flow Grid -->
            <div class="flow-grid">
                @for (flow of filteredFlows(); track flow.id) {
                    <div 
                        class="flow-card"
                        [class.enabled]="isEnabled(flow.id)"
                        [class.popular]="flow.popular"
                        [style.--brand-color]="flow.color"
                    >
                        <!-- Popular Badge -->
                        <div class="popular-badge" *ngIf="flow.popular">Popular</div>
                        
                        <!-- Brand Header -->
                        <div class="flow-brand-header">
                            <div class="flow-icon" [style.background]="flow.color">
                                {{ flow.icon }}
                            </div>
                            <div class="flow-info">
                                <h3 class="flow-name">{{ flow.name }}</h3>
                                <span class="flow-category">{{ getCategoryLabel(flow.category) }}</span>
                            </div>
                        </div>

                        <!-- Description -->
                        <p class="flow-description">{{ flow.description }}</p>

                        <!-- Steps Preview -->
                        <div class="flow-steps">
                            @for (step of flow.steps.slice(0, 3); track step.id) {
                                <span class="step-badge">{{ step.name }}</span>
                            }
                            @if (flow.steps.length > 3) {
                                <span class="step-more">+{{ flow.steps.length - 3 }}</span>
                            }
                        </div>

                        <!-- Footer -->
                        <div class="flow-footer">
                            <div class="flow-price">
                                @if (flow.monthlyPrice === 0) {
                                    <span class="price-free">Included</span>
                                } @else {
                                    <span class="price-amount">\${{ flow.monthlyPrice }}</span>
                                    <span class="price-period">/mo</span>
                                }
                            </div>
                            <button 
                                class="flow-toggle"
                                [class.enabled]="isEnabled(flow.id)"
                                (click)="toggleFlow(flow.id)"
                            >
                                {{ isEnabled(flow.id) ? 'Enabled' : 'Enable' }}
                            </button>
                        </div>
                    </div>
                }
            </div>
        </div>
    `,
    styles: [`
        .flow-selector {
            padding: 1.5rem;
        }

        .flow-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            margin-bottom: 1.5rem;
        }

        .flow-title {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--text-primary);
            margin: 0 0 0.25rem;
        }

        .flow-subtitle {
            font-size: 0.875rem;
            color: var(--text-muted);
            margin: 0;
        }

        .flow-price-summary {
            text-align: right;
            padding: 1rem 1.5rem;
            background: var(--accent-gradient-subtle);
            border-radius: var(--radius-lg);
            border: 1px solid var(--border-default);
        }

        .price-label {
            display: block;
            font-size: 0.75rem;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .price-value {
            font-size: 1.5rem;
            font-weight: 700;
            background: var(--accent-gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .category-filter {
            display: flex;
            gap: 0.5rem;
            margin-bottom: 1.5rem;
            flex-wrap: wrap;
        }

        .category-btn {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            font-size: 0.875rem;
            font-weight: 500;
            color: var(--text-muted);
            background: var(--bg-tertiary);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-md);
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .category-btn:hover {
            background: var(--bg-hover);
            color: var(--text-secondary);
        }

        .category-btn.active {
            background: var(--accent-primary);
            color: white;
            border-color: var(--accent-primary);
        }

        .cat-icon {
            font-size: 1rem;
        }

        .flow-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 1.25rem;
        }

        .flow-card {
            position: relative;
            background: var(--bg-secondary);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-lg);
            padding: 1.5rem;
            transition: all 0.2s ease;
        }

        .flow-card:hover {
            border-color: var(--border-hover);
            box-shadow: var(--shadow-md);
        }

        .flow-card.enabled {
            border-color: var(--brand-color, var(--accent-primary));
            box-shadow: 0 0 20px rgba(var(--brand-color), 0.1);
        }

        .flow-card.enabled::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: var(--brand-color, var(--accent-gradient));
            border-radius: var(--radius-lg) var(--radius-lg) 0 0;
        }

        .popular-badge {
            position: absolute;
            top: 1rem;
            right: 1rem;
            padding: 0.25rem 0.75rem;
            font-size: 0.7rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--accent-cyan);
            background: rgba(6, 182, 212, 0.15);
            border-radius: var(--radius-sm);
        }

        .flow-brand-header {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 1rem;
        }

        .flow-icon {
            width: 48px;
            height: 48px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            border-radius: var(--radius-md);
            color: white;
        }

        .flow-name {
            font-size: 1.125rem;
            font-weight: 600;
            color: var(--text-primary);
            margin: 0;
        }

        .flow-category {
            font-size: 0.75rem;
            color: var(--text-muted);
        }

        .flow-description {
            font-size: 0.875rem;
            color: var(--text-secondary);
            margin: 0 0 1rem;
            line-height: 1.5;
        }

        .flow-steps {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            margin-bottom: 1.25rem;
        }

        .step-badge {
            padding: 0.25rem 0.5rem;
            font-size: 0.7rem;
            font-weight: 500;
            color: var(--text-muted);
            background: var(--bg-tertiary);
            border-radius: var(--radius-sm);
        }

        .step-more {
            padding: 0.25rem 0.5rem;
            font-size: 0.7rem;
            font-weight: 500;
            color: var(--accent-primary);
        }

        .flow-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-top: 1rem;
            border-top: 1px solid var(--border-default);
        }

        .flow-price {
            display: flex;
            align-items: baseline;
            gap: 0.25rem;
        }

        .price-free {
            font-size: 0.875rem;
            font-weight: 500;
            color: var(--success);
        }

        .price-amount {
            font-size: 1.25rem;
            font-weight: 700;
            color: var(--text-primary);
        }

        .price-period {
            font-size: 0.75rem;
            color: var(--text-muted);
        }

        .flow-toggle {
            padding: 0.5rem 1.25rem;
            font-size: 0.875rem;
            font-weight: 500;
            color: var(--text-secondary);
            background: var(--bg-tertiary);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-md);
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .flow-toggle:hover {
            background: var(--bg-hover);
            color: var(--text-primary);
        }

        .flow-toggle.enabled {
            background: var(--success);
            color: white;
            border-color: var(--success);
        }

        .flow-toggle.enabled:hover {
            background: #059669;
        }
    `]
})
export class FlowSelectorComponent implements OnInit {
    @Output() flowsChanged = new EventEmitter<string[]>();

    flows = AVAILABLE_FLOWS;
    categories = Object.entries(FLOW_CATEGORIES).map(([key, val]) => ({ key, ...val }));

    selectedCategory = signal<string>('all');
    enabledFlows = signal<Set<string>>(new Set(['paypal'])); // PayPal enabled by default

    ngOnInit() {
        // Load saved flows from localStorage
        const saved = localStorage.getItem('enabledFlows');
        if (saved) {
            this.enabledFlows.set(new Set(JSON.parse(saved)));
        }
    }

    filteredFlows = computed(() => {
        const cat = this.selectedCategory();
        if (cat === 'all') return this.flows;
        return this.flows.filter(f => f.category === cat);
    });

    totalPrice = computed(() => {
        return calculateTotalPrice([...this.enabledFlows()]);
    });

    isEnabled(flowId: string): boolean {
        return this.enabledFlows().has(flowId);
    }

    toggleFlow(flowId: string) {
        const enabled = new Set(this.enabledFlows());
        if (enabled.has(flowId)) {
            // Don't disable PayPal (it's included)
            if (flowId !== 'paypal') {
                enabled.delete(flowId);
            }
        } else {
            enabled.add(flowId);
        }
        this.enabledFlows.set(enabled);

        // Save to localStorage
        localStorage.setItem('enabledFlows', JSON.stringify([...enabled]));

        // Emit change
        this.flowsChanged.emit([...enabled]);
    }

    getCategoryLabel(category: string): string {
        return FLOW_CATEGORIES[category as keyof typeof FLOW_CATEGORIES]?.label || category;
    }
}
