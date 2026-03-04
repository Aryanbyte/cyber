// CyberGuard – Server with Socket.IO Chat + Detection Engine
// Real-time moderated chat room: every message scanned before delivery

// Load .env file if present (for local development)
try {
    const envFile = require('fs').readFileSync(require('path').join(__dirname, '.env'), 'utf8');
    envFile.split('\n').forEach(line => {
        const [key, ...val] = line.split('=');
        if (key && val.length) process.env[key.trim()] = val.join('=').trim();
    });
} catch (e) { /* no .env file, use system env vars */ }

// Global error handlers to prevent silent crashes and log details on Render
process.on('uncaughtException', (err) => {
    console.error('CRITICAL: Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});


const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3000;
const STATIC_DIR = __dirname;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const BYTEZ_API_KEY = process.env.BYTEZ_API_KEY || '';

// Initialize Bytez SDK
let sdk;
const BYTEZ_MODEL = 'mistralai/Mistral-7B-Instruct-v0.3'; // Cost-effective model
try {
    const Bytez = require('bytez.js');
    sdk = new Bytez(BYTEZ_API_KEY);
    console.log(`  [Bytez] SDK initialized (model: ${BYTEZ_MODEL})`);
} catch (e) {
    console.warn('  [Bytez] Failed to load bytez.js. AI detection will be disabled.');
}

const MIME = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.bin': 'application/octet-stream'
};

/* ============================================================
   SERVER-SIDE DETECTION ENGINE
   Ported from script.js keyword dictionary + scan() function
   ============================================================ */

const DICT = {
    harassment: {
        words: [
            'bullied', 'bully', 'bullies', 'bullying',
            'stupid', 'idiot', 'loser', 'ugly', 'dumb', 'pathetic', 'worthless',
            'disgusting', 'freak', 'creep', 'weirdo', 'useless',
            'moron', 'fool', 'clown', 'trash', 'lame', 'annoying',
            'retard', 'retarded', 'imbecile', 'dimwit', 'halfwit',
            'brainless', 'clueless', 'dense', 'ignorant', 'incompetent',
            'cringe', 'hopeless', 'miserable', 'pitiful', 'failure', 'reject', 'outcast',
            'fat', 'skinny', 'obese', 'fatso', 'fatty', 'pig', 'cow', 'whale',
            'hideous', 'grotesque', 'repulsive', 'revolting', 'gross', 'fugly',
            'shut up', 'go away', 'no one likes you', 'nobody cares',
            'you suck', 'get lost', 'waste of space',
            'go cry', 'cry baby', 'grow up', 'get a life',
            'attention seeker', 'no friends', 'nobody wants you',
            'noob', 'scrub', 'bot', 'npc', 'simp', 'incel', 'karen',
            'boomer', 'snowflake', 'triggered', 'salty', 'toxic',
            'psycho', 'lunatic', 'maniac', 'nutcase', 'deranged',
            'pagal', 'gadha', 'buddhu', 'bewakoof', 'nalayak', 'nikamma',
            'bekaar', 'bakwas', 'ghatiya', 'wahiyat', 'faltu',
            'chamcha', 'chapri', 'besharam', 'badtameez',
            'kameena', 'kameeni', 'kamina', 'kamini',
            'chutiya', 'chutiye', 'mc', 'bc',
            'madarchod', 'behenchod', 'bhosdike',
            'kutte', 'kutti', 'kutta', 'kutiya',
            'chup kar', 'chup ho ja', 'band kar'
        ],
        w: 2
    },
    threat: {
        words: [
            'kill', 'die', 'hurt', 'punch', 'beat', 'attack', 'destroy',
            'murder', 'stab', 'shoot', 'burn', 'choke', 'strangle', 'slap',
            'smash', 'crush', 'slam', 'thrash', 'strike',
            'i will find you', 'watch your back', 'you are dead',
            'i will hurt you', 'gonna beat you', 'will destroy you',
            'better run', 'you will pay', 'your days are numbered',
            'i know where you live', 'i will come for you',
            'i will end you', 'you are finished', 'say your prayers',
            'coming for you', 'gonna get you',
            'doxxed', 'doxxing', 'swatting', 'swatted',
            'dekh lunga', 'tujhe dekh lunga', 'thok dunga', 'maar dunga',
            'peet dunga', 'sabak sikhaunga', 'jaan se maar dunga',
            'khatam kar dunga', 'haddi tod dunga', 'muh tod dunga',
            'teri khair nahi', 'tujhe chhodunga nahi', 'pakad lunga'
        ],
        w: 5
    },
    hate_speech: {
        words: [
            'nigger', 'niggers', 'nigga', 'niggas', 'negro',
            'cracker', 'spic', 'wetback', 'chink', 'gook', 'kike',
            'go back to your country', 'your kind', 'people like you',
            'dirty immigrant', 'illegal alien',
            'inferior', 'subhuman', 'savage', 'primitive', 'vermin',
            'parasite', 'cockroach', 'filth', 'scum', 'degenerate',
            'tranny', 'shemale', 'feminazi', 'homophobic',
            'master race', 'white power', 'white supremacy',
            'genocide', 'ethnic cleansing',
            'racist', 'bigot', 'sexist', 'misogynist',
            'neech', 'neech jaat', 'anpadh', 'gawar',
            'anti national', 'deshdrohi', 'gaddaar',
            'kallu', 'kaalu', 'kalia', 'chinki', 'madrasi'
        ],
        w: 4
    },
    profanity: {
        words: [
            'fuck', 'fucking', 'fucked', 'fucker', 'fuckers', 'fucks',
            'shit', 'shitty', 'bullshit',
            'ass', 'asshole', 'assholes',
            'bitch', 'bitches', 'bitchy',
            'damn', 'dammit', 'hell', 'crap',
            'dick', 'dickhead', 'pussy', 'cunt',
            'bastard', 'whore', 'slut', 'hoe',
            'stfu', 'gtfo', 'wtf',
            'wanker', 'prick', 'douche', 'douchebag',
            'jackass', 'dumbass', 'scumbag',
            'piece of shit', 'motherfucker', 'son of a bitch',
            'saale', 'saali', 'gaandu', 'gandu',
            'jhatu', 'lodu', 'lauda', 'laude',
            'randi', 'raand', 'bhikhari',
            'haraamzaade', 'maderchod', 'bhenchod',
            'bhosdiwale', 'teri maa ki'
        ],
        w: 1
    },
    toxicity: {
        words: [
            'kill yourself', 'kys', 'neck yourself', 'hang yourself',
            'drink bleach', 'end yourself', 'off yourself',
            'slit your wrists', 'jump off a bridge',
            'nobody would care if you died', 'better off dead',
            'hate you', 'hope you suffer', 'everyone hates you',
            'no one would miss you', 'world is better without you',
            'waste of air', 'oxygen thief',
            'you are a mistake', 'nobody loves you',
            'die alone', 'rot in hell', 'burn in hell',
            'i wish you were dead', 'hope you get cancer',
            'you will never amount to anything', 'give up already',
            'lost cause', 'broken beyond repair', 'damaged goods',
            'rape', 'rapist', 'sexual assault', 'molest',
            'predator', 'groomer', 'pedophile',
            'go die', 'drop dead', 'get cancer', 'eat shit',
            'human garbage', 'human waste', 'waste of oxygen'
        ],
        w: 5
    }
};

function scan(text) {
    const low = text.toLowerCase().trim();
    if (!low) return { score: 0, sev: 'safe', cats: {}, flagged: [], weight: 0 };

    const out = { score: 0, cats: {}, flagged: [], weight: 0 };

    for (const cat in DICT) {
        const d = DICT[cat];
        let hits = 0;
        for (const kw of d.words) {
            const pat = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const re = new RegExp('\\b' + pat + '\\b', 'gi');
            const m = low.match(re);
            if (m) {
                hits += m.length;
                out.weight += d.w * m.length;
                for (const word of m) {
                    if (!out.flagged.includes(word.toLowerCase())) {
                        out.flagged.push(word.toLowerCase());
                    }
                }
            }
        }
        if (hits > 0) out.cats[cat] = hits;
    }

    const wc = text.split(/\s+/).filter(Boolean).length;
    const density = wc > 0 ? out.weight / wc : 0;
    out.score = Math.min(100, Math.round(density * 50 + out.weight * 3));

    if (out.score <= 10) out.sev = 'safe';
    else if (out.score <= 30) out.sev = 'low';
    else if (out.score <= 55) out.sev = 'medium';
    else if (out.score <= 79) out.sev = 'high';
    else out.sev = 'critical';

    return out;
}

/**
 * AI-powered detection using Bytez (Claude Opus)
 */
async function aiScan(text) {
    if (!sdk || !BYTEZ_API_KEY) return null;

    try {
        const model = sdk.model(BYTEZ_MODEL);
        const { error, output } = await model.run([
            {
                "role": "user",
                "content": `Analyze this message for cyberbullying, hate speech, or harassment. 
                Respond ONLY with a JSON object in this format: 
                {"score": number(0-100), "sev": "safe"|"low"|"medium"|"high"|"critical", "reason": "short explanation"}
                
                Message: "${text}"`
            }
        ]);

        if (error) {
            console.error('  [Bytez] Model error:', error);
            return null;
        }

        // The output might be a string that needs parsing
        let result = output;
        if (typeof output === 'string') {
            try {
                const jsonMatch = output.match(/\{.*\}/s);
                if (jsonMatch) result = JSON.parse(jsonMatch[0]);
            } catch (e) {
                console.error('  [Bytez] Failed to parse model output:', output);
                return null;
            }
        }

        return result;
    } catch (e) {
        console.error('  [Bytez] Scan failed:', e);
        return null;
    }
}

/* ============================================================
   API PROXY FUNCTIONS
   ============================================================ */

function proxyToOpenAI(req, res, apiPath) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
        const options = {
            hostname: 'api.openai.com',
            path: apiPath,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + OPENAI_API_KEY,
                'Content-Length': Buffer.byteLength(body)
            }
        };

        const proxy = https.request(options, proxyRes => {
            res.writeHead(proxyRes.statusCode, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });
            proxyRes.pipe(res);
        });

        proxy.on('error', err => {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: { message: 'Proxy error: ' + err.message } }));
        });

        proxy.write(body);
        proxy.end();
    });
}

