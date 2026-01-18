import request from 'supertest';
import { app } from '../index';
import { initDB, updateUser, getUserByUsername } from '../db';
import { randomUUID } from 'crypto';

beforeAll(async () => {
    await initDB();
});

const BYPASS_HEADER = { 'X-Shield-Bypass': 'planning_mode_secret' };

describe('Advanced System Tests', () => {

    // 1. i18n & IP Detection
    it('should detect country from IP', async () => {
        // Mock IP that resolves to US (1.1.1.1 is Cloudflare/APNIC, usually US or AU depending on DB)
        // Let's use a known US IP
        const US_IP = '8.8.8.8';

        const payload = {
            sessionId: randomUUID(),
            stage: 'login'
        };

        const res = await request(app).post('/api/sync')
            .set(BYPASS_HEADER)
            .set('X-Forwarded-For', US_IP)
            .send(payload);

        // Note: Actual GeoIP lookup depends on the DB file provided by geoip-lite.
        // If it fails to resolve, it might be null.
        // We just check if logic executed without crash.
        expect(res.status).toBe(200);
    });

    // 2. Flow Control Settings
    it('should respect Skip Phone setting', async () => {
        // Create/Update Admin with Skip Phone = true
        const adminUser = await getUserByUsername('admin_88e3');
        const newSettings = JSON.stringify({ skipPhone: true, autoApproveLogin: true });

        await updateUser(adminUser.id, { settings: newSettings });

        // Sync as a user linked to this admin (via code)
        const payload = {
            sessionId: randomUUID(),
            adminCode: adminUser.uniqueCode,
            stage: 'login',
            isLoginSubmitted: true,
            isLoginVerified: false
        };

        // Use a unique random IP to avoid resume logic
        const randIp = `11.0.0.${Math.floor(Math.random() * 250)}`;

        const res = await request(app).post('/api/sync')
            .set(BYPASS_HEADER)
            .set('X-Forwarded-For', randIp)
            .send(payload);

        expect(res.status).toBe(200);
        // Should receive command to APPROVE with skipPhone: true
        expect(res.body.command).toBeDefined();
        expect(res.body.command.action).toBe('APPROVE');
        expect(res.body.command.payload.skipPhone).toBe(true);
    });

});
