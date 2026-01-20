import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { CSP_NONCE, provideExperimentalZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { AppComponent } from './app.component';
import { routes } from './app/app.routes';

const cspNonce = typeof document !== 'undefined'
  ? document.querySelector('meta[name="csp-nonce"]')?.getAttribute('content') || ''
  : '';

bootstrapApplication(AppComponent, {
  providers: [
    provideExperimentalZonelessChangeDetection(),
    { provide: CSP_NONCE, useValue: cspNonce },
    provideRouter(routes),
    provideHttpClient(withFetch()),
    provideAnimations()
  ]
}).catch((err) => console.error(err));
