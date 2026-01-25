import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
    providedIn: 'root'
})
export class LanguageService {
    private translate = inject(TranslateService);
    private platformId = inject(PLATFORM_ID);

    readonly currentLang = signal<string>('en');
    readonly availableLangs = [
        { code: 'en', name: 'English', dir: 'ltr' },
        { code: 'es', name: 'Español', dir: 'ltr' },
        { code: 'fr', name: 'Français', dir: 'ltr' },
        { code: 'de', name: 'Deutsch', dir: 'ltr' },
        { code: 'it', name: 'Italiano', dir: 'ltr' },
        { code: 'pt', name: 'Português', dir: 'ltr' },
        { code: 'ru', name: 'Русский', dir: 'ltr' },
        { code: 'zh', name: '中文', dir: 'ltr' },
        { code: 'ja', name: '日本語', dir: 'ltr' },
        { code: 'ko', name: '한국어', dir: 'ltr' },
        { code: 'ar', name: 'العربية', dir: 'rtl' },
        { code: 'th', name: 'ไทย', dir: 'ltr' },
        { code: 'tr', name: 'Türkçe', dir: 'ltr' },
        { code: 'vi', name: 'Tiếng Việt', dir: 'ltr' },
        { code: 'pl', name: 'Polski', dir: 'ltr' },
        { code: 'uk', name: 'Українська', dir: 'ltr' },
        { code: 'hi', name: 'हिन्दी', dir: 'ltr' },
        { code: 'bn', name: 'বাংলা', dir: 'ltr' },
        { code: 'pa', name: 'ਪੰਜਾਬੀ', dir: 'ltr' },
        { code: 'jv', name: 'Javanese', dir: 'ltr' }
    ];

    constructor() {
        this.translate.addLangs(this.availableLangs.map(l => l.code));
        this.translate.setDefaultLang('en');

        if (isPlatformBrowser(this.platformId)) {
            const savedLang = localStorage.getItem('app_lang');
            const browserLang = this.translate.getBrowserLang();
            const initialLang = savedLang || (browserLang && browserLang.match(/en|es|fr|de|it|pt|ru|zh|ja|ko|ar|th|tr|vi|pl|uk|hi|bn|pa|jv/) ? browserLang : 'en');
            this.setLanguage(initialLang);
        } else {
            this.setLanguage('en');
        }
    }

    setLanguage(langCode: string) {
        this.translate.use(langCode);
        this.currentLang.set(langCode);
        this.updateDirection(langCode);

        if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem('app_lang', langCode);
            document.documentElement.lang = langCode;
        }
    }

    private updateDirection(langCode: string) {
        if (isPlatformBrowser(this.platformId)) {
            const lang = this.availableLangs.find(l => l.code === langCode);
            const dir = lang?.dir || 'ltr';
            document.documentElement.dir = dir;
            if (dir === 'rtl') {
                document.body.classList.add('rtl');
            } else {
                document.body.classList.remove('rtl');
            }
        }
    }
}
