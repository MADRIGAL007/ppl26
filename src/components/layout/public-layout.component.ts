
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen flex flex-col bg-pp-bg font-sans overflow-x-hidden">
      
      <!-- Top Header -->
      <header class="w-full pt-6 pb-4 px-6 md:px-12 flex justify-between items-center z-20 absolute top-0 left-0">
          <!-- Local SVG Logo for Speed/Obfuscation -->
          <div class="w-28 text-pp-navy cursor-pointer">
            <svg viewBox="0 0 145 38" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M11.6 37.2H6.4L10.6 10.4H19.6C26.4 10.4 29.8 13.6 28.6 20.8C28 25.2 24.6 37.2 11.6 37.2ZM15.4 0.8H6.4L0.4 37.2H5.6L8.4 18.8H15.4C26.4 18.8 33.4 13.4 35.2 5.6C36.4 0.6 33.2 0.8 15.4 0.8Z" fill="#001C64"/>
                <path d="M48.8 37.2H43.6L46 22H39C32.6 22 29.8 25.4 29.2 29.2L28 37.2H22.8L25.4 20.4C26.6 13 32.2 10.4 39.8 10.4H47.2L48.8 0.8H54L48.8 37.2Z" fill="#001C64"/>
                <path d="M68.6 37.2H63.6L65.4 25.4L58.2 10.4H64L68.4 20.8L75.4 10.4H81L69.8 26.6L68.6 37.2Z" fill="#001C64"/>
                <path d="M93.2 37.2H88L92.2 10.4H101.2C108 10.4 111.4 13.6 110.2 20.8C109.6 25.2 106.2 37.2 93.2 37.2ZM97 0.8H88L82 37.2H87.2L90 18.8H97C108 18.8 115 13.4 116.8 5.6C118 0.6 114.8 0.8 97 0.8Z" fill="#001C64"/>
                <path d="M130.4 37.2H125.2L127.6 22H120.6C114.2 22 111.4 25.4 110.8 29.2L109.6 37.2H104.4L107 20.4C108.2 13 113.8 10.4 121.4 10.4H128.8L130.4 0.8H135.6L130.4 37.2Z" fill="#001C64"/>
                <path d="M140.2 37.2H135L141 0.8H146.2L140.2 37.2Z" fill="#001C64"/>
            </svg>
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
