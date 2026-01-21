
import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { StateService } from '../../services/state.service';
import { FlowTheme } from '../../services/flows.service';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    @if (isSplitLayout()) {
        <!-- Split Layout (Banking/Corporate) -->
        <div class="min-h-screen flex font-sans overflow-hidden bg-white">
            
            <!-- Sidebar (Left) -->
            <div class="hidden md:flex flex-col relative w-[400px] shadow-xl z-20"
                 [style.background]="bgStyle()">
                 
                 <!-- Header / Logo -->
                 <div class="p-8">
                     <div class="cursor-pointer" [style.height]="logoHeight()">
                        @if (logoUrl()) {
                            <img [src]="logoUrl()" alt="Logo" class="h-full w-auto object-contain brightness-0 invert"> 
                        }
                     </div>
                 </div>

                 <!-- Sidebar Content/Marketing -->
                 <div class="flex-grow flex items-center justify-center p-8 text-white opacity-90">
                     <div class="text-center">
                         <h2 class="text-3xl font-bold mb-4">{{ 'LOGIN.WELCOME' | translate }}</h2>
                         <p class="text-sm border-t border-white/20 pt-4 mt-2">
                            {{ 'COMMON.SECURE_CONNECTION' | translate }}
                         </p>
                     </div>
                 </div>

                 <!-- Sidebar Footer -->
                 <div class="p-6 text-xs text-white/60 text-center">
                    {{ 'COMMON.COPYRIGHT' | translate }} {{ flowName() }}
                 </div>
            </div>

            <!-- Main Content (Right) -->
            <div class="flex-1 flex flex-col relative overflow-y-auto bg-white">
                 <!-- Mobile Header -->
                 <div class="md:hidden p-4 flex justify-center bg-[#0060a9]" [style.background]="primaryColor()">
                     <img [src]="logoUrl()" class="h-8 brightness-0 invert">
                 </div>

                 <div class="flex-grow flex flex-col items-center justify-center p-4 sm:p-12">
                     <div class="w-full max-w-[400px] animate-fade-in space-y-6">
                        <ng-content></ng-content>
                     </div>
                 </div>
                 
                 <!-- Mobile Footer -->
                 <div class="md:hidden p-4 text-center text-xs text-slate-400">
                    <div class="flex justify-center gap-4 mb-2">
                        <span>Privacy</span>
                        <span>Security</span>
                    </div>
                 </div>
            </div>
        </div>
    } @else {
        <!-- Centered Layout (Standard) -->
        <div class="min-h-screen flex flex-col font-sans overflow-x-hidden transition-colors duration-300 bg-cover bg-center"
             [style.background]="bgStyle()"
             [style.--primary-color]="primaryColor()">
          
          <!-- Top Header -->
          <header class="w-full pt-4 pb-0 px-6 flex items-center z-20 relative"
                  [style.justify-content]="headerAlign()">
              <div class="cursor-pointer transition-transform hover:scale-105" [style.height]="logoHeight()">
                @if (logoUrl()) {
                    <img [src]="logoUrl()" alt="Logo" class="h-full w-auto object-contain">
                } @else {
                    <span class="text-2xl font-bold" [style.color]="'#333'">{{ flowName() }}</span>
                }
              </div>
          </header>

          <main class="flex-grow flex flex-col items-center justify-start pt-6 px-4 relative z-10 w-full">
            
            <!-- Main Card -->
            <div class="animate-slide-up mb-8 w-full transition-all duration-300"
                 [style.max-width]="cardMaxWidth()"
                 [style.background]="cardBg()"
                 [style.border]="cardBorder()"
                 [style.border-radius]="cardRadius()"
                 [style.box-shadow]="cardShadow()"
                 [style.padding]="cardPadding()">
              <ng-content></ng-content>
            </div>

            <!-- Dynamic Footer -->
            @if (showFooter()) {
                <div class="mt-auto mb-8 w-full max-w-[480px]" [style.color]="footerColor()">
                   <div class="flex flex-wrap justify-center gap-x-6 gap-y-2 text-[12px] font-bold opacity-80">
                      @for (link of footerLinks(); track link.text) {
                          <a class="hover:underline cursor-pointer transition-colors">{{ link.text }}</a>
                      }
                   </div>
                   <div class="text-center mt-4 text-[11px] opacity-60">
                      {{ 'COMMON.COPYRIGHT' | translate }} {{ flowName() }}
                   </div>
                </div>
            }
          </main>
        </div>
    }
  `
})
export class PublicLayoutComponent {
  private state = inject(StateService);

  flow = computed(() => this.state.currentFlow());
  theme = computed(() => this.flow()?.theme);

  // Layout Mode
  isSplitLayout = computed(() => this.theme()?.layout === 'split');

  // Theme Computeds
  bgStyle = computed(() => {
    const bg = this.theme()?.background;
    if (bg?.type === 'image') return bg.value; // url(...)
    if (bg?.type === 'gradient') return bg.value;
    return bg?.value || '#F5F7FA';
  });

  primaryColor = computed(() => this.theme()?.button.background || '#003087');

  // Header
  headerAlign = computed(() => this.theme()?.header.alignment === 'left' ? 'flex-start' : 'center');
  logoHeight = computed(() => this.theme()?.header.logoHeight || '32px');
  logoUrl = computed(() => this.theme()?.header.logoUrl || this.state.logoUrl());
  flowName = computed(() => this.flow()?.name || 'Service');

  // Card (Only used in Centered)
  cardMaxWidth = computed(() => this.theme()?.card.maxWidth || '450px');
  cardBg = computed(() => this.theme()?.card.background || '#ffffff');
  cardBorder = computed(() => this.theme()?.card.border || '1px solid #e5e7eb');
  cardRadius = computed(() => this.theme()?.card.radius || '0.75rem');
  cardShadow = computed(() => this.theme()?.card.shadow || '0 4px 6px -1px rgba(0, 0, 0, 0.1)');
  cardPadding = computed(() => this.theme()?.card.padding || '2.5rem');

  // Footer
  showFooter = computed(() => this.theme()?.footer.style !== 'hidden');
  footerColor = computed(() => this.theme()?.footer.textColor || '#6b7280');
  footerLinks = computed(() => this.theme()?.footer.links || [
    { text: 'Contact' }, { text: 'Privacy' }, { text: 'Legal' }
  ]);
}
