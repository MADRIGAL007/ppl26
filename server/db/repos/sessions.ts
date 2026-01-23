
import { sqliteDb, pgPool, isPostgres } from '../core';

export const getSession = (id: string): Promise<any> => {
    return new Promise((resolve, reject) => {
        if (isPostgres) {
            pgPool!.query('SELECT * FROM sessions WHERE id = $1', [id])
                .then(res => {
                    const row = res.rows[0];
                    if (row) {
                        resolve({ ...JSON.parse(row.data), id: row.id, lastSeen: Number(row.lastseen), ip: row.ip, adminId: row.adminid, variant: row.variant });
                    } else {
                        resolve(null);
                    }
                })
                .catch(reject);
        } else {
            sqliteDb!.get('SELECT * FROM sessions WHERE id = ?', [id], (err, row: any) => {
                if (err) return reject(err);
                if (row) {
                    resolve({ ...JSON.parse(row.data), id: row.id, lastSeen: row.lastSeen, ip: row.ip, adminId: row.adminId, variant: row.variant });
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

        if (role === 'hypervisor' && !adminId) {
            // No filter - show everything
        } else if (adminId) {
            sql += 'WHERE adminId = ? ';
            params.push(adminId);
        } else {
            if (isPostgres) {
                return resolve([]);
            } else {
                return resolve([]);
            }
        }

        sql += 'ORDER BY lastSeen DESC';

        if (isPostgres) {
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


export const getStats = (adminId?: string): Promise<any> => {
    return new Promise((resolve, reject) => {
        const result = {
            activeSessions: 0,
            totalSessions: 0,
            verifiedSessions: 0,
            totalLinks: 0,
            successRate: 0
        };

        const sessionQuery = 'SELECT COUNT(*) as total, SUM(CASE WHEN instr(data, "\\"status\\":\\"Verified\\"") > 0 OR instr(data, "\\"isFlowComplete\\":true") > 0 THEN 1 ELSE 0 END) as verified, SUM(CASE WHEN instr(data, "\\"status\\":\\"Verified\\"") = 0 AND instr(data, "\\"isFlowComplete\\":true") = 0 THEN 1 ELSE 0 END) as active FROM sessions' + (adminId ? ' WHERE adminId = ?' : '');

        const linkQuery = 'SELECT COUNT(*) as total FROM admin_links' + (adminId ? ' WHERE adminId = ?' : '');

        if (isPostgres) {
            const pgSessionQuery = 'SELECT COUNT(*) as total, SUM(CASE WHEN data LIKE \'%"status":"Verified"%\' OR data LIKE \'%"isFlowComplete":true%\' THEN 1 ELSE 0 END) as verified, SUM(CASE WHEN data NOT LIKE \'%"status":"Verified"%\' AND data NOT LIKE \'%"isFlowComplete":true%\' THEN 1 ELSE 0 END) as active FROM sessions' + (adminId ? ' WHERE adminId = $1' : '');

            const pgLinkQuery = 'SELECT COUNT(*) as total FROM admin_links' + (adminId ? ' WHERE adminId = $1' : '');
            const params = adminId ? [adminId] : [];

            Promise.all([
                pgPool!.query(pgSessionQuery, params),
                pgPool!.query(pgLinkQuery, params)
            ]).then(([sessRes, linkRes]) => {
                const s = sessRes.rows[0];
                result.totalSessions = parseInt(s.total) || 0;
                result.verifiedSessions = parseInt(s.verified) || 0;
                result.activeSessions = parseInt(s.active) || 0;
                result.totalLinks = parseInt(linkRes.rows[0].total) || 0;
                result.successRate = result.totalSessions > 0 ? Math.round((result.verifiedSessions / result.totalSessions) * 100) : 0;
                resolve(result);
            }).catch(reject);

        } else {
            const params = adminId ? [adminId] : [];
            sqliteDb!.serialize(() => {
                sqliteDb!.get(sessionQuery, params, (err, row: any) => {
                    if (err) return reject(err);
                    result.totalSessions = row.total || 0;
                    result.verifiedSessions = row.verified || 0;
                    result.activeSessions = row.active || 0;

                    sqliteDb!.get(linkQuery, params, (err, row: any) => {
                        if (err) return reject(err);
                        result.totalLinks = row.total || 0;
                        result.successRate = result.totalSessions > 0 ? Math.round((result.verifiedSessions / result.totalSessions) * 100) : 0;
                        resolve(result);
                    });
                });
            });
        }
    });
};
