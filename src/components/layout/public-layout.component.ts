
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen flex flex-col bg-pp-bg font-sans overflow-x-hidden">
      
      <!-- Top Header -->
      <header class="w-full pt-6 pb-4 px-6 md:px-12 flex justify-center items-center z-20 absolute top-0 left-0">
          <div class="w-32 cursor-pointer">
            <img src="assets/logo.png" alt="PayPal" class="w-full h-auto">
          </div>
      </header>

      <main class="flex-grow flex flex-col items-center justify-center px-4 relative z-10 w-full pt-16">
        
        <!-- Main Card -->
        <div class="pp-card animate-slide-up">
          <ng-content></ng-content>
        </div>

        <!-- Modern Footer (2026 Style) -->
        <div class="mt-8 mb-8 w-full max-w-[480px]">
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
