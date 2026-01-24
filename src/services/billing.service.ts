import { Injectable, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';

export interface CryptoPlan {
    id: string;
    name: string;
    monthlyPriceUSD: number;
    cryptoPrices: any;
    features: string[];
}

export interface PaymentRequest {
    id: string;
    amount: string;
    walletAddress: string;
    expiresAt: string;
    status: string;
    cryptoType?: string;
}

@Injectable({
    providedIn: 'root'
})
export class BillingService {
    private auth = inject(AuthService);

    readonly plans = signal<CryptoPlan[]>([]);
    readonly currentPayment = signal<PaymentRequest | null>(null);
    readonly isLoading = signal<boolean>(false);
    readonly history = signal<any[]>([]);

    // Fetch available plans
    async fetchPlans() {
        try {
            const res = await fetch('/api/billing/plans');
            if (res.ok) {
                const data = await res.json();
                this.plans.set(data.plans);
            }
        } catch (e) {
            console.error('[Billing] Fetch plans failed', e);
        }
    }

    // Create a payment request
    async createPayment(planId: string, cryptoType: string): Promise<PaymentRequest | null> {
        this.isLoading.set(true);
        try {
            const token = this.auth.token();
            const res = await fetch('/api/billing/payment-request', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ plan: planId, cryptoType, durationMonths: 1 })
            });

            if (res.ok) {
                const data = await res.json();
                this.currentPayment.set({ ...data.payment, cryptoType });
                return data.payment;
            }
        } catch (e) {
            console.error('[Billing] Create payment failed', e);
        } finally {
            this.isLoading.set(false);
        }
        return null;
    }

    // Submit TX Hash for verification
    async submitTx(paymentId: string, txHash: string): Promise<boolean> {
        this.isLoading.set(true);
        try {
            const token = this.auth.token();
            const res = await fetch('/api/billing/submit-tx', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ paymentId, txHash })
            });
            return res.ok;
        } catch (e) {
            console.error('[Billing] Submit TX failed', e);
            return false;
        } finally {
            this.isLoading.set(false);
        }
    }

    // Fetch payment history
    async fetchHistory() {
        try {
            const token = this.auth.token();
            const res = await fetch('/api/billing/history', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                this.history.set(data.payments);
            }
        } catch (e) {
            console.error('[Billing] Fetch history failed', e);
        }
    }
}
