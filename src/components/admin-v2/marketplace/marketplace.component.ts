
import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AVAILABLE_FLOWS } from '../../../services/flows.service';
import { ClientBillingService } from '../../../services/billing.service';

@Component({
   selector: 'app-admin-marketplace-v2',
   standalone: true,
   imports: [CommonModule, FormsModule],
   template: `
    <div class="space-y-6">
       <!-- Header -->
       <div>
          <h2 class="adm-h2 text-white">Marketplace & Licenses</h2>
          <p class="text-slate-400 text-sm mt-1">Purchase licenses to unlock payment flows. Crypto only.</p>
       </div>

       <!-- Grid -->
       <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          @for (flow of flows; track flow.id) {
          <div class="adm-card p-5 border border-slate-800 flex flex-col h-full bg-slate-900/50 hover:bg-slate-900 transition-colors">
             <div class="flex justify-between items-start mb-4">
                <div class="w-12 h-12 rounded-lg flex items-center justify-center text-2xl border transition-colors"
                     [style.background]="flow.color + '1A'"
                     [style.color]="flow.color"
                     [style.borderColor]="flow.color + '33'">
                   {{ flow.icon }}
                </div>
                
                @if (getLicenseStatus(flow.id) === 'active') {
                    <span class="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">ACTIVE</span>
                } @else if (getLicenseStatus(flow.id) === 'pending') {
                    <span class="px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 text-[10px] font-bold border border-yellow-500/20">PENDING</span>
                } @else {
                     <span class="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold border border-slate-700">
                        {{ getPrice(flow.id) | currency:'USD' }}/mo
                     </span>
                }
             </div>

             <h4 class="text-lg font-bold text-white mb-1">{{ flow.name }}</h4>
             <p class="text-sm text-slate-400 mb-6 flex-grow">{{ flow.description }}</p>

             <button class="adm-btn w-full justify-center"
                [disabled]="getLicenseStatus(flow.id) !== 'none'"
                [class.adm-btn-primary]="getLicenseStatus(flow.id) === 'none'"
                [class.adm-btn-ghost]="getLicenseStatus(flow.id) !== 'none'"
                [class.opacity-50]="getLicenseStatus(flow.id) !== 'none'"
                (click)="openPurchase(flow)">
                
                @if (getLicenseStatus(flow.id) === 'active') { Valid License }
                @else if (getLicenseStatus(flow.id) === 'pending') { Awaiting Approval }
                @else { Buy Now }
             </button>
          </div>
          }
       </div>

       <!-- Purchase Modal -->
       @if (selectedFlow) {
           <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
               <div class="bg-slate-900 border border-slate-700 rounded-xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                   <h3 class="text-xl font-bold text-white mb-2">Purchase {{ selectedFlow.name }}</h3>
                   <p class="text-slate-400 text-sm mb-6">Send exactly <strong class="text-white">{{ getPrice(selectedFlow.id) | currency:'USD' }}</strong> (in USDT or BTC equivalent) to the address below.</p>

                   <div class="space-y-4">
                       <div>
                           <label class="text-xs font-bold text-slate-500 uppercase">Wallet Address (USDT TRC20)</label>
                           <div class="flex items-center gap-2 mt-1">
                               <code class="bg-slate-950 p-3 rounded text-xs text-blue-400 font-mono break-all flex-grow border border-slate-800">
                                   TV9Qxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
                               </code>
                               <button class="p-2 text-slate-400 hover:text-white" title="Copy">
                                  <span class="material-icons text-sm">content_copy</span>
                               </button>
                           </div>
                       </div>

                       <div>
                           <label class="text-xs font-bold text-slate-500 uppercase">Transaction Hash (TXID)</label>
                           <input type="text" [(ngModel)]="txHash" class="w-full bg-slate-950 border border-slate-800 rounded p-3 text-white text-sm mt-1 focus:border-blue-500 outline-none" placeholder="Enter TX Hash...">
                       </div>

                       <div class="flex gap-3 mt-6">
                           <button class="adm-btn adm-btn-ghost w-full justify-center" (click)="selectedFlow = null">Cancel</button>
                           <button class="adm-btn adm-btn-primary w-full justify-center" [disabled]="!txHash || submitting()" (click)="confirmPurchase()">
                               {{ submitting() ? 'Verifying...' : 'I Have Sent Payment' }}
                           </button>
                       </div>
                   </div>
               </div>
           </div>
       }
    </div>
  `
})
export class MarketplaceComponent implements OnInit {
   flows = AVAILABLE_FLOWS;
   billing = inject(ClientBillingService);

   selectedFlow: any = null;
   txHash = '';
   submitting = signal(false);

   // MVP Pricing Map
   prices: Record<string, number> = {
      'paypal': 300,
      'chase': 250,
      'netflix': 150,
      'apple': 200,
      'amazon': 200,
      'wells': 250
   };

   ngOnInit() {
      this.billing.fetchMyLicenses();
   }

   getPrice(id: string) {
      return this.prices[id] || 150;
   }

   getLicenseStatus(flowId: string): 'none' | 'pending' | 'active' {
      const lic = this.billing.licenses().find(l => l.flowId === flowId);
      if (!lic) return 'none';
      if (lic.status === 'active' && lic.expiresAt > Date.now()) return 'active';
      if (lic.status === 'pending') return 'pending';
      return 'none'; // Expired treats as none/buyable again
   }

   openPurchase(flow: any) {
      if (this.getLicenseStatus(flow.id) !== 'none') return;
      this.selectedFlow = flow;
      this.txHash = '';
   }

   async confirmPurchase() {
      if (!this.txHash) return;
      this.submitting.set(true);
      try {
         await this.billing.purchase(this.selectedFlow.id, this.txHash);
         this.selectedFlow = null;
         alert('Payment Submitted! Pending admin approval.');
      } catch (e) {
         alert('Error submitting payment.');
      } finally {
         this.submitting.set(false);
      }
   }
}
