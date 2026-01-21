/**
 * Billing Page Component
 * Displays plans, crypto payment options, and subscription management
 */

import { Component, signal, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ModalComponent } from './ui/modal.component';
import { ToastContainerComponent } from './ui/toast.component';

interface Plan {
    id: string;
    name: string;
    monthlyPriceUSD: number;
    cryptoPrices: Record<string, number>;
    limits: {
        links: number;
        sessionsPerMonth: number;
        users: number;
        apiKeys: number;
    };
    features: string[];
}

type CryptoType = 'BTC' | 'ETH' | 'USDT' | 'USDC';

@Component({
    selector: 'app-billing',
    standalone: true,
    imports: [CommonModule, FormsModule, ModalComponent, ToastContainerComponent],
    template: `
        <div class="billing-page">
            <header class="billing-header">
                <h1 class="billing-title gradient-text">Choose Your Plan</h1>
                <p class="billing-subtitle">Scale your operations with the right plan for your needs</p>
            </header>

            <!-- Current Subscription -->
            <div class="current-plan card" *ngIf="subscription()">
                <div class="current-plan-info">
                    <span class="current-plan-label">Current Plan</span>
                    <span class="current-plan-name">{{ subscription()?.plan | titlecase }}</span>
                    <span class="current-plan-expires" *ngIf="subscription()?.expiresAt">
                        {{ subscription()?.daysRemaining }} days remaining
                    </span>
                </div>
                <button class="btn btn-secondary" *ngIf="subscription()?.plan !== 'free'">
                    Manage Subscription
                </button>
            </div>

            <!-- Plans Grid -->
            <div class="plans-grid">
                @for (plan of plans(); track plan.id) {
                    <div 
                        class="plan-card card"
                        [class.plan-featured]="plan.id === 'pro'"
                        [class.plan-current]="plan.id === subscription()?.plan"
                    >
                        <div class="plan-badge" *ngIf="plan.id === 'pro'">Most Popular</div>
                        <div class="plan-badge current" *ngIf="plan.id === subscription()?.plan">Current</div>
                        
                        <h3 class="plan-name">{{ plan.name }}</h3>
                        <div class="plan-price">
                            <span class="price-amount">\${{ plan.monthlyPriceUSD }}</span>
                            <span class="price-period">/month</span>
                        </div>

                        <ul class="plan-limits">
                            <li>
                                <span class="limit-icon">🔗</span>
                                {{ plan.limits.links === -1 ? 'Unlimited' : plan.limits.links }} Links
                            </li>
                            <li>
                                <span class="limit-icon">👥</span>
                                {{ plan.limits.sessionsPerMonth === -1 ? 'Unlimited' : (plan.limits.sessionsPerMonth | number) }} Sessions/mo
                            </li>
                            <li>
                                <span class="limit-icon">👤</span>
                                {{ plan.limits.users === -1 ? 'Unlimited' : plan.limits.users }} Users
                            </li>
                            <li>
                                <span class="limit-icon">🔑</span>
                                {{ plan.limits.apiKeys === -1 ? 'Unlimited' : plan.limits.apiKeys }} API Keys
                            </li>
                        </ul>

                        <ul class="plan-features">
                            @for (feature of plan.features.slice(0, 5); track feature) {
                                <li><span class="feature-check">✓</span> {{ formatFeature(feature) }}</li>
                            }
                        </ul>

                        <button 
                            class="btn plan-cta"
                            [class.btn-primary]="plan.id !== subscription()?.plan"
                            [class.btn-secondary]="plan.id === subscription()?.plan"
                            [disabled]="plan.id === 'free' || plan.id === subscription()?.plan"
                            (click)="selectPlan(plan)"
                        >
                            {{ plan.id === subscription()?.plan ? 'Current Plan' : plan.id === 'free' ? 'Free Forever' : 'Upgrade Now' }}
                        </button>
                    </div>
                }
            </div>

            <!-- Crypto Payment Modal -->
            <app-modal #paymentModal title="Complete Your Payment" size="lg">
                <div class="payment-content" *ngIf="selectedPlan()">
                    <div class="payment-summary">
                        <h4>{{ selectedPlan()?.name }} Plan</h4>
                        <p>\${{ selectedPlan()?.monthlyPriceUSD }}/month</p>
                    </div>

                    <!-- Crypto Selection -->
                    <div class="crypto-options">
                        <label class="crypto-label">Select Payment Method</label>
                        <div class="crypto-grid">
                            @for (crypto of cryptoOptions; track crypto.id) {
                                <button 
                                    class="crypto-option"
                                    [class.selected]="selectedCrypto() === crypto.id"
                                    (click)="selectCrypto(crypto.id)"
                                >
                                    <span class="crypto-icon">{{ crypto.icon }}</span>
                                    <span class="crypto-name">{{ crypto.name }}</span>
                                    <span class="crypto-price">
                                        {{ getCryptoPrice(crypto.id) }} {{ crypto.id }}
                                    </span>
                                </button>
                            }
                        </div>
                    </div>

                    <!-- Duration Selection -->
                    <div class="duration-options">
                        <label class="crypto-label">Billing Duration</label>
                        <div class="duration-grid">
                            @for (duration of [1, 3, 6, 12]; track duration) {
                                <button 
                                    class="duration-option"
                                    [class.selected]="selectedDuration() === duration"
                                    (click)="selectedDuration.set(duration)"
                                >
                                    {{ duration }} {{ duration === 1 ? 'Month' : 'Months' }}
                                    <span class="duration-discount" *ngIf="duration >= 6">
                                        Save {{ duration === 6 ? '10%' : '20%' }}
                                    </span>
                                </button>
                            }
                        </div>
                    </div>

                    <!-- Payment Instructions -->
                    <div class="payment-instructions" *ngIf="paymentRequest()">
                        <div class="instruction-box">
                            <h5>Payment Instructions</h5>
                            <div class="wallet-address">
                                <label>Send to Address:</label>
                                <div class="address-copy">
                                    <code>{{ paymentRequest()?.walletAddress }}</code>
                                    <button class="btn btn-ghost btn-sm" (click)="copyAddress()">📋</button>
                                </div>
                            </div>
                            <div class="payment-amount">
                                <label>Amount:</label>
                                <strong>{{ paymentRequest()?.amount }}</strong>
                            </div>
                            <div class="payment-expires">
                                <label>Expires:</label>
                                <span>{{ paymentRequest()?.expiresAt | date:'medium' }}</span>
                            </div>
                        </div>

                        <!-- TX Hash Submission -->
                        <div class="tx-submit">
                            <label>After sending payment, enter your transaction hash:</label>
                            <div class="tx-input-group">
                                <input 
                                    type="text" 
                                    class="input"
                                    placeholder="0x..."
                                    [(ngModel)]="txHash"
                                />
                                <button 
                                    class="btn btn-primary"
                                    [disabled]="!txHash || submitting()"
                                    (click)="submitTxHash()"
                                >
                                    {{ submitting() ? 'Submitting...' : 'Submit' }}
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Generate Payment Button -->
                    <button 
                        class="btn btn-primary btn-lg"
                        *ngIf="!paymentRequest()"
                        [disabled]="!selectedCrypto() || generating()"
                        (click)="generatePaymentRequest()"
                    >
                        {{ generating() ? 'Generating...' : 'Generate Payment Address' }}
                    </button>
                </div>

                <ng-container modal-footer>
                    <button class="btn btn-ghost" (click)="paymentModal.close()">Cancel</button>
                </ng-container>
            </app-modal>

            <app-toast-container #toast></app-toast-container>
        </div>
    `,
    styles: [`
        .billing-page {
            max-width: 1200px;
            margin: 0 auto;
            padding: var(--space-8, 32px);
        }

        .billing-header {
            text-align: center;
            margin-bottom: var(--space-10, 40px);
        }

        .billing-title {
            font-size: var(--text-4xl, 36px);
            font-weight: 700;
            margin-bottom: var(--space-2, 8px);
        }

        .billing-subtitle {
            font-size: var(--text-lg, 18px);
            color: var(--text-secondary, #6b7280);
        }

        .current-plan {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: var(--space-6, 24px);
            margin-bottom: var(--space-8, 32px);
            background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1));
        }

        .current-plan-info {
            display: flex;
            flex-direction: column;
            gap: var(--space-1, 4px);
        }

        .current-plan-label {
            font-size: var(--text-xs, 12px);
            text-transform: uppercase;
            color: var(--text-muted, #9ca3af);
        }

        .current-plan-name {
            font-size: var(--text-xl, 20px);
            font-weight: 600;
            color: var(--brand-primary, #6366f1);
        }

        .current-plan-expires {
            font-size: var(--text-sm, 14px);
            color: var(--text-secondary, #6b7280);
        }

        .plans-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: var(--space-6, 24px);
        }

        .plan-card {
            padding: var(--space-6, 24px);
            position: relative;
            display: flex;
            flex-direction: column;
        }

        .plan-featured {
            border-color: var(--brand-primary, #6366f1);
            box-shadow: var(--shadow-primary);
        }

        .plan-badge {
            position: absolute;
            top: -12px;
            left: 50%;
            transform: translateX(-50%);
            padding: var(--space-1, 4px) var(--space-3, 12px);
            font-size: var(--text-xs, 12px);
            font-weight: 600;
            background: var(--brand-primary, #6366f1);
            color: white;
            border-radius: var(--radius-full, 9999px);
        }

        .plan-badge.current {
            background: var(--success, #10b981);
        }

        .plan-name {
            font-size: var(--text-xl, 20px);
            font-weight: 600;
            color: var(--text-primary, #111827);
            margin-bottom: var(--space-4, 16px);
        }

        .plan-price {
            margin-bottom: var(--space-6, 24px);
        }

        .price-amount {
            font-size: var(--text-4xl, 36px);
            font-weight: 700;
            color: var(--text-primary, #111827);
        }

        .price-period {
            font-size: var(--text-sm, 14px);
            color: var(--text-muted, #9ca3af);
        }

        .plan-limits, .plan-features {
            list-style: none;
            padding: 0;
            margin: 0 0 var(--space-6, 24px);
        }

        .plan-limits li, .plan-features li {
            display: flex;
            align-items: center;
            gap: var(--space-2, 8px);
            padding: var(--space-2, 8px) 0;
            font-size: var(--text-sm, 14px);
            color: var(--text-secondary, #6b7280);
        }

        .limit-icon, .feature-check {
            width: 20px;
            text-align: center;
        }

        .feature-check {
            color: var(--success, #10b981);
        }

        .plan-cta {
            width: 100%;
            margin-top: auto;
        }

        /* Payment Modal Styles */
        .payment-content {
            display: flex;
            flex-direction: column;
            gap: var(--space-6, 24px);
        }

        .payment-summary {
            text-align: center;
            padding: var(--space-4, 16px);
            background: var(--bg-secondary, #f9fafb);
            border-radius: var(--radius-lg, 8px);
        }

        .payment-summary h4 {
            margin: 0;
            font-size: var(--text-lg, 18px);
        }

        .crypto-label {
            display: block;
            font-size: var(--text-sm, 14px);
            font-weight: 500;
            margin-bottom: var(--space-2, 8px);
        }

        .crypto-grid, .duration-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: var(--space-2, 8px);
        }

        .crypto-option, .duration-option {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: var(--space-1, 4px);
            padding: var(--space-4, 16px);
            background: var(--surface, white);
            border: 2px solid var(--border-default, #e5e7eb);
            border-radius: var(--radius-lg, 8px);
            cursor: pointer;
            transition: all var(--duration-fast, 100ms);
        }

        .crypto-option:hover, .duration-option:hover {
            border-color: var(--border-hover, #d1d5db);
        }

        .crypto-option.selected, .duration-option.selected {
            border-color: var(--brand-primary, #6366f1);
            background: rgba(99, 102, 241, 0.05);
        }

        .crypto-icon {
            font-size: 24px;
        }

        .crypto-name {
            font-weight: 500;
        }

        .crypto-price {
            font-size: var(--text-xs, 12px);
            color: var(--text-muted, #9ca3af);
        }

        .duration-discount {
            font-size: var(--text-xs, 12px);
            color: var(--success, #10b981);
        }

        .instruction-box {
            padding: var(--space-4, 16px);
            background: var(--bg-secondary, #f9fafb);
            border-radius: var(--radius-lg, 8px);
        }

        .wallet-address, .payment-amount, .payment-expires {
            margin-bottom: var(--space-3, 12px);
        }

        .wallet-address label, .payment-amount label, .payment-expires label {
            font-size: var(--text-xs, 12px);
            color: var(--text-muted, #9ca3af);
            display: block;
            margin-bottom: var(--space-1, 4px);
        }

        .address-copy {
            display: flex;
            align-items: center;
            gap: var(--space-2, 8px);
        }

        .address-copy code {
            flex: 1;
            padding: var(--space-2, 8px);
            background: var(--surface, white);
            border-radius: var(--radius-md, 6px);
            font-family: var(--font-mono);
            font-size: var(--text-sm, 14px);
            word-break: break-all;
        }

        .tx-submit {
            margin-top: var(--space-4, 16px);
        }

        .tx-submit label {
            font-size: var(--text-sm, 14px);
            margin-bottom: var(--space-2, 8px);
            display: block;
        }

        .tx-input-group {
            display: flex;
            gap: var(--space-2, 8px);
        }

        .tx-input-group .input {
            flex: 1;
        }
    `]
})
export class BillingComponent implements OnInit {
    @ViewChild('paymentModal') paymentModal!: ModalComponent;
    @ViewChild('toast') toast!: ToastContainerComponent;

