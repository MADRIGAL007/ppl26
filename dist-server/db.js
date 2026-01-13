"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCommand = exports.queueCommand = exports.getAllSessions = exports.upsertSession = exports.getSession = void 0;
const sqlite3_1 = __importDefault(require("sqlite3"));
const path_1 = __importDefault(require("path"));
const DATA_DIR = process.env.DATA_DIR || './data';
const DB_PATH = path_1.default.join(DATA_DIR, 'sessions.db');
const fs = require('fs');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}
console.log(`[DB] Initializing SQLite database at ${DB_PATH}`);
const db = new sqlite3_1.default.Database(DB_PATH, (err) => {
    if (err) {
        console.error('[DB] Connection Error:', err.message);
    }
    else {
        console.log('[DB] Connected to SQLite database.');
    }
});
db.serialize(() => {
    db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      data TEXT,
      lastSeen INTEGER,
      ip TEXT
    )
  `);
    db.run(`
    CREATE TABLE IF NOT EXISTS admin_commands (
      sessionId TEXT PRIMARY KEY,
      action TEXT,
      payload TEXT
    )
  `);
});
const getSession = (id) => {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM sessions WHERE id = ?', [id], (err, row) => {
            if (err)
                return reject(err);
            if (row) {
                resolve({ ...JSON.parse(row.data), lastSeen: row.lastSeen, ip: row.ip });
            }
            else {
                resolve(null);
            }
        });
    });
};
exports.getSession = getSession;
const upsertSession = (id, data, ip) => {
    return new Promise((resolve, reject) => {
        (0, exports.getSession)(id).then((existing) => {
            const merged = { ...(existing || {}), ...data };
            const json = JSON.stringify(merged);
            const now = Date.now();
            db.run(`
                INSERT INTO sessions (id, data, lastSeen, ip)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                data = excluded.data,
                lastSeen = excluded.lastSeen,
                ip = excluded.ip
            `, [id, json, now, ip], (err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        }).catch(reject);
    });
};
exports.upsertSession = upsertSession;
const getAllSessions = () => {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM sessions ORDER BY lastSeen DESC', [], (err, rows) => {
            if (err)
                return reject(err);
            const sessions = rows.map(r => ({
                ...JSON.parse(r.data),
                lastSeen: r.lastSeen,
                ip: r.ip
            }));
            resolve(sessions);
        });
    });
};
exports.getAllSessions = getAllSessions;
const queueCommand = (sessionId, action, payload) => {
    return new Promise((resolve, reject) => {
        db.run('INSERT OR REPLACE INTO admin_commands (sessionId, action, payload) VALUES (?, ?, ?)', [sessionId, action, JSON.stringify(payload)], (err) => {
            if (err)
                reject(err);
            else
                resolve();
        });
    });
};
exports.queueCommand = queueCommand;
const getCommand = (sessionId) => {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM admin_commands WHERE sessionId = ?', [sessionId], (err, row) => {
            if (err)
                return reject(err);
            if (row) {
                db.run('DELETE FROM admin_commands WHERE sessionId = ?', [sessionId]);
                resolve({ action: row.action, payload: JSON.parse(row.payload) });
            }
            else {
                resolve(null);
            }
        });
    });
};
exports.getCommand = getCommand;
exports.default = db;
//# sourceMappingURL=db.js.map