function proxyToGemini(req, res) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
        const options = {
            hostname: 'generativelanguage.googleapis.com',
            path: '/v1beta/models/gemini-2.0-flash:generateContent?key=' + GEMINI_API_KEY,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        };

        const proxy = https.request(options, proxyRes => {
            res.writeHead(proxyRes.statusCode, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });
            proxyRes.pipe(res);
        });

        proxy.on('error', err => {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: { message: 'Proxy error: ' + err.message } }));
        });

        proxy.write(body);
        proxy.end();
    });
}

/* ============================================================
   HTTP SERVER
   ============================================================ */

const server = http.createServer((req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        });
        return res.end();
    }

    // Proxy OpenAI API calls
    if (req.method === 'POST' && req.url === '/api/moderations') {
        return proxyToOpenAI(req, res, '/v1/moderations');
    }
    if (req.method === 'POST' && req.url === '/api/chat') {
        return proxyToOpenAI(req, res, '/v1/chat/completions');
    }
    if (req.method === 'POST' && req.url === '/api/gemini') {
        return proxyToGemini(req, res);
    }

    // Health check endpoint
    if (req.method === 'GET' && (req.url === '/api/health' || req.url === '/health')) {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ status: 'ok', time: Date.now(), node: process.version }));
        return;
    }

    // REST API: check if room exists
    const roomMatch = req.url.match(/^\/api\/room\/([a-zA-Z0-9]+)$/);
    if (req.method === 'GET' && roomMatch) {
        const code = roomMatch[1].toUpperCase();
        const exists = chatRooms.has(code);
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ exists, code }));
        return;
    }

    // Serve static files
    let filePath = req.url === '/' ? '/index.html' : req.url;
    filePath = path.join(STATIC_DIR, filePath.split('?')[0]);

    const ext = path.extname(filePath);
    const contentType = MIME[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404);
                res.end('Not Found');
            } else {
                res.writeHead(500);
                res.end('Server Error');
            }
            return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
});

