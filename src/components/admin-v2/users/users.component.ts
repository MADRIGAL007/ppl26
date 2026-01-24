import { Component, inject, computed, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataTableV2Component } from '../ui/data-table.component';
import { UsersService, User } from '../../../services/users.service';
import { UserDialogComponent } from './user-dialog.component';

@Component({
   selector: 'app-admin-users-v2',
   standalone: true,
   imports: [CommonModule, DataTableV2Component, UserDialogComponent],
   template: `
    <div class="space-y-6">
       <!-- Header -->
       <div class="flex items-center justify-between">
          <div>
             <h2 class="adm-h2 text-white">User Management</h2>
             <p class="text-slate-400 text-sm mt-1">Manage system administrators and operators.</p>
          </div>
          <button class="adm-btn adm-btn-primary shadow-lg shadow-blue-500/20" (click)="openCreate()">
             <span class="material-icons mr-2">person_add</span>
             Add User
          </button>
       </div>

       <!-- Users Table -->
       <app-data-table-v2
          [title]="'System Users'"
          [columns]="columns"
          [data]="users()"
          [actionTemplate]="actionButtons"
          [loading]="usersService.isLoading()">
       </app-data-table-v2>

       <!-- Row Actions Template -->
       <ng-template #actionButtons let-user>
           <button class="text-slate-400 hover:text-blue-400 p-1" (click)="openEdit(user)" title="Edit">
               <span class="material-icons text-sm">edit</span>
           </button>
           <button class="text-slate-400 hover:text-red-400 p-1" (click)="deleteUser(user)" title="Delete">
               <span class="material-icons text-sm">delete</span>
           </button>
       </ng-template>

       <!-- Create/Edit Dialog -->
       @if (showDialog()) {
           <app-user-dialog
               [user]="selectedUser()"
               (close)="closeDialog()"
               (saveUser)="handleSave($event)">
           </app-user-dialog>
       }
    </div>
  `
})
export class UsersComponent implements OnInit {
   usersService = inject(UsersService);

   showDialog = signal(false);
   selectedUser = signal<User | null>(null);

   columns: { header: string; field: string; width?: string; textClass?: string; type?: 'default' | 'status' | 'time' | 'country' | 'actions'; class?: string }[] = [
      { header: 'Username', field: 'username', width: 'col-span-3', textClass: 'font-bold text-white' },
      { header: 'Role', field: 'role', width: 'col-span-2' },
      { header: 'Pass Code', field: 'uniqueCode', width: 'col-span-2', textClass: 'font-mono text-slate-400' },
      { header: 'Max Links', field: 'maxLinks', width: 'col-span-2', textClass: 'font-mono text-slate-400' },
      { header: 'Status', field: 'status', width: 'col-span-2', type: 'status' },
      { header: '', field: 'actions', width: 'col-span-1', type: 'actions' }
   ];

   users = computed(() => {
      // Return raw user objects, but mapped for display where needed
      // Actually we should pass the raw object to the action template, 
      // but for display columns we might want transformation.
      // DataTable handles field access. 
      // Let's ensure the list has the fields we expect.
      return this.usersService.users().map(u => ({
         ...u,
         status: u.isSuspended ? 'blocked' : 'active'
      }));
   });

   ngOnInit() {
      this.usersService.fetchUsers();
   }

   openCreate() {
      this.selectedUser.set(null);
      this.showDialog.set(true);
   }

   openEdit(user: any) {
      this.selectedUser.set(user);
      this.showDialog.set(true);
   }

   closeDialog() {
      this.showDialog.set(false);
      this.selectedUser.set(null);
   }

   async handleSave(userData: any) {
      if (this.selectedUser()) {
         // Edit
         await this.usersService.updateUser(this.selectedUser()!.id, userData);
      } else {
         // Create
         await this.usersService.createUser(userData);
      }
      this.closeDialog();
   }

   async deleteUser(user: any) {
      if (confirm(`Are you sure you want to delete user ${user.username}?`)) {
         await this.usersService.deleteUser(user.id);
      }
   }
}
