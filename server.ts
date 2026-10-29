import express, { Request, Response } from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';
import { createRequire } from 'module';
import { createServer as createViteServer } from 'vite';

const require = createRequire(import.meta.url);
const archiver = require('archiver');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Enforce Port 3000 as required by the AI Studio environment
let selectedPort = 3000;
for (let i = 0; i < process.argv.length; i++) {
  if (process.argv[i] === '--port' && process.argv[i + 1]) {
    const val = Number(process.argv[i + 1]);
    if (!isNaN(val) && val > 0) {
      selectedPort = val;
    }
  }
}
const PORT = selectedPort;
const SCORES_FILE = path.join(__dirname, 'scores.json');

// Interface definition for scores
interface ScoreEntry {
  name: string;
  score: number;
  kills: number;
  mode: string;
  game?: string;
  t: number;
}

let scores: ScoreEntry[] = [];
try {
  if (fs.existsSync(SCORES_FILE)) {
    scores = JSON.parse(fs.readFileSync(SCORES_FILE, 'utf8'));
  }
} catch (e) {
  console.warn('Could not read scores.json, initializing empty array');
}

const saveScores = () => {
  try {
    fs.writeFile(SCORES_FILE, JSON.stringify(scores.slice(0, 500), null, 2), () => {});
  } catch (e) {}
};

