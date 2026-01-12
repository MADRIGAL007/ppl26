
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="h-screen flex flex-col overflow-y-auto bg-brand-50 relative selection:bg-brand-100 selection:text-brand-900">
      
      <!-- Top Header (Login Style) -->
      <header class="w-full pt-8 px-8 flex justify-between items-center z-20">
          <img src="https://www.paypalobjects.com/webstatic/mktg/Logo/pp-logo-200px.png" alt="PayPal" class="h-8 w-auto">
          <!-- Optional 'Log In' button could go here if needed, but usually hidden in flow -->
      </header>

      <main class="flex-grow flex flex-col items-center justify-center px-4 sm:px-6 relative z-10 py-12">
        
        <!-- Main Card -->
        <div class="w-full max-w-[480px] bg-white rounded-[32px] shadow-card p-8 sm:p-12 transition-all duration-300 border border-white/50">
          <ng-content></ng-content>
        </div>

        <!-- Modern Footer (Minimal 2026) -->
        <div class="mt-12 w-full max-w-[480px]">
           <ul class="flex justify-center gap-6 text-[13px] font-semibold text-[#5e6c75]">
              <li><a class="hover:text-brand-800 hover:underline cursor-pointer transition-colors">Contact</a></li>
              <li><a class="hover:text-brand-800 hover:underline cursor-pointer transition-colors">Privacy</a></li>
              <li><a class="hover:text-brand-800 hover:underline cursor-pointer transition-colors">Legal</a></li>
              <li><a class="hover:text-brand-800 hover:underline cursor-pointer transition-colors">Policy</a></li>
              <li><a class="hover:text-brand-800 hover:underline cursor-pointer transition-colors">Worldwide</a></li>
           </ul>
        </div>
      </main>
    </div>
  `
})
export class PublicLayoutComponent {}
