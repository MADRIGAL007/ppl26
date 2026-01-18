
import { bootstrapApplication } from '@angular/platform-browser';
import { ɵprovideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { AppComponent } from './app.component';
import { routes } from './app/app.routes';

bootstrapApplication(AppComponent, {
  providers: [
    ɵprovideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(withFetch())
  ]
}).catch((err) => console.error(err));
