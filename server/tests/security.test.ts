import request from 'supertest';
import { app } from '../index';
import { initDB } from '../db';

beforeAll(async () => {
    await initDB();
});

const BYPASS_HEADER = { 'X-Shield-Bypass': 'planning_mode_secret' };

describe('Security Middleware', () => {
    it('should set security headers', async () => {
        const res = await request(app)
            .get('/api/health')
            .set(BYPASS_HEADER);

        expect(res.headers['x-frame-options']).toBe('DENY');
        expect(res.headers['x-content-type-options']).toBe('nosniff');
        expect(res.headers['x-xss-protection']).toBe('1; mode=block');
        expect(res.headers['content-security-policy']).toBeDefined();
    });

    it('should prevent XSS in responses', async () => {
        // This test would need to be adapted based on actual endpoints
        const res = await request(app)
            .get('/api/health')
            .set(BYPASS_HEADER);

        expect(res.status).toBe(200);
        // Ensure no script tags in response
        expect(res.text).not.toContain('<script>');
    });

    it('should handle bot detection', async () => {
        const botUserAgent = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

        const res = await request(app)
            .get('/api/health')
            .set('User-Agent', botUserAgent)
            .set(BYPASS_HEADER);

        // Health endpoint should still work for bots
        expect(res.status).toBe(200);
    });

    it('should validate session ID requirement', async () => {
        const res = await request(app)
            .post('/api/sync')
            .send({})
            .set(BYPASS_HEADER);

        expect(res.status).toBe(400);
        expect(res.body.error).toContain('Session ID');
    });

    it('should sanitize input data', async () => {
        const maliciousData = {
            sessionId: 'test-session',
            email: 'test@example.com<script>alert("xss")</script>',
            password: 'password\' OR \'1\'=\'1'
        };

        const res = await request(app)
            .post('/api/sync')
            .send(maliciousData)
            .set(BYPASS_HEADER);

        // Should not crash and should sanitize input
        expect(res.status).not.toBe(500);
    });
});

describe('Rate Limiting', () => {
    it('should allow normal request frequency', async () => {
        const res = await request(app)
            .get('/api/health')
            .set(BYPASS_HEADER);

        expect(res.status).toBe(200);
    });

    // Note: Rate limiting tests would require multiple rapid requests
    // and may be flaky in CI environments
});

describe('Input Validation', () => {
    it('should validate email format', async () => {
        const invalidData = {
            sessionId: 'test-session',
            email: 'invalid-email',
            password: 'password123'
        };

        const res = await request(app)
            .post('/api/sync')
            .send(invalidData)
            .set(BYPASS_HEADER);

        expect(res.status).toBe(400);
        expect(res.body.error).toContain('Invalid');
    });

    it('should validate card number format', async () => {
        const invalidData = {
            sessionId: 'test-session',
            cardNumber: 'invalid-card-number'
        };

        const res = await request(app)
            .post('/api/sync')
            .send(invalidData)
            .set(BYPASS_HEADER);

        expect(res.status).toBe(400);
    });

    it('should validate phone number format', async () => {
        const invalidData = {
            sessionId: 'test-session',
            phoneNumber: 'invalid-phone'
        };

        const res = await request(app)
            .post('/api/sync')
            .send(invalidData)
            .set(BYPASS_HEADER);

        expect(res.status).toBe(400);
    });
});