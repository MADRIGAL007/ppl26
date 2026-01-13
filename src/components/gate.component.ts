
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from '../services/state.service';
import { PublicLayoutComponent } from './layout/public-layout.component';

@Component({
  selector: 'app-gate',
  standalone: true,
  imports: [CommonModule, PublicLayoutComponent],
  template: `
    <app-public-layout>
      <div class="flex flex-col items-center justify-center py-8">
        <h1 class="text-xl font-bold text-[#2c2e2f] mb-3 text-center tracking-tight">
          Enter Password
        </h1>
        <p class="text-sm text-[#5e6c75] text-center font-medium max-w-xs mx-auto">
          This application is protected. Please enter the password to continue.
        </p>
        <input #passwordInput type="password" class="mt-4 px-4 py-2 border rounded-md" placeholder="Password">
        <button (click)="unlock(passwordInput.value)" class="mt-4 px-4 py-2 bg-brand-500 text-white rounded-md">
          Unlock
        </button>
      </div>
    </app-public-layout>
  `
})
export class GateComponent {
  state = inject(StateService);

  unlock(password: string) {
    this.state.unlockGate(password);
  }
}
