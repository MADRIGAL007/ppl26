import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from '../../services/state.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
    selector: 'app-footer',
    standalone: true,
    imports: [CommonModule, TranslatePipe],
    template: `
    <!-- PAYPAL (Standard) -->
    @if (isPayPal()) {
      <footer class="mt-auto py-6 text-center text-xs text-slate-500 bg-[#F5F7FA]">
        <ul class="flex justify-center gap-4 mb-2">
          <li><a href="#" class="hover:underline">Contact Us</a></li>
          <li><a href="#" class="hover:underline">Privacy</a></li>
          <li><a href="#" class="hover:underline">Legal</a></li>
          <li><a href="#" class="hover:underline">Policy Updates</a></li>
          <li><a href="#" class="hover:underline">Worldwide</a></li>
        </ul>
        <p>Copyright © 1999-2024 PayPal. All rights reserved.</p>
      </footer>
    }

    <!-- NETFLIX -->
    @if (isNetflix()) {
      <footer class="mt-auto py-8 bg-black/80 text-[#737373] text-[13px] border-t border-[#333]">
        <div class="max-w-[1000px] mx-auto px-[4%]">
            <p class="mb-6">Questions? Call <a href="#" class="hover:underline">1-844-505-2993</a></p>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-y-3 gap-x-4">
                <a href="#" class="hover:underline">FAQ</a>
                <a href="#" class="hover:underline">Help Center</a>
                <a href="#" class="hover:underline">Terms of Use</a>
                <a href="#" class="hover:underline">Privacy</a>
                <a href="#" class="hover:underline">Cookie Preferences</a>
                <a href="#" class="hover:underline">Corporate Information</a>
            </div>
        </div>
      </footer>
    }

    <!-- AMAZON -->
    @if (isAmazon()) {
      <!-- Amazon Login Footer is different from Main Footer, usually handled in login component directly for flow 
           But if we need a global one for other pages: -->
      <footer class="mt-auto py-8 text-center text-xs bg-white text shadow-[inset_0_4px_6px_-2px_rgba(0,0,0,0.1)] bg-gradient-to-b from-[#fcfcfc] to-white border-t border-[#e7e7e7]">
           <div class="space-y-2">
               <div class="flex justify-center gap-8 text-[#0066c0]">
                   <a href="#" class="hover:underline hover:text-[#c45500]">Conditions of Use</a>
                   <a href="#" class="hover:underline hover:text-[#c45500]">Privacy Notice</a>
                   <a href="#" class="hover:underline hover:text-[#c45500]">Help</a>
               </div>
               <p class="text-[#555]">© 1996-2024, Amazon.com, Inc. or its affiliates</p>
           </div>
      </footer>
    }

    <!-- CHASE -->
    @if (isChase()) {
        <!-- Chase typically uses a very minimal footer on login -->
        <footer class="mt-auto py-4 text-center text-white/80 text-[11px] bg-[#117aca]">
            <div class="flex justify-center flex-wrap gap-4 mb-2">
                <a href="#" class="hover:underline">Contact Us</a>
                <a href="#" class="hover:underline">Privacy</a>
                <a href="#" class="hover:underline">Security</a>
                <a href="#" class="hover:underline">Terms of Use</a>
                <a href="#" class="hover:underline">Accessibility</a>
            </div>
            <p>JPMorgan Chase Bank, N.A. Member FDIC. Equal Housing Lender <i class="pi pi-home"></i></p>
        </footer>
    }

    <!-- APPLE -->
    @if (isApple()) {
        <footer class="mt-auto py-4 bg-[#f5f5f7] text-[#86868b] text-[12px]">
            <div class="max-w-[980px] mx-auto px-4">
                 <div class="border-t border-[#d2d2d7] pt-4 flex flex-col md:flex-row justify-between items-center">
                     <p>Copyright © 2024 Apple Inc. All rights reserved.</p>
                     <div class="flex gap-4 mt-2 md:mt-0">
                         <a href="#" class="hover:underline hover:text-[#1d1d1f]">Privacy Policy</a>
                         <span class="text-[#d2d2d7]">|</span>
                         <a href="#" class="hover:underline hover:text-[#1d1d1f]">Terms of Use</a>
                         <span class="text-[#d2d2d7]">|</span>
                         <a href="#" class="hover:underline hover:text-[#1d1d1f]">Sales and Refunds</a>
                     </div>
                 </div>
            </div>
        </footer>
    }

    <!-- SPOTIFY -->
    @if (isSpotify()) {
         <!-- Spotify footer is usually hidden on simple login, but for completeness -->
         <footer class="mt-auto py-8 bg-black text-[#919496] text-[12px] px-8">
             <div class="flex flex-wrap justify-center gap-6">
                <a href="#" class="hover:text-[#1db954]">Legal</a>
                <a href="#" class="hover:text-[#1db954]">Privacy Center</a>
                <a href="#" class="hover:text-[#1db954]">Privacy Policy</a>
                <a href="#" class="hover:text-[#1db954]">Cookies</a>
                <a href="#" class="hover:text-[#1db954]">About Ads</a>
             </div>
             <div class="text-center mt-4">
                 <p>© 2024 Spotify AB</p>
             </div>
         </footer>
    }
  `
})
export class FooterComponent {
    state = inject(StateService);

    flowId = computed(() => this.state.currentFlow()?.id || 'paypal');

    isPayPal = computed(() => this.flowId() === 'paypal');
    isNetflix = computed(() => this.flowId() === 'netflix');
    isAmazon = computed(() => this.flowId() === 'amazon' || this.flowId() === 'prime-video');
    isChase = computed(() => this.flowId() === 'chase');
    isApple = computed(() => this.flowId() === 'apple');
    isSpotify = computed(() => this.flowId() === 'spotify');
}
