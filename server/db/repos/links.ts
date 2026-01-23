
import { sqliteDb, pgPool, isPostgres } from '../core';

export const createLink = (code: string, adminId: string, flowConfig: any = {}, themeConfig: any = {}, abConfig: any = {}): Promise<void> => {
    const now = Date.now();
    const flowJson = JSON.stringify(flowConfig);
    const themeJson = JSON.stringify(themeConfig);
    const abJson = JSON.stringify(abConfig);

    return new Promise((resolve, reject) => {
        if (isPostgres) {
            pgPool!.query(`INSERT INTO admin_links (code, adminId, created_at, flow_config, theme_config, ab_config) VALUES ($1, $2, $3, $4, $5, $6)`,
                [code, adminId, now, flowJson, themeJson, abJson])
                .then(() => resolve())
                .catch(reject);
        } else {
            sqliteDb!.run(`INSERT INTO admin_links (code, adminId, created_at, flow_config, theme_config, ab_config) VALUES (?, ?, ?, ?, ?, ?)`,
                [code, adminId, now, flowJson, themeJson, abJson], (err: any) => {
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
