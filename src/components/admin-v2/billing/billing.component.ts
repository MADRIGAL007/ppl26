import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-admin-billing-v2',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="space-y-6">
       <!-- Header -->
       <div>
          <h2 class="adm-h2 text-white">Billing & Subscription</h2>
          <p class="text-slate-400 text-sm mt-1">Manage your Madrigals license and add-ons.</p>
       </div>

       <!-- Plan Card -->
       <div class="adm-card p-0 overflow-hidden relative">
          <div class="bg-gradient-to-r from-slate-900 to-slate-800 p-8 border-b border-slate-800">
             <div class="flex justify-between items-start">
                 <div>
                    <span class="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold uppercase tracking-wider mb-4 inline-block">Active License</span>
                    <h3 class="text-3xl font-bold text-white">Pro Enterprise</h3>
                    <p class="text-slate-400 mt-2 max-w-lg">Unlimited flows, advanced fingerprinting, and priority support.</p>
                 </div>
                 <div class="text-right">
                    <p class="text-3xl font-bold text-white">$299<span class="text-lg text-slate-500 font-normal">/mo</span></p>
                    <p class="text-xs text-slate-500 mt-1">Next billing: Feb 22, 2026</p>
                 </div>
             </div>
          </div>
          <div class="p-8 bg-slate-950/30 flex gap-4">
              <button class="adm-btn adm-btn-primary">Manage Subscription</button>
              <button class="adm-btn adm-btn-ghost border border-slate-700">View Invoices</button>
          </div>
       </div>
    </div>
  `
})
export class BillingComponent { }
