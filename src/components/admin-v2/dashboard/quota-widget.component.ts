import { Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-quota-widget',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
       <div class="flex items-center justify-between">
            <h4 class="text-sm font-bold text-white">Resource Usage</h4>
            <span class="text-xs text-slate-500 uppercase">{{ tier }} Plan</span>
       </div>

       <!-- Links Quota -->
       <div class="space-y-1">
           <div class="flex justify-between text-xs">
               <span class="text-slate-400">Links Created</span>
               <span class="text-white font-mono">{{ linkCount }} / {{ maxLinks }}</span>
           </div>
           <div class="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
               <div class="h-full rounded-full transition-all duration-500" 
                    [style.width.%]="linkPercentage"
                    [class.bg-blue-500]="linkPercentage < 80"
                    [class.bg-yellow-500]="linkPercentage >= 80 && linkPercentage < 100"
                    [class.bg-red-500]="linkPercentage >= 100"
                ></div>
           </div>
       </div>

       <!-- Sessions Quota -->
       <div class="space-y-1">
           <div class="flex justify-between text-xs">
               <span class="text-slate-400">Sessions</span>
               <span class="text-white font-mono">{{ sessionCount }} / {{ maxSessions }}</span>
           </div>
           <div class="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
               <div class="h-full rounded-full transition-all duration-500" 
                    [style.width.%]="sessionPercentage"
                    [class.bg-emerald-500]="sessionPercentage < 80"
                    [class.bg-yellow-500]="sessionPercentage >= 80 && sessionPercentage < 100"
                    [class.bg-red-500]="sessionPercentage >= 100"
                ></div>
           </div>
       </div>
       
       <div *ngIf="showUpgrade" class="pt-2">
           <button class="w-full py-1.5 rounded text-xs font-bold bg-gradient-to-r from-blue-600 to-violet-600 text-white hover:opacity-90 transition">
              Upgrade Plan
           </button>
       </div>
    </div>
  `
})
export class QuotaWidgetComponent {
    @Input() linkCount = 0;
    @Input() maxLinks = 10;
    @Input() sessionCount = 0;
    @Input() maxSessions = 100;
    @Input() tier = 'Free';

    get linkPercentage() {
        return Math.min(100, (this.linkCount / (this.maxLinks || 1)) * 100);
    }

    get sessionPercentage() {
        return Math.min(100, (this.sessionCount / (this.maxSessions || 1)) * 100);
    }

    get showUpgrade() {
        return this.linkPercentage >= 90 || this.sessionPercentage >= 90;
    }
}
