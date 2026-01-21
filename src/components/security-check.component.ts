
import { Component, signal, OnInit, OnDestroy, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from '../services/state.service';
import { SecurityService } from '../services/security.service';
import { TranslatePipe } from '../pipes/translate.pipe';

@Component({
  selector: 'app-security-check',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div class="h-screen w-full flex flex-col items-center justify-center font-sans transition-colors duration-300"
         [style.background]="bgStyle()">
      <div class="max-w-md w-full text-center flex flex-col items-center">
        
        <!-- Dynamic Spinner -->
        <div class="relative w-16 h-16 mb-8">
            <div class="absolute inset-0 rounded-full border-[3px]" [style.border-color]="spinnerTrackColor()"></div>
            <div class="absolute inset-0 rounded-full border-[3px] border-l-transparent border-r-transparent border-b-transparent animate-spin"
                 [style.border-top-color]="spinnerColor()"></div>
        </div>

        <h1 class="text-2xl font-bold mb-3 tracking-tight animate-fade-in"
            [style.color]="textColor()">
            {{ 'SECURITY.CHECKING' | translate }}
        </h1>
        <p class="text-base font-medium animate-pulse opacity-80"
           [style.color]="textColor()">{{ statusMessage() | translate }}</p>

        <div class="mt-12 flex items-center gap-2 opacity-60">
             <span class="material-icons text-sm" [style.color]="successColor()">lock</span>
             <span class="text-[11px] font-bold" [style.color]="textColor()">{{ 'COMMON.SECURE_CONNECTION' | translate }}</span>
        </div>

      </div>
    </div>
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
  theme = computed(() => this.state.currentFlow()?.theme);

  bgStyle = computed(() => {
    const bg = this.theme()?.background;
    return bg?.type === 'color' ? bg.value : '#F5F7FA'; // Default for security check often just solid color logic or same as theme
  });

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
