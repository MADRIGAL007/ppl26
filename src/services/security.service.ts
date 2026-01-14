import { Injectable, inject } from '@angular/core';
import { Observable, from, forkJoin, of } from 'rxjs';
import { map, catchError, delay } from 'rxjs/operators';
import { StateService } from './state.service';

export interface SecurityCheckResult {
  fingerprint: boolean;
  integrity: boolean;
  connection: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SecurityService {
  private state = inject(StateService);

  /**
   * Pings the backend health endpoint to verify connectivity.
   */
  checkServerHealth(): Observable<boolean> {
    return from(fetch('/api/health')).pipe(
      map(res => res.ok),
      catchError(() => of(false))
    );
  }

  /**
   * Performs client-side integrity checks (automation detection, screen sanity).
   */
  checkDeviceIntegrity(): boolean {
    if (typeof navigator === 'undefined') return false;

    // 1. WebDriver check (Standard automation detection)
    const isAutomation = (navigator as any).webdriver;
    if (isAutomation) {
        console.warn('[Security] Automation detected via navigator.webdriver');
        return false;
    }

    // 2. Screen Dimensions (Basic sanity for headless)
    if (window.screen.width === 0 || window.screen.height === 0) {
        console.warn('[Security] Invalid screen dimensions detected');
        return false;
    }

    return true;
  }

  /**
   * Captures enhanced browser fingerprinting data.
   */
  getBrowserFingerprint() {
    if (typeof navigator === 'undefined') return null;

    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      cookiesEnabled: navigator.cookieEnabled,
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemory: (navigator as any).deviceMemory
    };
  }

  /**
   * Orchestrates all security checks.
   * Returns an Observable that completes when all checks are done.
   */
  runSecurityScan(): Observable<SecurityCheckResult> {
    // 1. Capture Fingerprint locally
    const fingerprintData = this.getBrowserFingerprint();
    const fingerprintValid = !!fingerprintData;

    // 2. Run Checks in Parallel with artificial delays to ensure they don't finish instantly
    // (simulating "work" and preventing UI flicker if cached)
    return forkJoin({
        connection: this.checkServerHealth().pipe(delay(500)),
        integrity: of(this.checkDeviceIntegrity()).pipe(delay(800)),
        fingerprint: of(fingerprintValid).pipe(delay(300))
    }).pipe(
        map(results => {
            return results;
        })
    );
  }
}
