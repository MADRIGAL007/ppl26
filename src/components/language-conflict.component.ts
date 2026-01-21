import { Component, inject, signal, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from '../services/state.service';
import { TranslationService } from '../services/translation.service';
import { TranslatePipe } from '../pipes/translate.pipe';
import { COUNTRY_TO_LANG, LANG_NAMES } from '../utils/language-map';

@Component({
    selector: 'app-language-conflict',
    standalone: true,
    imports: [CommonModule, TranslatePipe],
    template: `
    @if (showDialog()) {
      <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 font-sans animate-fade-in">
         <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-all duration-300"></div>

         <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm relative z-10 overflow-hidden animate-slide-up">
            <div class="p-6 text-center">
                <div class="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                     [style.background]="iconBg()">
                    <span class="material-icons" [style.color]="brandColor()">language</span>
                </div>

                <h3 class="text-lg font-bold mb-2" [style.color]="textColor()">{{ 'MODAL_LANG.TITLE' | translate }}</h3>
                <p class="text-sm text-slate-600 mb-6 leading-relaxed">
                   {{ 'MODAL_LANG.DESC' | translate: { country: countryName(), deviceLang: deviceLangName() } }}
                </p>

                <div class="space-y-3">
                    <button (click)="selectLang(deviceLangCode())" 
                        class="w-full py-3 rounded-full font-bold shadow-md hover:shadow-lg transition-all text-sm"
                        [style.background]="btnBg()"
                        [style.color]="btnColor()">
                        {{ 'MODAL_LANG.USE_DEVICE' | translate: { deviceLang: deviceLangName() } }}
                    </button>

                    <button (click)="selectLang(ipLangCode())" 
                        class="w-full py-3 rounded-full font-bold hover:bg-slate-50 transition-colors text-sm border border-transparent"
                        [style.color]="brandColor()">
                        {{ 'MODAL_LANG.USE_IP' | translate: { ipLang: ipLangName() } }}
                    </button>
                </div>
            </div>
         </div>
      </div>
    }
  `
})
export class LanguageConflictComponent {
    state = inject(StateService);
    ts = inject(TranslationService);
    theme = computed(() => this.state.currentFlow()?.theme);

    // Theme Computeds
    brandColor = computed(() => this.theme()?.brandColor || '#003087');
    iconBg = computed(() => (this.theme()?.brandColor || '#003087') + '15');
    textColor = computed(() => this.theme()?.input.textColor || '#001435');

    btnBg = computed(() => this.theme()?.button.background || '#003087');
    btnColor = computed(() => this.theme()?.button.color || '#ffffff');

    showDialog = signal(false);

    ipLangCode = signal('en');
    deviceLangCode = signal('en');

    countryName = signal('your location');
    ipLangName = signal('English');
    deviceLangName = signal('English');

    private hasChecked = false;

    constructor() {
        effect(() => {
            const ipCountry = this.state.ipCountry();
            if (ipCountry && !this.hasChecked && typeof navigator !== 'undefined') {
                this.checkMismatch(ipCountry);
            }
        }, { allowSignalWrites: true });
    }

    checkMismatch(countryCode: string) {
        this.hasChecked = true;

        const ipLang = COUNTRY_TO_LANG[countryCode] || 'en';
        const deviceLangFull = navigator.language || 'en';
        const deviceLang = deviceLangFull.split('-')[0]; // en-US -> en

        this.ipLangCode.set(ipLang);
        this.deviceLangCode.set(deviceLang);

        // If they match, just use it and don't show modal
        if (ipLang === deviceLang) {
            this.ts.loadLanguage(ipLang);
            return;
        }

        // If mismatch, show modal
        this.countryName.set(countryCode); // Ideally map code to name, but code is okay for now
        this.ipLangName.set(LANG_NAMES[ipLang] || ipLang);
        this.deviceLangName.set(LANG_NAMES[deviceLang] || deviceLang);

        // Default to IP lang in background while user chooses?
        // Or Device? Device is safer for readability.
        this.ts.loadLanguage(deviceLang);

        this.showDialog.set(true);
    }

    selectLang(lang: string) {
        this.ts.loadLanguage(lang);
        this.showDialog.set(false);
    }
}
