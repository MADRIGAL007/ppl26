const fetch = require('node-fetch');
const https = require('https');

// Ignore self-signed certs if testing locally with https
const agent = new https.Agent({
    rejectUnauthorized: false
});

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';
const CONCURRENT_USERS = 50;
const REQUESTS_PER_USER = 20;

async function simulateUser(userId) {
    let errors = 0;
    let success = 0;
    let latencies = [];

    const sessionId = `load-test-${userId}-${Date.now()}`;

    for (let i = 0; i < REQUESTS_PER_USER; i++) {
        const start = Date.now();
        try {
            const res = await fetch(`${BASE_URL}/api/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId,
                    currentView: 'login',
                    stage: 'login',
                    fingerprint: { userAgent: 'LoadTest/1.0', ip: '127.0.0.1' }
                }),
                agent
            });

            if (res.ok) {
                success++;
            } else {
                errors++;
            }
        } catch (e) {
            errors++;
        }
        latencies.push(Date.now() - start);

        // Random small delay between actions
        await new Promise(r => setTimeout(r, Math.random() * 500));
    }

    return { success, errors, latencies };
}

async function runLoadTest() {
    console.log(`Starting load test against ${BASE_URL}`);
    console.log(`Users: ${CONCURRENT_USERS}, Requests/User: ${REQUESTS_PER_USER}`);

    const start = Date.now();
    const promises = [];

    for (let i = 0; i < CONCURRENT_USERS; i++) {
        promises.push(simulateUser(i));
    }

    const results = await Promise.all(promises);
    const totalTime = (Date.now() - start) / 1000;

    let totalSuccess = 0;
    let totalErrors = 0;
    let allLatencies = [];

    results.forEach(r => {
        totalSuccess += r.success;
        totalErrors += r.errors;
        allLatencies = allLatencies.concat(r.latencies);
    });

    const avgLatency = allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length;
    const maxLatency = Math.max(...allLatencies);

    console.log('\n--- Results ---');
    console.log(`Total Time: ${totalTime.toFixed(2)}s`);
    console.log(`Total Requests: ${totalSuccess + totalErrors}`);
    console.log(`Success: ${totalSuccess}`);
    console.log(`Errors: ${totalErrors}`);
    console.log(`RPS: ${(totalSuccess + totalErrors) / totalTime}`);
    console.log(`Avg Latency: ${avgLatency.toFixed(2)}ms`);
    console.log(`Max Latency: ${maxLatency}ms`);
}

runLoadTest();
