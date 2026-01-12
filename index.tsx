
import '@angular/compiler';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideZonelessChangeDetection } from '@angular/core';
import { AppComponent } from './src/app.component';

declare var process: any;
declare var require: any;
declare var __dirname: any;

const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';

if (isBrowser) {
  bootstrapApplication(AppComponent, {
    providers: [
      provideZonelessChangeDetection()
    ]
  }).catch((err) => console.error(err));
} else {
  // --- SERVER SIDE (Node.js) ---
  try {
    const http = require('http');
    const fs = require('fs');
    const path = require('path');
    
    const PORT = process.env.PORT || 8080;
    // GCP/Production Persistence Config
    // If running on Cloud Run with a volume mount, set DATA_DIR to that mount point (e.g., /app/data)
    const DATA_DIR = process.env.DATA_DIR || '.';
    const DB_PATH = path.join(DATA_DIR, 'sessions_v7.json'); 
    
    let sessions: Record<string, any> = {};
    const adminCommands: Record<string, any> = {};

    console.log(`[Server] Starting on port ${PORT}`);
    console.log(`[Server] Database Path: ${DB_PATH}`);

    // --- DIAGNOSTICS: Check Write Permissions ---
    try {
        // Ensure directory exists if it's a nested path
        if (DATA_DIR !== '.') {
             fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        // Try to access the directory with Write permissions
        fs.accessSync(DATA_DIR, fs.constants.W_OK);
        console.log(`[Server] ✅ Write access confirmed for directory: ${DATA_DIR}`);
    } catch (err) {
        console.error(`[Server] ❌ WARNING: No write access to ${DATA_DIR}. Session persistence will fail! Check IAM roles.`, err);
    }

    // Load existing data
    try {
        if (fs.existsSync(DB_PATH)) {
            const raw = fs.readFileSync(DB_PATH, 'utf8');
            if (raw) {
                sessions = JSON.parse(raw);
                console.log(`[Server] Loaded ${Object.keys(sessions).length} sessions from disk.`);
            }
        } else {
            console.log('[Server] No existing database found. Creating new.');
            // Try to write immediately to test permissions
            fs.writeFileSync(DB_PATH, JSON.stringify({}, null, 2));
            console.log('[Server] ✅ Initial DB file created successfully.');
        }
    } catch (e) {
        console.error('[Server] ❌ DB Init Error (Check Permissions):', e);
        sessions = {};
    }

    // --- OPTIMIZED DB SAVE (Debounced + Async) ---
    let saveTimer: any = null;
    const saveDB = () => {
        // Debounce: Cancel previous pending save
        if (saveTimer) clearTimeout(saveTimer);
        
        // Wait 200ms of inactivity before writing to disk
        saveTimer = setTimeout(() => {
            fs.writeFile(DB_PATH, JSON.stringify(sessions, null, 2), (err: any) => {
                if (err) {
                    console.error('[Server] Async Save Failed:', err);
                }
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
        // CORS - Robust headers for Production
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

        // 1. Sync State (Client updates server)
        if (req.method === 'POST' && url === '/api/sync') {
            try {
                const body = await readBody(req);
                if (!body) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Empty body' }));
                    return;
                }

                let data;
                try {
                    data = JSON.parse(body);
                } catch (parseError) {
                    console.warn('[Server] Invalid JSON in sync');
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid JSON' }));
                    return;
                }
                
                if (data.sessionId) {
                    // Capture Real IP
                    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'Unknown';
                    
                    // Update Session
                    const existing = sessions[data.sessionId] || {};
                    sessions[data.sessionId] = { 
                        ...existing, 
                        ...data,
                        lastSeen: Date.now(),
                        ip: ip 
                    };
                    
                    // Ensure fingerprint has the real IP
                    if (sessions[data.sessionId].fingerprint) {
                        sessions[data.sessionId].fingerprint.ip = ip;
                    } else {
                        sessions[data.sessionId].fingerprint = { ip };
                    }

                    saveDB(); // Trigger async save

                    // Check for pending commands (Admin -> User)
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
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Internal Server Error' }));
            }
            return;
        }

        // 2. Fetch Sessions (Admin polling)
        if (req.method === 'GET' && url === '/api/sessions') {
            try {
                // Return array of sessions
                const list = Object.values(sessions).sort((a: any, b: any) => (b.lastSeen || 0) - (a.lastSeen || 0));
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(list));
            } catch(e) {
                 console.error('[Sessions] Fetch Error', e);
                 res.writeHead(500, { 'Content-Type': 'application/json' });
                 res.end(JSON.stringify([]));
            }
            return;
        }

        // 3. Admin Command (Admin sends instruction)
        if (req.method === 'POST' && url === '/api/command') {
            try {
                const body = await readBody(req);
                const { sessionId, action, payload } = JSON.parse(body);
                if (sessionId && action) {
                    adminCommands[sessionId] = { action, payload };
                    console.log(`[Command] ${action} queued for ${sessionId}`);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'queued' }));
                } else {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Missing fields' }));
                }
            } catch (e) {
                console.error('[Command] Error:', e);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Server Error' }));
            }
            return;
        }

        // --- STATIC FILES (Frontend) ---
        let filePath = '.' + req.url;
        if (filePath === './') filePath = './index.html';

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
                    // SPA Fallback: Serve index.html for unknown paths
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

    server.listen(PORT, () => {
        console.log(`[Server] Running on port ${PORT}`);
    });

  } catch (e) {
    console.error('Fatal Server Error:', e);
  }
}

// AI Studio always uses an `index.tsx` file for all project types.
