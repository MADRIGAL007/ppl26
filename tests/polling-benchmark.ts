import { PollingScheduler } from '../src/services/polling.util';

// Mock Browser Environment
(global as any).document = {
    hidden: false,
    addEventListener: (event: string, cb: any) => {
        if (event === 'visibilitychange') {
            (global as any).triggerVisibilityChange = cb;
        }
    },
    removeEventListener: (event: string, cb: any) => {
        // Mock implementation
    }
};

async function runBenchmark() {
    console.log('--- Starting Polling Benchmark ---');

    let callCount = 0;
    let lastCallTime = Date.now();
    let hasChanged = false;

    const task = async () => {
        const now = Date.now();
        const diff = now - lastCallTime;
        // Don't log the first initial diff which is meaningless
        const displayDiff = callCount === 0 ? 0 : diff;
        console.log(`[Task] Call #${++callCount} | Interval: ~${Math.round(displayDiff/10)*10}ms | Data Changed: ${hasChanged}`);
        lastCallTime = now;
        return hasChanged;
    };

    // Base: 100ms, Max: 800ms (fast for testing)
    // Backoff: 100 -> 150 -> 225 -> 337 -> 506 -> 759 -> 800
    const poller = new PollingScheduler(100, 800, task);

    console.log('\n[Phase 1] No Changes (Expect Exponential Backoff)');
    poller.start();

    // Run for 1.5 seconds
    await new Promise(r => setTimeout(r, 1500));

    console.log('\n[Phase 2] Data Change Detected (Expect Reset to 100ms)');
    hasChanged = true;
    // Wait enough for the next tick to pick up the change
    await new Promise(r => setTimeout(r, 400));

    console.log('\n[Phase 3] Stabilization (Backoff starts again)');
    hasChanged = false;
    await new Promise(r => setTimeout(r, 800));

    console.log('\n[Phase 4] Hidden (Expect Pause - No calls for 2s)');
    (global.document as any).hidden = true;

    // We wait 2s. The util waits 10s when hidden. So we expect 0 calls.
    const callsBeforeHide = callCount;
    await new Promise(r => setTimeout(r, 2000));

    if (callCount === callsBeforeHide) {
        console.log('SUCCESS: No calls made while hidden.');
    } else {
        console.error('FAIL: Calls made while hidden!');
    }

    console.log('\n[Phase 5] Visibility Wake Up (Expect Immediate Run)');
    (global.document as any).hidden = false;
    if ((global as any).triggerVisibilityChange) {
        (global as any).triggerVisibilityChange();
    } else {
        console.warn('Visibility listener not registered?');
    }

    // Should run immediately
    await new Promise(r => setTimeout(r, 200));

    poller.stop();
    console.log('\n--- Benchmark Complete ---');
}

runBenchmark().catch(e => console.error(e));
