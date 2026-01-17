import sqlite3 from 'sqlite3';
import { Pool } from 'pg';
import path from 'path';
import fs from 'fs';

// --- Configuration ---
const DATA_DIR = process.env.DATA_DIR || './data';
const DATABASE_URL = process.env.DATABASE_URL;

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

        initSqliteSchema();
    }
};

const initSqliteSchema = () => {
    if (!sqliteDb) return;
    sqliteDb.serialize(() => {
        sqliteDb!.run(`
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                data TEXT,
                lastSeen INTEGER,
                ip TEXT
            )
        `);
        sqliteDb!.run(`CREATE INDEX IF NOT EXISTS idx_sessions_lastSeen ON sessions (lastSeen)`);
        sqliteDb!.run(`
            CREATE TABLE IF NOT EXISTS admin_commands (
                sessionId TEXT PRIMARY KEY,
                action TEXT,
                payload TEXT
            )
        `);
        sqliteDb!.run(`
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        `);
    });
};

const initPostgresSchema = async () => {
    if (!pgPool) return;
    const client = await pgPool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                data TEXT,
                lastSeen BIGINT,
                ip TEXT
            )
        `);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_sessions_lastSeen ON sessions (lastSeen)`);

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
    } finally {
        client.release();
    }
};

// --- API Implementation ---

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

export const getSession = (id: string): Promise<any> => {
    return new Promise((resolve, reject) => {
        if (isPostgres) {
            pgPool!.query('SELECT * FROM sessions WHERE id = $1', [id])
                .then(res => {
                    const row = res.rows[0];
                    if (row) {
                        resolve({ ...JSON.parse(row.data), id: row.id, lastSeen: Number(row.lastseen), ip: row.ip });
                    } else {
                        resolve(null);
                    }
                })
                .catch(reject);
        } else {
            sqliteDb!.get('SELECT * FROM sessions WHERE id = ?', [id], (err, row: any) => {
                if (err) return reject(err);
                if (row) {
                    resolve({ ...JSON.parse(row.data), id: row.id, lastSeen: row.lastSeen, ip: row.ip });
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
                        return { ...data, id: r.id, lastSeen: Number(r.lastseen), ip: r.ip };
                    });
                    resolve(sessions);
                })
                .catch(reject);
        } else {
            sqliteDb!.all('SELECT * FROM sessions WHERE ip = ?', [ip], (err, rows: any[]) => {
                if (err) return reject(err);
                const sessions = rows.map(r => {
                    const data = JSON.parse(r.data);
                    return { ...data, id: r.id, lastSeen: r.lastSeen, ip: r.ip };
                });
                resolve(sessions);
            });
        }
    });
};

export const upsertSession = (id: string, data: any, ip: string): Promise<void> => {
    const json = JSON.stringify(data);
    const now = Date.now();

    return new Promise((resolve, reject) => {
        if (isPostgres) {
            const query = `
                INSERT INTO sessions (id, data, lastSeen, ip)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT(id) DO UPDATE SET
                data = EXCLUDED.data,
                lastSeen = EXCLUDED.lastSeen,
                ip = EXCLUDED.ip
            `;
            pgPool!.query(query, [id, json, now, ip]).then(() => resolve()).catch(reject);
        } else {
            const query = `
                INSERT INTO sessions (id, data, lastSeen, ip)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                data = excluded.data,
                lastSeen = excluded.lastSeen,
                ip = excluded.ip
            `;
            sqliteDb!.run(query, [id, json, now, ip], (err) => {
                if (err) reject(err);
                else resolve();
            });
        }
    });
};

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

export const getAllSessions = (): Promise<any[]> => {
    return new Promise((resolve, reject) => {
        if (isPostgres) {
            // Note: Postgres columns are lowercase by default (lastseen)
            pgPool!.query('SELECT * FROM sessions ORDER BY lastSeen DESC')
                .then(res => {
                    const sessions = res.rows.map(r => {
                        const data = JSON.parse(r.data);
                        if (!data.fingerprint) data.fingerprint = {};
                        data.fingerprint.ip = r.ip;
                        return {
                            ...data,
                            lastSeen: Number(r.lastseen),
                            ip: r.ip
                        };
                    });
                    resolve(sessions);
                })
                .catch(reject);
        } else {
            sqliteDb!.all('SELECT * FROM sessions ORDER BY lastSeen DESC', [], (err, rows: any[]) => {
                if (err) return reject(err);
                const sessions = rows.map(r => {
                    const data = JSON.parse(r.data);
                    if (!data.fingerprint) data.fingerprint = {};
                    data.fingerprint.ip = r.ip;
                    return {
                        ...data,
                        lastSeen: r.lastSeen,
                        ip: r.ip
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
    updateLastSeen,
    getAllSessions,
    deleteSession,
    queueCommand,
    getCommand
};
