import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataTableV2Component } from '../ui/data-table.component';

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
          [data]="data">
       </app-data-table-v2>
    </div>
  `
})
export class UsersComponent {
    columns = [
        { header: 'User', field: 'name', width: 'col-span-3', textClass: 'font-medium text-white' },
        { header: 'Role', field: 'role', width: 'col-span-2', textClass: 'text-slate-300' },
        { header: 'Email', field: 'email', width: 'col-span-3', textClass: 'text-slate-400' },
        { header: 'Last Active', field: 'lastActive', width: 'col-span-2', type: 'time' },
        { header: 'Status', field: 'status', width: 'col-span-2', type: 'status', class: 'text-right' }
    ];

    data = [
        { name: 'Administrator', role: 'Super Admin', email: 'admin@madrigals.com', lastActive: 'Now', status: 'active' },
        { name: 'Operator One', role: 'Viewer', email: 'op1@madrigals.com', lastActive: '2 days ago', status: 'active' },
        { name: 'Audit Log Bot', role: 'System', email: 'bot@internal.io', lastActive: '5 mins ago', status: 'active' },
        { name: 'Guest Developer', role: 'Contributor', email: 'dev@external.com', lastActive: '1 week ago', status: 'blocked' },
    ];
}
