import React, { useState, useEffect, useRef } from 'react';
import {
  Gamepad2,
  Users,
  Wifi,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  RotateCcw,
  Trophy,
  Search,
  ExternalLink,
  X,
  Play,
  Radio,
  Share2,
  Smartphone,
  Download
} from 'lucide-react';

interface GameInfo {
  id: string;
  title: string;
  file: string;
  category: string;
  players: string;
  description: string;
  accent: string;
  tags: string[];
}

interface ServerInfo {
  status: string;
  port: number;
  lanIp: string;
  addresses: { address: string; name: string }[];
  connectedClients: number;
  activeRooms: number;
  uptime: number;
}

interface RoomInfo {
  code: string;
  game: string;
  title: string;
  type: string;
  players: number;
  max: number;
  inGame: boolean;
  open: number;
}

interface ScoreEntry {
  name: string;
  score: number;
  kills: number;
  mode: string;
  t: number;
}

const GAMES: GameInfo[] = [
  {
    id: 'ludo',
    title: 'Ludo',
    file: 'ludo.html',
    category: 'Board & Strategy',
    players: '2-5 Players',
    description: 'Roll the dice, race tokens home, and send rivals back to the yard with optional duo teams.',
    accent: '#38bdf8',
    tags: ['Board', 'Dice', 'Turn-Based', '2-5P']
  },
  {
    id: 'carrom',
    title: 'Carrom',
    file: 'carrom.html',
    category: 'Board & Strategy',
    players: '2-4 Players',
    description: 'Authentic wooden board physics with striker friction, corner pockets, and queen cover mechanics.',
    accent: '#fbbf24',
    tags: ['Physics', 'Flick', 'Singles/Doubles', 'Voice Chat']
  },
  {
    id: 'snake_io',
    title: 'Snake.io',
    file: 'snake_io.html',
    category: 'Arcade & Action',
    players: '2-12 Players',
    description: 'Eat energy orbs, boost speed, trap rivals, and grow into the largest serpent in a shrinking arena.',
    accent: '#34d399',
    tags: ['Real-Time', 'Survival', 'Custom Skins', 'Bots']
  },
  {
    id: 'football',
    title: 'Football.io',
    file: 'football.html',
    category: 'Arcade & Action',
    players: '2-10 Players',
    description: 'Fast-paced arcade soccer from 1v1 up to 5v5. Sprint, slide tackle, curved shots, and keeper AI.',
    accent: '#4ade80',
    tags: ['Sports', 'Arcade', 'Teams', '1v1 to 5v5']
  },
  {
    id: 'among-us',
    title: 'Impostor Aboard',
    file: 'among-us.html',
    category: 'Card & Party',
    players: '4-10 Players',
    description: 'Solve ship console tasks in the dark, report fallen crewmates, call meetings, and vote.',
    accent: '#f87171',
    tags: ['Social Deduction', 'Meetings', 'Tasks', 'Spectator']
  },
  {
    id: 'ben10-omni-brawl',
    title: 'Ben 10: Omni Brawl',
    file: 'ben10-omni-brawl.html',
    category: 'Action & Fighting',
    players: '1v1 Combat',
    description: 'Transform mid-combo into 11 alien heroes: Four Arms, XLR8, Heatblast, Diamondhead, and Alien X.',
    accent: '#a3e635',
    tags: ['Fighting', 'Combos', 'Special Moves']
  },
  {
    id: 'duelist',
    title: 'Supreme Duelist',
    file: 'duelist.html',
    category: 'Action & Fighting',
    players: '2-4 Players',
    description: 'Stickman sword duel showdowns with parrying, mid-air dashes, weapon drops, and duo team battles.',
    accent: '#22d3ee',
    tags: ['Stickman', 'Brawler', 'Weapons', 'Parry']
  },
  {
    id: 'checkers',
    title: 'Checkers',
    file: 'checkers.html',
    category: 'Board & Strategy',
    players: '2 Players',
    description: 'Classic 8x8 checkers with multi-jumps, forced captures, king crownings, and move timers.',
    accent: '#fb7185',
    tags: ['Strategy', '1v1', 'Tactical']
  },
  {
    id: 'bead16',
    title: 'Sixteen Beads (Sholo Guti)',
    file: 'bead16.html',
    category: 'Board & Strategy',
    players: '2 Players',
    description: 'Authentic 37-point South Asian board strategy game. Slide along vertex lines and multi-jump.',
    accent: '#2dd4bf',
    tags: ['Traditional', '1v1', 'Skill']
  },
  {
    id: 'dual',
    title: 'Dual Arena',
    file: 'dual.html',
    category: 'Action & Fighting',
    players: '2 Players',
    description: 'High-speed face-to-face projectile arena duel. Charge plasma shots and clash lasers.',
    accent: '#fb923c',
    tags: ['Shooter', 'Head-to-head', 'Fast']
  },
  {
    id: 'echo-ops',
    title: 'Echo Ops',
    file: 'echo-ops.html',
    category: 'Action & Fighting',
    players: '2-8 Players',
    description: 'Tactical top-down darkness combat. You only see inside your flashlight cone; gunfire sends echoes.',
    accent: '#38bdf8',
    tags: ['Tactical', 'Fog of War', 'Team Deathmatch']
  },
  {
    id: 'mini-militia',
    title: 'Jet Militia',
    file: 'mini-militia.html',
    category: 'Action & Fighting',
    players: '2-8 Players',
    description: '2D jetpack arena shooter inspired by Doodle Army. Rocket launchers, snipers, and grenades.',
    accent: '#84cc16',
    tags: ['Jetpack', 'Weapons', 'Free-for-All']
  },
  {
    id: 'hundred',
    title: 'Hundred (১০০ ডাক)',
    file: 'hundred.html',
    category: 'Card & Party',
    players: '4 Players',
    description: 'Strategic South Asian trick-taking card game with secret bids, trump pocha (২৫), and race to 100.',
    accent: '#a78bfa',
    tags: ['Card Game', 'Bidding', 'Bilingual']
  },
  {
    id: 'aamjam_lichi',
    title: 'Aam Jam Kanthal Lichi',
    file: 'aamjam_lichi.html',
    category: 'Card & Party',
    players: '4-8 Players',
    description: 'Fast-paced fruit passing matching game. Trade cards secretly until someone gets 4 of a kind.',
    accent: '#f472b6',
    tags: ['Party Game', 'Trading', 'Bengali & English']
  }
];

