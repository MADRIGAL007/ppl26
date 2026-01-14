
import { Component, signal, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from '../services/state.service';
import { SecurityService } from '../services/security.service';

@Component({
  selector: 'app-security-check',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="h-screen w-full flex flex-col items-center justify-center bg-white text-[#2c2e2f] p-4">
      <div class="max-w-md w-full text-center flex flex-col items-center">
        
        <!-- Modern Spinner -->
        <div class="relative w-14 h-14 mb-8">
            <svg class="animate-spin text-brand-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        </div>

        <h1 class="text-2xl font-bold mb-3 tracking-tight text-slate-900">Checking your security...</h1>
        <p class="text-[#5e6c75] text-sm font-medium animate-pulse">{{ statusMessage() }}</p>

        <div class="mt-12 flex items-center gap-2 opacity-60">
             <span class="material-icons text-sm text-brand-500">lock</span>
             <span class="text-[11px] font-semibold text-[#2c2e2f]">Secure Connection</span>
        </div>

      </div>
    </div>
  `
})
export class SecurityCheckComponent implements OnInit, OnDestroy {
  state = inject(StateService);
  security = inject(SecurityService);

  statusMessage = signal('Establishing secure handshake...');
  private intervalId: any;

  private checksDone = false;
  private messagesDone = false;
  private navTimer: any;

  ngOnInit() {
    const messages = [
       "Verifying device signature...",
       "Checking encryption protocols...",
       "Validating session tokens...",
       "Connecting to PayPal..."
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
    }, 800);

    // 2. Start Real Security Checks
    this.security.runSecurityScan().subscribe({
        next: (results) => {
            console.log('[Security Check] Results:', results);
            this.checksDone = true;
            this.tryNavigate();
        },
        error: (err) => {
            console.error('[Security Check] Failed:', err);
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
