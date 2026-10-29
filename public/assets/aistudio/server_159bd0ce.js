// Multi-game LOCAL server (index.html + all games) — zero dependencies (no npm install needed).
// Serves snake_io.html over HTTP and acts as the lobby + WebRTC signalling
// server over WebSocket (replaces Supabase). Run:  node server.js
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto'), os = require('os'), cp = require('child_process');

const PORT = +process.env.PORT || 3000;
const DIR = __dirname;
const MAIN = 'index.html';
const SCORES_FILE = path.join(DIR, 'scores.json');
const MAX_MSG = 1 << 20; // 1 MB per WebSocket message
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav'
};

/* ----------------------------- leaderboard ----------------------------- */
let scores = [];
try { scores = JSON.parse(fs.readFileSync(SCORES_FILE, 'utf8')); } catch (e) {}
const saveScores = () => fs.writeFile(SCORES_FILE, JSON.stringify(scores), () => {});
const clamp = (v, a, b) => Math.min(b, Math.max(a, v | 0));

/* ------------------------------ HTTP server ----------------------------- */
const server = http.createServer((req, res) => {
  let p;
  try { p = decodeURIComponent((req.url || '/').split('?')[0].split('#')[0]); } catch (e) { res.writeHead(400); return res.end('Bad request'); }
  if (p === '/' || p === '/index.html') p = '/' + MAIN;
  const f = path.normalize(path.join(DIR, p));
  const base = path.basename(f);
  if (!f.startsWith(DIR + path.sep) || base === 'server.js' || base === 'scores.json') { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(f, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(buf);
  });
});

/* ----------------------- minimal WebSocket (RFC 6455) ------------------- */
function frame(op, data) {
  const n = data.length;
  let h;
  if (n < 126) { h = Buffer.alloc(2); h[1] = n; }
  else if (n < 65536) { h = Buffer.alloc(4); h[1] = 126; h.writeUInt16BE(n, 2); }
  else { h = Buffer.alloc(10); h[1] = 127; h.writeBigUInt64BE(BigInt(n), 2); }
  h[0] = 0x80 | op;
  return Buffer.concat([h, data]);
}

/* topic -> Map(client -> { key, payload|null }) */
const topics = new Map();
const clients = new Set();
let lanIp = '';

const ipOf = s => { let a = s.remoteAddress || ''; if (a.startsWith('::ffff:')) a = a.slice(7); return a; };
const isLoop = a => a === '127.0.0.1' || a === '::1' || a === '';
const isV4 = a => /^\d{1,3}(\.\d{1,3}){3}$/.test(a);

function sendTo(c, o) { if (!c.dead) try { c.socket.write(frame(1, Buffer.from(JSON.stringify(o)))); } catch (e) {} }

function presenceState(topic) {
  const st = {}, m = topics.get(topic);
  if (m) for (const e of m.values()) if (e.payload !== null) (st[e.key] = st[e.key] || []).push(e.payload);
  return st;
}
function broadcastPresence(topic) {
  const m = topics.get(topic); if (!m) return;
  const msg = { op: 'presence', topic, state: presenceState(topic) };
  for (const c of m.keys()) sendTo(c, msg);
}
function leave(c, topic) {
  const m = topics.get(topic); if (!m) return;
  const e = m.get(c); if (!e) return;
  m.delete(c);
  if (!m.size) topics.delete(topic);
  else if (e.payload !== null) broadcastPresence(topic);
}

// Browsers hide LAN IPs behind random "xxxx.local" mDNS names in WebRTC offers.
// Many hotspots can't resolve those, so swap them for the sender's real IP.
const MDNS = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.local/gi;
function fixCandidates(c, payload) {
  let ip = ipOf(c.socket);
  if (isLoop(ip)) ip = lanIp;
  if (!isV4(ip)) return payload;
  try { return JSON.parse(JSON.stringify(payload).replace(MDNS, ip)); } catch (e) { return payload; }
}

