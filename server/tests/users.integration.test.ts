import request from 'supertest';
import { app } from '../index';
import { initDB } from '../db';
import { signToken } from '../auth';

// Mock DB init
beforeAll(async () => {
    await initDB();
});

// Create tokens for different roles
const hypervisorToken = signToken({ username: 'hypervisor', role: 'hypervisor' });
const adminToken = signToken({ username: 'admin', role: 'admin' });

const HYPERVISOR_HEADER = { 'Authorization': `Bearer ${hypervisorToken}` };
const ADMIN_HEADER = { 'Authorization': `Bearer ${adminToken}` };

describe('User Management API Integration', () => {

    // Cleanup/Setup if needed (but we rely on in-memory sqlite for tests usually)

    describe('Access Control', () => {
        it('should allow hypervisor to list users', async () => {
            const res = await request(app)
                .get('/api/admin/users')
                .set(HYPERVISOR_HEADER);
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        it('should deny admin from listing users', async () => {
            const res = await request(app)
                .get('/api/admin/users')
                .set(ADMIN_HEADER);
            expect(res.status).toBe(403);
        });
    });

    describe('CRUD Operations', () => {
        let createdUserId: string;

        it('should create a new user', async () => {
            const newUser = {
                username: 'test_user_v1',
                password: 'TestPassword123!',
                role: 'admin'
            };

            const res = await request(app)
                .post('/api/admin/users')
                .set(HYPERVISOR_HEADER)
                .send(newUser);

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('id');
            expect(res.body.username).toBe(newUser.username);

            createdUserId = res.body.id;
        });

        it('should update user password', async () => {
            const update = {
                password: 'NewPassword456!'
            };

            const res = await request(app)
                .patch(`/api/admin/users/${createdUserId}`)
                .set(HYPERVISOR_HEADER)
                .send(update);

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it('should delete user', async () => {
            const res = await request(app)
                .delete(`/api/admin/users/${createdUserId}`)
                .set(HYPERVISOR_HEADER);

            expect(res.status).toBe(200);

            // Verify deletion
            const listRes = await request(app)
                .get('/api/admin/users')
                .set(HYPERVISOR_HEADER);

            const found = listRes.body.find((u: any) => u.id === createdUserId);
            expect(found).toBeUndefined();
        });
    });
});
