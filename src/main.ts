import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { CSP_NONCE, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './interceptors/auth.interceptor';
import { loadingInterceptor } from './interceptors/loading.interceptor';
import { errorInterceptor } from './interceptors/error.interceptor';
import { AppComponent } from './app.component';
import { routes } from './app/app.routes';
import 'zone.js';

const cspNonce = typeof document !== 'undefined'
  ? document.querySelector('meta[name="csp-nonce"]')?.getAttribute('content') || ''
  : '';

bootstrapApplication(AppComponent, {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    { provide: CSP_NONCE, useValue: cspNonce },
    provideRouter(routes),
    provideHttpClient(
      withFetch(),
      withInterceptors([
        authInterceptor,
        loadingInterceptor,
        errorInterceptor
      ])
    ),
    provideAnimations()
  ]
}).catch((err) => console.error(err));
