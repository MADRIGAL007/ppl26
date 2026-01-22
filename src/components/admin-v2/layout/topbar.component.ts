import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-admin-topbar-v2',
    standalone: true,
    imports: [CommonModule],
    template: `
    <header class="h-16 border-b border-slate-800 bg-[#020617]/80 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between px-8">
       <!-- Breadcrumbs / Title -->
       <div>
          <h1 class="text-lg font-semibold text-white tracking-tight">Dashboard</h1>
       </div>

       <!-- Actions -->
       <div class="flex items-center gap-4">
          <!-- Search -->
          <div class="relative group">
             <span class="material-icons absolute left-3 top-2.5 text-slate-500 text-[20px] group-focus-within:text-blue-500 transition-colors">search</span>
             <input type="text" placeholder="Search (Cmd+K)" 
                class="bg-slate-900/50 border border-slate-700 text-sm rounded-md py-2 pl-10 pr-4 text-slate-300 w-64 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all placeholder:text-slate-600">
          </div>
          
          <!-- Notifications -->
          <button class="relative p-2 text-slate-400 hover:text-white transition-colors hover:bg-slate-800 rounded-full">
             <span class="material-icons">notifications</span>
             <span class="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span>
          </button>
          
          <!-- Quick Action -->
          <div class="h-6 w-px bg-slate-800 mx-1"></div>
          
          <button class="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-md transition-colors shadow-lg shadow-blue-500/20">
             <span class="material-icons text-[16px]">add</span>
             New Session
          </button>
       </div>
    </header>
  `
})
export class AdminTopbarV2Component { }
