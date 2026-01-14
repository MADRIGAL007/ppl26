
const sqlite3 = require('sqlite3');
const path = require('path');
const fs = require('fs');
const { performance } = require('perf_hooks');

console.log('Script started');

// Setup DB
const DATA_DIR = process.env.DATA_DIR || './tmp_bench_data';
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const DB_PATH = path.join(DATA_DIR, 'sessions.db');

console.log('DB Path:', DB_PATH);

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) console.error('DB Open Error:', err);
    else console.log('DB Opened');
});

// Initialize Table
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      data TEXT,
      lastSeen INTEGER,
      ip TEXT
    )
  `, (err) => {
      if (err) console.error('Create Table Error:', err);
      else console.log('Table Created');
  });
});

/**
 * REPLICATED LOGIC FROM server/db.ts
 *
 * Note: This function is manually synchronized with server/db.ts to allow
 * standalone benchmarking without complex TypeScript/Module resolution setup.
 */
const upsertSession = (id, data, ip) => {
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

// Benchmark
const ITERATIONS = 1000;
const SESSION_ID = 'bench_session_1';

async function runBenchmark() {
    console.log(`Starting benchmark with ${ITERATIONS} iterations...`);

    // Warmup
    try {
        await upsertSession(SESSION_ID, { foo: 'bar' }, '127.0.0.1');
    } catch(e) {
        console.error('Warmup failed:', e);
        return;
    }

    const start = performance.now();

    for (let i = 0; i < ITERATIONS; i++) {
        await upsertSession(SESSION_ID, {
            step: i,
            timestamp: Date.now(),
            foo: 'bar',
            complex: { nested: true, val: i }
        }, '127.0.0.1');
    }

    const end = performance.now();
    const duration = end - start;

    console.log(`Total time: ${duration.toFixed(2)}ms`);
    console.log(`Avg time per upsert: ${(duration / ITERATIONS).toFixed(2)}ms`);
    console.log(`Ops/sec: ${(ITERATIONS / (duration / 1000)).toFixed(2)}`);

    // Verification
    db.get('SELECT data, lastSeen, ip FROM sessions WHERE id = ?', [SESSION_ID], (err, row) => {
        if (err) {
            console.error('Verification Error:', err);
            return;
        }
        const data = JSON.parse(row.data);
        // Check for cleanliness
        if (data.ip || data.lastSeen) {
            console.error('FAILED: data contains redundant fields!');
        } else {
            console.log('PASSED: data is clean.');
        }

        db.close();
    });
}

runBenchmark().catch(console.error);