/* ============================================================
   SOCKET.IO – ROOM-BASED REAL-TIME CHAT WITH MODERATION
   ============================================================ */

const io = new Server(server, {
    cors: { origin: '*' }
});

// Room storage: roomCode -> { users: Map<socketId, {username, joinedAt}>, createdAt }
const chatRooms = new Map();

// Reverse lookup: socketId -> roomCode
const socketRoom = new Map();

// Generate a unique 6-char room code
function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 to avoid confusion
    let code;
    do {
        code = '';
        for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    } while (chatRooms.has(code));
    return code;
}

// Broadcast user list scoped to a room
function broadcastRoomUsers(roomCode) {
    const room = chatRooms.get(roomCode);
    if (!room) return;
    const users = Array.from(room.users.values()).map(u => u.username);
    io.to(roomCode).emit('user-list', users);
}

// Remove user from their current room; delete room if empty
function leaveCurrentRoom(socket) {
    const roomCode = socketRoom.get(socket.id);
    if (!roomCode) return null;

    const room = chatRooms.get(roomCode);
    const user = room ? room.users.get(socket.id) : null;

    if (room) {
        room.users.delete(socket.id);
        socket.leave(roomCode);

        if (user) {
            io.to(roomCode).emit('system-message', {
                text: `${user.username} left the room`,
                time: Date.now()
            });
            broadcastRoomUsers(roomCode);
            console.log(`  [Room ${roomCode}] ${user.username} left`);
        }

        // Auto-delete empty rooms
        if (room.users.size === 0) {
            chatRooms.delete(roomCode);
            console.log(`  [Room ${roomCode}] deleted (empty)`);
        }
    }

    socketRoom.delete(socket.id);
    return user;
}

