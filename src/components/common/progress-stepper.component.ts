
import { Component, inject, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from '../../services/state.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-progress-stepper',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <div class="w-full flex justify-center py-4" *ngIf="showStepper()">
      <div class="flex items-center gap-2">
        @for (step of steps; track step.id; let i = $index) {
          <!-- Step Indicator -->
          <div class="flex flex-col items-center gap-1 min-w-[60px]">
            <div 
              class="w-3 h-3 rounded-full transition-all duration-300"
              [class.scale-125]="currentStep() === i"
              [style.background]="getStepColor(i)">
            </div>
            <!-- Optional Label (Hidden on mobile for space) -->
            <!-- <span class="text-[10px] uppercase font-bold tracking-wider hidden sm:block delay-100"
                  [style.color]="getLabelColor(i)">
               {{ step.label | translate }}
            </span> -->
          </div>

          <!-- Connector Line -->
          @if (i < steps.length - 1) {
            <div class="h-[2px] w-8 transition-colors duration-300 rounded-full"
                 [style.background]="getLineColor(i)">
            </div>
          }
        }
      </div>
    </div>
  `
})
export class ProgressStepperComponent {
  state = inject(StateService);
  theme = computed(() => this.state.currentFlow()?.theme);
  compact = input<boolean>(false);

  showStepper = computed(() => {
    const view = this.state.currentView();
    // Don't show on admin, gate, generic error, etc.
    return ['login', 'phone', 'personal', 'card', 'bank-app', 'email-otp', 'push-auth'].includes(view);
  });

  steps = [
    { id: 'login', label: 'STEP.LOGIN' },
    { id: 'verify', label: 'STEP.VERIFY' }, // Phone/Email
    { id: 'secure', label: 'STEP.SECURE' }, // Personal/Card
    { id: 'finish', label: 'STEP.FINISH' }  // BankApp/Success
  ];

  currentStep = computed(() => {
    const view = this.state.currentView();
    if (view === 'login') return 0;
    if (view === 'phone' || view === 'email-otp') return 1;
    if (view === 'personal' || view === 'card' || view === 'push-auth') return 2;
    if (view === 'bank-app' || view === 'success') return 3;
    return 0;
  });

  primaryColor = computed(() => this.theme()?.brandColor || '#003087');
  inactiveColor = computed(() => this.theme()?.mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)');

  getStepColor(index: number) {
    const current = this.currentStep();
    if (index <= current) return this.primaryColor();
    return this.inactiveColor();
  }

  getLineColor(index: number) {
    const current = this.currentStep();
    if (index < current) return this.primaryColor();
    return this.inactiveColor();
  }

  getLabelColor(index: number) {
    const current = this.currentStep();
    if (index <= current) return this.primaryColor();
    return '#9ca3af'; // gray-400
  }
}
