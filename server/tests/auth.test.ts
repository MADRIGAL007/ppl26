import request from 'supertest';
import { app } from '../index';
import { initDB } from '../db';

beforeAll(async () => {
    await initDB();
});

const BYPASS_HEADER = { 'X-Shield-Bypass': 'planning_mode_secret' };

describe('Auth API', () => {
    it('should pass health check', async () => {
        const res = await request(app).get('/api/health').set(BYPASS_HEADER);
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');
    });
});
