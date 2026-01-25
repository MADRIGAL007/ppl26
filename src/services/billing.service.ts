
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface CryptoPlan {
    id: string;
    name: string;
    monthlyPriceUSD: number;
    features: string[];
}

export interface PaymentRequest {
    id: string;
    planId: string;
    cryptoType: string;
    amount: number;
    walletAddress: string;
    status: 'pending' | 'verifying' | 'completed' | 'expired';
    txHash?: string;
    createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class BillingService {
    private http = inject(HttpClient);

    // State Signals
    isLoading = signal(false);
    plans = signal<CryptoPlan[]>([]);
    history = signal<PaymentRequest[]>([]);
    currentPayment = signal<PaymentRequest | null>(null);

    async fetchPlans() {
        this.isLoading.set(true);
        try {
            // Mock plans for now if backend not ready, or actual endpoint
            // Keeping it simple with hardcoded plans as per original intent if API fails or for initial state
            // But let's try API first. If this is a real endpoint:
            // const data = await firstValueFrom(this.http.get<CryptoPlan[]>('/api/admin/billing/plans'));
            // this.plans.set(data);

            // Simulating plans for UI stability as backend might be minimal
            this.plans.set([
                { id: 'starter', name: 'Starter License', monthlyPriceUSD: 99, features: ['1 Active Domain', 'Basic Anti-Bot', 'Standard Support'] },
                { id: 'pro', name: 'Pro License', monthlyPriceUSD: 249, features: ['5 Active Domains', 'Advanced Evasion', 'Priority Support'] },
                { id: 'enterprise', name: 'Enterprise', monthlyPriceUSD: 499, features: ['Unlimited Domains', 'Custom Automation', '24/7 Dedicated Support'] }
            ]);
        } catch (e) {
            console.error('Failed to fetch plans', e);
        } finally {
            this.isLoading.set(false);
        }
    }

    async fetchHistory() {
        this.isLoading.set(true);
        try {
            const data = await firstValueFrom(this.http.get<PaymentRequest[]>('/api/admin/billing/history'));
            this.history.set(data || []);
        } catch (e) {
            console.error('Failed to fetch history', e);
            // Fallback for demo
            this.history.set([]);
        } finally {
            this.isLoading.set(false);
        }
    }

    async createPayment(planId: string, cryptoType: string) {
        this.isLoading.set(true);
        try {
            const res = await firstValueFrom(this.http.post<PaymentRequest>('/api/admin/billing/create', { planId, cryptoType }));
            this.currentPayment.set(res);
        } catch (e) {
            console.error('Payment creation failed', e);
            alert('Failed to generate payment address');
        } finally {
            this.isLoading.set(false);
        }
    }

    async submitTx(paymentId: string, txHash: string): Promise<boolean> {
        this.isLoading.set(true);
        try {
            await firstValueFrom(this.http.post(`/api/admin/billing/${paymentId}/verify`, { txHash }));
            return true;
        } catch (e) {
            console.error('TX submission failed', e);
            alert('Failed to submit transaction');
            return false;
        } finally {
            this.isLoading.set(false);
        }
    }
}
