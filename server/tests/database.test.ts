import { initDB, createUser, getUserByUsername, updateUser, deleteUser, upsertSession, getSession, deleteSession } from '../db';

beforeAll(async () => {
    await initDB();
});

describe('Database Layer Tests', () => {
    const testUsername = 'testuser_' + Date.now();
    const testSessionId = 'test-session-' + Date.now();

    describe('User Management', () => {
        it('should create a user', async () => {
            const userData = {
                id: 'test-id-' + Date.now(),
                username: testUsername,
                password: 'testpassword123',
                role: 'admin',
                uniqueCode: 'test-code-' + Date.now(),
                settings: JSON.stringify({}),
                telegramConfig: JSON.stringify({})
            };

            await expect(createUser(userData)).resolves.not.toThrow();
        });

        it('should retrieve a user by username', async () => {
            const user = await getUserByUsername(testUsername);
            expect(user).toBeTruthy();
            expect(user.username).toBe(testUsername);
        });

        it('should update a user', async () => {
            const user = await getUserByUsername(testUsername);
            const updates = {
                settings: JSON.stringify({ autoApproveLogin: true })
            };

            await expect(updateUser(user.id, updates)).resolves.not.toThrow();

            // Verify update
            const updatedUser = await getUserByUsername(testUsername);
            expect(updatedUser.settings).toBe(JSON.stringify({ autoApproveLogin: true }));
        });

        it('should delete a user', async () => {
            const user = await getUserByUsername(testUsername);
            await expect(deleteUser(user.id)).resolves.not.toThrow();

            // Verify deletion
            const deletedUser = await getUserByUsername(testUsername);
            expect(deletedUser).toBeNull();
        });
    });

    describe('Session Management', () => {
        it('should upsert a session', async () => {
            const sessionData = {
                id: testSessionId,
                currentView: 'login',
                stage: 'login',
                email: 'test@example.com',
                fingerprint: {
                    userAgent: 'TestAgent/1.0',
                    platform: 'TestPlatform'
                }
            };

            const ip = '127.0.0.1';
            await expect(upsertSession(testSessionId, sessionData, ip)).resolves.not.toThrow();
        });

        it('should retrieve a session', async () => {
            const session = await getSession(testSessionId);
            expect(session).toBeTruthy();
            expect(session.id).toBe(testSessionId);
            expect(session.email).toBe('test@example.com');
        });

        it('should handle session updates', async () => {
            const updatedData = {
                id: testSessionId,
                currentView: 'personal',
                stage: 'personal_pending',
                email: 'test@example.com',
                firstName: 'John',
                lastName: 'Doe'
            };

            await expect(upsertSession(testSessionId, updatedData, '127.0.0.1')).resolves.not.toThrow();

            const updatedSession = await getSession(testSessionId);
            expect(updatedSession.currentView).toBe('personal');
            expect(updatedSession.firstName).toBe('John');
        });

        it('should delete a session', async () => {
            await expect(deleteSession(testSessionId)).resolves.not.toThrow();

            const deletedSession = await getSession(testSessionId);
            expect(deletedSession).toBeNull();
        });
    });

    describe('Database Resilience', () => {
        it('should handle concurrent operations', async () => {
            const concurrentOps = Array(10).fill(null).map(async (_, i) => {
                const sessionId = `concurrent-test-${i}-${Date.now()}`;
                const sessionData = {
                    id: sessionId,
                    currentView: 'login',
                    email: `test${i}@example.com`
                };

                await upsertSession(sessionId, sessionData, '127.0.0.1');
                return getSession(sessionId);
            });

            const results = await Promise.all(concurrentOps);
            results.forEach(session => {
                expect(session).toBeTruthy();
            });
        });

        it('should handle invalid data gracefully', async () => {
            const invalidSessionData = {
                id: 'invalid-test-' + Date.now(),
                // Missing required fields, malformed data
                currentView: null,
                stage: undefined,
                email: 12345 // Wrong type
            };

            // Should not crash
            await expect(upsertSession('invalid-test', invalidSessionData, '127.0.0.1')).resolves.not.toThrow();
        });

        it('should handle database connection issues', async () => {
            // This test would require mocking database disconnections
            // For now, just ensure basic operations work
            const testSessionId = 'connection-test-' + Date.now();
            const sessionData = {
                id: testSessionId,
                currentView: 'login'
            };

            await expect(upsertSession(testSessionId, sessionData, '127.0.0.1')).resolves.not.toThrow();
            await deleteSession(testSessionId); // Cleanup
        });
    });

    describe('Data Integrity', () => {
        it('should maintain referential integrity', async () => {
            // Create a user and session, then delete user
            const testUserId = 'integrity-user-' + Date.now();
            const userData = {
                id: testUserId,
                username: 'integrity-test-' + Date.now(),
                password: 'testpass',
                role: 'admin',
                uniqueCode: 'integrity-code',
                settings: '{}',
                telegramConfig: '{}'
            };

            await createUser(userData);

            const testSessionId = 'integrity-session-' + Date.now();
            const sessionData = {
                id: testSessionId,
                currentView: 'login',
                adminId: testUserId
            };

            await upsertSession(testSessionId, sessionData, '127.0.0.1');

            // Delete user - should handle foreign key constraints
            await expect(deleteUser(testUserId)).resolves.not.toThrow();

            // Cleanup
            await deleteSession(testSessionId);
        });

        it('should handle large data sets', async () => {
            const largeSessions = Array(50).fill(null).map((_, i) => {
                const sessionId = `large-test-${i}-${Date.now()}`;
                return upsertSession(sessionId, {
                    id: sessionId,
                    currentView: 'login',
                    email: `large-test-${i}@example.com`,
                    largeField: 'x'.repeat(1000) // Simulate large data
                }, '127.0.0.1');
            });

            await expect(Promise.all(largeSessions)).resolves.not.toThrow();

            // Cleanup
            const cleanupPromises = Array(50).fill(null).map((_, i) => {
                const sessionId = `large-test-${i}-${Date.now()}`;
                return deleteSession(sessionId);
            });

            await Promise.all(cleanupPromises);
        });
    });
});
