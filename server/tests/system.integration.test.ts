import request from 'supertest';
import { app } from '../index';
import { initDB } from '../db';
import { signToken } from '../auth';

beforeAll(async () => {
    await initDB();
});

const adminToken = signToken({ username: 'admin', role: 'admin' });
const ADMIN_HEADER = { 'Authorization': `Bearer ${adminToken}` };

describe('System API Integration', () => {

    describe('Dashboard stats', () => {
        it('should return health metrics', async () => {
            const res = await request(app)
                .get('/api/system/health')
                .set(ADMIN_HEADER);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('status');
            expect(res.body).toHaveProperty('uptime');
            expect(res.body).toHaveProperty('memory');
        });

        it('should return stats', async () => {
            const res = await request(app)
                .get('/api/system/stats')
                .set(ADMIN_HEADER);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('total');
            expect(res.body).toHaveProperty('active');
        });
    });

    describe('Audit Logs', () => {
        it('should return audit logs', async () => {
            const res = await request(app)
                .get('/api/system/audit-logs')
                .set(ADMIN_HEADER);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('logs');
            expect(Array.isArray(res.body.logs)).toBe(true);
        });
    });

    describe('Payments API', () => {
        // We might need to seed a payment first or mock the repo
        // For integration tests, we assume the DB starts empty usually, so maybe no payments exist.
        // We verify the empty list first.

        it('should list payments', async () => {
            const res = await request(app)
                .get('/api/system/payments')
                .set(ADMIN_HEADER);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });
    });
});
