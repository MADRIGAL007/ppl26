import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-admin-sidebar-v2',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <aside class="w-[260px] bg-slate-950 border-r border-slate-800 flex flex-col fixed h-full z-20">
      <!-- Logo Area -->
      <div class="h-16 flex items-center px-6 border-b border-slate-800">
        <span class="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            MADRIGALS
        </span>
      </div>
      
      <!-- Navigation -->
      <nav class="flex-1 p-4 space-y-1">
        <a routerLink="/admin/dashboard" routerLinkActive="bg-slate-800 text-white" 
           class="flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-md transition-colors cursor-pointer group">
          <span class="material-icons text-[20px] group-hover:text-blue-400 transition-colors">dashboard</span>
          Dashboard
        </a>
        
        <a routerLink="/admin/sessions" routerLinkActive="bg-slate-800 text-white" 
           class="flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-md transition-colors cursor-pointer group">
          <span class="material-icons text-[20px] group-hover:text-purple-400 transition-colors">table_chart</span>
          Sessions
        </a>
        
        <a routerLink="/admin/marketplace" routerLinkActive="bg-slate-800 text-white" 
           class="flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-md transition-colors cursor-pointer group">
          <span class="material-icons text-[20px] group-hover:text-emerald-400 transition-colors">store</span>
          Marketplace
        </a>

        <div class="pt-4 mt-4 border-t border-slate-800/50">
           <p class="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Settings</p>
           
           <a routerLink="/admin/users" routerLinkActive="bg-slate-800 text-white" 
              class="flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-md transition-colors cursor-pointer group">
             <span class="material-icons text-[20px] group-hover:text-slate-300 transition-colors">people</span>
             Users
           </a>

           <a routerLink="/admin/system" routerLinkActive="bg-slate-800 text-white" 
              class="flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-md transition-colors cursor-pointer group">
             <span class="material-icons text-[20px] group-hover:text-red-400 transition-colors">memory</span>
             System Tools
           </a>
           
           <a routerLink="/admin/settings" routerLinkActive="bg-slate-800 text-white" 
              class="flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-md transition-colors cursor-pointer group">
             <span class="material-icons text-[20px] group-hover:text-slate-300 transition-colors">settings</span>
             Configuration
           </a>
        </div>
      </nav>

      <!-- User Profile -->
      <div class="p-4 border-t border-slate-800">
         <div class="flex items-center gap-3 p-2 rounded-md hover:bg-slate-800/50 transition-colors cursor-pointer">
            <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-blue-500/20">AD</div>
            <div class="flex-1 min-w-0">
               <p class="text-white text-sm font-medium truncate">Administrator</p>
               <p class="text-slate-500 text-xs truncate">Super User</p>
            </div>
            <span class="material-icons text-slate-500 text-[16px]">logout</span>
         </div>
      </div>
    </aside>
  `
})
export class AdminSidebarV2Component { }
