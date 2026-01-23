import request from 'supertest';
import { app } from '../index';
import { initDB } from '../db';

beforeAll(async () => {
    // Force sqlite environment
    process.env.DB_TYPE = 'sqlite';
    process.env.DATA_DIR = './test-data';
    await initDB();
});

// We'll use this agent for authenticated requests
let adminAgent: request.SuperAgentTest;
let authToken: string;

const BYPASS_HEADER = { 'X-Shield-Bypass': 'planning_mode_secret' };
const MOCK_ADMIN = {
    username: 'admin_test_88e3',
    password: 'TestPassword123!',
    role: 'hypervisor'
};

describe('API Integration Tests', () => {

    describe('Admin Authentication', () => {
        it('should handle gate check', async () => {
            const { updateSetting } = await import('../db'); // Singular
            await updateSetting('gateUser', 'admin');
            await updateSetting('gatePass', 'secure123');

            const res = await request(app)
                .post('/api/admin/gate')
                .send({ username: 'admin', password: 'secure123' });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('status', 'ok');
        });

        it('should login admin', async () => {
            // 1. Seed user
            const { createUser } = await import('../db');

            // Create a fresh user
            try {
                await createUser({
                    id: 'admin_test_id',
                    username: MOCK_ADMIN.username,
                    password: MOCK_ADMIN.password,
                    role: MOCK_ADMIN.role,
                    uniqueCode: 'admin_code',
                    settings: JSON.stringify({}),
                    telegramConfig: JSON.stringify({})
                });
            } catch (e) {
                // Ignore if exists
            }

            // 2. Get CSRF via Agent
            adminAgent = request.agent(app);
            const csrfRes = await adminAgent.get('/api/admin/csrf-token');
            expect(csrfRes.status).toBe(200);
            const csrfToken = csrfRes.body.csrfToken;

            // 3. Login
            const res = await adminAgent
                .post('/api/admin/login')
                .set('X-CSRF-Token', csrfToken)
                .send({ username: MOCK_ADMIN.username, password: MOCK_ADMIN.password })
                .set(BYPASS_HEADER);

            if (res.status !== 200) {
                console.error('Login Failed Response:', res.body);
            }

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('token');

            authToken = res.body.token;
        });
    });

    describe('Settings API', () => {
        it('should return settings', async () => {
            const res = await adminAgent
                .get('/api/settings')
                .set('Authorization', `Bearer ${authToken}`);
            expect(res.status).toBe(200);
        });

        it('should accept settings updates', async () => {
            const res = await adminAgent
                .post('/api/settings')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ telegramConfig: { token: 'new-token' } });

            expect(res.status).toBe(200);
            expect(res.body.status).toBe('ok');
        });
    });

    describe('Health Check', () => {
        it('should return health status', async () => {
            const res = await request(app).get('/api/health');
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('status', 'ok');
        });
    });

    describe('Session Sync', () => {
        const validSessionData = {
            sessionId: 'test-session-' + Date.now(),
            currentView: 'login'
        };

        it('should accept valid session data', async () => {
            const res = await request(app)
                .post('/api/sync')
                .send(validSessionData);
            expect(res.status).toBe(200);
        });
    });

    describe('Error Handling', () => {
        it('should handle malformed JSON', async () => {
            const res = await request(app)
                .post('/api/sync')
                .set('Content-Type', 'application/json')
                .send('invalid json');

            // Expected 400 because middleware now handles SyntaxError -> 400
            expect(res.status).toBe(400);
        });

        it('should handle large payloads if over limit', async () => {
            const res = await request(app)
                .post('/api/sync')
                .send({ data: 'x'.repeat(1024 * 1024 * 11) }); // 11MB > 10MB limit

            // Expected 413 because middleware now handles PayloadTooLarge -> 413
            expect(res.status).toBe(413);
        });
    });

    describe('Static Files', () => {
        it('should return 404 for unknown routes', async () => {
            const res = await request(app).get('/unknown-route');
            expect(res.status).toBe(404); // Default 404 handler
        });
    });
});
