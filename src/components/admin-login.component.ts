
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
    <div class="min-h-screen bg-[var(--adm-bg-base)] flex items-center justify-center p-4">
      <div class="w-full max-w-md bg-[var(--adm-bg-card)] border border-[var(--adm-border)] rounded-xl p-8 shadow-2xl relative overflow-hidden group">
        
        <!-- Glow Effect -->
        <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-600 shadow-[0_0_20px_rgba(59,130,246,0.5)]"></div>
        <div class="absolute -inset-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur opacity-0 group-hover:opacity-100 transition duration-1000"></div>

        <div class="relative z-10">
            <div class="text-center mb-10">
              <h1 class="adm-h1 text-white mb-2 tracking-tighter">MADRIGALS</h1>
              <p class="text-slate-400 text-xs font-mono uppercase tracking-[0.2em]">Command Center Access</p>
            </div>

            @if (error()) {
              <div class="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 animate-fade-in">
                <span class="material-icons text-red-500 text-sm">error_outline</span>
                <span class="text-red-400 text-sm">{{ error() }}</span>
              </div>
            }

            <form (submit)="onSubmit()" class="space-y-6">
              <div class="space-y-4">
                  <div class="relative group/input">
                    <span class="material-icons absolute left-3 top-3.5 text-slate-500 group-focus-within/input:text-blue-400 transition-colors text-sm">person</span>
                    <input 
                      type="text" 
                      [(ngModel)]="username" 
                      name="username"
                      class="w-full bg-slate-950/50 border border-slate-700/50 rounded-lg py-3 pl-10 pr-4 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none placeholder:text-slate-600"
                      placeholder="Operator ID"
                    />
                  </div>

                  <div class="relative group/input">
                    <span class="material-icons absolute left-3 top-3.5 text-slate-500 group-focus-within/input:text-blue-400 transition-colors text-sm">lock</span>
                    <input 
                      type="password" 
                      [(ngModel)]="password" 
                      name="password"
                      class="w-full bg-slate-950/50 border border-slate-700/50 rounded-lg py-3 pl-10 pr-4 text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all outline-none placeholder:text-slate-600"
                      placeholder="Access Key"
                    />
                  </div>
              </div>

              <button 
                type="submit" 
                [disabled]="isLoading()"
                class="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 rounded-lg transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 border border-blue-500/20">
                @if (isLoading()) {
                  <span class="material-icons animate-spin text-sm">sync</span>
                  <span class="text-sm">Verifying Credentials...</span>
                } @else {
                  <span class="text-sm">Initiate Session</span>
                  <span class="material-icons text-sm">login</span>
                }
              </button>
            </form>

            <div class="mt-8 text-center flex justify-center gap-4 text-[10px] text-slate-600 font-mono opacity-50">
                <span>V2.4.0-STABLE</span>
                <span>•</span>
                <span>SECURE CONNECTION</span>
            </div>
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
