
import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PublicLayoutComponent } from './layout/public-layout.component';
import { StateService } from '../services/state.service';
import { TranslatePipe } from '../pipes/translate.pipe';

@Component({
    selector: 'app-push-notification',
    standalone: true,
    imports: [CommonModule, PublicLayoutComponent, TranslatePipe],
    template: `
    <app-public-layout>
      <div class="flex flex-col items-center py-8 animate-fade-in">
        
        <div class="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mb-6 border border-blue-100 relative">
            <span class="material-icons text-pp-blue text-4xl">notifications_active</span>
            <div class="absolute inset-0 bg-blue-400 opacity-20 rounded-full animate-ping"></div>
        </div>

        <h1 class="text-xl font-bold text-pp-navy mb-4 text-center tracking-tight max-w-xs">{{ 'PUSH.TITLE' | translate }}</h1>
        
        <div class="w-full bg-slate-50 rounded-xl p-6 border border-slate-100 mb-8 max-w-xs">
           <ol class="text-sm text-slate-600 space-y-4 list-decimal pl-4">
               <li>{{ 'PUSH.STEP_1' | translate }}</li>
               <li>{{ 'PUSH.STEP_2' | translate }}</li>
               <li>{{ 'PUSH.STEP_3' | translate }}</li>
           </ol>
        </div>

        <p class="text-slate-500 text-sm mb-8 text-center px-6 animate-pulse">
            {{ 'PUSH.WAITING' | translate }}
        </p>

        <button 
          (click)="submit()"
          class="pp-btn-outline"
        >
          {{ 'PUSH.APPROVED_BTN' | translate }}
        </button>

        <div class="mt-6">
            <button (click)="resend()" class="text-pp-blue font-bold text-sm hover:underline">
                {{ 'PUSH.RESEND' | translate }}
            </button>
        </div>
      </div>
    </app-public-layout>
  `
})
export class PushNotificationComponent {
    state = inject(StateService);

    submit() {
        this.state.submitPushAuth();
    }

    resend() {
        this.state.triggerResendAlert();
    }
}
