import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsersService, User } from '../../services/users.service';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-users-view',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="p-6">
      <div class="flex justify-between items-center mb-6">
        <div>
           <h2 class="text-xl font-bold text-white">User Management</h2>
           <p class="text-sm text-slate-400">Manage customers and their subscription limits.</p>
        </div>
        <button (click)="openCreateModal()" 
           class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center gap-2">
           <span>➕</span> Add Customer
        </button>
      </div>

      <!-- Users Table -->
      <div class="bg-[#12121a] border border-[#2e2e3a] rounded-xl overflow-hidden">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="text-xs text-slate-500 uppercase bg-[#1a1a24] border-b border-[#2e2e3a]">
              <th class="px-6 py-4">Username</th>
              <th class="px-6 py-4">Role</th>
              <th class="px-6 py-4">Links Limit</th>
              <th class="px-6 py-4">Status</th>
              <th class="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#2e2e3a]">
            @for (user of users.users(); track user.id) {
              <tr class="hover:bg-[#1a1a24] transition-colors group">
                <td class="px-6 py-4">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                      {{ user.username.charAt(0).toUpperCase() }}
                    </div>
                    <div>
                      <div class="font-medium text-white">{{ user.username }}</div>
                      <div class="text-xs text-slate-500 font-mono">{{ user.id.substring(0,8) }}...</div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 text-sm text-slate-300">
                  <span [class.text-amber-400]="user.role === 'hypervisor'" [class.text-blue-400]="user.role === 'admin'">
                    {{ user.role | titlecase }}
                  </span>
                </td>
                <td class="px-6 py-4 text-sm text-slate-300">
                    {{ user.maxLinks }}
                </td>
                <td class="px-6 py-4">
                  <span class="px-2 py-1 rounded text-xs border"
                    [class.bg-green-500-10]="!user.isSuspended"
                    [class.text-green-400]="!user.isSuspended"
                    [class.border-green-500-20]="!user.isSuspended"
                    [class.bg-red-500-10]="user.isSuspended"
                    [class.text-red-400]="user.isSuspended"
                    [class.border-red-500-20]="user.isSuspended">
                    {{ user.isSuspended ? 'Suspended' : 'Active' }}
                  </span>
                </td>
                <td class="px-6 py-4 text-right">
                    <div class="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button (click)="impersonate(user)" class="p-2 hover:bg-[#2e2e3a] rounded text-slate-400 hover:text-white" title="Impersonate">
                            🕵️
                        </button>
                        <button (click)="editUser(user)" class="p-2 hover:bg-[#2e2e3a] rounded text-slate-400 hover:text-blue-400" title="Edit">
                            ✏️
                        </button>
                        @if (user.role !== 'hypervisor') {
                            <button (click)="deleteUser(user)" class="p-2 hover:bg-[#2e2e3a] rounded text-slate-400 hover:text-red-400" title="Delete">
                                🗑️
                            </button>
                        }
                    </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal -->
    @if (showModal()) {
        <div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div class="bg-[#12121a] border border-[#2e2e3a] rounded-xl w-full max-w-md p-6 relative">
                <button (click)="closeModal()" class="absolute top-4 right-4 text-slate-500 hover:text-white">✕</button>
                <h3 class="text-lg font-bold text-white mb-6">{{ isEditing() ? 'Edit User' : 'Create User' }}</h3>
                
                <form (ngSubmit)="saveUser()">
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm text-slate-400 mb-1">Username</label>
                            <input [(ngModel)]="formData.username" name="username" type="text" 
                                class="w-full bg-[#1a1a24] border border-[#2e2e3a] rounded-lg px-4 py-2 text-white outline-none focus:border-indigo-500">
                        </div>
                        <div>
                            <label class="block text-sm text-slate-400 mb-1">Password</label>
                            <input [(ngModel)]="formData.password" name="password" type="text" placeholder="Leave blank to keep current"
                                class="w-full bg-[#1a1a24] border border-[#2e2e3a] rounded-lg px-4 py-2 text-white outline-none focus:border-indigo-500">
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                             <div>
                                <label class="block text-sm text-slate-400 mb-1">Role</label>
                                <select [(ngModel)]="formData.role" name="role"
                                    class="w-full bg-[#1a1a24] border border-[#2e2e3a] rounded-lg px-4 py-2 text-white outline-none focus:border-indigo-500">
                                    <option value="admin">Admin</option>
                                    <option value="hypervisor">Hypervisor</option>
                                </select>
                             </div>
                             <div>
                                <label class="block text-sm text-slate-400 mb-1">Max Links</label>
                                <input [(ngModel)]="formData.maxLinks" name="maxLinks" type="number" 
                                    class="w-full bg-[#1a1a24] border border-[#2e2e3a] rounded-lg px-4 py-2 text-white outline-none focus:border-indigo-500">
                             </div>
                        </div>
                        
                        @if (isEditing()) {
                            <div class="flex items-center gap-2 pt-2">
                                <input type="checkbox" [(ngModel)]="formData.isSuspended" name="isSuspended" id="susp">
                                <label for="susp" class="text-sm text-white">Suspend User</label>
                            </div>
                        }
                    </div>

                    <div class="mt-6 flex justify-end gap-3">
                        <button type="button" (click)="closeModal()" class="px-4 py-2 text-slate-400 hover:text-white">Cancel</button>
                        <button type="submit" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg">Save</button>
                    </div>
                </form>
            </div>
        </div>
    }
  `
})
export class UsersViewComponent implements OnInit {
    users = inject(UsersService);
    auth = inject(AuthService);

    showModal = signal(false);
    isEditing = signal(false);
    editingId = signal<string | null>(null);

    formData: Partial<User> = {
        username: '',
        password: '',
        role: 'admin',
        maxLinks: 5,
        isSuspended: false
    };

    ngOnInit() {
        this.users.fetchUsers();
    }

    openCreateModal() {
        this.isEditing.set(false);
        this.editingId.set(null);
        this.formData = { username: '', password: '', role: 'admin', maxLinks: 5, isSuspended: false };
        this.showModal.set(true);
    }

    editUser(user: User) {
        this.isEditing.set(true);
        this.editingId.set(user.id);
        this.formData = { ...user, password: '' }; // Don't show password
        this.showModal.set(true);
    }

    closeModal() {
        this.showModal.set(false);
    }

    async saveUser() {
        if (this.isEditing() && this.editingId()) {
            await this.users.updateUser(this.editingId()!, this.formData);
        } else {
            await this.users.createUser(this.formData);
        }
        this.closeModal();
    }

    async deleteUser(user: User) {
        if (confirm(`Delete user ${user.username}? This cannot be undone.`)) {
            await this.users.deleteUser(user.id);
        }
    }

    async impersonate(user: User) {
        const success = await this.auth.impersonate(user.id);
        if (success) {
            window.location.reload();
        }
    }
}