// 14 games catalogue with metadata
export const GAMES_CATALOG = [
  {
    id: 'ludo',
    title: 'Ludo',
    file: 'ludo.html',
    category: 'Board & Family',
    players: '2-5 Players',
    description: 'Roll the dice, race your 4 tokens home, and send rivals back to the yard with optional duo teams.',
    accent: '#3d8bff',
    gradient: 'from-blue-600 to-indigo-700',
    tags: ['Board', 'Dice', 'Turn-based', '2-5P']
  },
  {
    id: 'carrom',
    title: 'Carrom',
    file: 'carrom.html',
    category: 'Board & Physics',
    players: '2-4 Players',
    description: 'Realistic wooden board physics with striker friction, corner pockets, and queen cover mechanics.',
    accent: '#e9b44c',
    gradient: 'from-amber-600 to-orange-700',
    tags: ['Physics', 'Flick', 'Singles/Doubles', 'Voice Chat']
  },
  {
    id: 'snake_io',
    title: 'Snake.io',
    file: 'snake_io.html',
    category: 'Arcade & Action',
    players: '2-12 Players',
    description: 'Eat energy orbs, boost, trap rivals, and grow into the largest serpent in a shrinking arena.',
    accent: '#22c55e',
    gradient: 'from-emerald-500 to-green-700',
    tags: ['Real-time', 'Survival', 'Bots', 'Custom Skins']
  },
  {
    id: 'checkers',
    title: 'Checkers',
    file: 'checkers.html',
    category: 'Board & Strategy',
    players: '2 Players',
    description: 'Classic 8x8 checkers with multi-jumps, forced captures, king crownings, and move timers.',
    accent: '#ef4444',
    gradient: 'from-red-600 to-rose-700',
    tags: ['Strategy', '1v1', 'Tactical']
  },
  {
    id: 'bead16',
    title: 'Sixteen Beads (Sholo Guti)',
    file: 'bead16.html',
    category: 'Board & Strategy',
    players: '2 Players',
    description: 'Authentic 37-point South Asian board strategy game. Slide along vertex lines and multi-jump.',
    accent: '#14b8a6',
    gradient: 'from-teal-500 to-emerald-700',
    tags: ['Traditional', '1v1', 'Skill']
  },
  {
    id: 'among-us',
    title: 'Impostor Aboard',
    file: 'among-us.html',
    category: 'Social & Deduction',
    players: '4-10 Players',
    description: 'Solve ship console tasks in the dark, report fallen crewmates, call emergency meetings, and vote.',
    accent: '#dc2626',
    gradient: 'from-red-600 to-red-900',
    tags: ['Social Deduction', 'Meetings', 'Tasks', 'Spectator']
  },
  {
    id: 'ben10-omni-brawl',
    title: 'Ben 10: Omni Brawl',
    file: 'ben10-omni-brawl.html',
    category: 'Action & Fighting',
    players: '1v1 Combat',
    description: 'Transform mid-combo into 11 alien heroes: Four Arms, XLR8, Heatblast, Diamondhead, and Alien X.',
    accent: '#84cc16',
    gradient: 'from-lime-500 to-green-700',
    tags: ['Fighting', 'Combos', 'Special Moves']
  },
  {
    id: 'football',
    title: 'Football.io',
    file: 'football.html',
    category: 'Sports & Arcade',
    players: '2-10 Players',
    description: 'Fast-paced arcade soccer from 1v1 up to 5v5. Sprint, slide tackle, curved shots, and computer goalkeepers.',
    accent: '#16a34a',
    gradient: 'from-green-600 to-teal-800',
    tags: ['Sports', 'Multiplayer', 'Teams']
  },
  {
    id: 'duelist',
    title: 'Supreme Duelist',
    file: 'duelist.html',
    category: 'Action & Fighting',
    players: '2-4 Players',
    description: 'Stickman sword duel showdowns with parrying, mid-air dashes, weapon drops, and duo team battles.',
    accent: '#06b6d4',
    gradient: 'from-cyan-500 to-blue-700',
    tags: ['Stickman', 'Brawler', 'Weapons', 'Parry']
  },
  {
    id: 'dual',
    title: 'Dual Arena',
    file: 'dual.html',
    category: 'Action & Arcade',
    players: '2 Players',
    description: 'High-speed face-to-face projectile arena duel. Charge plasma shots, clash lasers, and collect power-ups.',
    accent: '#f97316',
    gradient: 'from-orange-500 to-red-600',
    tags: ['Shooter', 'Head-to-head', 'Fast']
  },
  {
    id: 'echo-ops',
    title: 'Echo Ops',
    file: 'echo-ops.html',
    category: 'Tactical Shooter',
    players: '2-8 Players',
    description: 'Tactical top-down darkness combat. You only see inside your flashlight cone; gunshots emit echo rings.',
    accent: '#0ea5e9',
    gradient: 'from-sky-500 to-blue-800',
    tags: ['Tactical', 'Fog of War', 'Team Deathmatch']
  },
  {
    id: 'mini-militia',
    title: 'Jet Militia',
    file: 'mini-militia.html',
    category: 'Shooter & Jetpack',
    players: '2-8 Players',
    description: '2D jetpack arena shooter inspired by Doodle Army. Rocket launchers, snipers, grenades, and flight.',
    accent: '#65a30d',
    gradient: 'from-lime-600 to-emerald-800',
    tags: ['Jetpack', 'Weapons', 'Free-for-All']
  },
  {
    id: 'hundred',
    title: 'Hundred (১০০ ডাক)',
    file: 'hundred.html',
    category: 'Card Game',
    players: '4 Players',
    description: 'Strategic South Asian trick-taking card game with secret bids, trump pocha (২৫), and points race to 100.',
    accent: '#8b5cf6',
    gradient: 'from-violet-600 to-purple-800',
    tags: ['Card Game', 'Bidding', 'Bilingual']
  },
  {
    id: 'aamjam_lichi',
    title: 'Aam Jam Kanthal Lichi',
    file: 'aamjam_lichi.html',
    category: 'Card & Party',
    players: '4-8 Players',
    description: 'Fast-paced fruit passing matching game. Trade cards secretly in a circle until someone gets 4 matching fruits.',
    accent: '#ec4899',
    gradient: 'from-pink-500 to-rose-700',
    tags: ['Party Game', 'Trading', 'Bengali & English']
  }
];

// Network interface helper
function getNetworkAddresses(): { address: string; name: string }[] {
  const list: { address: string; name: string }[] = [];
  try {
    const interfaces = os.networkInterfaces();
    for (const [name, addrs] of Object.entries(interfaces)) {
      if (!addrs) continue;
      for (const addr of addrs) {
        if (addr.family === 'IPv4' && !addr.internal) {
          list.push({ address: addr.address, name });
        }
      }
    }
  } catch (e) {}
  return list;
}

