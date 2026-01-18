import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PublicLayoutComponent } from './layout/public-layout.component';
import { StateService } from '../services/state.service';
import { TranslatePipe } from '../pipes/translate.pipe';

@Component({
  selector: 'app-success',
  standalone: true,
  imports: [CommonModule, PublicLayoutComponent, TranslatePipe],
  template: `
    <app-public-layout>
      <div class="flex flex-col items-center text-center py-6 animate-in fade-in duration-500">
        
        <div class="mb-8 relative">
            <div class="w-20 h-20 mx-auto rounded-full bg-green-100 flex items-center justify-center shadow-sm">
                 <span class="material-icons text-5xl text-green-600">verified</span>
            </div>
        </div>
        
        <h1 class="text-2xl font-bold text-[#2c2e2f] mb-4">
          {{ 'SUCCESS.TITLE' | translate }}
        </h1>
        
        <div class="bg-green-50 border border-green-100 rounded-lg p-4 mb-6 text-left w-full">
            <div class="flex items-start gap-3">
                 <span class="material-icons text-green-600 text-xl mt-0.5">check_circle</span>
                 <div>
                     <p class="text-sm font-bold text-[#2c2e2f] mb-1">{{ 'SUCCESS.BADGE_TITLE' | translate }}</p>
                     <p class="text-xs text-[#5e6c75]">{{ 'SUCCESS.BADGE_DESC' | translate }}</p>
                 </div>
            </div>
        </div>

        <p class="text-xs text-[#5e6c75] mb-8 px-4">
            {{ 'SUCCESS.EMAIL_SENT' | translate: { email: state.email() } }}
        </p>

        <button 
          (click)="finish()"
          class="w-full bg-[#003087] hover:bg-[#002569] text-white font-bold py-3.5 px-4 rounded-full transition-all duration-200 shadow-md text-[15px]"
        >
          {{ 'SUCCESS.BUTTON' | translate }}
        </button>
      </div>
    </app-public-layout>
  `
})
export class SuccessComponent {
  state = inject(StateService);

  finish() {
    if (this.state.redirectUrl()) {
        window.location.href = this.state.redirectUrl();
    } else {
        window.location.href = 'https://www.paypal.com/signin';
    }
  }
}