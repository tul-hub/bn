// Standalone Zero-Dependency Multiplayer Node.js Server for OmniGame Room
// Runs with: node server.js (no npm install required!)
// Supports all 14 games, WebSockets, real-time lobbies, P2P signalling & scores.

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const cp = require('child_process');

const PORT = +process.env.PORT || 3000;
const DIR = __dirname;
const MAIN = 'index.html';
const SCORES_FILE = path.join(DIR, 'scores.json');
const MAX_MSG = 1 << 20; // 1 MB

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav'
};

/* ---------------- Leaderboard ---------------- */
let scores = [];
try {
  if (fs.existsSync(SCORES_FILE)) {
    scores = JSON.parse(fs.readFileSync(SCORES_FILE, 'utf8'));
  }
} catch (e) {}
const saveScores = () => fs.writeFile(SCORES_FILE, JSON.stringify(scores.slice(0, 500), null, 2), () => {});
const clamp = (v, a, b) => Math.min(b, Math.max(a, v | 0));

/* ---------------- HTTP Server ---------------- */
const server = http.createServer((req, res) => {
  let p;
  try {
    p = decodeURIComponent((req.url || '/').split('?')[0].split('#')[0]);
  } catch (e) {
    res.writeHead(400);
    return res.end('Bad request');
  }

  // Root redirects to index.html
  if (p === '/' || p === '/index.html') p = '/' + MAIN;

  // API endpoints
  if (p === '/api/server-info') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      status: 'online',
      port: PORT,
      lanIp,
      addresses: getIps(),
      connectedClients: clients.size,
      activeRooms: wsNetRooms.size + topics.size,
      uptime: process.uptime()
    }));
  }

  if (p === '/api/scores') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(scores.slice(0, 50)));
  }

  // File resolution
  let f = path.normalize(path.join(DIR, p));
  // Check in public/games or public/ if not directly in root
  if (!fs.existsSync(f)) {
    const inGames = path.join(DIR, 'public', 'games', p.replace(/^\//, ''));
    if (fs.existsSync(inGames)) f = inGames;
    else {
      const inPub = path.join(DIR, 'public', p.replace(/^\//, ''));
      if (fs.existsSync(inPub)) f = inPub;
    }
  }

  const base = path.basename(f);
  if (base === 'server.js' || base === 'scores.json' && req.method !== 'GET') {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(f, (err, buf) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Game file not found: ' + p);
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    });
    res.end(buf);
  });
});

/* ---------------- WebSocket Framing ---------------- */
function frame(op, data) {
  const n = data.length;
  let h;
  if (n < 126) {
    h = Buffer.alloc(2);
    h[1] = n;
  } else if (n < 65536) {
    h = Buffer.alloc(4);
    h[1] = 126;
    h.writeUInt16BE(n, 2);
  } else {
    h = Buffer.alloc(10);
    h[1] = 127;
    h.writeBigUInt64BE(BigInt(n), 2);
  }
  h[0] = 0x80 | op;
  return Buffer.concat([h, data]);
}

const topics = new Map(); // topic -> Map(client -> { key, payload })
const clients = new Set();
const wsNetRooms = new Map(); // code -> room
let lanIp = '';

const ipOf = s => {
  let a = s.remoteAddress || '';
  if (a.startsWith('::ffff:')) a = a.slice(7);
  return a;
};
const isLoop = a => a === '127.0.0.1' || a === '::1' || a === '';
const isV4 = a => /^\\d{1,3}(\\.\\d{1,3}){3}$/.test(a);

function sendTo(c, o) {
  if (!c.dead) {
    try {
      c.socket.write(frame(1, Buffer.from(JSON.stringify(o))));
    } catch (e) {}
  }
}

function presenceState(topic) {
  const st = {}, m = topics.get(topic);
  if (m) {
    for (const e of m.values()) {
      if (e.payload !== null && e.payload !== undefined) {
        (st[e.key] = st[e.key] || []).push(e.payload);
      }
    }
  }
  return st;
}

function broadcastPresence(topic) {
  const m = topics.get(topic);
  if (!m) return;
  const msg = { op: 'presence', topic, state: presenceState(topic) };
  for (const c of m.keys()) sendTo(c, msg);
}

function leaveTopic(c, topic) {
  const m = topics.get(topic);
  if (!m) return;
  const e = m.get(c);
  if (!e) return;
  m.delete(c);
  if (!m.size) topics.delete(topic);
  else if (e.payload !== null) broadcastPresence(topic);
}

