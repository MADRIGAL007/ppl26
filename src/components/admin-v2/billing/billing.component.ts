import { Component, inject, computed, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SettingsService } from '../../../services/settings.service';
import { BillingService, CryptoPlan } from '../../../services/billing.service';
import { DataTableV2Component } from '../ui/data-table.component';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-admin-billing-v2',
    standalone: true,
    imports: [CommonModule, DataTableV2Component, FormsModule],
    template: `
    <div class="space-y-8">
       <!-- Header -->
       <div>
          <h2 class="adm-h2 text-white">Billing & Subscription</h2>
          <p class="text-slate-400 text-sm mt-1">Manage your Madrigals license and view payment history.</p>
       </div>

       <!-- Active Plan & Upgrade -->
       <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
           <div class="lg:col-span-2 space-y-6">
               <!-- Payment History -->
               <app-data-table-v2
                  [title]="'Payment History'"
                  [columns]="historyColumns"
                  [data]="history()"
                  [loading]="billingService.isLoading()"
                  (onRefresh)="billingService.fetchHistory()">
               </app-data-table-v2>
           </div>

           <!-- Upgrade / Current Plan -->
           <div class="space-y-6">
               <div class="adm-card bg-gradient-to-br from-slate-900 to-indigo-950 border-indigo-500/30">
                   <h3 class="text-white font-bold text-lg mb-2">Upgrade Plan</h3>
                   <div class="space-y-4">
                       @for (plan of billingService.plans(); track plan.id) {
                           <button 
                               class="w-full p-4 rounded-xl border text-left transition-all relative overflow-hidden group"
                               [ngClass]="selectedPlan() === plan.id ? 'bg-indigo-500/20 border-indigo-500' : 'bg-slate-950 border-slate-800 hover:border-slate-600'"
                               (click)="selectPlan(plan.id)">
                               <div class="relative z-10">
                                   <div class="flex justify-between items-center mb-1">
                                       <span class="font-bold text-white group-hover:text-indigo-300 transition-colors">{{ plan.name }}</span>
                                       <span class="text-white font-mono">\${{ plan.monthlyPriceUSD }}</span>
                                   </div>
                                   <p class="text-xs text-slate-400">{{ plan.features[0] }}</p>
                               </div>
                           </button>
                       }
                   </div>

                   @if (selectedPlan()) {
                       <div class="mt-6 pt-6 border-t border-slate-800 space-y-4">
                           <div class="space-y-2">
                               <label class="text-xs font-bold text-slate-500 uppercase">Payment Method</label>
                               <div class="grid grid-cols-2 gap-2">
                                   <button 
                                       class="p-2 rounded border text-sm font-bold transition-colors"
                                       [ngClass]="selectedCrypto() === 'BTC' ? 'bg-orange-500/10 border-orange-500 text-orange-400' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'"
                                       (click)="selectedCrypto.set('BTC')">BTC</button>
                                   <button 
                                       class="p-2 rounded border text-sm font-bold transition-colors"
                                       [ngClass]="selectedCrypto() === 'ETH' ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'"
                                       (click)="selectedCrypto.set('ETH')">ETH</button>
                                   <button 
                                       class="p-2 rounded border text-sm font-bold transition-colors"
                                       [ngClass]="selectedCrypto() === 'USDT' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'"
                                       (click)="selectedCrypto.set('USDT')">USDT</button>
                                    <button 
                                       class="p-2 rounded border text-sm font-bold transition-colors"
                                       [ngClass]="selectedCrypto() === 'USDC' ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'"
                                       (click)="selectedCrypto.set('USDC')">USDC</button>
                               </div>
                           </div>

                           <button class="adm-btn adm-btn-primary w-full justify-center" (click)="initiatePayment()" [disabled]="billingService.isLoading()">
                               {{ billingService.isLoading() ? 'Processing...' : 'Generate Payment Address' }}
                           </button>
                       </div>
                   }
               </div>

               @if (currentPayment(); as cp) {
                   <div class="adm-card border-orange-500/20 bg-orange-500/5">
                       <h3 class="text-orange-400 font-bold mb-4 flex items-center gap-2">
                           <span class="material-icons text-sm">pending</span> Action Required
                       </h3>
                       <div class="space-y-4 text-sm">
                           <div>
                               <label class="block text-xs text-slate-500 mb-1">Send Exactly</label>
                               <div class="flex items-center gap-2">
                                   <span class="text-white font-mono text-lg font-bold">{{ cp.amount }} {{ cp.cryptoType }}</span>
                                   <button class="text-slate-400 hover:text-white" (click)="copy(cp.amount)"><span class="material-icons text-xs">content_copy</span></button>
                               </div>
                           </div>
                           <div>
                               <label class="block text-xs text-slate-500 mb-1">To Address</label>
                               <div class="flex items-center gap-2 bg-slate-950 p-2 rounded border border-slate-800">
                                   <span class="text-slate-300 font-mono text-xs break-all">{{ cp.walletAddress }}</span>
                                   <button class="text-slate-400 hover:text-white ml-auto" (click)="copy(cp.walletAddress)"><span class="material-icons text-xs">content_copy</span></button>
                               </div>
                           </div>
                           
                           <div class="pt-2">
                               <label class="block text-xs text-slate-500 mb-1">Transaction Hash (TXID)</label>
                               <div class="flex gap-2">
                                   <input type="text" [(ngModel)]="txHash" class="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white text-sm w-full outline-none focus:border-orange-500/50" placeholder="0x...">
                                   <button class="adm-btn adm-btn-sm adm-btn-primary" (click)="submitTx()" [disabled]="!txHash || billingService.isLoading()">Submit</button>
                               </div>
                           </div>
                       </div>
                   </div>
               }
           </div>
       </div>
    </div>
  `
})
export class BillingComponent implements OnInit {
    billingService = inject(BillingService);