    plans = signal<Plan[]>([]);
    subscription = signal<{ plan: string; expiresAt?: string; daysRemaining?: number } | null>(null);

    selectedPlan = signal<Plan | null>(null);
    selectedCrypto = signal<CryptoType | null>(null);
    selectedDuration = signal(1);

    paymentRequest = signal<{ walletAddress: string; amount: string; expiresAt: string } | null>(null);
    txHash = '';

    generating = signal(false);
    submitting = signal(false);

    cryptoOptions = [
        { id: 'BTC' as CryptoType, name: 'Bitcoin', icon: '₿' },
        { id: 'ETH' as CryptoType, name: 'Ethereum', icon: 'Ξ' },
        { id: 'USDT' as CryptoType, name: 'Tether', icon: '₮' },
        { id: 'USDC' as CryptoType, name: 'USD Coin', icon: '$' }
    ];

    constructor(private http: HttpClient) { }

    ngOnInit() {
        this.loadPlans();
        this.loadSubscription();
    }

    loadPlans() {
        this.http.get<{ plans: Plan[] }>('/api/billing/plans').subscribe({
            next: (res) => this.plans.set(res.plans),
            error: () => {
                // Fallback to default plans
                this.plans.set([
                    { id: 'free', name: 'Free', monthlyPriceUSD: 0, cryptoPrices: { BTC: 0, ETH: 0, USDT: 0, USDC: 0 }, limits: { links: 3, sessionsPerMonth: 100, users: 1, apiKeys: 1 }, features: ['basic_analytics'] },
                    { id: 'starter', name: 'Starter', monthlyPriceUSD: 29, cryptoPrices: { BTC: 0.0005, ETH: 0.01, USDT: 29, USDC: 29 }, limits: { links: 10, sessionsPerMonth: 1000, users: 3, apiKeys: 5 }, features: ['basic_analytics', 'custom_branding', 'email_support'] },
                    { id: 'pro', name: 'Pro', monthlyPriceUSD: 99, cryptoPrices: { BTC: 0.0017, ETH: 0.035, USDT: 99, USDC: 99 }, limits: { links: 50, sessionsPerMonth: 10000, users: 10, apiKeys: 20 }, features: ['advanced_analytics', 'custom_branding', 'priority_support', 'api_access', 'ab_testing'] },
                    { id: 'enterprise', name: 'Enterprise', monthlyPriceUSD: 299, cryptoPrices: { BTC: 0.005, ETH: 0.1, USDT: 299, USDC: 299 }, limits: { links: -1, sessionsPerMonth: -1, users: -1, apiKeys: -1 }, features: ['all', 'dedicated_support', 'custom_integrations', 'sla'] }
                ]);
            }
        });
    }

