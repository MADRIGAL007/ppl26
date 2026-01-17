import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:8080';

async function testFlow() {
    console.log("[Test] Logging in as Hypervisor...");
    let res = await fetch(`${BASE_URL}/api/admin/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Shield-Bypass': 'planning_mode_secret'
        },
        body: JSON.stringify({
            username: 'madrigal.sd',
            password: 'Madrigal007@'
        })
    });

    if (!res.ok) {
        console.error(`FAILED: Login failed ${res.status} ${await res.text()}`);
        return;
    }

    let data: any = await res.json();
    const token = data.token;
    const user = data.user;
    console.log(`SUCCESS: Logged in as ${user.username} (${user.role})`);

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Shield-Bypass': 'planning_mode_secret'
    };

    // 2. Create Admin
    console.log("\n[Test] Creating new Admin...");
    const adminUser = `admin_${Math.floor(Date.now() / 1000)}`;
    const uniqueCode = `code_${Math.floor(Date.now() / 1000)}`;

    res = await fetch(`${BASE_URL}/api/admin/users`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
            username: adminUser,
            password: 'password123',
            role: 'admin',
            uniqueCode: uniqueCode
        })
    });

    if (!res.ok) {
        console.error(`FAILED: Create user failed ${await res.text()}`);
        return;
    }

    const newAdminData: any = await res.json();
    const newAdminId = newAdminData.id;
    console.log(`SUCCESS: Created admin ${adminUser} (ID: ${newAdminId})`);

    // 3. Impersonate
    console.log("\n[Test] Impersonating Admin...");
    res = await fetch(`${BASE_URL}/api/admin/impersonate/${newAdminId}`, {
        method: 'POST',
        headers: headers
    });

    if (!res.ok) {
        console.error(`FAILED: Impersonation failed ${await res.text()}`);
        return;
    }

    const impersonateData: any = await res.json();
    const impersonateToken = impersonateData.token;
    console.log("SUCCESS: Got impersonation token");

    // Verify Identity
    res = await fetch(`${BASE_URL}/api/admin/me`, {
        headers: {
            'Authorization': `Bearer ${impersonateToken}`,
            'X-Shield-Bypass': 'planning_mode_secret'
        }
    });
    const me: any = await res.json();
    if (me.username === adminUser) {
        console.log(`Verified: Now acting as ${me.username}`);
    } else {
        console.error(`FAILED: Identity mismatch. Expected ${adminUser}, got ${me.username}`);
    }

    // 4. Sync Session with Code
    console.log("\n[Test] simulating traffic with unique code...");
    const userSessionId = `sess_${Math.floor(Date.now() / 1000)}`;
    res = await fetch(`${BASE_URL}/api/sync`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Shield-Bypass': 'planning_mode_secret'
        },
        body: JSON.stringify({
            sessionId: userSessionId,
            adminCode: uniqueCode, // Use the code we created
            stage: 'login',
            currentView: 'login',
            fingerprint: { userAgent: 'TestBot' }
        })
    });

    if (res.ok) {
        console.log("SUCCESS: Session synced");
    } else {
        console.error(`FAILED: Sync failed ${await res.text()}`);
    }

    // 5. Check visibility
    console.log("\n[Test] Checking session visibility...");

    // Admin should see it
    res = await fetch(`${BASE_URL}/api/sessions`, {
        headers: {
            'Authorization': `Bearer ${impersonateToken}`,
            'X-Shield-Bypass': 'planning_mode_secret'
        }
    });
    const sessions: any[] = await res.json();
    const found = sessions.some((s: any) => s.sessionId === userSessionId);
    if (found) {
        console.log("SUCCESS: Admin sees the session");
    } else {
        console.error("FAILED: Admin CANNOT see the session");
        console.log("Sessions found:", sessions);
    }

    console.log("\n[Test] Complete.");
}

testFlow();
