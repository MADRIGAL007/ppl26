
import { sqliteDb, pgPool, isPostgres } from '../core';

export const addSessionNote = (sessionId: string, content: string, author: string): Promise<void> => {
    const now = Date.now();
    return new Promise((resolve, reject) => {
        if (isPostgres) {
            pgPool!.query('INSERT INTO session_notes (sessionId, content, author, timestamp) VALUES ($1, $2, $3, $4)', [sessionId, content, author, now])
                .then(() => resolve())
                .catch(reject);
        } else {
            sqliteDb!.run('INSERT INTO session_notes (sessionId, content, author, timestamp) VALUES (?, ?, ?, ?)', [sessionId, content, author, now], (err) => {
                if (err) reject(err);
                else resolve();
            });
        }
    });
};

export const getSessionNotes = (sessionId: string): Promise<any[]> => {
    return new Promise((resolve, reject) => {
        if (isPostgres) {
            pgPool!.query('SELECT * FROM session_notes WHERE sessionId = $1 ORDER BY timestamp DESC', [sessionId])
                .then(res => resolve(res.rows))
                .catch(reject);
        } else {
            sqliteDb!.all('SELECT * FROM session_notes WHERE sessionId = ? ORDER BY timestamp DESC', [sessionId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows as any[]);
            });
        }
    });
};
