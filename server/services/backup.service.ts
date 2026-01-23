
import fs from 'fs';
import path from 'path';
import { pgPool, sqliteDb, isPostgres, withTransaction, DATA_DIR } from '../db/core';

export const createBackup = async (): Promise<any> => {
    const tables = ['users', 'sessions', 'admin_commands', 'admin_links', 'crypto_payments', 'refresh_tokens', 'settings'];
    const backup: any = {
        timestamp: Date.now(),
        version: 1,
        type: isPostgres ? 'postgresql' : 'sqlite',
        data: {}
    };

    if (isPostgres) {
        for (const table of tables) {
            try {
                const res = await pgPool!.query(`SELECT * FROM ${table}`);
                backup.data[table] = res.rows;
            } catch (e) {
                console.warn(`[Backup] Skipping table ${table} (maybe not exists)`);
            }
        }
    } else {
        for (const table of tables) {
            await new Promise<void>((resolve) => {
                sqliteDb!.all(`SELECT * FROM ${table}`, (err, rows) => {
                    if (!err) backup.data[table] = rows;
                    resolve();
                });
            });
        }
    }

    return backup;
};

export const restoreBackup = async (backupData: any) => {
    if (!backupData || !backupData.data) throw new Error('Invalid backup format');

    const tables = Object.keys(backupData.data);

    if (isPostgres) {
        await withTransaction(async (client) => {
            // Disable constraints temporarily if possible, or just delete in reverse order?
            // Re-creating schema is safer, but complex. 
            // We will truncate and re-insert. 
            // Ideally we'd disable FK checks.

            // Ordered delete to avoid FK violations
            // sessions depends on users
            // refresh_tokens depends on users
            // session_notes depends on sessions (if exists)

            const tableOrder = ['session_notes', 'refresh_tokens', 'sessions', 'admin_commands', 'admin_links', 'crypto_payments', 'settings', 'users'];

            for (const table of tableOrder) {
                try {
                    await client.query(`TRUNCATE TABLE ${table} CASCADE`);
                } catch (e) {
                    // Ignore if table doesn't exist
                }
            }

            for (const table of tables) {
                const rows = backupData.data[table];
                if (!Array.isArray(rows) || rows.length === 0) continue;

                const columns = Object.keys(rows[0]);
                const colsList = columns.join(', ');

                for (const row of rows) {
                    const values = columns.map(c => row[c]);
                    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
                    const query = `INSERT INTO ${table} (${colsList}) VALUES (${placeholders})`;
                    await client.query(query, values);
                }
            }
        });
    } else {
        return new Promise<void>((resolve, reject) => {
            sqliteDb!.serialize(() => {
                sqliteDb!.run('BEGIN TRANSACTION');

                // Truncate/Delete
                const tableOrder = ['session_notes', 'refresh_tokens', 'sessions', 'admin_commands', 'admin_links', 'crypto_payments', 'settings', 'users'];
                for (const table of tableOrder) {
                    sqliteDb!.run(`DELETE FROM ${table}`, (err) => { if (err) console.error(err); });
                }

                // Insert
                try {
                    for (const table of tables) {
                        const rows = backupData.data[table];
                        if (!Array.isArray(rows) || rows.length === 0) continue;

                        const columns = Object.keys(rows[0]);
                        const colsList = columns.join(', ');
                        const placeholders = columns.map(() => '?').join(', ');

                        const stmt = sqliteDb!.prepare(`INSERT INTO ${table} (${colsList}) VALUES (${placeholders})`);
                        for (const row of rows) {
                            stmt.run(Object.values(row));
                        }
                        stmt.finalize();
                    }
                    sqliteDb!.run('COMMIT', () => resolve());
                } catch (e) {
                    sqliteDb!.run('ROLLBACK');
                    reject(e);
                }
            });
        });
    }
};
