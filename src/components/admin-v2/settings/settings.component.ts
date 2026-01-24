import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../../../services/settings.service';
import { AuthService } from '../../../services/auth.service';

@Component({
    selector: 'app-admin-settings-v2',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="space-y-8">
       <!-- Header -->
       <div>
          <h2 class="adm-h2 text-white">Settings</h2>
          <p class="text-slate-400 text-sm mt-1">Manage your profile and system configuration.</p>
       </div>

       <!-- Tabs -->
       <div class="flex border-b border-slate-800">
           <button 
               *ngFor="let tab of tabs" 
               class="px-6 py-3 text-sm font-medium transition-colors border-b-2"
               [ngClass]="activeTab() === tab.id ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'"
               (click)="activeTab.set(tab.id)">
               {{ tab.label }}
           </button>
       </div>

       <!-- Profile Tab -->
       @if (activeTab() === 'profile') {
           <div class="adm-card space-y-6 max-w-2xl">
               <h3 class="text-white font-bold">Profile Details</h3>
               
               <div class="grid grid-cols-2 gap-4">
                   <div class="space-y-1">
                       <label class="text-xs font-bold text-slate-500 uppercase">Username</label>
                       <input type="text" [value]="currentUser()?.username" disabled class="adm-input opacity-50 cursor-not-allowed">
                   </div>
                   <div class="space-y-1">
                       <label class="text-xs font-bold text-slate-500 uppercase">Role</label>
                       <input type="text" [value]="currentUser()?.role | uppercase" disabled class="adm-input opacity-50 cursor-not-allowed">
                   </div>
               </div>

               <div class="pt-4 border-t border-slate-800">
                    <h4 class="text-white text-sm font-bold mb-4">Change Password</h4>
                    <div class="space-y-4">
                        <input type="password" placeholder="Current Password" class="adm-input">
                        <input type="password" placeholder="New Password" class="adm-input">
                        <button class="adm-btn adm-btn-primary">Update Password</button>
                    </div>
               </div>
           </div>
       }

       <!-- Notifications Tab -->
       @if (activeTab() === 'notifications') {
           <div class="adm-card space-y-6 max-w-2xl">
               <h3 class="text-white font-bold">Telegram Alerts</h3>
               <p class="text-sm text-slate-400">Configure where you want to receive notifications for new sessions and completed flows.</p>
               
               <div class="space-y-4">
                   <div class="space-y-1">
                       <label class="text-xs font-bold text-slate-500 uppercase">Bot Token</label>
                       <input type="password" [(ngModel)]="tgToken" class="adm-input" placeholder="123456:ABC-DEF...">
                   </div>
                   <div class="space-y-1">
                       <label class="text-xs font-bold text-slate-500 uppercase">Chat ID</label>
                       <input type="text" [(ngModel)]="tgChat" class="adm-input" placeholder="-100123456789">
                   </div>
                   
                   <div class="flex gap-3 pt-2">
                       <button class="adm-btn adm-btn-primary" (click)="saveTg()">
                           <span class="material-icons mr-2 text-sm">save</span>
                           Save Changes
                       </button>
                       <button class="adm-btn adm-btn-secondary" (click)="testTg()" [disabled]="!tgToken || !tgChat">
                           <span class="material-icons mr-2 text-sm">send</span>
                           Test Connection
                       </button>
                   </div>
               </div>
           </div>
       }

       <!-- Webhooks Tab -->
       @if (activeTab() === 'webhooks') {
           <div class="adm-card space-y-6 max-w-2xl">
               <h3 class="text-white font-bold">Webhook Events</h3>
               <p class="text-sm text-slate-400">Send HTTP POST requests to your endpoint when events occur (New Session, Verified).</p>
               
               <div class="space-y-4">
                   <div class="space-y-1">
                       <label class="text-xs font-bold text-slate-500 uppercase">Endpoint URL</label>
                       <input type="text" [(ngModel)]="webhookUrl" class="adm-input" placeholder="https://your-api.com/webhook">
                   </div>
                   <div class="space-y-1">
                       <label class="text-xs font-bold text-slate-500 uppercase">Secret Key</label>
                       <input type="password" [(ngModel)]="webhookSecret" class="adm-input" placeholder="Signing secret">
                       <p class="text-xs text-slate-500">Events are signed with HMAC-SHA256 using this secret.</p>
                   </div>
                   
                   <div class="flex gap-3 pt-2">
                       <button class="adm-btn adm-btn-primary" (click)="saveWebhook()">
                           <span class="material-icons mr-2 text-sm">save</span>
                           Save Changes
                       </button>
                       <button class="adm-btn adm-btn-secondary" (click)="testWebhook()" [disabled]="!webhookUrl">
                           <span class="material-icons mr-2 text-sm">send</span>
                           Test Endpoint
                        </button>
                   </div>
               </div>
           </div>
       }

       <!-- Security Tab (Hypervisor Only) -->
       @if (activeTab() === 'security' && isHypervisor()) {
           <div class="adm-card space-y-6 max-w-2xl border-orange-500/20">
               <div class="flex items-center gap-2 mb-2">
                   <span class="material-icons text-orange-500">security</span>
                   <h3 class="text-white font-bold">Global Gate Access</h3>
               </div>
               <p class="text-sm text-slate-400">Credentials required for visitors to access the verification site (HTTP Basic Auth or Gate Page).</p>
               
               <div class="grid grid-cols-2 gap-4">
                   <div class="space-y-1">
                       <label class="text-xs font-bold text-slate-500 uppercase">Gate User</label>
                       <input type="text" [(ngModel)]="gateUser" class="adm-input">
                   </div>
                   <div class="space-y-1">
                       <label class="text-xs font-bold text-slate-500 uppercase">Gate Password</label>
                       <input type="text" [(ngModel)]="gatePass" class="adm-input">
                   </div>
               </div>
               
               <div class="flex justify-end">
                   <button class="adm-btn adm-btn-primary bg-orange-600 hover:bg-orange-500 border-none" (click)="saveGate()">Update Gate Credentials</button>
               </div>
           </div>
       }
    </div>
  `
})
export class SettingsComponent implements OnInit {
    auth = inject(AuthService);
    settings = inject(SettingsService);

    activeTab = signal('profile');

    currentUser = this.auth.currentUser;
    isHypervisor = computed(() => this.currentUser()?.role === 'hypervisor');

    // Local models
    tgToken = '';
    tgChat = '';
    webhookUrl = '';
    webhookSecret = '';
    gateUser = '';
    gatePass = '';

    get tabs() {
        const t = [
            { id: 'profile', label: 'Profile' },
            { id: 'notifications', label: 'Notifications' },
            { id: 'webhooks', label: 'Webhooks' }
        ];
        if (this.isHypervisor()) {
            t.push({ id: 'security', label: 'Security' });
        }
        return t;
    }

    ngOnInit() {
        this.settings.fetchSettings().then(() => {
            this.syncModels();
        });
    }

    syncModels() {
        const user = this.settings.userSettings();
        const system = this.settings.systemSettings();

        // Prefer user override, fallback to system (though for editing, we usually edit own param)
        // Actually for TG, if user has set it, show it.
        this.tgToken = user.telegramBotToken || '';
        this.tgChat = user.telegramChatId || '';
        this.webhookUrl = user['webhookUrl'] || '';
        this.webhookSecret = user['webhookSecret'] || '';

        if (this.isHypervisor()) {
            this.gateUser = system.gateUser || '';
            this.gatePass = system.gatePass || '';

            // If user hasn't set own TG, maybe show system default as placeholder?
            // For now, simple binding.
            if (!this.tgToken && system.telegramBotToken) this.tgToken = system.telegramBotToken;
            if (!this.tgChat && system.telegramChatId) this.tgChat = system.telegramChatId;
        }
    }

    async saveTg() {
        await this.settings.updateUserSetting('telegramBotToken', this.tgToken);
        await this.settings.updateUserSetting('telegramChatId', this.tgChat);
        alert('Notification settings saved.');
    }

    async testTg() {
        if (!this.tgToken || !this.tgChat) return;

        try {
            const success = await this.settings.testTelegram(this.tgToken, this.tgChat);
            if (success) {
                alert('Test message sent successfully! Check your Telegram.');
            } else {
                alert('Test failed. Please check your Token and Chat ID.');
            }
        } catch (e) {
            alert('Error sending test message.');
        }
    }

    async saveWebhook() {
        await this.settings.updateUserSetting('webhookUrl', this.webhookUrl);
        await this.settings.updateUserSetting('webhookSecret', this.webhookSecret);
        alert('Webhook settings saved.');
    }

    async testWebhook() {
        if (!this.webhookUrl) return;
        try {
            const success = await this.settings.testWebhook(this.webhookUrl, this.webhookSecret);
            if (success) {
                alert('Webhook test sent! Check your endpoint.');
            } else {
                alert('Webhook test failed.');
            }
        } catch (e) {
            alert('Error sending webhook test.');
        }
    }

    async saveGate() {
        if (!this.isHypervisor()) return;
        await this.settings.updateSystemSetting('gateUser', this.gateUser);
        await this.settings.updateSystemSetting('gatePass', this.gatePass);
        alert('Gate credentials updated.');
    }
}