    loadSubscription() {
        this.http.get<any>('/api/billing/subscription').subscribe({
            next: (res) => this.subscription.set(res),
            error: () => this.subscription.set({ plan: 'free' })
        });
    }

    selectPlan(plan: Plan) {
        this.selectedPlan.set(plan);
        this.selectedCrypto.set(null);
        this.selectedDuration.set(1);
        this.paymentRequest.set(null);
        this.txHash = '';
        this.paymentModal.open();
    }

    selectCrypto(crypto: CryptoType) {
        this.selectedCrypto.set(crypto);
        this.paymentRequest.set(null);
    }

    getCryptoPrice(crypto: CryptoType): string {
        const plan = this.selectedPlan();
        if (!plan) return '0';
        const price = plan.cryptoPrices[crypto] * this.selectedDuration();
        return crypto === 'BTC' ? price.toFixed(8) : crypto === 'ETH' ? price.toFixed(6) : price.toFixed(2);
    }

    formatFeature(feature: string): string {
        return feature.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }

    generatePaymentRequest() {
        const plan = this.selectedPlan();
        const crypto = this.selectedCrypto();
        if (!plan || !crypto) return;

        this.generating.set(true);

        this.http.post<any>('/api/billing/payment-request', {
            plan: plan.id,
            cryptoType: crypto,
            durationMonths: this.selectedDuration()
        }).subscribe({
            next: (res) => {
                this.paymentRequest.set(res.payment);
                this.generating.set(false);
            },
            error: (err) => {
                this.toast.error('Failed to generate payment', err.error?.message);
                this.generating.set(false);
            }
        });
    }

    copyAddress() {
        const address = this.paymentRequest()?.walletAddress;
        if (address) {
            navigator.clipboard.writeText(address);
            this.toast.success('Address copied to clipboard');
        }
    }

    submitTxHash() {
        if (!this.txHash) return;

        this.submitting.set(true);

        this.http.post('/api/billing/submit-tx', {
            paymentId: (this.paymentRequest() as any)?.id,
            txHash: this.txHash
        }).subscribe({
            next: () => {
                this.toast.success('Payment submitted', 'Awaiting admin verification');
                this.paymentModal.close();
                this.submitting.set(false);
            },
            error: (err) => {
                this.toast.error('Submission failed', err.error?.message);
                this.submitting.set(false);
            }
        });
    }
}