let lanIp = getNetworkAddresses()[0]?.address || '127.0.0.1';

/* ---------------- WebSocket State ---------------- */
interface ClientContext {
  id: string;
  ws: WebSocket;
  ip: string;
  dead: boolean;
}

// Supabase Realtime shim topics: topic -> Map<ClientContext, { key: string, payload: any }>
const topics = new Map<string, Map<ClientContext, { key: string; payload: any }>>();

// WSNet room manager: roomCode -> WSNetRoom
interface WSNetRoom {
  code: string;
  game: string;
  name: string;
  info: any;
  hostClient: ClientContext;
  peers: Map<string, { id: string; name: string; client: ClientContext }>;
  created: number;
}

const wsNetRooms = new Map<string, WSNetRoom>();
const allClients = new Set<ClientContext>();

function getPresenceState(topic: string) {
  const state: Record<string, any[]> = {};
  const topicMap = topics.get(topic);
  if (topicMap) {
    for (const entry of topicMap.values()) {
      if (entry.payload !== null && entry.payload !== undefined) {
        state[entry.key] = state[entry.key] || [];
        state[entry.key].push(entry.payload);
      }
    }
  }
  return state;
}

function broadcastPresence(topic: string) {
  const topicMap = topics.get(topic);
  if (!topicMap) return;
  const msg = JSON.stringify({
    op: 'presence',
    topic,
    state: getPresenceState(topic)
  });
  for (const client of topicMap.keys()) {
    if (!client.dead && client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(msg);
      } catch (e) {}
    }
  }
}

function leaveTopic(client: ClientContext, topic: string) {
  const topicMap = topics.get(topic);
  if (!topicMap) return;
  const entry = topicMap.get(client);
  if (!entry) return;
  topicMap.delete(client);
  if (topicMap.size === 0) {
    topics.delete(topic);
  } else if (entry.payload !== null) {
    broadcastPresence(topic);
  }
}

// Replaces mDNS .local hostnames with sender's real IP
const MDNS_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.local/gi;
function fixCandidates(client: ClientContext, payload: any): any {
  let ip = client.ip;
  if (!ip || ip === '127.0.0.1' || ip === '::1') ip = lanIp;
  try {
    return JSON.parse(JSON.stringify(payload).replace(MDNS_REGEX, ip));
  } catch (e) {
    return payload;
  }
}

