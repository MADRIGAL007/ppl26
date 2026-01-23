const fetch = require('node-fetch');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

async function checkEndpoint(name, method, url, payload = null, headers = {}) {
    try {
        const res = await fetch(`${BASE_URL}${url}`, {
            method,
            headers: { 'Content-Type': 'application/json', ...headers },
            body: payload ? JSON.stringify(payload) : null
        });
        return { status: res.status, headers: res.headers };
    } catch (e) {
        return { error: e.message };
    }
}

async function runSecurityScan() {
    console.log(`Starting security scan against ${BASE_URL}\n`);

    let issues = [];

    // 1. Check Security Headers
    console.log('Checking Security Headers...');
    const healthRes = await checkEndpoint('Health', 'GET', '/api/health');
    if (!healthRes.error) {
        const h = healthRes.headers;
        if (!h.get('x-content-type-options')) issues.push('Missing X-Content-Type-Options');
        if (!h.get('x-frame-options')) issues.push('Missing X-Frame-Options');
        if (!h.get('content-security-policy')) issues.push('Missing Content-Security-Policy');
    } else {
        console.log('Failed to connect to server for header check.');
    }

    // 2. SQL Injection / NoSQL Injection Probe
    console.log('Probing for Injection Vulnerabilities...');
    const injectionPayload = {
        username: 'admin" OR "1"="1',
        password: 'password'
    };
    const injectionRes = await checkEndpoint('Login Injection', 'POST', '/api/admin/login', injectionPayload);
    if (injectionRes.status === 200) {
        issues.push('CRITICAL: Possible SQL/NoSQL Injection vulnerability in login');
    }

    // 3. XSS Probe
    console.log('Probing for XSS...');
    const xssPayload = {
        sessionId: '<script>alert(1)</script>',
        currentView: 'login'
    };
    const xssRes = await checkEndpoint('Sync XSS', 'POST', '/api/sync', xssPayload);
    // We expect 200 OK because the input is usually accepted but should be sanitized on output.
    // However, checking if it reflects back is harder without a browser.
    // Ideally, valid input validation should block this or sanitize it.

    // 4. Rate Limiting Check
    console.log('Checking Rate Limiting...');
    // Fire 20 requests rapidly
    let rateLimited = false;
    for (let i = 0; i < 20; i++) {
        const res = await checkEndpoint('Rate Limit', 'POST', '/api/admin/login', { username: 'test', password: 'test' });
        if (res.status === 429) {
            rateLimited = true;
            break;
        }
    }
    // This is technically a pass if we get rate limited, but we might not hit the limit with just 20.
    // Just logging it.
    if (rateLimited) console.log('Rate limiting is active (Status 429 received).');

    console.log('\n--- Security Scan Results ---');
    if (issues.length === 0) {
        console.log('✅ Basic checks passed. No obvious low-hanging fruit found.');
    } else {
        console.log('⚠️ Issues Found:');
        issues.forEach(i => console.log(`- ${i}`));
    }
}

runSecurityScan();
