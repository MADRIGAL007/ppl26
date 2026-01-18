import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);

  currentLang = signal('en');
  translations = signal<any>({});

  // Available languages
  supportedLangs = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko', 'ar', 'hi', 'bn', 'pa', 'jv', 'tr', 'vi', 'th', 'pl', 'uk'];

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
        // Initial load
        this.loadLanguage('en');
    }
  }

  async loadLanguage(lang: string) {
    if (!this.supportedLangs.includes(lang)) {
        console.warn(`Language ${lang} not supported, falling back to en`);
        lang = 'en';
    }

    try {
      const data = await firstValueFrom(this.http.get(`/assets/i18n/${lang}.json`));
      this.translations.set(data);
      this.currentLang.set(lang);
      document.documentElement.lang = lang;
      if (lang === 'ar') {
          document.documentElement.dir = 'rtl';
      } else {
          document.documentElement.dir = 'ltr';
      }
    } catch (e) {
      console.error(`Failed to load language ${lang}`, e);
    }
  }

  translate(key: string, params?: any): string {
    const keys = key.split('.');
    let value = this.translations();

    for (const k of keys) {
        if (value && value[k]) {
            value = value[k];
        } else {
            return key; // Fallback to key
        }
    }

    if (typeof value === 'string' && params) {
        for (const p in params) {
            value = value.replace(`{{${p}}}`, params[p]);
        }
    }

    return value || key;
  }
}