const CATEGORIES = ['All Games', 'Board & Strategy', 'Action & Fighting', 'Arcade & Action', 'Card & Party'];

/* Custom vector game logos for all 14 games */
function GameVisualLogo({ id, className = 'w-full h-full' }: { id: string; className?: string }) {
  switch (id) {
    case 'ludo':
      return (
        <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
          <rect x="6" y="6" width="88" height="88" rx="8" fill="#ffffff" />
          <rect x="6" y="6" width="36" height="36" rx="8" fill="#e63946" />
          <rect x="58" y="6" width="36" height="36" rx="8" fill="#2a9d4a" />
          <rect x="6" y="58" width="36" height="36" rx="8" fill="#3a7bd5" />
          <rect x="58" y="58" width="36" height="36" rx="8" fill="#f4b400" />
          <polygon points="42,42 58,42 50,50" fill="#2a9d4a" />
          <polygon points="58,42 58,58 50,50" fill="#f4b400" />
          <polygon points="58,58 42,58 50,50" fill="#3a7bd5" />
          <polygon points="42,58 42,42 50,50" fill="#e63946" />
          <g fill="#ffffff">
            <circle cx="17" cy="17" r="5" />
            <circle cx="31" cy="17" r="5" />
            <circle cx="17" cy="31" r="5" />
            <circle cx="31" cy="31" r="5" />
          </g>
          <g fill="#ffffff" opacity="0.9">
            <circle cx="69" cy="17" r="5" />
            <circle cx="83" cy="17" r="5" />
            <circle cx="69" cy="31" r="5" />
            <circle cx="83" cy="31" r="5" />
          </g>
          <g stroke="#dddddd" strokeWidth="1" fill="none">
            <path d="M42 6V42M58 6V42M6 42H42M6 58H42M42 58V94M58 58V94M58 42H94M58 58H94" />
          </g>
        </svg>
      );
    case 'carrom':
      return (
        <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
          <rect x="4" y="4" width="92" height="92" rx="8" fill="#583115" />
          <rect x="11" y="11" width="78" height="78" rx="4" fill="#f3d8a2" />
          <g fill="#14110f">
            <circle cx="16" cy="16" r="6" />
            <circle cx="84" cy="16" r="6" />
            <circle cx="16" cy="84" r="6" />
            <circle cx="84" cy="84" r="6" />
          </g>
          <circle cx="50" cy="50" r="18" fill="none" stroke="#b5513a" strokeWidth="2" />
          <circle cx="50" cy="50" r="4" fill="#b5513a" />
          <g stroke="#583115" strokeWidth="1">
            <circle cx="50" cy="42" r="4.5" fill="#1f2937" />
            <circle cx="57" cy="54" r="4.5" fill="#ffffff" />
            <circle cx="43" cy="54" r="4.5" fill="#ffffff" />
            <circle cx="50" cy="58" r="3.8" fill="#dc2626" />
          </g>
          <circle cx="68" cy="80" r="6" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
          <path d="M62 74L54 66" stroke="#583115" strokeWidth="1.5" strokeDasharray="3 3" />
        </svg>
      );
    case 'snake_io':
      return (
        <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
          <rect x="6" y="6" width="88" height="88" rx="12" fill="#0d2417" />
          <g stroke="#1a4029" strokeWidth="1">
            <path d="M6 28H94M6 50H94M6 72H94M28 6V94M50 6V94M72 6V94" />
          </g>
          <path
            d="M20 76C20 52 44 70 50 52C56 34 34 28 52 20C64 15 78 24 80 38"
            fill="none"
            stroke="#22c55e"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <path
            d="M20 76C20 52 44 70 50 52C56 34 34 28 52 20C64 15 78 24 80 38"
            fill="none"
            stroke="#bbf7d0"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="1 9"
          />
          <circle cx="80" cy="38" r="9" fill="#22c55e" />
          <circle cx="77" cy="35" r="2.8" fill="#ffffff" />
          <circle cx="84" cy="36" r="2.8" fill="#ffffff" />
          <circle cx="77.5" cy="35.5" r="1.3" fill="#090d16" />
          <circle cx="84.5" cy="36.5" r="1.3" fill="#090d16" />
          <circle cx="82" cy="72" r="5" fill="#f43f5e" />
          <circle cx="26" cy="30" r="4" fill="#fbbf24" />
          <circle cx="68" cy="84" r="4" fill="#38bdf8" />
        </svg>
      );
    case 'football':
      return (
        <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
          <rect x="6" y="6" width="88" height="88" rx="12" fill="#15803d" />
          <g stroke="#ffffff" strokeWidth="2" fill="none">
            <rect x="14" y="14" width="72" height="72" />
            <path d="M14 50H86" />
            <circle cx="50" cy="50" r="14" />
          </g>
          <circle cx="50" cy="50" r="10" fill="#ffffff" />
          <path d="M50 43l5.5 4-2 6.5h-7l-2-6.5z" fill="#0f172a" />
        </svg>
      );
    case 'among-us':
      return (
        <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
          <rect x="6" y="6" width="88" height="88" rx="12" fill="#0f172a" />
          <rect x="30" y="24" width="42" height="54" rx="20" fill="#dc2626" />
          <rect x="42" y="34" width="32" height="17" rx="8" fill="#bae6fd" />
          <rect x="22" y="42" width="13" height="28" rx="6" fill="#991b1b" />
          <rect x="34" y="73" width="13" height="13" rx="4" fill="#991b1b" />
          <rect x="56" y="73" width="13" height="13" rx="4" fill="#991b1b" />
        </svg>
      );
    case 'ben10-omni-brawl':
      return (
        <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
          <rect x="6" y="6" width="88" height="88" rx="12" fill="#052e16" />
          <circle cx="50" cy="50" r="32" fill="#090d16" />
          <circle cx="50" cy="50" r="26" fill="#4ade80" />
          <path d="M35 35H65L35 65H65Z" fill="#090d16" />
        </svg>
      );
    case 'duelist':
      return (
        <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
          <rect x="6" y="6" width="88" height="88" rx="12" fill="#3f1311" />
          <g stroke="#ffffff" strokeWidth="5" strokeLinecap="round" fill="none">
            <circle cx="28" cy="28" r="6" fill="#ffffff" />
            <path d="M28 36V58M28 44L40 50M28 58L20 76M28 58L38 76" />
          </g>
          <path d="M42 50L66 38" stroke="#facc15" strokeWidth="4" strokeLinecap="round" />
          <g stroke="#f87171" strokeWidth="5" strokeLinecap="round" fill="none">
            <circle cx="72" cy="28" r="6" fill="#f87171" />
            <path d="M72 36V58M72 58L64 76M72 58L82 76" />
          </g>
        </svg>
      );
    case 'checkers':
      return (
        <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
          <rect x="6" y="6" width="88" height="88" rx="8" fill="#1c120c" />
          <g fill="#fde68a">
            <rect x="10" y="10" width="20" height="20" />
            <rect x="50" y="10" width="20" height="20" />
            <rect x="30" y="30" width="20" height="20" />
            <rect x="70" y="30" width="20" height="20" />
            <rect x="10" y="50" width="20" height="20" />
            <rect x="50" y="50" width="20" height="20" />
            <rect x="30" y="70" width="20" height="20" />
            <rect x="70" y="70" width="20" height="20" />
          </g>
          <g fill="#78350f">
            <rect x="30" y="10" width="20" height="20" />
            <rect x="70" y="10" width="20" height="20" />
            <rect x="10" y="30" width="20" height="20" />
            <rect x="50" y="30" width="20" height="20" />
            <rect x="30" y="50" width="20" height="20" />
            <rect x="70" y="50" width="20" height="20" />
            <rect x="10" y="70" width="20" height="20" />
            <rect x="50" y="70" width="20" height="20" />
          </g>
          <circle cx="40" cy="20" r="8" fill="#dc2626" />
          <circle cx="60" cy="40" r="8" fill="#dc2626" />
          <circle cx="40" cy="60" r="8" fill="#f8fafc" />
          <circle cx="60" cy="80" r="8" fill="#f8fafc" />
        </svg>
      );
    case 'bead16':
      return (
        <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
          <rect x="6" y="6" width="88" height="88" rx="10" fill="#064e3b" />
          <g stroke="#6ee7b7" strokeWidth="2" fill="none" strokeLinecap="round">
            <path d="M20 20H80M20 50H80M20 80H80M20 20V80M50 20V80M80 20V80M20 20L80 80M80 20L20 80" />
          </g>
          <g stroke="#064e3b" strokeWidth="2">
            <circle cx="20" cy="20" r="7" fill="#fbbf24" />
            <circle cx="50" cy="20" r="7" fill="#fbbf24" />
            <circle cx="80" cy="20" r="7" fill="#fbbf24" />
            <circle cx="50" cy="50" r="7" fill="#ffffff" />
            <circle cx="20" cy="80" r="7" fill="#f43f5e" />
            <circle cx="50" cy="80" r="7" fill="#f43f5e" />
            <circle cx="80" cy="80" r="7" fill="#f43f5e" />
          </g>
        </svg>
      );
    case 'dual':
      return (
        <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
          <rect x="6" y="6" width="88" height="88" rx="12" fill="#2d150c" />
          <circle cx="28" cy="50" r="14" fill="#ea580c" />
          <circle cx="72" cy="50" r="14" fill="#0284c7" />
          <path d="M42 50H58" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" strokeDasharray="1 7" />
        </svg>
      );
    case 'echo-ops':
      return (
        <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
          <rect x="6" y="6" width="88" height="88" rx="12" fill="#032b30" />
          <g fill="none" stroke="#06b6d4" strokeWidth="2.5">
            <circle cx="50" cy="50" r="12" />
            <circle cx="50" cy="50" r="26" opacity="0.6" />
            <circle cx="50" cy="50" r="40" opacity="0.3" />
          </g>
          <circle cx="50" cy="50" r="5" fill="#ffffff" />
        </svg>
      );
    case 'mini-militia':
      return (
        <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
          <rect x="6" y="6" width="88" height="88" rx="12" fill="#14260f" />
          <circle cx="48" cy="38" r="12" fill="#bef264" />
          <rect x="38" y="48" width="22" height="26" rx="6" fill="#65a30d" />
          <rect x="56" y="54" width="26" height="6" rx="3" fill="#cbd5e1" />
          <path d="M42 76l-4 12M54 76l4 12" stroke="#eab308" strokeWidth="5" strokeLinecap="round" />
        </svg>
      );
    case 'hundred':
      return (
        <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
          <rect x="6" y="6" width="88" height="88" rx="12" fill="#2e1065" />
          <text x="50" y="62" textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="36" fill="#ffffff">
            100
          </text>
          <path d="M22 74H78" stroke="#facc15" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );
    case 'aamjam_lichi':
    default:
      return (
        <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
          <rect x="6" y="6" width="88" height="88" rx="12" fill="#2e1026" />
          <g transform="rotate(-14 50 55)">
            <rect x="18" y="20" width="38" height="54" rx="7" fill="#ffffff" />
            <circle cx="37" cy="47" r="11" fill="#facc15" />
            <path d="M37 36c2-5 6-7 9-6" stroke="#16a34a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </g>
          <g transform="rotate(10 50 55)">
            <rect x="42" y="22" width="38" height="54" rx="7" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1.2" />
            <circle cx="61" cy="49" r="11" fill="#e11d48" />
            <circle cx="58" cy="46" r="2.5" fill="#fda4af" />
            <path d="M61 38c1-4 4-6 7-5" stroke="#16a34a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </g>
        </svg>
      );
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'games' | 'rooms' | 'leaderboard'>('games');
  const [selectedCategory, setSelectedCategory] = useState('All Games');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Game session
  const [activeGame, setActiveGame] = useState<GameInfo | null>(null);
  const [roomCodeToJoin, setRoomCodeToJoin] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Server state
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [activeRooms, setActiveRooms] = useState<RoomInfo[]>([]);
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [pingMs, setPingMs] = useState<number | null>(null);
  const [networkModalOpen, setNetworkModalOpen] = useState(false);
  const [quickCodeInput, setQuickCodeInput] = useState('');

  const gameContainerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Poll server state
  useEffect(() => {
    let isMounted = true;
    const fetchInfo = async () => {
      try {
        const [infoRes, roomsRes, scoresRes] = await Promise.all([
          fetch('/api/server-info'),
          fetch('/api/rooms'),
          fetch('/api/scores')
        ]);
        if (infoRes.ok && isMounted) setServerInfo(await infoRes.json());
        if (roomsRes.ok && isMounted) setActiveRooms(await roomsRes.json());
        if (scoresRes.ok && isMounted) setScores(await scoresRes.json());
      } catch (err) {}
    };

    fetchInfo();
    const interval = setInterval(fetchInfo, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // WebSocket telemetry
  useEffect(() => {
    let ws: WebSocket | null = null;
    let pingInterval: any = null;
    let isAlive = true;

    try {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${proto}//${window.location.host}`;
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        if (!isAlive) return;
        setWsConnected(true);
        pingInterval = setInterval(() => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ op: 'hub:ping', t: Date.now() }));
          }
        }, 3000);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.op === 'hub:pong' && msg.t) {
            setPingMs(Date.now() - msg.t);
          }
        } catch (e) {}
      };

      ws.onclose = () => {
        if (isAlive) {
          setWsConnected(false);
          setPingMs(null);
        }
      };

      ws.onerror = () => {
        if (isAlive) setWsConnected(false);
      };
    } catch (e) {
      setWsConnected(false);
    }

    return () => {
      isAlive = false;
      if (pingInterval) clearInterval(pingInterval);
      if (ws) ws.close();
    };
  }, []);

  const handleLaunchGame = (game: GameInfo, code?: string) => {
    setActiveGame(game);
    setRoomCodeToJoin(code || '');
  };

  const handleCopyInvite = (code?: string) => {
    let url = `${window.location.origin}/games/${activeGame?.file || 'ludo.html'}`;
    if (code) url += `#room=${code}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleToggleFullscreen = () => {
    if (!gameContainerRef.current) return;
    if (!document.fullscreenElement) {
      gameContainerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleQuickJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = quickCodeInput.trim().toUpperCase();
    if (!code) return;

    const found = activeRooms.find((r) => r.code.toUpperCase() === code);
    if (found) {
      const g = GAMES.find((x) => x.id === found.game || x.file.includes(found.game));
      if (g) {
        handleLaunchGame(g, code);
        return;
      }
    }
    handleLaunchGame(GAMES[0], code);
  };

  const filteredGames = GAMES.filter((g) => {
    const matchesCategory =
      selectedCategory === 'All Games' ||
      (selectedCategory === 'Board & Strategy' && g.category.includes('Board')) ||
      (selectedCategory === 'Action & Fighting' && g.category.includes('Fighting')) ||
      (selectedCategory === 'Arcade & Action' && g.category.includes('Arcade')) ||
      (selectedCategory === 'Card & Party' && g.category.includes('Party'));

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      g.title.toLowerCase().includes(q) ||
      g.description.toLowerCase().includes(q) ||
      g.tags.some((t) => t.toLowerCase().includes(q)) ||
      g.category.toLowerCase().includes(q);

    return matchesCategory && matchesSearch;
  });

  const featured = GAMES[0]; // Ludo

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans selection:bg-emerald-400 selection:text-slate-950 relative">
      {/* 50% Translucent Ambient Background Mesh */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[15%] w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[140px]" />
        <div className="absolute top-[35%] right-[5%] w-[550px] h-[550px] bg-sky-500/10 rounded-full blur-[130px]" />
        <div className="absolute bottom-[-10%] left-[30%] w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px]" />
      </div>

      {/* Top Bar Contract (50% Transparency Glass) */}
      <header className="sticky top-0 z-40 bg-slate-900/50 backdrop-blur-xl border-b border-white/10 px-6 lg:px-12 py-3.5 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
          {/* Zone 1: Single text element wordmark */}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              setActiveGame(null);
            }}
            className="text-lg font-black tracking-tight text-white hover:text-emerald-400 transition-colors whitespace-nowrap shrink-0 flex items-center gap-2.5"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500/80 flex items-center justify-center text-slate-950 font-black shadow-md shadow-emerald-500/20">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <span>OmniGame Room</span>
          </a>

          {/* Zone 2: 4 concise single-line text navigation links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-300">
            <button
              onClick={() => {
                setActiveGame(null);
                setActiveTab('games');
              }}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'games' && !activeGame ? 'text-emerald-400' : ''
              }`}
            >
              All 14 Games
            </button>
            <button
              onClick={() => {
                setActiveGame(null);
                setActiveTab('rooms');
              }}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'rooms' ? 'text-emerald-400' : ''
              }`}
            >
              <span>Live Matches</span>
              <span className="font-mono text-xs text-slate-400">({activeRooms.length})</span>
            </button>
            <button
              onClick={() => {
                setActiveGame(null);
                setActiveTab('leaderboard');
              }}
              className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'leaderboard' ? 'text-emerald-400' : ''
              }`}
            >
              Leaderboard
            </button>
            <button
              onClick={() => setNetworkModalOpen(true)}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span>Multi-Device Wi-Fi</span>
            </button>
          </nav>

          {/* Zone 3: Primary action button + APK download */}
          <div className="flex items-center gap-2.5 shrink-0">
            <a
              href="/api/download/apk"
              download="omnigame-room.apk"
              title="Download Android APK (v1.0.0)"
              className="px-3.5 py-2 text-xs font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 active:scale-95"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Android APK</span>
            </a>
            <button
              onClick={() => handleLaunchGame(featured)}
              className="px-4 py-2 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-md shadow-emerald-400/20 active:scale-95 flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Quick Play</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col z-10">
        {/* ACTIVE GAME VIEWPORT - Direct, fast, unencumbered play */}
        {activeGame ? (
          <div
            ref={gameContainerRef}
            className="flex-1 flex flex-col bg-black relative overflow-hidden min-h-[calc(100vh-65px)]"
          >
            {/* Mid-Transparent 50% Top Command Bar */}
            <div className="bg-slate-900/50 backdrop-blur-xl border-b border-white/10 px-4 py-2.5 flex items-center justify-between gap-4 text-xs flex-wrap z-20">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setActiveGame(null)}
                  className="bg-white/10 hover:bg-white/20 text-slate-200 px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition active:scale-95"
                >
                  <X className="w-3.5 h-3.5" />
                  Back to Hub
                </button>
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-md overflow-hidden bg-white/10 p-0.5">
                    <GameVisualLogo id={activeGame.id} />
                  </div>
                  <span className="font-extrabold text-sm text-white">{activeGame.title}</span>
                  <span className="text-slate-400 font-medium hidden sm:inline">· {activeGame.players}</span>
                </div>
              </div>

              {/* Clean in-game actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyInvite(roomCodeToJoin)}
                  className="bg-white/10 hover:bg-white/20 text-slate-200 border border-white/15 px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copied Link!' : 'Share Room'}</span>
                </button>

                <button
                  onClick={() => window.open(`/games/${activeGame.file}${roomCodeToJoin ? `#room=${roomCodeToJoin}` : ''}`, '_blank')}
                  className="p-1.5 bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white rounded-lg border border-white/15 transition"
                  title="Open in Standalone Window"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => {
                    if (iframeRef.current) iframeRef.current.src = iframeRef.current.src;
                  }}
                  className="p-1.5 bg-white/10 hover:bg-white/20 text-slate-200 rounded-lg border border-white/15 transition"
                  title="Restart Game"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={handleToggleFullscreen}
                  className="p-1.5 bg-white/10 hover:bg-white/20 text-slate-200 rounded-lg border border-white/15 transition"
                  title="Toggle Fullscreen"
                >
                  {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* In-Frame Viewport */}
            <div className="flex-1 relative h-full min-h-[550px] bg-black">
              <iframe
                ref={iframeRef}
                src={`/games/${activeGame.file}${roomCodeToJoin ? `#room=${roomCodeToJoin}` : ''}`}
                title={activeGame.title}
                className="w-full h-full border-0 absolute inset-0"
                allow="microphone; fullscreen; clipboard-write; autoplay"
              />
            </div>
          </div>
        ) : (
          /* HOMEPAGE: 50% TRANSPARENCY UI WITH VISUAL GAME LOGOS */
          <main className="max-w-7xl mx-auto px-6 lg:px-12 py-10 w-full flex-1 flex flex-col gap-10">
            {/* Hero Section with 50% Translucent UI Surface */}
            <section className="relative rounded-3xl bg-slate-900/50 backdrop-blur-2xl border border-white/10 p-8 sm:p-12 overflow-hidden shadow-2xl">
              <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-10">
                <div className="max-w-2xl space-y-5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 tracking-wide">
                    <span>Node.js WebSocket Engine Active</span>
                    <span aria-hidden="true">·</span>
                    <span>14 Multiplayer Games</span>
                    <span aria-hidden="true">·</span>
                    <span>Multi-Device Ready</span>
                  </div>

                  <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
                    Play Real-Time Games with Friends Anywhere
                  </h1>
                  <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                    The Node.js server starts automatically in the app. Play solo against smart bots or invite friends
                    across phones, tablets, and laptops on the same Wi-Fi, hotspot, or link.
                  </p>

                  {/* Room Join Bar */}
                  <form onSubmit={handleQuickJoinSubmit} className="flex flex-wrap items-center gap-3 pt-2">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="ENTER ROOM CODE (e.g. ABCD)"
                        maxLength={6}
                        value={quickCodeInput}
                        onChange={(e) => setQuickCodeInput(e.target.value.toUpperCase())}
                        className="bg-slate-950/50 backdrop-blur-md border border-white/20 rounded-xl px-4 py-2.5 text-xs font-mono font-bold tracking-widest text-emerald-400 placeholder:text-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 w-64"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold rounded-xl text-xs transition-colors shadow-md shadow-emerald-400/20 active:scale-95"
                    >
                      Join Room
                    </button>
                    <button
                      type="button"
                      onClick={() => setNetworkModalOpen(true)}
                      className="px-4 py-2.5 bg-white/10 hover:bg-white/15 text-slate-200 rounded-xl text-xs font-semibold border border-white/15 transition flex items-center gap-1.5"
                    >
                      <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Wi-Fi Network Guide</span>
                    </button>
                  </form>
                </div>

                {/* Server Telemetry 50% Glass Card */}
                <div className="w-full lg:w-80 bg-slate-950/50 border border-white/10 rounded-2xl p-6 backdrop-blur-2xl space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Node.js Server</span>
                    <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-400">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>{wsConnected ? `Online (${pingMs ?? 4}ms)` : 'Active'}</span>
                    </div>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Server Port</span>
                      <span className="font-mono text-white font-bold">{serverInfo?.port || 3000}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Connected Peers</span>
                      <span className="font-mono text-emerald-400 font-bold">{serverInfo?.connectedClients || 1} online</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Active Game Rooms</span>
                      <span className="font-mono text-sky-400 font-bold">{activeRooms.length} open</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Code Protection</span>
                      <span className="font-mono text-emerald-400 font-bold">Enabled</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Server IP:</span>
                    <span className="font-mono text-slate-200">{serverInfo?.lanIp || '127.0.0.1'}</span>
                  </div>
                </div>
              </div>
            </section>

            {/* TAB BAR & SEARCH (50% Transparency) */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4 flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('games')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
                    activeTab === 'games'
                      ? 'bg-white text-slate-950 shadow-md'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  All 14 Games
                </button>
                <button
                  onClick={() => setActiveTab('rooms')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-1.5 ${
                    activeTab === 'rooms'
                      ? 'bg-white text-slate-950 shadow-md'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span>Active Rooms</span>
                  <span className="font-mono text-xs opacity-80">({activeRooms.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('leaderboard')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
                    activeTab === 'leaderboard'
                      ? 'bg-white text-slate-950 shadow-md'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Leaderboard
                </button>
              </div>

              {/* Search Control */}
              {activeTab === 'games' && (
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search games, tags..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-lg pl-9 pr-8 py-2 text-xs text-white placeholder:text-slate-400 focus:outline-none focus:border-white/30"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* TAB: ALL 14 GAMES WITH 50% TRANSPARENT CARDS & VISUAL LOGOS */}
            {activeTab === 'games' && (
              <div className="space-y-6">
                {/* Category filter pills */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                        selectedCategory === cat
                          ? 'bg-white/20 text-white border border-white/25 shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* 14 Games Grid with Visual Logos */}
                {filteredGames.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {filteredGames.map((game) => (
                      <div
                        key={game.id}
                        className="group bg-slate-900/50 backdrop-blur-xl border border-white/10 hover:border-white/25 rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/70 hover:bg-slate-900/70"
                      >
                        <div>
                          {/* Visual Game Logo Canvas Container */}
                          <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-slate-950/50 border border-white/10 p-3 flex items-center justify-center mb-3.5 relative group-hover:scale-[1.02] transition-transform duration-200">
                            <div className="w-24 h-24 sm:w-28 sm:h-28">
                              <GameVisualLogo id={game.id} />
                            </div>
                            <span className="absolute top-2.5 right-2.5 text-[10px] font-bold px-2 py-0.5 rounded bg-black/60 text-slate-300 backdrop-blur-sm border border-white/10">
                              {game.players}
                            </span>
                          </div>

                          <h3 className="text-lg font-black text-white tracking-tight mb-1.5 flex items-center justify-between">
                            <span>{game.title}</span>
                          </h3>

                          <p className="text-slate-400 text-xs leading-relaxed line-clamp-2 mb-3">
                            {game.description}
                          </p>

                          <div className="flex items-center flex-wrap gap-1.5 text-[11px] text-slate-400 font-medium mb-4">
                            {game.tags.map((tag, idx) => (
                              <React.Fragment key={tag}>
                                <span>{tag}</span>
                                {idx < game.tags.length - 1 && <span aria-hidden="true">·</span>}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>

                        {/* Card Actions */}
                        <div className="flex items-center gap-2 pt-3 border-t border-white/10">
                          <button
                            onClick={() => handleLaunchGame(game)}
                            className="flex-1 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-md shadow-emerald-400/20"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Play Game</span>
                          </button>
                          <a
                            href={`/games/${game.file}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white rounded-lg border border-white/15 transition"
                            title="Open in Standalone Tab"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10">
                    <p className="text-slate-400 text-sm">No games matched "{searchQuery}"</p>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory('All Games');
                      }}
                      className="mt-2 text-xs text-emerald-400 hover:underline"
                    >
                      Clear search
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB: ACTIVE ROOMS */}
            {activeTab === 'rooms' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-white">Active Rooms on this Server</h2>
                    <p className="text-xs text-slate-400">Join any room currently open on this machine or hotspot</p>
                  </div>
                  <button
                    onClick={async () => {
                      const res = await fetch('/api/rooms');
                      if (res.ok) setActiveRooms(await res.json());
                    }}
                    className="text-xs text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg border border-white/15 flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Refresh</span>
                  </button>
                </div>

                {activeRooms.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {activeRooms.map((room) => {
                      const matched = GAMES.find((g) => g.id === room.game || g.file.includes(room.game));
                      return (
                        <div
                          key={room.code}
                          className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-xl p-4 flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-mono text-sm font-black tracking-widest text-emerald-400 bg-slate-950/60 px-2 py-0.5 rounded border border-white/10">
                                {room.code}
                              </span>
                              <span className="text-xs font-semibold text-slate-400">
                                {room.inGame ? 'In Progress' : 'In Lobby'}
                              </span>
                            </div>
                            <h4 className="font-bold text-white text-base mb-1">{room.title}</h4>
                            <div className="text-xs text-slate-400 mb-4 flex items-center gap-2">
                              <span>{matched?.title || room.game}</span>
                              <span aria-hidden="true">·</span>
                              <span>{room.players} players</span>
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              if (matched) handleLaunchGame(matched, room.code);
                              else handleLaunchGame(GAMES[0], room.code);
                            }}
                            className="w-full bg-white/10 hover:bg-emerald-400 hover:text-slate-950 text-white font-bold py-2 rounded-lg text-xs transition"
                          >
                            Join This Match
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-12 text-center">
                    <Radio className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                    <h3 className="font-bold text-slate-300 text-sm mb-1">No Active Game Lobbies Found</h3>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                      Open any game and tap "Create Room", then share the code with friends to join.
                    </p>
                    <button
                      onClick={() => setActiveTab('games')}
                      className="bg-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs hover:bg-emerald-300"
                    >
                      Browse Games to Host
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB: LEADERBOARD */}
            {activeTab === 'leaderboard' && (
              <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <div className="mb-4">
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span>Server Leaderboard</span>
                  </h2>
                  <p className="text-xs text-slate-400">Scores stored persistently in the Node.js server database</p>
                </div>

                {scores.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/10 text-slate-400 font-bold uppercase tracking-wider">
                          <th className="py-2.5 px-3">Rank</th>
                          <th className="py-2.5 px-3">Player</th>
                          <th className="py-2.5 px-3">High Score</th>
                          <th className="py-2.5 px-3">Kills</th>
                          <th className="py-2.5 px-3">Mode</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-medium">
                        {scores.slice(0, 25).map((s, idx) => (
                          <tr key={idx} className="hover:bg-white/5 transition">
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-400">
                              {idx === 0 ? '01 🏆' : idx === 1 ? '02' : idx === 2 ? '03' : String(idx + 1).padStart(2, '0')}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-white">{s.name}</td>
                            <td className="py-2.5 px-3 text-emerald-400 font-mono font-bold text-sm">
                              {s.score.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-slate-400 font-mono">{s.kills || 0}</td>
                            <td className="py-2.5 px-3 text-slate-400 uppercase text-[11px] font-semibold">
                              {s.mode || 'standard'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 py-8 text-center">
                    No scores recorded yet. Complete a match to claim the top spot!
                  </p>
                )}
              </div>
            )}
          </main>
        )}
      </div>

      {/* Multi-Device & Wi-Fi Hotspot Modal with QR Code (50% Transparency) */}
      {networkModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900/50 backdrop-blur-2xl border border-white/20 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative">
            <button
              onClick={() => setNetworkModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
                <Wifi className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Multi-Device Wi-Fi Setup</h3>
                <p className="text-xs text-slate-400">Connect other phones or tablets on the same Wi-Fi</p>
              </div>
            </div>

            <div className="space-y-3 mb-5 text-xs text-slate-300">
              <div className="p-3 bg-slate-950/60 rounded-xl border border-white/10">
                <span className="font-bold text-emerald-400 block mb-1">Local Network Address:</span>
                <div className="font-mono bg-slate-900/60 p-2 rounded border border-white/10 text-slate-200 select-all flex items-center justify-between">
                  <span>
                    {serverInfo?.addresses?.[0]?.address
                      ? `http://${serverInfo.addresses[0].address}:${serverInfo.port}`
                      : window.location.origin}
                  </span>
                  <button
                    onClick={() => {
                      const addr = serverInfo?.addresses?.[0]?.address
                        ? `http://${serverInfo.addresses[0].address}:${serverInfo.port}`
                        : window.location.origin;
                      navigator.clipboard.writeText(addr);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    }}
                    className="text-emerald-400 hover:underline text-[11px] font-semibold"
                  >
                    {copiedLink ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-emerald-950/30 rounded-xl border border-emerald-500/20 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-bold text-white block text-xs">Android App (APK)</span>
                    <span className="text-[11px] text-slate-400">Offline gaming & auto-LAN connection</span>
                  </div>
                </div>
                <a
                  href="/api/download/apk"
                  download="omnigame-room.apk"
                  className="px-3 py-1.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold rounded-lg text-xs transition flex items-center gap-1 shrink-0"
                >
                  <Download className="w-3 h-3" />
                  <span>Get APK</span>
                </a>
              </div>

              <ol className="list-decimal list-inside space-y-2 text-slate-400 pt-1">
                <li>Turn on personal hotspot on your phone or connect everyone to the same Wi-Fi.</li>
                <li>Friends open the address above in Chrome or Safari on their device.</li>
                <li>Host creates a room, shares the 4-letter code, and all devices sync in real-time!</li>
              </ol>
            </div>

            <button
              onClick={() => setNetworkModalOpen(false)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 rounded-xl text-xs transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* 50% Translucent Glass Footer */}
      <footer className="bg-slate-900/50 backdrop-blur-xl border-t border-white/10 px-6 lg:px-12 py-4 text-xs text-slate-400 z-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>OmniGame Room · Real-Time Node.js Server & Multi-Device Gaming System</span>
          <div className="flex items-center gap-4 text-slate-400">
            <a
              href="/api/download/apk"
              download="omnigame-room.apk"
              className="hover:text-emerald-400 transition-colors flex items-center gap-1.5 font-medium"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Android APK</span>
            </a>
            <a
              href="/api/download/pack"
              download="omnigame-offline-server-pack.zip"
              className="hover:text-sky-400 transition-colors flex items-center gap-1.5 font-medium"
            >
              <Download className="w-3.5 h-3.5 text-sky-400" />
              <span>Offline Server Pack</span>
            </a>
            <span>Port {serverInfo?.port || 3000}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
