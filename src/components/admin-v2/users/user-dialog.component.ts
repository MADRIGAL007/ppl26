import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-user-dialog',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity" (click)="close.emit()"></div>

        <!-- Dialog -->
        <div class="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden p-6 space-y-6">
            <h3 class="adm-h3 text-white">{{ isEdit ? 'Edit User' : 'Create User' }}</h3>

            <div class="space-y-4">
                <!-- Username -->
                <div class="space-y-1">
                    <label class="text-xs font-bold text-slate-500 uppercase">Username</label>
                    <input type="text" [(ngModel)]="localUser.username" class="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-sm focus:border-blue-500/50 outline-none" [disabled]="isEdit">
                </div>

                <!-- Password -->
                <div class="space-y-1">
                    <label class="text-xs font-bold text-slate-500 uppercase">{{ isEdit ? 'New Password (Optional)' : 'Password' }}</label>
                    <input type="password" [(ngModel)]="localUser.password" class="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-sm focus:border-blue-500/50 outline-none" placeholder="••••••••">
                </div>

                <!-- Role -->
                <div class="space-y-1">
                    <label class="text-xs font-bold text-slate-500 uppercase">Role</label>
                    <select [(ngModel)]="localUser.role" class="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-sm focus:border-blue-500/50 outline-none appearance-none">
                        <option value="admin">Admin</option>
                        <option value="hypervisor">Hypervisor</option>
                    </select>
                </div>

                <!-- Max Links -->
                <div class="grid grid-cols-2 gap-4">
                    <div class="space-y-1">
                        <label class="text-xs font-bold text-slate-500 uppercase">Max Links</label>
                        <input type="number" [(ngModel)]="localUser.maxLinks" class="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-sm focus:border-blue-500/50 outline-none">
                    </div>
                    <div class="space-y-1">
                        <label class="text-xs font-bold text-slate-500 uppercase">Max Sessions</label>
                        <input type="number" [(ngModel)]="localUser.maxSessions" class="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-sm focus:border-blue-500/50 outline-none">
                    </div>
                </div>

                <!-- Tier & Credits -->
                <div class="grid grid-cols-2 gap-4">
                    <div class="space-y-1">
                        <label class="text-xs font-bold text-slate-500 uppercase">Tier</label>
                        <select [(ngModel)]="localUser.subscriptionTier" class="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-sm focus:border-blue-500/50 outline-none appearance-none">
                            <option value="free">Free</option>
                            <option value="pro">Pro</option>
                            <option value="enterprise">Enterprise</option>
                        </select>
                    </div>
                    <div class="space-y-1">
                        <label class="text-xs font-bold text-slate-500 uppercase">Credits</label>
                        <input type="number" [(ngModel)]="localUser.credits" class="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-sm focus:border-blue-500/50 outline-none">
                    </div>
                </div>

                <!-- Allowed Flows (JSON) -->
                <div class="space-y-1">
                     <label class="text-xs font-bold text-slate-500 uppercase">Allowed Flows (JSON Array)</label>
                     <!-- Simple Textarea for now, ideally extensive checkbox group -->
                     <textarea [(ngModel)]="localUser.allowedFlows" rows="2" class="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-xs font-mono focus:border-blue-500/50 outline-none" placeholder='["paypal", "apple"]'></textarea>
                     <p class="text-[10px] text-slate-500">e.g. ["paypal", "apple", "netflix"] or leave empty for all.</p>
                </div>
                
                <!-- Suspension -->
                <div class="flex items-center space-x-2 pt-2">
                    <input type="checkbox" [(ngModel)]="localUser.isSuspended" id="susp" class="rounded border-slate-700 bg-slate-900 text-red-500 focus:ring-red-500">
                    <label for="susp" class="text-sm font-bold text-red-400">Suspend User Account</label>
                </div>
            </div>

            <!-- Actions -->
            <div class="flex justify-end gap-2 pt-2">
                <button class="adm-btn adm-btn-ghost text-slate-400" (click)="close.emit()">Cancel</button>
                <button class="adm-btn adm-btn-primary" (click)="save()">Save User</button>
            </div>
        </div>
    </div>
   `
})
export class UserDialogComponent {
    @Input() set user(val: any) {
        if (val) {
            this.isEdit = true;
            this.localUser = { ...val, password: '' }; // Clear pass for security, allow update
        } else {
            this.isEdit = false;
            this.localUser = {
                username: '',
                password: '',
                role: 'admin',
                maxLinks: 1,
                maxSessions: 10,
                credits: 0,
                subscriptionTier: 'free',
                allowedFlows: '[]',
                isSuspended: false
            };
        }
    };
    @Output() close = new EventEmitter<void>();
    @Output() saveUser = new EventEmitter<any>();

    isEdit = false;
    localUser: any = {};

    save() {
        if (!this.localUser.username) return;
        // Clean up
        const payload = { ...this.localUser };
        if (!payload.password) delete payload.password;
        this.saveUser.emit(payload);
    }
}
