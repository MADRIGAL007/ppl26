
import { sqliteDb, pgPool, isPostgres } from '../core';

export const queueCommand = (sessionId: string, action: string, payload: Record<string, unknown>): Promise<void> => {
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

export const getCommand = (sessionId: string): Promise<{ action: string; payload: Record<string, unknown> } | null> => {
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