function onMessage(c, text) {
  let m; try { m = JSON.parse(text); } catch (e) { return; }
  if (!m || typeof m.op !== 'string') return;
  const topic = typeof m.topic === 'string' ? m.topic.slice(0, 80) : '';
  switch (m.op) {
    case 'join': {
      if (!topic) return;
      let t = topics.get(topic); if (!t) topics.set(topic, t = new Map());
      if (!t.has(c)) t.set(c, { key: String(m.key || '').slice(0, 40), payload: null });
      else t.get(c).key = String(m.key || '').slice(0, 40);
      sendTo(c, { op: 'joined', topic });
      sendTo(c, { op: 'presence', topic, state: presenceState(topic) });
      break;
    }
    case 'track': {
      const t = topics.get(topic), e = t && t.get(c); if (!e) return;
      e.payload = m.payload === undefined ? {} : m.payload;
      broadcastPresence(topic);
      break;
    }
    case 'bc': {
      const t = topics.get(topic); if (!t || !t.has(c)) return;
      const out = { op: 'bc', topic, event: String(m.event || ''), payload: fixCandidates(c, m.payload) };
      for (const o of t.keys()) if (o !== c) sendTo(o, out);
      break;
    }
    case 'leave': leave(c, topic); break;
    case 'score_add': {
      const r = m.row || {};
      scores.push({
        name: String(r.name || 'Player').slice(0, 14), score: clamp(r.score, 0, 100000), kills: clamp(r.kills, 0, 1000),
        mode: ['ffa', 'last', 'race'].includes(r.mode) ? r.mode : 'ffa', t: Date.now()
      });
      scores.sort((a, b) => b.score - a.score);
      if (scores.length > 200) scores.length = 200;
      saveScores();
      sendTo(c, { op: 'res', id: m.id, data: null, error: null });
      break;
    }
    case 'score_top':
      sendTo(c, { op: 'res', id: m.id, data: scores.slice(0, clamp(m.n || 15, 1, 50)).map(({ name, score, kills, mode }) => ({ name, score, kills, mode })), error: null });
      break;
  }
}

server.on('upgrade', (req, socket) => {
  const key = req.headers['sec-websocket-key'];
  if (!key || String(req.headers.upgrade).toLowerCase() !== 'websocket') { socket.destroy(); return; }
  const accept = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
  socket.setNoDelay(true);

  const la = (socket.localAddress || '').replace('::ffff:', '');
  if (isV4(la) && !isLoop(la)) lanIp = la;

  const c = { socket, dead: false };
  clients.add(c);
  let buf = Buffer.alloc(0), frag = null, fragOp = 0;

  const close = () => {
    if (c.dead) return; c.dead = true; clients.delete(c);
    for (const t of [...topics.keys()]) leave(c, t);
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
      if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (buf.length < 10) return; len = Number(buf.readBigUInt64BE(2)); off = 10; }
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
      if (op === 8) { try { socket.write(frame(8, Buffer.alloc(0))); } catch (e) {} close(); return; }
      if (op === 9) { try { socket.write(frame(10, payload)); } catch (e) {} continue; }
      if (op === 10) continue;
      if (op === 1 || op === 2) {
        if (fin) onMessage(c, payload.toString('utf8'));
        else { frag = [payload]; fragOp = op; }
      } else if (op === 0 && frag) {
        frag.push(payload);
        if (fin) { const full = Buffer.concat(frag); frag = null; onMessage(c, full.toString('utf8')); }
      }
    }
  });
});

// keep hotspot/NAT sessions alive
setInterval(() => { for (const c of clients) try { c.socket.write(frame(9, Buffer.alloc(0))); } catch (e) {} }, 20000);

server.listen(PORT, '0.0.0.0', () => {
  console.log('\n  Local games server running (no internet needed)\n');
  console.log('  This device : http://localhost:' + PORT);
  const ips = [];
  const add = (a, n) => { if (/^\d{1,3}(\.\d{1,3}){3}$/.test(a) && !a.startsWith('127.') && !ips.some(x => x[0] === a)) ips.push([a, n || '']); };
  try { for (const [n, l] of Object.entries(os.networkInterfaces())) for (const i of l) if (i.family === 'IPv4' && !i.internal) add(i.address, n); } catch (e) {}
  if (!ips.length) { // Termux/Android often blocks networkInterfaces(); fall back to system tools
    for (const c of ['ip -4 addr', 'ifconfig']) {
      try { const o = cp.execSync(c + ' 2>/dev/null', { encoding: 'utf8', timeout: 3000 }); for (const m of o.matchAll(/inet (?:addr:)?(\d{1,3}(?:\.\d{1,3}){3})/g)) add(m[1]); } catch (e) {}
      if (ips.length) break;
    }
  }
  if (ips.length) { if (!lanIp) lanIp = ips[0][0]; for (const [a, n] of ips) console.log('  Other devices: http://' + a + ':' + PORT + (n ? '   (' + n + ')' : '')); }
  else console.log('  Other devices: could not detect IP. Run  ifconfig  and use  http://<ip>:' + PORT + '\n  (if THIS phone is the hotspot, friends usually use http://192.168.43.1:' + PORT + ')');
  console.log('\n  Phone hotspot: friends join your hotspot, then open the address above.');
  console.log('  The host should open the same Other-devices address too, not localhost.\n');
});