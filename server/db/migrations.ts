import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { pgPool } from './core';

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

// Ensure directory exists
if (!fs.existsSync(MIGRATIONS_DIR)) {
    fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
}

export const runMigrations = async () => {
    if (!pgPool) return;

    const client = await pgPool.connect();

    try {
        console.log('[DB] Checking migrations...');

        // 1. Create migrations table
        await client.query(`
            CREATE TABLE IF NOT EXISTS migrations (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                applied_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // 2. Get applied migrations
        const { rows: applied } = await client.query('SELECT name FROM migrations');
        const appliedNames = new Set(applied.map(row => row.name));

        // 3. Read migration files
        const files = fs.readdirSync(MIGRATIONS_DIR)
            .filter(f => f.endsWith('.sql'))
            .sort(); // Ensure order by filename

        let count = 0;

        for (const file of files) {
            if (!appliedNames.has(file)) {
                console.log(`[DB] Applying migration: ${file}`);
                const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');

                await client.query('BEGIN');
                try {
                    await client.query(sql);
                    await client.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
                    await client.query('COMMIT');
                    count++;
                } catch (e) {
                    await client.query('ROLLBACK');
                    console.error(`[DB] Migration failed: ${file}`, e);
                    throw e;
                }
            }
        }

        if (count > 0) {
            console.log(`[DB] Successfully applied ${count} migrations.`);
        } else {
            console.log('[DB] No new migrations to apply.');
        }

    } finally {
        client.release();
    }
};
