import sqlite3 from 'sqlite3';
import path from 'path';

// Determine database path based on environment or default
const DATA_DIR = process.env.DATA_DIR || './data';
const DB_PATH = path.join(DATA_DIR, 'sessions.db');

// Ensure directory exists (basic check, usually handled by Docker/Init)
const fs = require('fs');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

console.log(`[DB] Initializing SQLite database at ${DB_PATH}`);

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('[DB] Connection Error:', err.message);
  } else {
    console.log('[DB] Connected to SQLite database.');
  }
});

// Create tables
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      data TEXT,
      lastSeen INTEGER,
      ip TEXT
    )
  `);

  // Index for sorting sessions by last seen
  db.run(`CREATE INDEX IF NOT EXISTS idx_sessions_lastSeen ON sessions (lastSeen)`);

  db.run(`
    CREATE TABLE IF NOT EXISTS admin_commands (
      sessionId TEXT PRIMARY KEY,
      action TEXT,
      payload TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);
});

export const getSettings = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM settings', [], (err, rows: any[]) => {
      if (err) return reject(err);
      const settings: any = {};
      rows.forEach(r => settings[r.key] = r.value);
      resolve(settings);
    });
  });
};

export const updateSetting = (key: string, value: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

export const getSession = (id: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM sessions WHERE id = ?', [id], (err, row: any) => {
      if (err) return reject(err);
      if (row) {
        resolve({ ...JSON.parse(row.data), id: row.id, lastSeen: row.lastSeen, ip: row.ip });
      } else {
        resolve(null);
      }
    });
  });
};

export const upsertSession = (id: string, data: any, ip: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        const json = JSON.stringify(data);
        const now = Date.now();

        db.run(`
            INSERT INTO sessions (id, data, lastSeen, ip)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
            data = excluded.data,
            lastSeen = excluded.lastSeen,
            ip = excluded.ip
        `, [id, json, now, ip], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
};

export const updateLastSeen = (id: string, lastSeen: number): Promise<void> => {
    return new Promise((resolve, reject) => {
        db.run(`
            UPDATE sessions SET lastSeen = ? WHERE id = ?
        `, [lastSeen, id], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
};

export const getAllSessions = (): Promise<any[]> => {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM sessions ORDER BY lastSeen DESC', [], (err, rows: any[]) => {
            if (err) return reject(err);
            const sessions = rows.map(r => {
                const data = JSON.parse(r.data);
                // Ensure IP is in fingerprint
                if (!data.fingerprint) data.fingerprint = {};
                data.fingerprint.ip = r.ip;

                return {
                    ...data,
                    lastSeen: r.lastSeen,
                    ip: r.ip
                };
            });
            resolve(sessions);
        });
    });
};

export const deleteSession = (id: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        db.run('DELETE FROM sessions WHERE id = ?', [id], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
};

export const queueCommand = (sessionId: string, action: string, payload: any): Promise<void> => {
    return new Promise((resolve, reject) => {
        db.run('INSERT OR REPLACE INTO admin_commands (sessionId, action, payload) VALUES (?, ?, ?)',
            [sessionId, action, JSON.stringify(payload)], (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
};

export const getCommand = (sessionId: string): Promise<any> => {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM admin_commands WHERE sessionId = ?', [sessionId], (err, row: any) => {
            if (err) return reject(err);
            if (row) {
                // Delete after retrieving (one-time consumption)
                db.run('DELETE FROM admin_commands WHERE sessionId = ?', [sessionId]);
                resolve({ action: row.action, payload: JSON.parse(row.payload) });
            } else {
                resolve(null);
            }
        });
    });
};

export default db;
