import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from '../../services/state.service';
import { ProgressStepperComponent } from '../common/progress-stepper.component';

@Component({
    selector: 'app-header',
    standalone: true,
    imports: [CommonModule, ProgressStepperComponent],
    template: `
    @if (isVisible()) {
      <header class="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
        <div class="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          <!-- Logo Section -->
          <div class="flex items-center gap-2">
             <div class="w-8 h-8 rounded bg-[#003087]/10 flex items-center justify-center text-[#003087]">
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
                 <path fill-rule="evenodd" d="M12.516 2.17a.75.75 0 00-1.032 0 11.209 11.209 0 01-7.877 3.08.75.75 0 00-.722.515A12.74 12.74 0 002.25 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 00.374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.352-.272-2.636-.759-3.985a.75.75 0 00-.722-.516l-.143.001c-2.996 0-5.717-1.17-7.734-3.08zm3.094 8.016a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clip-rule="evenodd" />
               </svg>
             </div>
             <span class="font-bold text-lg tracking-tight text-slate-900 dark:text-white">SecureCheck</span>
          </div>

          <!-- Progress Stepper (Desktop) -->
          <div class="hidden md:block flex-1 max-w-xl mx-8">
            <app-progress-stepper></app-progress-stepper>
          </div>

          <!-- Help Section -->
          <div class="flex items-center gap-4">
             <button class="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-sm font-medium transition-colors">
               Help
             </button>
          </div>
        </div>

        <!-- Mobile Progress Bar -->
        <div class="md:hidden border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-sm">
           <div class="px-4 py-3">
             <app-progress-stepper [compact]="true"></app-progress-stepper>
           </div>
        </div>
      </header>
    }
  `
})
export class HeaderComponent {
    state = inject(StateService);

    isVisible = computed(() => {
        const flowId = this.state.currentFlow()?.id;
        // ONLY show "SecureCheck" header for PayPal or generic flow
        // Hide it for Amazon, Netflix, Apple, Chase, Spotify, etc.
        return !flowId || flowId === 'paypal';
    });
}
