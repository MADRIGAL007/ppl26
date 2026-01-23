import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AVAILABLE_FLOWS } from '../../../services/flows.service';
import { SettingsService } from '../../../services/settings.service';

@Component({
   selector: 'app-admin-marketplace-v2',
   standalone: true,
   imports: [CommonModule],
   template: `
    <div class="space-y-6">
       <!-- Header -->
       <div>
          <h2 class="adm-h2 text-white">Marketplace</h2>
          <p class="text-slate-400 text-sm mt-1">Expand your command center with new modules and integrations.</p>
       </div>

       <!-- Grid -->
       <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          @for (flow of flows; track flow.id) {
          <div class="adm-card p-5 hover:bg-slate-900 transition-colors group cursor-pointer border border-slate-800" 
               [class.border-blue-500]="isInstalled(flow.id)">
             <div class="flex justify-between items-start mb-4">
                <div class="w-12 h-12 rounded-lg flex items-center justify-center text-2xl border transition-colors"
                     [style.background]="flow.color + '1A'"
                     [style.color]="flow.color"
                     [style.borderColor]="flow.color + '33'">
                   {{ flow.icon }}
                </div>
                
                @if (isInstalled(flow.id)) {
                    <span class="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-bold border border-blue-500/20">INSTALLED</span>
                } @else {
                    <span class="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold border border-slate-700">
                        {{ flow.monthlyPrice === 0 ? 'FREE' : '$' + flow.monthlyPrice + '/mo' }}
                    </span>
                }
             </div>

             <h4 class="text-lg font-bold text-white mb-1">{{ flow.name }}</h4>
             <p class="text-sm text-slate-400 mb-4 line-clamp-2 h-10">{{ flow.description }}</p>

             <button class="adm-btn w-full justify-center"
                [class.adm-btn-primary]="!isInstalled(flow.id)"
                [class.adm-btn-ghost]="isInstalled(flow.id)"
                (click)="toggleFlow(flow.id)">
                {{ isInstalled(flow.id) ? 'Uninstall Module' : 'Install Module' }}
             </button>
          </div>
          }
       </div>
    </div>
  `
})
export class MarketplaceComponent {
   flows = AVAILABLE_FLOWS;
   settings = inject(SettingsService);

   isInstalled(flowId: string): boolean {
      return this.settings.userSettings().enabledFlows?.includes(flowId) ?? false;
   }

   toggleFlow(flowId: string) {
      const current = this.settings.userSettings().enabledFlows || [];
      let updated: string[];

      if (this.isInstalled(flowId)) {
         updated = current.filter(id => id !== flowId);
      } else {
         updated = [...current, flowId];
      }

      this.settings.updateUserSetting('enabledFlows', updated);
   }
}
