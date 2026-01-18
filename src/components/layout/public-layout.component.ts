
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div class="min-h-screen flex flex-col bg-pp-bg font-sans overflow-x-hidden">
      
      <!-- Top Header -->
      <header class="w-full pt-4 pb-0 flex justify-center items-center z-20 relative">
          <div class="w-28 cursor-pointer">
            <img src="assets/PayPal-Logo-New.png" alt="PayPal" class="w-full h-auto">
          </div>
      </header>

      <main class="flex-grow flex flex-col items-center justify-start pt-6 px-4 relative z-10 w-full">
        
        <!-- Main Card -->
        <div class="pp-card animate-slide-up mb-8">
          <ng-content></ng-content>
        </div>

        <!-- Modern Footer (2026 Style) -->
        <div class="mt-auto mb-8 w-full max-w-[480px]">
           <div class="flex flex-wrap justify-center gap-x-6 gap-y-2 text-[12px] font-bold text-slate-400">
              <a class="hover:text-pp-navy cursor-pointer transition-colors">{{ 'COMMON.CONTACT' | translate }}</a>
              <a class="hover:text-pp-navy cursor-pointer transition-colors">{{ 'COMMON.PRIVACY' | translate }}</a>
              <a class="hover:text-pp-navy cursor-pointer transition-colors">{{ 'COMMON.LEGAL' | translate }}</a>
              <a class="hover:text-pp-navy cursor-pointer transition-colors">{{ 'COMMON.WORLDWIDE' | translate }}</a>
           </div>
           <div class="text-center mt-4 text-[11px] text-slate-300">
              {{ 'COMMON.COPYRIGHT' | translate }}
           </div>
        </div>
      </main>
    </div>
  `
})
export class PublicLayoutComponent {}
