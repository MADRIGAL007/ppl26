import { bootstrapApplication } from '@angular/platform-browser';
import { ɵprovideZonelessChangeDetection } from '@angular/core';
import { AppComponent } from './app.component';

bootstrapApplication(AppComponent, {
  providers: [
    ɵprovideZonelessChangeDetection()
  ]
}).catch((err) => console.error(err));
