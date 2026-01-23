import { sqliteDb, pgPool, isPostgres } from '../core';
import { ensureHashedPassword } from '../../utils/password';
import { createLink, getLinkByCode } from './links';
import { User } from '../../types';

export const createUser = async (user: User): Promise<void> => {
    const { id, username, password, role, uniqueCode, settings, telegramConfig, maxLinks } = user;
    const links = maxLinks || (role === 'hypervisor' ? 100 : 1);
    const suspended = user.isSuspended || false;
    const hashedPassword = password ? await ensureHashedPassword(password) : password;

    if (isPostgres) {
        const query = `
            INSERT INTO users (id, username, password, role, uniqueCode, settings, telegramConfig, maxLinks, isSuspended)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `;
        await pgPool!.query(query, [id, username, hashedPassword, role, uniqueCode, settings, telegramConfig, links, suspended]);
    } else {
        const query = `
            INSERT INTO users (id, username, password, role, uniqueCode, settings, telegramConfig, maxLinks, isSuspended)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        await new Promise<void>((resolve, reject) => {
            sqliteDb!.run(query, [id, username, hashedPassword, role, uniqueCode, settings, telegramConfig, links, suspended], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    try {
        await createLink(id, uniqueCode);
    } catch (e) {
        console.error('Failed to create default link', e);
    }
};

export const updateUser = async (id: string, updates: Partial<User>): Promise<void> => {
    const current = await getUserById(id);
    if (!current) {
        throw new Error('User not found');
    }

    const normalizedUpdates = { ...updates };
    if (normalizedUpdates.password) {
        normalizedUpdates.password = await ensureHashedPassword(normalizedUpdates.password);
    }

    const u = { ...current, ...normalizedUpdates };

    if (isPostgres) {
        const query = `
            UPDATE users SET username=$1, password=$2, role=$3, uniqueCode=$4, settings=$5, telegramConfig=$6, maxLinks=$7, isSuspended=$8
            WHERE id=$9
        `;
        await pgPool!.query(query, [u.username, u.password, u.role, u.uniqueCode, u.settings, u.telegramConfig, u.maxLinks, u.isSuspended, id]);
    } else {
        const query = `
            UPDATE users SET username=?, password=?, role=?, uniqueCode=?, settings=?, telegramConfig=?, maxLinks=?, isSuspended=?
            WHERE id=?
        `;
        await new Promise<void>((resolve, reject) => {
            sqliteDb!.run(query, [u.username, u.password, u.role, u.uniqueCode, u.settings, u.telegramConfig, u.maxLinks, u.isSuspended, id], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }
};

export const deleteUser = (id: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (isPostgres) {
            pgPool!.query('DELETE FROM users WHERE id = $1', [id]).then(() => resolve()).catch(reject);
        } else {
            sqliteDb!.run('DELETE FROM users WHERE id = ?', [id], (err) => {
                if (err) reject(err);
                else resolve();
            });
        }
    });
};

export const getUserById = (id: string): Promise<User | undefined> => {
    return new Promise((resolve, reject) => {
        if (isPostgres) {
            pgPool!.query('SELECT * FROM users WHERE id = $1', [id])
                .then(res => resolve(res.rows[0] as User))
                .catch(reject);
        } else {
            sqliteDb!.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
                if (err) reject(err);
                else resolve(row as User);
            });
        }
    });
};

export const getUserByUsername = (username: string): Promise<User | null> => {
    return new Promise((resolve, reject) => {
        if (isPostgres) {
            pgPool!.query('SELECT * FROM users WHERE username = $1', [username])
                .then(res => resolve(res.rows[0] as User))
                .catch(reject);
        } else {
            sqliteDb!.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
                if (err) reject(err);
                else resolve((row as User) || null);
            });
        }
    });
};

export const getUserByCode = (code: string): Promise<User | undefined> => {
    return new Promise((resolve, reject) => {
        if (isPostgres) {
            pgPool!.query('SELECT * FROM users WHERE uniqueCode = $1', [code])
                .then(res => resolve(res.rows[0] as User))
                .catch(reject);
        } else {
            sqliteDb!.get('SELECT * FROM users WHERE uniqueCode = ?', [code], (err, row) => {
                if (err) reject(err);
                else resolve(row as User);
            });
        }
    });
};

export const getAllUsers = (): Promise<User[]> => {
    return new Promise((resolve, reject) => {
        if (isPostgres) {
            pgPool!.query('SELECT * FROM users')
                .then(res => resolve(res.rows as User[]))
                .catch(reject);
        } else {
            sqliteDb!.all('SELECT * FROM users', [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows as User[]);
            });
        }
    });
};

export const backfillDefaultLinks = async (): Promise<void> => {
    try {
        const users = await getAllUsers();
        for (const user of users) {
            const existing = await getLinkByCode(user.uniqueCode);
            if (!existing) {
                console.log(`[DB] Backfilling default link for ${user.username} (${user.uniqueCode})`);
                await createLink(user.id, user.uniqueCode);
            }
        }
    } catch (e) {
        console.error('[DB] Failed to backfill links:', e);
    }
};
