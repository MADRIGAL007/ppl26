import { TestBed } from '@angular/core/testing';
import { LanguageService } from './language.service';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { PLATFORM_ID } from '@angular/core';

describe('LanguageService', () => {
    let service: LanguageService;
    let translateService: TranslateService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [TranslateModule.forRoot()],
            providers: [
                LanguageService,
                { provide: PLATFORM_ID, useValue: 'browser' }
            ]
        });
        service = TestBed.inject(LanguageService);
        translateService = TestBed.inject(TranslateService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should set default language to en', () => {
        expect(service.currentLang()).toBe('en');
        expect(translateService.defaultLang).toBe('en');
    });

    it('should switch language', () => {
        service.setLanguage('es');
        expect(service.currentLang()).toBe('es');
        expect(translateService.currentLang).toBe('es');
    });

    it('should set direction to rtl for Arabic', () => {
        service.setLanguage('ar');
        expect(document.documentElement.dir).toBe('rtl');
        expect(document.body.classList.contains('rtl')).toBe(true);
    });

    it('should set direction to ltr for English', () => {
        service.setLanguage('ar'); // First set to RTL
        service.setLanguage('en'); // Then back to LTR
        expect(document.documentElement.dir).toBe('ltr');
        expect(document.body.classList.contains('rtl')).toBe(false);
    });
});