    selectedPlan = signal<string | null>(null);
    selectedCrypto = signal<string>('BTC');
    currentPayment = this.billingService.currentPayment;
    txHash = '';

    historyColumns: any[] = [
        { header: 'Status', field: 'status', type: 'status', width: 'col-span-2' },
        { header: 'Plan', field: 'plan', width: 'col-span-2', textClass: 'font-bold text-white uppercase' },
        { header: 'Amount', field: 'amountStr', width: 'col-span-3', textClass: 'font-mono text-slate-400' },
        { header: 'Date', field: 'createdStr', width: 'col-span-3', textClass: 'text-xs text-slate-500' },
        { header: 'TX', field: 'txShort', width: 'col-span-2', textClass: 'font-mono text-xs text-indigo-400' }
    ];

    history = computed(() => {
        return this.billingService.history().map((p: any) => ({
            ...p,
            amountStr: `${p.amount} ${p.cryptoType}`,
            createdStr: new Date(p.createdAt).toLocaleDateString(),
            txShort: p.txHash ? p.txHash.substring(0, 6) + '...' : '-'
        }));
    });

    ngOnInit() {
        this.billingService.fetchPlans();
        this.billingService.fetchHistory();
    }

    selectPlan(id: string) {
        this.selectedPlan.set(id);
        this.billingService.currentPayment.set(null); // Reset pending payment view on plan switch
    }

    async initiatePayment() {
        const plan = this.selectedPlan();
        const crypto = this.selectedCrypto();
        if (plan && crypto) {
            await this.billingService.createPayment(plan, crypto);
        }
    }

    async submitTx() {
        const payment = this.currentPayment();
        if (payment && this.txHash) {
            const success = await this.billingService.submitTx(payment.id, this.txHash);
            if (success) {
                alert('Transaction submitted for verification.');
                this.billingService.currentPayment.set(null);
                this.txHash = '';
                this.billingService.fetchHistory();
            }
        }
    }

    copy(text: string) {
        navigator.clipboard.writeText(text);
    }
}
