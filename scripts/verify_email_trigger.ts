
import { spawn, ChildProcess } from 'child_process';
import { io, Socket } from 'socket.io-client';

const PORT = 8081; // Use a different port to avoid conflicts if main server is running
const API_URL = `http://localhost:${PORT}/api`;
const SOCKET_URL = `http://localhost:${PORT}`;

// Mock Session Data
const MOCK_SESSION = {
    sessionId: 'test-session-123',
    status: 'Verified',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User'
};

async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
    console.log('[Test] Starting Server on port ' + PORT + '...');

    // Start Server with modified env
    const serverProcess = spawn('node', ['dist-server/index.js'], {
        env: { ...process.env, PORT: PORT.toString(), ADMIN_EMAIL: 'admin@example.com' },
        stdio: ['ignore', 'pipe', 'pipe']
    });

    let serverReady = false;
    let adminOnlineLog = false;
    let emailSentLog = false;

    // Monitor Server Output
    serverProcess.stdout.on('data', (data) => {
        const msg = data.toString();
        console.log('[Server stdout]', msg.trim()); // Debugging

        if (msg.includes('Express + Socket.IO running')) {
            serverReady = true;
        }
        if (msg.includes('Admin online, suppressing email')) {
            console.log('[Test] ✅ Detected: Admin online suppression log.');
            adminOnlineLog = true;
        }
        if (msg.includes('[Email] Sending email') || msg.includes('Email sent') || msg.includes('Email failed')) {
            console.log('[Test] ✅ Detected: Email send attempt.');
            emailSentLog = true;
        }
    });

    serverProcess.stderr.on('data', (data) => {
        console.error('[Server stderr]', data.toString());
    });

    // Wait for server start
    let attempts = 0;
    while (!serverReady && attempts < 20) {
        await sleep(500);
        attempts++;
    }

    if (!serverReady) {
        console.error('[Test] Server failed to start.');
        serverProcess.kill();
        process.exit(1);
    }
    console.log('[Test] Server is ready.');

    // --- TEST CASE 1: Admin Online ---
    console.log('\n--- Test Case 1: Admin Online ---');

    const adminSocket = io(SOCKET_URL, { autoConnect: false });
    adminSocket.connect();

    await new Promise<void>(resolve => {
        adminSocket.on('connect', () => {
            console.log('[Test] Admin Socket Connected');
            adminSocket.emit('joinAdmin');
            setTimeout(resolve, 500);
        });
    });

    // Trigger API - Create Session first
    console.log('[Test] Creating Session (Active)...');
    await fetch(`${API_URL}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...MOCK_SESSION, status: 'Active' })
    });

    await sleep(500);

    console.log('[Test] Triggering Sync (Verified)...');
    await fetch(`${API_URL}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(MOCK_SESSION)
    });

    await sleep(1000); // Wait for logs

    if (adminOnlineLog) {
        console.log('[Test] PASS: Email suppressed when admin is online.');
    } else {
        console.error('[Test] FAIL: Expected suppression log not found.');
    }

    // Reset flags
    adminOnlineLog = false;
    emailSentLog = false;

    // --- TEST CASE 2: Admin Offline ---
    console.log('\n--- Test Case 2: Admin Offline ---');

    console.log('[Test] Disconnecting Admin Socket...');
    adminSocket.disconnect();
    await sleep(1000); // Allow server to process disconnect

    // Trigger API
    console.log('[Test] Creating New Session (Active)...');
    MOCK_SESSION.sessionId = 'test-session-456'; // New session
    await fetch(`${API_URL}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...MOCK_SESSION, status: 'Active' })
    });

    await sleep(500);

    console.log('[Test] Triggering Sync (Verified) again...');
    await fetch(`${API_URL}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(MOCK_SESSION)
    });

    await sleep(1000); // Wait for logs

    if (emailSentLog) {
        console.log('[Test] PASS: Email attempt detected when admin is offline.');
    } else {
        console.error('[Test] FAIL: Expected email attempt log not found.');
    }

    // Cleanup
    serverProcess.kill();
    console.log('\n[Test] Done.');
}

runTest().catch(e => {
    console.error(e);
    process.exit(1);
});
