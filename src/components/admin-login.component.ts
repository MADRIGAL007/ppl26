
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
    selector: 'app-admin-login',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div class="w-full max-w-md bg-[#12121a] border border-[#2e2e3a] rounded-xl p-8 shadow-2xl relative overflow-hidden">
        
        <!-- Glow Effect -->
        <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-600"></div>

        <div class="text-center mb-8">
          <h1 class="text-2xl font-bold text-white mb-2">Admin Portal</h1>
          <p class="text-slate-400 text-sm">Restricted Access Area</p>
        </div>

        @if (error()) {
          <div class="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
            <span class="material-icons text-red-500 text-sm">error</span>
            <span class="text-red-400 text-sm">{{ error() }}</span>
          </div>
        }

        <form (submit)="onSubmit()" class="space-y-6">
          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Username</label>
            <input 
              type="text" 
              [(ngModel)]="username" 
              name="username"
              class="w-full bg-[#1a1a24] border border-[#2e2e3a] rounded-lg p-3 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
              placeholder="admin"
            />
          </div>

          <div>
            <label class="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Password</label>
            <input 
              type="password" 
              [(ngModel)]="password" 
              name="password"
              class="w-full bg-[#1a1a24] border border-[#2e2e3a] rounded-lg p-3 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            [disabled]="isLoading()"
            class="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3 rounded-lg transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            @if (isLoading()) {
              <span class="material-icons animate-spin text-sm">refresh</span>
              <span>Authenticating...</span>
            } @else {
              <span>Secure Login</span>
              <span class="material-icons text-sm">arrow_forward</span>
            }
          </button>
        </form>

        <div class="mt-8 text-center">
            <p class="text-[10px] text-slate-600 font-mono">PPL26 HYPERVISOR v2.0</p>
        </div>
      </div>
    </div>
  `
})
export class AdminLoginComponent {
    private auth = inject(AuthService);
    private router = inject(Router);

    username = '';
    password = '';
    isLoading = signal(false);
    error = signal<string | null>(null);

    async onSubmit() {
        if (!this.username || !this.password) {
            this.error.set('Credentials required');
            return;
        }

        this.isLoading.set(true);
        this.error.set(null);

        const success = await this.auth.login(this.username, this.password);

        if (success) {
            this.router.navigate(['/admin']);
        } else {
            this.error.set('Invalid credentials or access denied');
            this.isLoading.set(false);
        }
    }
}
