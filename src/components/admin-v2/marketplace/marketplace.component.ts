import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-admin-marketplace-v2',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="space-y-6">
       <!-- Header -->
       <div>
          <h2 class="adm-h2 text-white">Marketplace</h2>
          <p class="text-slate-400 text-sm mt-1">Expand your command center with new modules and integrations.</p>
       </div>

       <!-- Featured Banner -->
       <div class="relative rounded-xl overflow-hidden bg-gradient-to-r from-blue-900 to-indigo-900 border border-slate-800 p-8 flex items-center shadow-2xl">
          <div class="absolute inset-0 bg-[url('/assets/grid.svg')] opacity-20"></div>
          <div class="relative z-10 max-w-lg">
             <span class="px-2 py-1 rounded bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-500/30 mb-2 inline-block">NEW ARRIVAL</span>
             <h3 class="text-3xl font-bold text-white mb-2">Advanced Analytics Pro</h3>
             <p class="text-slate-300 mb-6">Unlock deep insights into user behavior, heatmaps, and conversion funnels. Visualize data like never before.</p>
             <button class="adm-btn adm-btn-primary px-6 py-2.5">
                <span class="material-icons mr-2">download</span> Install Module
             </button>
          </div>
          <div class="hidden lg:block absolute right-10 top-1/2 -translate-y-1/2">
             <span class="material-icons text-[180px] text-white/5 opacity-50 rotate-12">analytics</span>
          </div>
       </div>

       <!-- Grid -->
       <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <!-- Card 1 -->
          <div class="adm-card p-5 hover:bg-slate-900 transition-colors group cursor-pointer">
             <div class="flex justify-between items-start mb-4">
                <div class="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors">
                   <span class="material-icons text-2xl">security</span>
                </div>
                <span class="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold border border-slate-700">INSTALLED</span>
             </div>
             <h4 class="text-lg font-bold text-white mb-1">Bot Protection Suite</h4>
             <p class="text-sm text-slate-400 mb-4 line-clamp-2">Automatically detect and block automated bot traffic using AI-driven behavioral analysis.</p>
             <div class="flex items-center gap-1 text-xs text-slate-500">
                <span class="material-icons text-[14px] text-amber-500">star</span>
                <span class="text-slate-300 font-medium">4.9</span>
                <span>(1.2k)</span>
             </div>
          </div>

          <!-- Card 2 -->
          <div class="adm-card p-5 hover:bg-slate-900 transition-colors group cursor-pointer">
             <div class="flex justify-between items-start mb-4">
                <div class="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500 border border-purple-500/20 group-hover:bg-purple-500/20 transition-colors">
                   <span class="material-icons text-2xl">telegram</span>
                </div>
                <span class="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold border border-slate-700">FREE</span>
             </div>
             <h4 class="text-lg font-bold text-white mb-1">Telegram Notifier</h4>
             <p class="text-sm text-slate-400 mb-4 line-clamp-2">Get instant alerts sent directly to your Telegram channels when credentials are captured.</p>
             <div class="flex items-center gap-1 text-xs text-slate-500">
                <span class="material-icons text-[14px] text-amber-500">star</span>
                <span class="text-slate-300 font-medium">4.8</span>
                <span>(850)</span>
             </div>
          </div>

          <!-- Card 3 -->
           <div class="adm-card p-5 hover:bg-slate-900 transition-colors group cursor-pointer">
             <div class="flex justify-between items-start mb-4">
                <div class="w-12 h-12 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-500 border border-pink-500/20 group-hover:bg-pink-500/20 transition-colors">
                   <span class="material-icons text-2xl">palette</span>
                </div>
                <span class="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold border border-slate-700">PRO</span>
             </div>
             <h4 class="text-lg font-bold text-white mb-1">Custom Themes</h4>
             <p class="text-sm text-slate-400 mb-4 line-clamp-2">Add your own branding and custom CSS themes to the checkout flows.</p>
             <div class="flex items-center gap-1 text-xs text-slate-500">
                <span class="material-icons text-[14px] text-amber-500">star</span>
                <span class="text-slate-300 font-medium">4.7</span>
                <span>(320)</span>
             </div>
          </div>
       </div>
    </div>
  `
})
export class MarketplaceComponent { }
