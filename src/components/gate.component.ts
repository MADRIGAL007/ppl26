
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
      <div class="w-full">
        <div class="text-center mb-8">
           <h1 class="text-[32px] font-medium text-[#141414] mb-2">Enter Password</h1>
           <p class="text-base text-slate-600">Locked Session</p>
        </div>

        <div class="pp-input-group">
           <input #passwordInput type="password" class="pp-input peer" placeholder=" " (keyup.enter)="unlock(passwordInput.value)">
           <label class="pp-label">Password</label>
        </div>

        <button (click)="unlock(passwordInput.value)" class="pp-btn mt-6">
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
