
import { sqliteDb, pgPool, isPostgres } from '../core';

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
