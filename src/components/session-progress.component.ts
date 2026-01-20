import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface FlowStep {
    id: string;
    label: string;
    icon: string;
    status: 'pending' | 'active' | 'completed' | 'error';
}

@Component({
    selector: 'app-session-progress',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="session-progress flex items-center justify-between w-full px-2 py-3 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
      @for(step of steps(); track step.id; let i = $index; let last = $last) {
        <div class="flex items-center" [class.flex-1]="!last">
          <!-- Step Circle -->
          <div class="flex flex-col items-center relative">
            <div 
              class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 shadow-sm"
              [ngClass]="{
                'bg-pp-success text-white ring-2 ring-pp-success/20': step.status === 'completed',
                'bg-pp-blue text-white ring-2 ring-pp-blue/30 animate-pulse scale-110': step.status === 'active',
                'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500': step.status === 'pending',
                'bg-red-500 text-white ring-2 ring-red-500/20': step.status === 'error'
              }">
              @if (step.status === 'completed') {
                <span class="material-icons text-sm">check</span>
              } @else if (step.status === 'error') {
                <span class="material-icons text-sm">close</span>
              } @else {
                <span class="material-icons text-sm">{{ step.icon }}</span>
              }
            </div>
            <span 
              class="text-[9px] font-bold mt-1.5 whitespace-nowrap transition-colors"
              [ngClass]="{
                'text-pp-success': step.status === 'completed',
                'text-pp-blue': step.status === 'active',
                'text-slate-400 dark:text-slate-500': step.status === 'pending',
                'text-red-500': step.status === 'error'
              }">
              {{ step.label }}
            </span>
          </div>
          
          <!-- Connector Line -->
          @if (!last) {
            <div class="flex-1 mx-2">
              <div 
                class="h-0.5 rounded-full transition-all duration-500"
                [ngClass]="{
                  'bg-pp-success': step.status === 'completed',
                  'bg-gradient-to-r from-pp-blue to-slate-200 dark:to-slate-600': step.status === 'active',
                  'bg-slate-200 dark:bg-slate-700': step.status === 'pending'
                }">
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
    styles: [`
    :host {
      display: block;
      width: 100%;
    }
    
    .session-progress {
      min-height: 60px;
    }
    
    @keyframes pulse-glow {
      0%, 100% { box-shadow: 0 0 0 0 rgba(0, 112, 186, 0.4); }
      50% { box-shadow: 0 0 0 8px rgba(0, 112, 186, 0); }
    }
  `]
})
export class SessionProgressComponent {
    @Input() stage: string = 'login';
    @Input() isLoginVerified: boolean = false;
    @Input() isPhoneVerified: boolean = false;
    @Input() isPersonalVerified: boolean = false;
    @Input() isCardSubmitted: boolean = false;
    @Input() isFlowComplete: boolean = false;
    @Input() verificationFlow: 'otp' | 'app' | 'both' | 'complete' = 'complete';
    @Input() skipPhone: boolean = false;

    readonly steps = computed<FlowStep[]>(() => {
        const stepsConfig: FlowStep[] = [
            {
                id: 'login',
                label: 'Login',
                icon: 'login',
                status: this.getStepStatus('login')
            },
            {
                id: 'phone',
                label: this.skipPhone ? 'Skip' : 'Phone',
                icon: this.skipPhone ? 'skip_next' : 'phone_iphone',
                status: this.skipPhone ? 'completed' : this.getStepStatus('phone')
            },
            {
                id: 'personal',
                label: 'Personal',
                icon: 'person',
                status: this.getStepStatus('personal')
            },
            {
                id: 'card',
                label: 'Card',
                icon: 'credit_card',
                status: this.getStepStatus('card')
            },
            {
                id: 'verify',
                label: this.getVerifyLabel(),
                icon: this.getVerifyIcon(),
                status: this.getStepStatus('verify')
            }
        ];

        return stepsConfig;
    });

    private getStepStatus(stepId: string): 'pending' | 'active' | 'completed' | 'error' {
        const stage = this.stage;

        switch (stepId) {
            case 'login':
                if (this.isLoginVerified) return 'completed';
                if (stage === 'login' || stage === 'login_pending') return 'active';
                return 'pending';

            case 'phone':
                if (this.skipPhone) return 'completed';
                if (this.isPhoneVerified) return 'completed';
                if (stage === 'phone_pending') return 'active';
                if (this.isLoginVerified && !this.isPhoneVerified) return 'pending';
                return 'pending';

            case 'personal':
                if (this.isPersonalVerified) return 'completed';
                if (stage === 'personal_pending') return 'active';
                return 'pending';

            case 'card':
                if (this.isCardSubmitted) return 'completed';
                if (stage === 'card_pending') return 'active';
                return 'pending';

            case 'verify':
                if (this.isFlowComplete) return 'completed';
                if (stage === 'card_otp_pending' || stage === 'bank_app_pending' || stage === 'bank_app_input') return 'active';
                if (stage === 'final_review' || stage === 'complete') return 'completed';
                return 'pending';
        }

        return 'pending';
    }

    private getVerifyLabel(): string {
        if (this.verificationFlow === 'app') return 'App';
        if (this.verificationFlow === 'otp') return 'OTP';
        if (this.verificationFlow === 'both') return 'Verify';
        return 'Verify';
    }

    private getVerifyIcon(): string {
        if (this.verificationFlow === 'app') return 'touch_app';
        if (this.verificationFlow === 'otp') return 'sms';
        return 'verified_user';
    }
}