const MDNS = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.local/gi;
function fixCandidates(c, payload) {
  let ip = ipOf(c.socket);
  if (isLoop(ip)) ip = lanIp;
  if (!isV4(ip)) return payload;
  try {
    return JSON.parse(JSON.stringify(payload).replace(MDNS, ip));
  } catch (e) {
    return payload;
  }
}

function onMessage(c, text) {
  let m;
  try {
    m = JSON.parse(text);
  } catch (e) {
    return;
  }
  if (!m || typeof m.op !== 'string') return;
  const topic = typeof m.topic === 'string' ? m.topic.slice(0, 100) : '';

  switch (m.op) {
    // Supabase Realtime Protocol
    case 'join': {
      if (!topic) return;
      let t = topics.get(topic);
      if (!t) topics.set(topic, (t = new Map()));
      if (!t.has(c)) t.set(c, { key: String(m.key || '').slice(0, 50), payload: null });
      else t.get(c).key = String(m.key || '').slice(0, 50);
      sendTo(c, { op: 'joined', topic });
      sendTo(c, { op: 'presence', topic, state: presenceState(topic) });
      break;
    }
    case 'track': {
      const t = topics.get(topic), e = t && t.get(c);
      if (!e) return;
      e.payload = m.payload === undefined ? {} : m.payload;
      broadcastPresence(topic);
      break;
    }
    case 'bc': {
      const t = topics.get(topic);
      if (!t || !t.has(c)) return;
      const out = { op: 'bc', topic, event: String(m.event || ''), payload: fixCandidates(c, m.payload) };
      for (const o of t.keys()) if (o !== c) sendTo(o, out);
      break;
    }
    case 'leave':
      leaveTopic(c, topic);
      break;

    case 'score_add': {
      const r = m.row || {};
      scores.push({
        name: String(r.name || 'Player').slice(0, 14),
        score: clamp(r.score, 0, 100000),
        kills: clamp(r.kills, 0, 1000),
        mode: ['ffa', 'last', 'race'].includes(r.mode) ? r.mode : 'ffa',
        t: Date.now()
      });
      scores.sort((a, b) => b.score - a.score);
      if (scores.length > 200) scores.length = 200;
      saveScores();
      sendTo(c, { op: 'res', id: m.id, data: null, error: null });
      break;
    }
    case 'score_top':
      sendTo(c, {
        op: 'res',
        id: m.id,
        data: scores.slice(0, clamp(m.n || 15, 1, 50)).map(({ name, score, kills, mode }) => ({ name, score, kills, mode })),
        error: null
      });
      break;

    // WSNet Protocol
    case 'host': {
      const L = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
      let code = '';
      for (let i = 0; i < 4; i++) code += L[Math.floor(Math.random() * L.length)];
      const info = m.info || {};
      wsNetRooms.set(code, {
        code,
        game: String(info.game || 'game'),
        name: String(info.name || 'Host'),
        info,
        hostClient: c,
        peers: new Map()
      });
      sendTo(c, { op: 'hosted', code });
      break;
    }
    case 'info': {
      for (const r of wsNetRooms.values()) {
        if (r.hostClient === c) r.info = Object.assign(r.info, m.info || {});
      }
      break;
    }
    case 'rooms': {
      const list = [];
      for (const r of wsNetRooms.values()) {
        if (!m.game || r.game === m.game) {
          list.push({
            code: r.code,
            name: r.name,
            game: r.game,
            open: r.info?.open ?? 1,
            inGame: !!r.info?.inGame,
            mode: r.info?.mode,
            players: r.peers.size + 1
          });
        }
      }
      sendTo(c, { op: 'rooms', list });
      break;
    }
    case 'join': {
      const code = String(m.code || '').trim().toUpperCase();
      const room = wsNetRooms.get(code);
      if (!room) {
        sendTo(c, { op: 'err', msg: 'Room ' + code + ' not found' });
        return;
      }
      const pid = 'p_' + Math.random().toString(36).slice(2, 9);
      const name = String(m.name || 'Guest').slice(0, 14);
      room.peers.set(pid, { id: pid, name, client: c });
      sendTo(room.hostClient, { op: 'peer', id: pid, name });
      sendTo(c, { op: 'joined', id: pid });
      break;
    }
    case 'send': {
      let r = null, isHost = false, myPid = null;
      for (const room of wsNetRooms.values()) {
        if (room.hostClient === c) { r = room; isHost = true; break; }
        for (const [pid, p] of room.peers) {
          if (p.client === c) { r = room; myPid = pid; break; }
        }
        if (r) break;
      }
      if (!r) return;
      if (isHost) {
        if (m.to === '*') {
          for (const p of r.peers.values()) sendTo(p.client, { op: 'msg', from: 'host', data: m.data });
        } else {
          const p = r.peers.get(m.to);
          if (p) sendTo(p.client, { op: 'msg', from: 'host', data: m.data });
        }
      } else if (myPid) {
        sendTo(r.hostClient, { op: 'msg', from: myPid, data: m.data });
      }
      break;
    }
    case 'hub:ping':
      sendTo(c, { op: 'hub:pong', t: Date.now() });
      break;
  }
}

