import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AdminSidebarV2Component } from './sidebar.component';
import { AdminTopbarV2Component } from './topbar.component';

@Component({
    selector: 'app-admin-layout-v2',
    standalone: true,
    imports: [CommonModule, RouterOutlet, AdminSidebarV2Component, AdminTopbarV2Component],
    template: `
    <div class="admin-root flex min-h-screen">
      <!-- Sidebar -->
      <app-admin-sidebar-v2></app-admin-sidebar-v2>

      <!-- Main Content -->
      <main class="flex-1 ml-[260px] bg-[#020617]">
        <!-- Top Header -->
        <app-admin-topbar-v2></app-admin-topbar-v2>

        <!-- Router Outlet -->
        <div class="p-8">
            <router-outlet></router-outlet>
        </div>
      </main>
    </div>
  `,
    styles: []
})
export class AdminLayoutV2Component { }
