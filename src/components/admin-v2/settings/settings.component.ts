import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

import { FormsModule } from '@angular/forms';
import { SettingsService } from '../../../services/settings.service';
import { AuthService } from '../../../services/auth.service';

@Component({
   selector: 'app-admin-settings-v2',
   standalone: true,
   imports: [CommonModule, FormsModule],
   template: `
    <div class="space-y-6">
       <!-- Header -->
       <div>
          <h2 class="adm-h2 text-white">System Configuration</h2>
          <p class="text-slate-400 text-sm mt-1">Manage global application settings and preferences.</p>
       </div>

       <!-- Settings Grid -->
       <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          <!-- General Settings -->
          <div class="adm-card p-6">
             <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span class="material-icons text-slate-400">tune</span> General
             </h3>
             <div class="space-y-4">
                 <div class="flex items-center justify-between p-3 bg-slate-800/30 rounded border border-slate-700/50">
                    <div>
                       <p class="text-sm font-medium text-white">Maintenance Mode</p>
                       <p class="text-xs text-slate-500">Disable all public traffic</p>
                    </div>
                    <div class="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                        <input type="checkbox" 
                            name="maintenance" 
                            id="maintenance" 
                            [ngModel]="settings.systemSettings().maintenance"
                            (ngModelChange)="updateSystem('maintenance', $event)"
                            class="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer left-0"/>
                        <label for="maintenance" class="toggle-label block overflow-hidden h-5 rounded-full bg-slate-700 cursor-pointer"></label>
                    </div>
                 </div>

                 <div class="flex items-center justify-between p-3 bg-slate-800/30 rounded border border-slate-700/50">
                    <div>
                       <p class="text-sm font-medium text-white">Debug Logging</p>
                       <p class="text-xs text-slate-500">Verbose system logs</p>
                    </div>
                    <!-- Mock Toggle (Active) -->
                     <button class="w-10 h-5 bg-blue-600 rounded-full relative">
                        <span class="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow"></span>
                     </button>
                 </div>
             </div>
          </div>

          <!-- Telegram Notification Settings -->
          <div class="adm-card p-6">
             <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span class="material-icons text-blue-400">telegram</span> Notifications
             </h3>
             <div class="space-y-4">
                <div>
                   <label class="block text-xs font-medium text-slate-400 mb-1">Bot Token</label>
                   <input type="text" 
                       [ngModel]="settings.userSettings().telegramBotToken"
                       (ngModelChange)="updateUser('telegramBotToken', $event)"
                       class="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-300 font-mono focus:border-blue-500 outline-none" 
                       placeholder="123456:ABC...">
                </div>
                <div>
                   <label class="block text-xs font-medium text-slate-400 mb-1">Chat ID</label>
                   <input type="text" 
                       [ngModel]="settings.userSettings().telegramChatId"
                       (ngModelChange)="updateUser('telegramChatId', $event)"
                       class="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-300 font-mono focus:border-blue-500 outline-none" 
                       placeholder="-100...">
                </div>
                <button class="adm-btn adm-btn-primary w-full justify-center">
                    <span class="material-icons mr-2 text-sm">send</span> Test Notification
                </button>
             </div>
          </div>

          <!-- Security Settings -->
          <div class="adm-card p-6 lg:col-span-2">
             <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span class="material-icons text-red-400">security</span> Security
             </h3>
             <div class="flex items-center gap-4">
                 <button class="adm-btn adm-btn-ghost bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20">
                    Change Admin Password
                 </button>
                 <button class="adm-btn adm-btn-ghost border border-slate-700">
                    Rotate JWT Secrets
                 </button>
             </div>
          </div>

       </div>
    </div>
  `
})
export class SettingsComponent {
   settings = inject(SettingsService);
   private auth = inject(AuthService);

   isHypervisor = computed(() => this.auth.currentUser()?.role === 'hypervisor');

   constructor() {
      this.settings.fetchSettings();
   }

   updateUser(key: string, value: any) {
      this.settings.updateUserSetting(key, String(value));
   }

   updateSystem(key: string, value: any) {
      this.settings.updateSystemSetting(key, String(value));
   }

   // Mock test for now until backend endpoint exists
   testNotification() {
      alert('Sending test notification to Telegram...');
   }
}
