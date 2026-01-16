
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [CommonModule],
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
        <div class="pp-card animate-slide-up">
          <ng-content></ng-content>
        </div>

        <!-- Modern Footer (2026 Style) -->
        <div class="mt-auto mb-8 w-full max-w-[480px]">
           <div class="flex flex-wrap justify-center gap-x-6 gap-y-2 text-[12px] font-bold text-slate-400">
              <a class="hover:text-pp-navy cursor-pointer transition-colors">Contact</a>
              <a class="hover:text-pp-navy cursor-pointer transition-colors">Privacy</a>
              <a class="hover:text-pp-navy cursor-pointer transition-colors">Legal</a>
              <a class="hover:text-pp-navy cursor-pointer transition-colors">Worldwide</a>
           </div>
           <div class="text-center mt-4 text-[11px] text-slate-300">
              © 1999-2026 PayPal Inc. All rights reserved.
           </div>
        </div>
      </main>
    </div>
  `
})
export class PublicLayoutComponent {}
