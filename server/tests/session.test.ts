import request from 'supertest';
import { app } from '../index';
import { initDB } from '../db';
import { randomUUID } from 'crypto';

beforeAll(async () => {
    await initDB();
});

const BYPASS_HEADER = { 'X-Shield-Bypass': 'planning_mode_secret' };

describe('Session API', () => {
    const sessionId = randomUUID();

    it('should create a new session on sync', async () => {
        const payload = {
            sessionId,
            stage: 'login',
            fingerprint: { userAgent: 'Jest-Test' }
        };
        const randIp = `10.0.0.${Math.floor(Math.random() * 250)}`;

        const res = await request(app).post('/api/sync')
            .set(BYPASS_HEADER)
            .set('X-Forwarded-For', randIp)
            .send(payload);

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');
    });
});