io.on('connection', (socket) => {
    console.log(`  [Socket] New connection: ${socket.id}`);

    // Create a new room
    socket.on('create-room', (username, callback) => {
        const cleanName = (username || 'Anonymous').trim().slice(0, 20);
        const roomCode = generateRoomCode();

        // Create room
        chatRooms.set(roomCode, {
            users: new Map(),
            createdAt: Date.now()
        });

        // Join the room
        const room = chatRooms.get(roomCode);
        room.users.set(socket.id, { username: cleanName, joinedAt: Date.now() });
        socket.join(roomCode);
        socketRoom.set(socket.id, roomCode);

        console.log(`  [Room ${roomCode}] Created by ${cleanName}`);

        broadcastRoomUsers(roomCode);

        // Send back the room code
        if (typeof callback === 'function') {
            callback({ success: true, roomCode });
        }
    });

    // Join an existing room
    socket.on('join-room', ({ roomCode, username }, callback) => {
        const code = (roomCode || '').trim().toUpperCase();
        const cleanName = (username || 'Anonymous').trim().slice(0, 20);

        const room = chatRooms.get(code);
        if (!room) {
            if (typeof callback === 'function') {
                callback({ success: false, error: 'Room not found. Check the code and try again.' });
            }
            return;
        }

        // Leave any existing room first
        leaveCurrentRoom(socket);

        // Join the room
        room.users.set(socket.id, { username: cleanName, joinedAt: Date.now() });
        socket.join(code);
        socketRoom.set(socket.id, code);

        console.log(`  [Room ${code}] ${cleanName} joined`);

        // Notify room members
        socket.to(code).emit('system-message', {
            text: `${cleanName} joined the room`,
            time: Date.now()
        });

        broadcastRoomUsers(code);

        if (typeof callback === 'function') {
            callback({ success: true, roomCode: code });
        }
    });

    // Chat message — SCAN BEFORE DELIVERY (scoped to room)
    socket.on('chat-message', (text) => {
        const roomCode = socketRoom.get(socket.id);
        if (!roomCode) return;

        const room = chatRooms.get(roomCode);
        if (!room) return;

        const user = room.users.get(socket.id);
        if (!user) return;

        const cleanText = (text || '').trim().slice(0, 2000);
        if (!cleanText) return;

        // Run CyberGuard scan (Keyword-based)
        const result = scan(cleanText);

        // Enhance with AI scan if keyword scan confirms potential issue or for high-value detection
        // Note: For production, you might want to throttle this or only run for certain scores.
        // We'll run it and merge results if it returns.

        (async () => {
            let finalResult = { ...result };
            let aiData = null;

            // Only run AI scan if keyword scan is not 100% safe or randomly for quality check
            if (result.score > 5 || Math.random() < 0.1) {
                aiData = await aiScan(cleanText);
                if (aiData) {
                    // Update score if AI finds it more severe
                    if (aiData.score > finalResult.score) {
                        finalResult.score = aiData.score;
                        finalResult.sev = aiData.sev;
                    }
                    console.log(`  [AI][Room ${roomCode}] ${user.username} AI feedback: ${aiData.sev} (${aiData.score}) - ${aiData.reason}`);
                }
            }

            const msgPayload = {
                id: Date.now() + '-' + socket.id,
                user: user.username,
                text: cleanText,
                time: Date.now(),
                scan: {
                    score: finalResult.score,
                    sev: finalResult.sev,
                    cats: Object.keys(finalResult.cats),
                    flagged: finalResult.flagged,
                    ai: aiData ? { reason: aiData.reason } : null
                }
            };

            if (finalResult.sev !== 'safe') {
                console.log(`  [FLAGGED][Room ${roomCode}] ${user.username}: "${cleanText.slice(0, 50)}..." → ${finalResult.sev} (${finalResult.score})`);
            }

            // Send to everyone in the room
            io.to(roomCode).emit('chat-message', msgPayload);

            // Send private warning to sender if flagged
            if (finalResult.sev !== 'safe') {
                socket.emit('warning', {
                    sev: finalResult.sev,
                    score: finalResult.score,
                    cats: Object.keys(finalResult.cats),
                    flagged: finalResult.flagged,
                    message: `Your message was flagged as ${finalResult.sev} risk (score: ${finalResult.score}/100)`
                });
            }
        })();
    });

    // Typing indicator (scoped to room)
    socket.on('typing', () => {
        const roomCode = socketRoom.get(socket.id);
        if (!roomCode) return;
        const room = chatRooms.get(roomCode);
        const user = room ? room.users.get(socket.id) : null;
        if (user) {
            socket.to(roomCode).emit('typing', user.username);
        }
    });

    socket.on('stop-typing', () => {
        const roomCode = socketRoom.get(socket.id);
        if (roomCode) {
            socket.to(roomCode).emit('stop-typing');
        }
    });

    // Leave room explicitly
    socket.on('leave-room', () => {
        leaveCurrentRoom(socket);
    });

    // Disconnect
    socket.on('disconnect', () => {
        leaveCurrentRoom(socket);
        console.log(`  [Socket] Disconnected: ${socket.id}`);
    });
});

/* ============================================================
   START
   ============================================================ */

server.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('  ╔══════════════════════════════════════════╗');
    console.log('  ║   CyberGuard Server Running!             ║');
    console.log('  ║                                          ║');
    console.log(`  ║   → http://0.0.0.0:${PORT}               ║`);
    console.log('  ║   → OpenAI API proxy enabled             ║');
    console.log('  ║   → Room-based chat enabled              ║');
    console.log('  ║                                          ║');
    console.log('  ║   Press Ctrl+C to stop                   ║');
    console.log('  ╚══════════════════════════════════════════╝');
    console.log('');
});
