
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { performance } from 'perf_hooks';

const PORT = 3001;
const SERVER_URL = `http://localhost:${PORT}`;
const DATA_DIR = path.join(process.cwd(), 'bench_data');

// Clean up previous run
if (fs.existsSync(DATA_DIR)) {
    fs.rmSync(DATA_DIR, { recursive: true, force: true });
}
fs.mkdirSync(DATA_DIR);

const serverEnv = {
    ...process.env,
    PORT: PORT.toString(),
    DATA_DIR: DATA_DIR,
    MASTER_PASSWORD: 'bench_password'
};

async function wait(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForServer(): Promise<void> {
    for (let i = 0; i < 20; i++) {
        try {
            const res = await fetch(`${SERVER_URL}/api/health`);
            if (res.ok) return;
        } catch (e) {}
        await wait(500);
    }
    throw new Error('Server failed to start');
}

async function populateData(count: number) {
    for (let i = 0; i < count; i++) {
        const payload = {
            sessionId: `bench_sess_${i}`,
            timestamp: new Date().toISOString(),
            status: 'Active',
            stage: 'login',
            lastSeen: Date.now(),
            data: { some: 'data', index: i }
        };
        await fetch(`${SERVER_URL}/api/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    }
}

async function runBenchmark() {
    console.log('--- Starting Benchmark ---');

    // Start Server
    const serverProcess: ChildProcess = spawn('node', ['dist-server/index.js'], {
        env: serverEnv,
        cwd: process.cwd(),
        stdio: 'inherit' // Enable logs to debug startup
    });

    try {
        await waitForServer();
        console.log('Server started.');

        // Populate
        const SESSION_COUNT = 30;
        await populateData(SESSION_COUNT);
        console.log(`Populated ${SESSION_COUNT} sessions.`);

        // Measure
        const ITERATIONS = 50;
        let totalTime = 0;
        let totalBytes = 0;
        let etag: string | null = null;
        let status304Count = 0;

        const start = performance.now();

        for (let i = 0; i < ITERATIONS; i++) {
            const reqStart = performance.now();

            const headers: Record<string, string> = {};
            if (etag) {
                headers['If-None-Match'] = etag;
            }

            const res = await fetch(`${SERVER_URL}/api/sessions`, { headers });

            // Read body
            const text = await res.text();
            const bytes = Buffer.byteLength(text);

            totalBytes += bytes;

            const newEtag = res.headers.get('etag');
            if (newEtag) etag = newEtag;

            if (res.status === 304) status304Count++;

            // Simple "change detection" simulation (parse if 200)
            if (res.status === 200) {
                 JSON.parse(text);
            }

            // console.log(`Req ${i}: Status ${res.status}, Bytes ${bytes}`);
        }

        const end = performance.now();
        totalTime = end - start;

        console.log('\n--- Results ---');
        console.log(`Total Requests: ${ITERATIONS}`);
        console.log(`Total Time:     ${totalTime.toFixed(2)} ms`);
        console.log(`Total Bytes:    ${totalBytes} bytes`);
        console.log(`304 Responses:  ${status304Count}`);
        console.log(`Avg Time/Req:   ${(totalTime / ITERATIONS).toFixed(2)} ms`);

    } catch (e) {
        console.error('Benchmark failed:', e);
    } finally {
        serverProcess.kill();
        // Clean up
        if (fs.existsSync(DATA_DIR)) {
             fs.rmSync(DATA_DIR, { recursive: true, force: true });
        }
    }
}

runBenchmark();
