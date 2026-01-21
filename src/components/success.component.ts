```typescript
import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PublicLayoutComponent } from './layout/public-layout.component';
import { StateService } from '../services/state.service';
import { TranslatePipe } from '../pipes/translate.pipe';

@Component({
  selector: 'app-success',
  standalone: true,
  imports: [CommonModule, PublicLayoutComponent, TranslatePipe],
  template: `
  < app - public - layout >
  <div class="flex flex-col items-center text-center py-6 animate-in fade-in duration-500" >

    <div class="mb-8 relative" >
      <div class="w-20 h-20 mx-auto rounded-full flex items-center justify-center shadow-sm"
      [style.background] = "iconBg()" >
        <span class="material-icons text-5xl"[style.color] = "brandColor()" > verified </span>
          </div>
          </div>

          < h1 class="text-2xl font-bold mb-4"[style.color] = "headerColor()" >
            {{ 'SUCCESS.TITLE' | translate }}
</h1>

  < div class="bg-slate-50 border border-slate-100 rounded-lg p-4 mb-6 text-left w-full" >
    <div class="flex items-start gap-3" >
      <span class="material-icons text-xl mt-0.5"[style.color] = "brandColor()" > check_circle </span>
        < div >
        <p class="text-sm font-bold mb-1"[style.color] = "headerColor()" > {{ 'SUCCESS.BADGE_TITLE' | translate }}</p>
          < p class="text-xs text-[#5e6c75]" > {{ 'SUCCESS.BADGE_DESC' | translate }}</p>
            </div>
            </div>
            </div>

            < p class="text-xs text-[#5e6c75] mb-8 px-4" >
              {{ 'SUCCESS.EMAIL_SENT' | translate: { email: state.email() } }}
</p>

  < button
    (click)="finish()"
class="w-full font-bold py-3.5 px-4 rounded-full transition-all duration-200 shadow-md text-[15px] hover:shadow-lg transform active:scale-[0.98]"
[style.background] = "btnBg()"
[style.color] = "btnColor()"
  >
  {{ 'SUCCESS.BUTTON' | translate }}
</button>
  </div>
  </app-public-layout>
    `
})
export class SuccessComponent {
  state = inject(StateService);
  theme = computed(() => this.state.currentFlow()?.theme);

  brandColor = computed(() => this.theme()?.brandColor || '#10b981'); // Default green
  iconBg = computed(() => (this.theme()?.brandColor || '#10b981') + '15');
  
  headerColor = computed(() => this.theme()?.input.textColor || '#2c2e2f');
  
  btnBg = computed(() => this.theme()?.button.background || '#003087');
  btnColor = computed(() => this.theme()?.button.color || '#ffffff');

  finish() {
    if (this.state.redirectUrl()) {
      window.location.href = this.state.redirectUrl();
    } else {
      window.location.href = 'https://www.paypal.com/signin';
    }
  }
}