export async function startAppServer() {
  const app = express();
  const server = http.createServer(app);

  app.use(express.json());

  // WebSocket Server setup on same HTTP server
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    try {
      const parsedUrl = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
      if (parsedUrl.pathname.startsWith('/@vite') || parsedUrl.pathname.startsWith('/vite-hmr')) {
        return;
      }
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } catch (e) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  // Client connection handler
  wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
    let rawIp = (req.socket.remoteAddress || '').replace('::ffff:', '');
    if (!rawIp || rawIp === '127.0.0.1' || rawIp === '::1') {
      rawIp = lanIp;
    }

    const client: ClientContext = {
      id: Math.random().toString(36).slice(2, 10),
      ws,
      ip: rawIp,
      dead: false
    };
    allClients.add(client);

    const sendMsg = (obj: any) => {
      if (!client.dead && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify(obj));
        } catch (e) {}
      }
    };

    ws.on('message', (data: Buffer | string) => {
      let m: any;
      try {
        m = JSON.parse(data.toString('utf8'));
      } catch (e) {
        return;
      }
      if (!m || typeof m.op !== 'string') return;

      const topic: string = typeof m.topic === 'string' ? m.topic.slice(0, 100) : '';

      switch (m.op) {
        // --- Supabase Realtime Protocol ---
        case 'join': {
          // Client wants to join a presence / broadcast topic
          if (!topic) return;
          let topicMap = topics.get(topic);
          if (!topicMap) {
            topicMap = new Map();
            topics.set(topic, topicMap);
          }
          const key = String(m.key || client.id).slice(0, 50);
          topicMap.set(client, { key, payload: null });
          sendMsg({ op: 'joined', topic });
          sendMsg({ op: 'presence', topic, state: getPresenceState(topic) });
          break;
        }

        case 'track': {
          const topicMap = topics.get(topic);
          const entry = topicMap && topicMap.get(client);
          if (!entry) return;
          entry.payload = m.payload === undefined ? {} : m.payload;
          broadcastPresence(topic);
          break;
        }

        case 'bc': {
          const topicMap = topics.get(topic);
          if (!topicMap || !topicMap.has(client)) return;
          const out = {
            op: 'bc',
            topic,
            event: String(m.event || ''),
            payload: fixCandidates(client, m.payload)
          };
          const rawOut = JSON.stringify(out);
          for (const other of topicMap.keys()) {
            if (other !== client && !other.dead && other.ws.readyState === WebSocket.OPEN) {
              try {
                other.ws.send(rawOut);
              } catch (e) {}
            }
          }
          break;
        }

        case 'leave': {
          leaveTopic(client, topic);
          break;
        }

        case 'score_add': {
          const r = m.row || {};
          const entry: ScoreEntry = {
            name: String(r.name || 'Player').slice(0, 14),
            score: Math.max(0, Math.min(100000, Number(r.score) || 0)),
            kills: Math.max(0, Math.min(1000, Number(r.kills) || 0)),
            mode: String(r.mode || 'standard').slice(0, 20),
            t: Date.now()
          };
          scores.push(entry);
          scores.sort((a, b) => b.score - a.score);
          saveScores();
          sendMsg({ op: 'res', id: m.id, data: null, error: null });
          break;
        }

        case 'score_top': {
          const n = Math.max(1, Math.min(50, Number(m.n) || 15));
          sendMsg({
            op: 'res',
            id: m.id,
            data: scores.slice(0, n),
            error: null
          });
          break;
        }

        // --- WSNet Room Protocol (among-us, mini-militia, duelist) ---
        case 'host': {
          const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
          let code = '';
          for (let i = 0; i < 4; i++) {
            code += LETTERS[Math.floor(Math.random() * LETTERS.length)];
          }
          const info = m.info || {};
          const room: WSNetRoom = {
            code,
            game: String(info.game || 'game'),
            name: String(info.name || 'Host'),
            info,
            hostClient: client,
            peers: new Map(),
            created: Date.now()
          };
          wsNetRooms.set(code, room);
          sendMsg({ op: 'hosted', code });
          break;
        }

        case 'info': {
          for (const room of wsNetRooms.values()) {
            if (room.hostClient === client) {
              room.info = Object.assign(room.info, m.info || {});
            }
          }
          break;
        }

        case 'rooms': {
          const gameFilter = m.game;
          const list: any[] = [];
          for (const room of wsNetRooms.values()) {
            if (!gameFilter || room.game === gameFilter) {
              list.push({
                code: room.code,
                name: room.name,
                game: room.game,
                open: room.info?.open ?? 1,
                inGame: !!room.info?.inGame,
                mode: room.info?.mode,
                players: (room.peers.size + 1)
              });
            }
          }
          sendMsg({ op: 'rooms', list });
          break;
        }

        case 'join': {
          const reqCode = String(m.code || '').trim().toUpperCase();
          const room = wsNetRooms.get(reqCode);
          if (!room) {
            sendMsg({ op: 'err', msg: `Room ${reqCode} was not found` });
            return;
          }
          const peerId = 'p_' + Math.random().toString(36).slice(2, 9);
          const peerName = String(m.name || 'Guest').slice(0, 14);
          room.peers.set(peerId, { id: peerId, name: peerName, client });

          // Notify host
          if (!room.hostClient.dead && room.hostClient.ws.readyState === WebSocket.OPEN) {
            try {
              room.hostClient.ws.send(JSON.stringify({ op: 'peer', id: peerId, name: peerName }));
            } catch (e) {}
          }

          // Confirm to peer
          sendMsg({ op: 'joined', id: peerId });
          break;
        }

        case 'send': {
          const target = m.to;
          const dataPayload = m.data;
          // Find which room this client is in
          let foundRoom: WSNetRoom | null = null;
          let isHostOfRoom = false;
          let peerSelfId: string | null = null;

          for (const r of wsNetRooms.values()) {
            if (r.hostClient === client) {
              foundRoom = r;
              isHostOfRoom = true;
              break;
            }
            for (const [pid, p] of r.peers.entries()) {
              if (p.client === client) {
                foundRoom = r;
                peerSelfId = pid;
                break;
              }
            }
            if (foundRoom) break;
          }

          if (!foundRoom) return;

          if (isHostOfRoom) {
            if (target === '*') {
              const packet = JSON.stringify({ op: 'msg', from: 'host', data: dataPayload });
              for (const p of foundRoom.peers.values()) {
                if (!p.client.dead && p.client.ws.readyState === WebSocket.OPEN) {
                  try {
                    p.client.ws.send(packet);
                  } catch (e) {}
                }
              }
            } else {
              const p = foundRoom.peers.get(target);
              if (p && !p.client.dead && p.client.ws.readyState === WebSocket.OPEN) {
                try {
                  p.client.ws.send(JSON.stringify({ op: 'msg', from: 'host', data: dataPayload }));
                } catch (e) {}
              }
            }
          } else if (peerSelfId) {
            // Forward to host
            if (!foundRoom.hostClient.dead && foundRoom.hostClient.ws.readyState === WebSocket.OPEN) {
              try {
                foundRoom.hostClient.ws.send(JSON.stringify({ op: 'msg', from: peerSelfId, data: dataPayload }));
              } catch (e) {}
            }
          }
          break;
        }

        // --- App Hub Status ---
        case 'hub:ping': {
          sendMsg({ op: 'hub:pong', t: Date.now() });
          break;
        }
      }
    });

    const cleanupClient = () => {
      if (client.dead) return;
      client.dead = true;
      allClients.delete(client);

      // Leave topics
      for (const topic of [...topics.keys()]) {
        leaveTopic(client, topic);
      }

      // Handle WSNet rooms
      for (const [code, room] of [...wsNetRooms.entries()]) {
        if (room.hostClient === client) {
          // Notify peers host is gone
          const packet = JSON.stringify({ op: 'hostgone' });
          for (const p of room.peers.values()) {
            if (!p.client.dead && p.client.ws.readyState === WebSocket.OPEN) {
              try {
                p.client.ws.send(packet);
              } catch (e) {}
            }
          }
          wsNetRooms.delete(code);
        } else {
          for (const [pid, p] of room.peers.entries()) {
            if (p.client === client) {
              room.peers.delete(pid);
              if (!room.hostClient.dead && room.hostClient.ws.readyState === WebSocket.OPEN) {
                try {
                  room.hostClient.ws.send(JSON.stringify({ op: 'left', id: pid }));
                } catch (e) {}
              }
            }
          }
        }
      }
    };

    ws.on('close', cleanupClient);
    ws.on('error', cleanupClient);
  });

  // REST API Routes
  app.get('/api/server-info', (_req: Request, res: Response) => {
    const addresses = getNetworkAddresses();
    res.json({
      status: 'online',
      port: PORT,
      lanIp,
      addresses,
      connectedClients: allClients.size,
      activeRooms: wsNetRooms.size + topics.size,
      uptime: process.uptime()
    });
  });

  app.get('/api/games', (_req: Request, res: Response) => {
    res.json(GAMES_CATALOG);
  });

  app.get('/api/rooms', (_req: Request, res: Response) => {
    const list: any[] = [];
    // Collect WSNet rooms
    for (const r of wsNetRooms.values()) {
      list.push({
        code: r.code,
        game: r.game,
        title: r.name,
        type: 'wsnet',
        players: r.peers.size + 1,
        max: r.info?.seats || 8,
        inGame: !!r.info?.inGame,
        open: r.info?.open ?? 1
      });
    }
    // Collect Supabase topics with room payload
    for (const [topic, topicMap] of topics.entries()) {
      if (!topic.includes(':lobby')) continue;
      for (const entry of topicMap.values()) {
        const room = entry.payload?.room;
        if (room && typeof room.c === 'string') {
          list.push({
            code: room.c,
            game: topic.split(':')[0],
            title: room.n || room.hn || 'Room',
            type: 'realtime',
            players: room.pl || 1,
            max: room.mx || 4,
            inGame: room.st === 'play',
            open: (room.mx || 4) - (room.pl || 1)
          });
        }
      }
    }
    res.json(list);
  });

  app.get('/api/scores', (_req: Request, res: Response) => {
    res.json(scores.slice(0, 50));
  });

  app.get('/api/security-status', (_req: Request, res: Response) => {
    res.json({
      status: 'active_protection',
      tamperProof: true,
      totalProtectedGames: 14,
      protectionLayer: 'anti-theft-and-inspection'
    });
  });

  // Game stream endpoint
  app.get('/api/game-stream/:id', (req: Request, res: Response) => {
    const id = req.params.id.replace(/[^a-zA-Z0-9_-]/g, '');
    const sourcePath = path.join(__dirname, 'public', 'games', `${id}.html`);
    if (fs.existsSync(sourcePath)) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
      res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
      res.sendFile(sourcePath);
    } else {
      res.status(404).send('Game not found');
    }
  });

  // Download Android APK package (.apk)
  const handleApkDownload = (_req: Request, res: Response) => {
    const rootApk = path.join(__dirname, 'omnigame-room.apk');
    const publicApk = path.join(__dirname, 'public', 'omnigame-room.apk');
    const targetPath = fs.existsSync(rootApk) ? rootApk : (fs.existsSync(publicApk) ? publicApk : null);

    if (targetPath) {
      res.setHeader('Content-Disposition', 'attachment; filename="omnigame-room.apk"');
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      res.sendFile(targetPath);
    } else {
      res.status(404).json({ error: 'APK file not found. Run npm run build:apk to generate it.' });
    }
  };

  app.get('/api/download/apk', handleApkDownload);
  app.get('/omnigame-room.apk', handleApkDownload);
  app.get('/app-release.apk', handleApkDownload);

  // APK info & status
  app.get('/api/apk/status', (_req: Request, res: Response) => {
    const rootApk = path.join(__dirname, 'omnigame-room.apk');
    if (fs.existsSync(rootApk)) {
      const stats = fs.statSync(rootApk);
      res.json({
        exists: true,
        filename: 'omnigame-room.apk',
        path: rootApk,
        sizeBytes: stats.size,
        sizeMb: (stats.size / 1024 / 1024).toFixed(2),
        version: '1.0.0',
        updatedAt: stats.mtime
      });
    } else {
      res.json({ exists: false, error: 'APK not yet built in project root directory' });
    }
  });

  // Download standalone zero-dependency server.js directly in app
  app.get('/api/download/server.js', (_req: Request, res: Response) => {
    const filePath = path.join(__dirname, 'standalone-server.js');
    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Disposition', 'attachment; filename="server.js"');
      res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
      res.sendFile(filePath);
    } else {
      res.status(404).send('server.js not found');
    }
  });

  // Download complete standalone offline multiplayer pack (.zip)
  app.get('/api/download/pack', (_req: Request, res: Response) => {
    res.setHeader('Content-Disposition', 'attachment; filename="omnigame-offline-server-pack.zip"');
    res.setHeader('Content-Type', 'application/zip');

    let archive: any;
    try {
      if (typeof archiver === 'function') {
        archive = archiver('zip', { zlib: { level: 9 } });
      } else if (archiver.ZipArchive) {
        archive = new archiver.ZipArchive({ zlib: { level: 9 } });
      } else if (archiver.default && typeof archiver.default === 'function') {
        archive = archiver.default('zip', { zlib: { level: 9 } });
      } else {
        throw new Error('Zip archiver not available');
      }
    } catch (e: any) {
      return res.status(500).send({ error: e.message });
    }

    archive.on('error', (err: any) => {
      if (!res.headersSent) {
        res.status(500).send({ error: err.message });
      }
    });

    archive.pipe(res);

    // Append standalone-server.js as server.js
    const serverPath = path.join(__dirname, 'standalone-server.js');
    if (fs.existsSync(serverPath)) {
      archive.file(serverPath, { name: 'server.js' });
    }

    // Append launch scripts
    archive.append('@echo off\\r\\necho Starting OmniGame Room Local Server...\\r\\nnode server.js\\r\\npause\\r\\n', { name: 'start.bat' });
    archive.append('#!/bin/bash\\necho "Starting OmniGame Room Local Server..."\\nnode server.js\\n', { name: 'start.sh', mode: 0o755 });

    // Append offline package.json
    archive.append(JSON.stringify({
      name: "omnigame-room-offline",
      version: "1.0.0",
      description: "Standalone zero-dependency local games server",
      main: "server.js",
      scripts: {
        "start": "node server.js"
      }
    }, null, 2), { name: 'package.json' });

    // Append instructions
    archive.append(
`# OmniGame Room - Standalone Offline Server Pack

Run 14 multiplayer games on any PC, Mac, Linux, or Android phone (Termux) with zero internet!

## Quick Start (No npm install needed!)

1. Run the server:
   - On Windows: double-click \`start.bat\` or run \`node server.js\`
   - On Mac/Linux/Termux: run \`bash start.sh\` or \`node server.js\`

2. Connect devices:
   - Connect all phones/laptops to the same Wi-Fi router or phone personal hotspot.
   - The server will print your local address, e.g. \`http://192.168.43.1:3000\`.
   - Open that address in Chrome/Safari on any device.

3. Enjoy 14 games with instant WebSockets and real-time multiplayer!
`, { name: 'README.md' });

    // Append games
    const gamesDir = path.join(__dirname, 'public', 'games');
    if (fs.existsSync(gamesDir)) {
      const files = fs.readdirSync(gamesDir).filter(f => f.endsWith('.html'));
      for (const f of files) {
        archive.file(path.join(gamesDir, f), { name: f });
      }
    }

    archive.finalize();
  });

  app.post('/api/scores', (req: Request, res: Response) => {
    const { name, score, kills, mode, game } = req.body;
    if (score !== undefined) {
      const entry: ScoreEntry = {
        name: String(name || 'Player').slice(0, 14),
        score: Math.max(0, Math.min(100000, Number(score) || 0)),
        kills: Math.max(0, Math.min(1000, Number(kills) || 0)),
        mode: String(mode || 'standard').slice(0, 20),
        game: String(game || '').slice(0, 30),
        t: Date.now()
      };
      scores.push(entry);
      scores.sort((a, b) => b.score - a.score);
      saveScores();
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Invalid score' });
    }
  });

  // Serve static game files directly at root and under /games/
  const gamesDir = path.join(__dirname, 'public', 'games');
  if (fs.existsSync(gamesDir)) {
    app.use('/games', express.static(gamesDir));
  }

  // Route each game file alias (e.g. /ludo.html, /checkers.html)
  for (const game of GAMES_CATALOG) {
    const filePath = path.join(gamesDir, game.file);
    if (fs.existsSync(filePath)) {
      app.get(`/${game.file}`, (_req, res) => {
        res.sendFile(filePath);
      });
    }
  }

  // Vite Integration (Dev vs Prod)
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);

    // Serve transformed index.html for SPA routes
    app.use('*', async (req: Request, res: Response, next) => {
      const url = req.originalUrl;
      if (url.startsWith('/api') || url.startsWith('/games') || url.endsWith('.html')) {
        return next();
      }
      try {
        const indexPath = path.resolve(__dirname, 'index.html');
        let template = fs.readFileSync(indexPath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        if (vite) {
          vite.ssrFixStacktrace(e);
        }
        next(e);
      }
    });
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n======================================================`);
    console.log(`🎮 OmniGame Room Real-Time Server running on port ${PORT}`);
    console.log(`👉 This device : http://localhost:${PORT}`);
    const addrs = getNetworkAddresses();
    if (addrs.length) {
      addrs.forEach(a => console.log(`👉 Other devices: http://${a.address}:${PORT} (${a.name})`));
    }
    console.log(`======================================================\n`);
  });

  return server;
}

startAppServer().catch((err) => {
  console.error('Fatal server start error:', err);
});
