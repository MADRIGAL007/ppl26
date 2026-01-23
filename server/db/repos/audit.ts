
import { sqliteDb, pgPool, isPostgres } from '../core';

export interface AuditLogFilter {
    page?: number;
    limit?: number;
    action?: string;
    actor?: string;
    startDate?: number;
    endDate?: number;
}

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

export const getAuditLogs = (filters: AuditLogFilter = {}): Promise<{ logs: any[], total: number }> => {
    const { page = 1, limit = 100, action, actor, startDate, endDate } = filters;
    const offset = (page - 1) * limit;

    return new Promise((resolve, reject) => {
        let whereClause = '';
        const conditions: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;

        if (action) {
            conditions.push(isPostgres ? `action = $${paramIndex++}` : 'action = ?');
            params.push(action);
        }
        if (actor) {
            conditions.push(isPostgres ? `actor = $${paramIndex++}` : 'actor = ?');
            params.push(actor);
        }
        if (startDate) {
            conditions.push(isPostgres ? `timestamp >= $${paramIndex++}` : 'timestamp >= ?');
            params.push(startDate);
        }
        if (endDate) {
            conditions.push(isPostgres ? `timestamp <= $${paramIndex++}` : 'timestamp <= ?');
            params.push(endDate);
        }

        if (conditions.length > 0) {
            whereClause = 'WHERE ' + conditions.join(' AND ');
        }

        if (isPostgres) {
            const countQuery = `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`;
            const dataQuery = `SELECT * FROM audit_logs ${whereClause} ORDER BY timestamp DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;

            Promise.all([
                pgPool!.query(countQuery, params),
                pgPool!.query(dataQuery, [...params, limit, offset])
            ]).then(([countRes, dataRes]) => {
                resolve({
                    logs: dataRes.rows,
                    total: parseInt(countRes.rows[0].total)
                });
            }).catch(reject);
        } else {
            const countQuery = `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`;
            const dataQuery = `SELECT * FROM audit_logs ${whereClause} ORDER BY timestamp DESC LIMIT ? OFFSET ?`;

            sqliteDb!.get(countQuery, params, (err, countRow: any) => {
                if (err) return reject(err);
                sqliteDb!.all(dataQuery, [...params, limit, offset], (err, rows: any[]) => {
                    if (err) reject(err);
                    else resolve({ logs: rows, total: countRow?.total || 0 });
                });
            });
        }
    });
};
