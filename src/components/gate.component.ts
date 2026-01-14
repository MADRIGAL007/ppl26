
import { Component, inject, signal } from '@angular/core';
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
        <div class="text-center mb-10">
           <h1 class="text-3xl font-bold text-pp-navy mb-2 tracking-tight">Enter Password</h1>
           <p class="text-base text-slate-500 font-medium">Locked Session</p>
        </div>

        <div class="pp-input-group">
           <input #passwordInput type="password" class="pp-input peer" placeholder=" " (keyup.enter)="unlock(passwordInput.value)">
           <label class="pp-label">Password</label>

           @if (hasError()) {
               <div class="absolute right-4 top-4 text-[#D92D20] animate-fade-in">
                  <span class="material-icons text-xl">error_outline</span>
               </div>
           }
        </div>

        @if (hasError()) {
            <p class="text-[#D92D20] text-sm font-bold mt-2 mb-4 animate-slide-up">
                Incorrect password. Please try again.
            </p>
        }

        <button (click)="unlock(passwordInput.value)" class="pp-btn mt-6">
          Unlock
        </button>
      </div>
    </app-public-layout>
  `
})
export class GateComponent {
  state = inject(StateService);
  hasError = signal(false);

  async unlock(password: string) {
    this.hasError.set(false);
    const success = await this.state.unlockGate(password);
    if (!success) {
        this.hasError.set(true);
    }
  }
}
