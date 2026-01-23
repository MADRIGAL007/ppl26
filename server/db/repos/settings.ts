
import { sqliteDb, pgPool, isPostgres } from '../core';

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