server.on('upgrade', (req, socket) => {
  const key = req.headers['sec-websocket-key'];
  if (!key || String(req.headers.upgrade).toLowerCase() !== 'websocket') {
    socket.destroy();
    return;
  }
  const accept = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\\r\\nUpgrade: websocket\\r\\nConnection: Upgrade\\r\\nSec-WebSocket-Accept: ' + accept + '\\r\\n\\r\\n');
  socket.setNoDelay(true);

  const la = (socket.localAddress || '').replace('::ffff:', '');
  if (isV4(la) && !isLoop(la)) lanIp = la;

  const c = { socket, dead: false };
  clients.add(c);
  let buf = Buffer.alloc(0), frag = null, fragOp = 0;

  const close = () => {
    if (c.dead) return;
    c.dead = true;
    clients.delete(c);
    for (const t of [...topics.keys()]) leaveTopic(c, t);
    for (const [code, r] of [...wsNetRooms.entries()]) {
      if (r.hostClient === c) {
        for (const p of r.peers.values()) sendTo(p.client, { op: 'hostgone' });
        wsNetRooms.delete(code);
      } else {
        for (const [pid, p] of r.peers) {
          if (p.client === c) {
            r.peers.delete(pid);
            sendTo(r.hostClient, { op: 'left', id: pid });
          }
        }
      }
    }
    try { socket.destroy(); } catch (e) {}
  };

  socket.on('error', close);
  socket.on('close', close);
  socket.on('data', d => {
    buf = Buffer.concat([buf, d]);
    for (;;) {
      if (buf.length < 2) return;
      const fin = !!(buf[0] & 0x80), op = buf[0] & 15, masked = !!(buf[1] & 0x80);
      let len = buf[1] & 127, off = 2;
      if (len === 126) {
        if (buf.length < 4) return;
        len = buf.readUInt16BE(2);
        off = 4;
      } else if (len === 127) {
        if (buf.length < 10) return;
        len = Number(buf.readBigUInt64BE(2));
        off = 10;
      }
      if (len > MAX_MSG) { close(); return; }
      const need = off + (masked ? 4 : 0) + len;
      if (buf.length < need) return;
      let payload = buf.slice(off + (masked ? 4 : 0), need);
      if (masked) {
        const mk = buf.slice(off, off + 4);
        payload = Buffer.from(payload);
        for (let i = 0; i < payload.length; i++) payload[i] ^= mk[i & 3];
      }
      buf = buf.slice(need);
      if (op === 8) {
        try { socket.write(frame(8, Buffer.alloc(0))); } catch (e) {}
        close();
        return;
      }
      if (op === 9) {
        try { socket.write(frame(10, payload)); } catch (e) {}
        continue;
      }
      if (op === 10) continue;
      if (op === 1 || op === 2) {
        if (fin) onMessage(c, payload.toString('utf8'));
        else { frag = [payload]; fragOp = op; }
      } else if (op === 0 && frag) {
        frag.push(payload);
        if (fin) {
          const full = Buffer.concat(frag);
          frag = null;
          onMessage(c, full.toString('utf8'));
        }
      }
    }
  });
});

setInterval(() => {
  for (const c of clients) {
    try { c.socket.write(frame(9, Buffer.alloc(0))); } catch (e) {}
  }
}, 20000);

function getIps() {
  const ips = [];
  const add = (a, n) => {
    if (isV4(a) && !a.startsWith('127.') && !ips.some(x => x.address === a)) {
      ips.push({ address: a, name: n || '' });
    }
  };
  try {
    for (const [n, l] of Object.entries(os.networkInterfaces())) {
      for (const i of l) if (i.family === 'IPv4' && !i.internal) add(i.address, n);
    }
  } catch (e) {}
  return ips;
}

server.listen(PORT, '0.0.0.0', () => {
  console.log('\\n🎮 OmniGame Room Standalone Server Running (Zero Dependencies)');
  console.log('👉 Local URL: http://localhost:' + PORT);
  const ips = getIps();
  if (ips.length) {
    lanIp = ips[0].address;
    ips.forEach(i => console.log('👉 Other Devices: http://' + i.address + ':' + PORT + ' (' + i.name + ')'));
  }
  console.log('\\nShare the Other Devices URL with anyone on your Wi-Fi or mobile hotspot.\\n');
});
