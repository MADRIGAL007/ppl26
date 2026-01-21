
import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SettingsService } from '../../services/settings.service';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-settings-view',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="p-6 max-w-4xl mx-auto">
      <h2 class="text-xl font-bold text-white mb-6">Settings</h2>

      <div class="grid gap-6">
          <!-- Telegram Settings (User Scoped) -->
          <div class="bg-[#12121a] border border-[#2e2e3a] rounded-xl p-6">
              <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span class="text-blue-400">📱</span> Telegram Integration
              </h3>
              <p class="text-sm text-slate-500 mb-4">Configure your personal bot to verify your sessions.</p>
              <div class="grid gap-4">
                  <div class="form-group">
                      <label class="block text-sm text-slate-400 mb-1">Bot Token</label>
                      <input type="text" 
                          [ngModel]="settings.userSettings().telegramBotToken"
                          (ngModelChange)="updateUser('telegramBotToken', $event)"
                          class="w-full bg-[#1a1a24] border border-[#2e2e3a] rounded-lg px-4 py-2 text-white focus:border-indigo-500 outline-none"
                          placeholder="123456:ABC...">
                  </div>
                  <div class="form-group">
                      <label class="block text-sm text-slate-400 mb-1">Chat ID</label>
                      <input type="text" 
                          [ngModel]="settings.userSettings().telegramChatId"
                          (ngModelChange)="updateUser('telegramChatId', $event)"
                          class="w-full bg-[#1a1a24] border border-[#2e2e3a] rounded-lg px-4 py-2 text-white focus:border-indigo-500 outline-none"
                          placeholder="-100...">
                  </div>
              </div>
          </div>

          <!-- Gate Protection (Hypervisor Only) -->
          @if (isHypervisor()) {
              <div class="bg-[#12121a] border border-[#2e2e3a] rounded-xl p-6">
                  <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <span class="text-red-400">🛡️</span> Gate Credentials (Global)
                  </h3>
                  <p class="text-sm text-slate-500 mb-4">Manage the global protection gate.</p>
                  <div class="grid gap-4 md:grid-cols-2">
                      <div class="form-group">
                          <label class="block text-sm text-slate-400 mb-1">Gate User</label>
                          <input type="text" 
                              [ngModel]="settings.systemSettings().gateUser"
                              (ngModelChange)="updateSystem('gateUser', $event)"
                              class="w-full bg-[#1a1a24] border border-[#2e2e3a] rounded-lg px-4 py-2 text-white focus:border-indigo-500 outline-none">
                      </div>
                      <div class="form-group">
                          <label class="block text-sm text-slate-400 mb-1">Gate Password</label>
                          <input type="text" 
                              [ngModel]="settings.systemSettings().gatePass"
                              (ngModelChange)="updateSystem('gatePass', $event)"
                              class="w-full bg-[#1a1a24] border border-[#2e2e3a] rounded-lg px-4 py-2 text-white focus:border-indigo-500 outline-none">
                      </div>
                  </div>
              </div>
          }
      </div>
    </div>
  `
})
export class SettingsViewComponent implements OnInit {
    settings = inject(SettingsService);
    auth = inject(AuthService);

    isHypervisor = signal(false);

    ngOnInit() {
        this.settings.fetchSettings();
        this.isHypervisor.set(this.auth.user()?.role === 'hypervisor');
    }

    updateUser(key: string, value: any) {
        this.settings.updateUserSetting(key, String(value));
    }

    updateSystem(key: string, value: any) {
        this.settings.updateSystemSetting(key, String(value));
    }
}
