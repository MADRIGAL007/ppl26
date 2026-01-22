import { Component, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataTableV2Component } from '../ui/data-table.component';
import { UsersService } from '../../../services/users.service';

@Component({
   selector: 'app-admin-users-v2',
   standalone: true,
   imports: [CommonModule, DataTableV2Component],
   template: `
    <div class="space-y-6">
       <!-- Header -->
       <div class="flex items-center justify-between">
          <div>
             <h2 class="adm-h2 text-white">User Management</h2>
             <p class="text-slate-400 text-sm mt-1">Manage system administrators and operators.</p>
          </div>
          <button class="adm-btn adm-btn-primary shadow-lg shadow-blue-500/20">
             <span class="material-icons mr-2">person_add</span>
             Add User
          </button>
       </div>

       <!-- Users Table -->
       <app-data-table-v2
          [title]="'System Users'"
          [columns]="columns"
          [data]="users()">
       </app-data-table-v2>
    </div>
  `
})
export class UsersComponent implements OnInit {
   private usersService = inject(UsersService);

   columns: { header: string; field: string; width?: string; textClass?: string; type?: 'default' | 'status' | 'time' | 'country'; class?: string }[] = [
      { header: 'Username', field: 'username', width: 'col-span-3', textClass: 'font-bold text-white' },
      { header: 'Role', field: 'role', width: 'col-span-3' },
      { header: 'Pass Code', field: 'uniqueCode', width: 'col-span-3', textClass: 'font-mono text-slate-400' },
      { header: 'Status', field: 'status', width: 'col-span-3', type: 'status' }
   ];

   users = computed(() => {
      return this.usersService.users().map(u => ({
         id: u.id,
         username: u.username,
         role: u.role,
         uniqueCode: u.uniqueCode,
         status: u.isSuspended ? 'blocked' : 'active'
      }));
   });

   ngOnInit() {
      this.usersService.fetchUsers();
   }
}
