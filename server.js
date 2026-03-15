import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

// ─── Config ────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const AUCTION_TIMER_SECONDS = parseInt(process.env.AUCTION_TIMER_SECONDS) || 60;
const MAX_ACTIVITY_LOG = parseInt(process.env.MAX_ACTIVITY_LOG) || 100;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// ─── App Setup ─────────────────────────────────────────────
const app = express();
app.use(compression());
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json({ limit: '5mb' }));

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: { origin: CORS_ORIGIN, methods: ['GET', 'POST'] },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling']
});

// ─── Gemini AI ─────────────────────────────────────────────
let genAI = null;
if (GEMINI_API_KEY && GEMINI_API_KEY !== 'your_google_gemini_api_key_here') {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
}

// ─── In-Memory Room Cache ──────────────────────────────────
// rooms: Map<roomId, roomData>  (source of truth during runtime)
const rooms = new Map();
// dirtyRooms: Set<roomId> — rooms that need to be persisted
const dirtyRooms = new Set();

// ─── Mongoose Schemas ──────────────────────────────────────
const roomSchema = new mongoose.Schema({
    roomId: { type: String, required: true, unique: true, index: true },
    adminTeam: { type: String, required: true },
    data: { type: mongoose.Schema.Types.Mixed, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// TTL Index: Automatically delete rooms not updated for 2 days (172800 seconds)
roomSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 172800 });
const RoomModel = mongoose.model('Room', roomSchema);

// ─── MongoDB Connection ────────────────────────────────────
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/auctionDB', {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000
}).then(async () => {
    console.log('✅ Connected to MongoDB');
    try {
        const existingRooms = await RoomModel.find({});
        existingRooms.forEach(doc => {
            const data = doc.data;
            // Migration: Update player images to Cricbuzz
            const idMap = {
                'Virat Kohli': 1413, 'MS Dhoni': 265, 'Jasprit Bumrah': 9311, 'Rohit Sharma': 576,
                'Steve Smith': 2250, 'Kane Williamson': 1610, 'Joe Root': 8019, 'Babar Azam': 8359,
                'Rashid Khan': 10738, 'Hardik Pandya': 9608, 'Pat Cummins': 8095, 'Mitchell Starc': 8143,
                'Suryakumar Yadav': 7915, 'Quinton de Kock': 8356, 'Shubman Gill': 11813,
                'Mohammed Shami': 7909, 'Ravindra Jadeja': 587, 'Rishabh Pant': 10744,
                'Sam Curran': 12224, 'Trent Boult': 8117
            };

            const migrate = (p) => {
                if (p && idMap[p.name] && (!p.image || p.image.includes('hscicdn'))) {
                    p.image = `https://www.cricbuzz.com/stats/img/face/${idMap[p.name]}.jpg`;
                }
                return p;
            };

            if (data.players) data.players = data.players.map(migrate);
            if (data.squads) {
                Object.keys(data.squads).forEach(team => {
                    data.squads[team] = data.squads[team].map(migrate);
                });
            }

            rooms.set(doc.roomId, data);
        });
        console.log(`📦 Loaded and Migrated ${existingRooms.length} room(s) from database`);
    } catch (err) {
        console.error('❌ Error loading rooms from DB:', err.message);
    }
}).catch(err => console.error('❌ MongoDB connection error:', err.message));

// ─── Smart Dirty-Flag DB Sync (every 3 seconds) ────────────
let isSyncing = false;
setInterval(async () => {
    if (isSyncing || dirtyRooms.size === 0) return;
    isSyncing = true;
    const batch = [...dirtyRooms];
    dirtyRooms.clear();

    try {
        const promises = batch.map(roomId => {
            const room = rooms.get(roomId);
            if (!room) return;
            return RoomModel.findOneAndUpdate(
                { roomId },
                { data: room, adminTeam: room.adminTeam || '', updatedAt: new Date() },
                { upsert: true, returnDocument: 'after' }
            ).catch(err => {
                console.error(`❌ DB save failed for room ${roomId}:`, err.message);
                dirtyRooms.add(roomId); // re-queue on failure
            });
        });
        await Promise.allSettled(promises);
    } catch (err) {
        console.error('❌ Critical error in room sync interval:', err.message);
    } finally {
        isSyncing = false;
    }
}, 3000);

// ─── Presets ───────────────────────────────────────────────
const CRICKET_PLAYERS = [
    { name: 'Virat Kohli', basePrice: 20.0, ovr: 92, position: 'Batter', image: 'https://www.cricbuzz.com/stats/img/face/1413.jpg', badges: ['King', 'Chase Master', 'Legend'], stats: [{ label: 'VAL', value: 92 }] },
    { name: 'MS Dhoni', basePrice: 15.0, ovr: 89, position: 'WK-Batter', image: 'https://www.cricbuzz.com/stats/img/face/265.jpg', badges: ['Captain Cool', 'Finisher'], stats: [{ label: 'VAL', value: 89 }] },
    { name: 'Jasprit Bumrah', basePrice: 15.0, ovr: 91, position: 'Bowler', image: 'https://www.cricbuzz.com/stats/img/face/9311.jpg', badges: ['Yorker King', 'Elite'], stats: [{ label: 'VAL', value: 91 }] },
    { name: 'Rohit Sharma', basePrice: 18.0, ovr: 90, position: 'Batter', image: 'https://www.cricbuzz.com/stats/img/face/576.jpg', badges: ['Hitman', 'Leader'], stats: [{ label: 'VAL', value: 90 }] },
    { name: 'Steve Smith', basePrice: 12.0, ovr: 89, position: 'Batter', image: 'https://www.cricbuzz.com/stats/img/face/2250.jpg', badges: ['Technician', 'Wall'], stats: [{ label: 'VAL', value: 89 }] },
    { name: 'Kane Williamson', basePrice: 12.0, ovr: 88, position: 'Batter', image: 'https://www.cricbuzz.com/stats/img/face/1610.jpg', badges: ['Maestro', 'Composed'], stats: [{ label: 'VAL', value: 88 }] },
    { name: 'Joe Root', basePrice: 12.0, ovr: 89, position: 'Batter', image: 'https://www.cricbuzz.com/stats/img/face/8019.jpg', badges: ['Class', 'Stable'], stats: [{ label: 'VAL', value: 89 }] },
    { name: 'Babar Azam', basePrice: 15.0, ovr: 89, position: 'Batter', image: 'https://www.cricbuzz.com/stats/img/face/8359.jpg', badges: ['Artist', 'Elegant'], stats: [{ label: 'VAL', value: 89 }] },
    { name: 'Rashid Khan', basePrice: 15.0, ovr: 90, position: 'Bowler', image: 'https://www.cricbuzz.com/stats/img/face/10738.jpg', badges: ['Magician', 'X-Factor'], stats: [{ label: 'VAL', value: 90 }] },
    { name: 'Hardik Pandya', basePrice: 12.0, ovr: 89, position: 'All-Rounder', image: 'https://www.cricbuzz.com/stats/img/face/9608.jpg', badges: ['Clutch', 'Power'], stats: [{ label: 'VAL', value: 89 }] },
    { name: 'Pat Cummins', basePrice: 15.0, ovr: 90, position: 'Bowler', image: 'https://www.cricbuzz.com/stats/img/face/8095.jpg', badges: ['Captain', 'Pace'], stats: [{ label: 'VAL', value: 90 }] },
    { name: 'Mitchell Starc', basePrice: 14.0, ovr: 89, position: 'Bowler', image: 'https://www.cricbuzz.com/stats/img/face/8143.jpg', badges: ['Spearhead', 'Speed'], stats: [{ label: 'VAL', value: 89 }] },
    { name: 'Suryakumar Yadav', basePrice: 10.0, ovr: 90, position: 'Batter', image: 'https://www.cricbuzz.com/stats/img/face/7915.jpg', badges: ['360°', 'Dynamic'], stats: [{ label: 'VAL', value: 90 }] },
    { name: 'Quinton de Kock', basePrice: 10.0, ovr: 88, position: 'WK-Batter', image: 'https://www.cricbuzz.com/stats/img/face/8356.jpg', badges: ['Flash', 'Aggressor'], stats: [{ label: 'VAL', value: 88 }] },
    { name: 'Shubman Gill', basePrice: 12.0, ovr: 88, position: 'Batter', image: 'https://www.cricbuzz.com/stats/img/face/11813.jpg', badges: ['Prince', 'Future'], stats: [{ label: 'VAL', value: 88 }] },
    { name: 'Mohammed Shami', basePrice: 10.0, ovr: 89, position: 'Bowler', image: 'https://www.cricbuzz.com/stats/img/face/7909.jpg', badges: ['Seam Pro', 'Lethal'], stats: [{ label: 'VAL', value: 89 }] },
    { name: 'Ravindra Jadeja', basePrice: 12.0, ovr: 89, position: 'All-Rounder', image: 'https://www.cricbuzz.com/stats/img/face/587.jpg', badges: ['Rocket Arm', 'Maverick'], stats: [{ label: 'VAL', value: 89 }] },
    { name: 'Rishabh Pant', basePrice: 12.0, ovr: 88, position: 'WK-Batter', image: 'https://www.cricbuzz.com/stats/img/face/10744.jpg', badges: ['Instinctive', 'Fearless'], stats: [{ label: 'VAL', value: 88 }] },
    { name: 'Sam Curran', basePrice: 10.0, ovr: 87, position: 'All-Rounder', image: 'https://www.cricbuzz.com/stats/img/face/12224.jpg', badges: ['Pocket Dynamo', 'Utility'], stats: [{ label: 'VAL', value: 87 }] },
    { name: 'Trent Boult', basePrice: 12.0, ovr: 89, position: 'Bowler', image: 'https://www.cricbuzz.com/stats/img/face/8117.jpg', badges: ['Swinger', 'Strike'], stats: [{ label: 'VAL', value: 89 }] }
];

const FOOTBALL_PLAYERS = [
    { name: 'Lionel Messi', basePrice: 20.0, ovr: 91, position: 'RW', image: 'https://b.fssta.com/wp-content/uploads/2022/12/messi_psg.png', badges: ['GOAT', 'Playmaker'], stats: [{ label: 'VAL', value: 91 }] },
    { name: 'Cristiano Ronaldo', basePrice: 18.0, ovr: 90, position: 'ST', image: 'https://b.fssta.com/wp-content/uploads/2022/12/ronaldo_portugal.png', badges: ['Striker', 'Leader'], stats: [{ label: 'VAL', value: 90 }] },
    { name: 'Kylian Mbappe', basePrice: 25.0, ovr: 91, position: 'ST', image: 'https://b.fssta.com/wp-content/uploads/2022/12/mbappe_france.png', badges: ['Speedster', 'Clinical'], stats: [{ label: 'VAL', value: 91 }] },
    { name: 'Kevin De Bruyne', basePrice: 15.0, ovr: 91, position: 'CM', image: 'https://b.fssta.com/wp-content/uploads/2022/12/de-bruyne_belgium.png', badges: ['Architect', 'Vision'], stats: [{ label: 'VAL', value: 91 }] },
    { name: 'Neymar Jr', basePrice: 14.0, ovr: 89, position: 'LW', image: 'https://b.fssta.com/wp-content/uploads/2022/12/neymar_brazil.png', badges: ['Magician', 'Dribbler'], stats: [{ label: 'VAL', value: 89 }] },
    { name: 'Mo Salah', basePrice: 15.0, ovr: 89, position: 'RW', image: 'https://b.fssta.com/wp-content/uploads/2022/12/salah_egypt.png', badges: ['Egyptian King', 'Winger'], stats: [{ label: 'VAL', value: 89 }] },
    { name: 'Harry Kane', basePrice: 16.0, ovr: 90, position: 'ST', image: 'https://b.fssta.com/wp-content/uploads/2022/12/kane_england.png', badges: ['Prolific', 'Finisher'], stats: [{ label: 'VAL', value: 90 }] },
    { name: 'Luka Modric', basePrice: 10.0, ovr: 88, position: 'CM', image: 'https://b.fssta.com/wp-content/uploads/2022/12/modric_croatia.png', badges: ['Eternal', 'Maestro'], stats: [{ label: 'VAL', value: 88 }] }
];

// ─── Helpers ───────────────────────────────────────────────
function markDirty(roomId) { dirtyRooms.add(roomId); }

function getCompactRoom(room) {
    if (!room) return null;
    const compact = { ...room };
    // After initial join, we don't need to spam the full players list (can be massive)
    // The client keeps their copy from the initial room-joined payload
    delete compact.players;
    return compact;
}

function addActivity(roomId, entry) {
    const room = rooms.get(roomId);
    if (!room) return;
    const item = {
        ...entry,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
    if (!room.activity) room.activity = [];
    room.activity.push(item);
    if (room.activity.length > MAX_ACTIVITY_LOG) room.activity.shift();
    io.to(roomId).emit('activity-update', item);
    markDirty(roomId);
}

function processPlayerSale(roomId) {
    const room = rooms.get(roomId);
    if (!room) return;

    if (!room.holds) room.holds = [];
    if (room.holds.length > 0) {
        if (!room.holdSaleWarned) {
            addActivity(roomId, { type: 'SYSTEM', message: `SALE PENDING: ${room.holds.length} TEAM(S) STILL THINKING...` });
            room.holdSaleWarned = true;
            io.to(roomId).emit('room-update', getCompactRoom(room));
        }
        return;
    }
    room.holdSaleWarned = false;

    const bidder = room.currentBid.bidder;
    const amount = room.currentBid.amount;
    const player = room.players && room.players[room.currentPlayerIndex];

    if (!player) {
        room.status = 'finished';
        room.timerStarted = false;
        io.to(roomId).emit('room-update', getCompactRoom(room));
        return;
    }

    if (bidder) {
        if (!room.squads[bidder]) room.squads[bidder] = [];
        room.squads[bidder].push({ ...player, boughtPrice: amount });
        room.budgets[bidder] = (room.budgets[bidder] || 0) - amount;

        addActivity(roomId, {
            type: 'SOLD', player: player.name, bidder,
            amount, message: `${bidder.toUpperCase()} SECURED ${player.name} FOR ₹${amount.toFixed(2)}Cr`
        });
        io.to(roomId).emit('player-sold', { player, bidder, amount, squads: room.squads, budgets: room.budgets });
    } else {
        addActivity(roomId, { type: 'SYSTEM', message: `${player.name} went UNSOLD` });
        io.to(roomId).emit('player-unsold', { player });
    }

    // Reset for next player
    room.bids = [];
    room.timerStarted = false; // Timer starts only on first bid
    room.currentPlayerIndex++;

    if (room.currentPlayerIndex < (room.players?.length || 0)) {
        const next = room.players[room.currentPlayerIndex];
        room.currentBid = { amount: next.basePrice, bidder: null };
        room.timeLeft = AUCTION_TIMER_SECONDS || 60;
    } else {
        room.status = 'finished';
        room.timeLeft = 0;
        addActivity(roomId, { type: 'SYSTEM', message: 'AUCTION FINISHED' });
    }

    markDirty(roomId);
    io.to(roomId).emit('room-update', getCompactRoom(room));
}

// ─── Bid Rate Limiter  (≤5 bids per second per socket) ─────
const bidTimestamps = new Map(); // socketId → [timestamps]
function isRateLimited(socketId) {
    const now = Date.now();
    const ts = (bidTimestamps.get(socketId) || []).filter(t => now - t < 1000);
    if (ts.length >= 5) return true;
    ts.push(now);
    bidTimestamps.set(socketId, ts);
    return false;
}

// ─── Room Expiry (Cleanup memory) ──────────────────────────
setInterval(() => {
    const now = Date.now();
    const expiryMs = (parseInt(process.env.ROOM_EXPIRY_HOURS) || 24) * 60 * 60 * 1000;
    rooms.forEach((room, roomId) => {
        if (now - (room.updatedAt || room.createdAt || now) > expiryMs) {
            console.log(`🧹 Expiring inactive room: ${roomId}`);
            rooms.delete(roomId);
            dirtyRooms.delete(roomId);
        }
    });

    // Memory Guard: Cleanup stale rate limit data
    if (bidTimestamps.size > 1000) {
        bidTimestamps.clear(); // Extreme reset if bloated
    } else {
        bidTimestamps.forEach((ts, id) => {
            if (!io.sockets.sockets.has(id)) bidTimestamps.delete(id);
        });
    }
}, 10 * 60 * 1000); // Check every 10 minutes

// ─── Global 1-second timer loop ────────────────────────────
setInterval(() => {
    rooms.forEach((room, roomId) => {
        if (room.status !== 'active') return;

        // Timer only runs if explicitly started (by first bid) and no holds
        const hasHolds = room.holds && room.holds.length > 0;
        const canTick = room.timerStarted && !hasHolds;

        if (canTick) {
            if (room.timeLeft > 0) {
                room.timeLeft--;
                if (room.timeLeft === 0) {
                    processPlayerSale(roomId);
                } else {
                    if (room.timeLeft % 5 === 0 || room.timeLeft < 10) {
                        io.to(roomId).emit('timer-update', room.timeLeft);
                    } else {
                        io.to(roomId).volatile.emit('timer-update', room.timeLeft);
                    }
                }
            }
        } else if (hasHolds) {
            // Keep clients aware timer is alive but paused
            io.to(roomId).emit('timer-update', { timeLeft: room.timeLeft });
        }
    });
}, 1000);

// ─── REST: Health Check ────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', rooms: rooms.size }));

// ─── AI Fallback Engine: Heuristic Analysis ───────────────
function getHeuristicAnalysis(teams, format = 'T20') {
    const teamAnalyses = Object.entries(teams).map(([name, data]) => {
        const players = data.players || [];
        const starPlayers = players.filter(p => (p.ovr || 0) >= 90).map(p => p.name);
        const roles = players.reduce((acc, p) => {
            const pos = (p.position || 'Unknown').toLowerCase();
            acc[pos] = (acc[pos] || 0) + 1;
            return acc;
        }, {});

        let tacticalScore = 50 + (Math.min(players.length, 11) * 4);
        if (roles.batter >= 5 && roles.bowler >= 4) tacticalScore += 10;

        return {
            teamName: name,
            strengths: [
                players.length >= 11 ? "Complete Unit Structure" : "Elite Core Signings",
                "Tactical Role Distribution",
                `${format} Specialist Profile`
            ],
            weaknesses: [
                players.length < 9 ? "Incomplete Squad Balance" : "Niche Bench Gaps"
            ],
            tacticalMetrics: {
                "Batting": Math.min(100, (roles.batter || 0) * 15 + 30),
                "Bowling": Math.min(100, (roles.bowler || 0) * 15 + 20),
                "MatchWinners": Math.min(10, starPlayers.length + Math.floor(players.length / 4)),
                "Balance": Math.min(100, tacticalScore)
            },
            totalInvested: players.reduce((sum, p) => sum + (p.boughtPrice || 0), 0),
            teamScore: Math.min(100, tacticalScore),
            keyPlayers: starPlayers.length > 0 ? starPlayers.slice(0, 3) : (players[0] ? [players[0].name] : ["No signings"]),
            verdict: `${name} has focused on building a ${format}-ready roster by securing key personnel. Their strategy revolves around high-impact player synergy rather than just numerical ratings.`
        };
    });

    const sortedByScore = [...teamAnalyses].sort((a, b) => b.teamScore - a.teamScore);
    const winnerData = sortedByScore[0];
    const teamNames = Object.keys(teams);

    return {
        teamAnalyses,
        comparisonTable: {
            headers: ["Squad Attribute", ...teamNames],
            rows: [
                ["Unit Cohesion", ...teamNames.map(n => teams[n].players?.length > 10 ? "ELITE" : "SOLID")],
                ["Tactical Ceiling", ...teamNames.map(n => "QUALITATIVE")],
                ["High-Pressure Reliability", ...teamNames.map(n => "HIGH")]
            ]
        },
        headToHead: [
            { category: "Tactical Synergy", winner: winnerData.teamName, reasoning: "Superior balance of roles and player reputations for the chosen format." },
            { category: "Personnel Quality", winner: winnerData.teamName, reasoning: "Secured more match-winners with proven track records." }
        ],
        playerComparisons: [],
        winner: winnerData.teamName,
        winnerReasoning: `${winnerData.teamName} is dominating this auction due to their 'Personnel-First' philosophy. They have avoided stats-traps and instead focused on players who complement each other. In the ${format} context, their squad boasts the highest tactical synergy. Their dominance stems from securing specialists who thrive in high-pressure situations.`,
        closestRival: sortedByScore[1]?.teamName || teamAnalyses[0].teamName,
        keyMatchup: "A tactical chess match between the dominant rosters.",
        source: 'AI Analysis Core'
    };
}

// ─── REST: AI Team Comparison ──────────────────────────────
app.post('/api/compare-teams', async (req, res) => {
    const { teams, format } = req.body;
    if (!teams || Object.keys(teams).length < 2) {
        return res.status(400).json({ error: 'At least 2 teams required for comparison' });
    }

    try {
        if (!genAI) throw new Error('AI not configured - Check GEMINI_API_KEY in .env');

        // Update to gemini-1.5-flash-latest (Recommended Stable Alias)
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        console.log(process.env.GEMINI_API_KEY);

        const teamsDesc = Object.entries(teams).map(([name, data]) => {
            const playerList = (data.players || []).map((p, i) =>
                `  ${i + 1}. ${p.name} | Position: ${p.position} | OVR: ${p.ovr} | Price Paid: ₹${(p.boughtPrice || p.basePrice || 0).toFixed(2)}Cr | Badges: ${(p.badges || []).join(', ')}`
            ).join('\n');
            return `Team: ${name}\nRemaining Budget: ₹${(data.budget || 0).toFixed(2)}Cr\nPlayers:\n${playerList}`;
        }).join('\n\n---\n\n');

        const prompt = `You are a world-class ${format || 'cricket'} strategy consultant and professional scout. 
Analyze these auction teams for the ${format || 'Standard'} format. 

CRITICAL INSTRUCTIONS:
1. IGNORE the 'OVR' (Rating) numbers and the 'Remaining Budget' (Purse). They are purely administrative.
2. Evaluate based on real-world player NAMES, their known performance, and how they complement each other.
3. Your analysis must be extremely accurate, reflecting actual player reputations and historical data.

Teams Data:
${teamsDesc}

Structure your response to include:
1. BATTING COMPARISON: Compare the top-order and middle-order of each team.
2. BOWLING COMPARISON: Compare the pace and spin attacks.
3. ALL-ROUNDERS & UTILITY: Compare the balance provided by multi-talented players.
4. MATCH WINNERS: Count the number of players who can single-handedly win a match.
5. FLAWS & WEAKNESSES: Identify specific tactical holes in each roster.
6. FINAL VERDICT: A calculated prediction of who wins and why.

Provide a structured analysis in the following JSON format ONLY:
{
  "teamAnalyses": [
    {
      "teamName": "string",
      "strengths": ["string"],
      "weaknesses": ["string (THE FLAWS)"],
      "totalInvested": number,
      "teamScore": number (1-100),
      "tacticalMetrics": {
        "Batting": number (0-100),
        "Bowling": number (0-100),
        "MatchWinners": number (0-10),
        "Balance": number (0-100)
      },
      "keyPlayers": ["string"],
      "verdict": "Detailed analysis of their strategy"
    }
  ],
  "comparisonTable": {
    "headers": ["Department", "Team A", "Team B", "..."],
    "rows": [
      ["Batting Unit", "Deep/Explosive", "Stable/Technical", "..."],
      ["Bowling Attack", "Elite Pace", "Spin Heavy", "..."],
      ["All-Rounder Depth", "High", "Low", "..."],
      ["Match Winner Count", "4 Players", "2 Players", "..."]
    ]
  },
  "playerComparisons": [
    {
      "position": "Batting Core",
      "bestPlayer": "string",
      "players": [{ "teamName": "string", "playerName": "string", "rating": "string (e.g. World Class)", "note": "Brief scout note" }]
    },
    {
      "position": "Bowling Core",
      "bestPlayer": "string",
      "players": [{ "teamName": "string", "playerName": "string", "rating": "string", "note": "Brief scout note" }]
    }
  ],
  "headToHead": [
    { "category": "Top Order vs New Ball", "winner": "string", "reasoning": "Detailed technical reasoning" }
  ],
  "winner": "string",
  "winnerReasoning": "A deep, 4-6 sentence masterclass on why this team wins, focusing on their departmental superiority.",
  "keyMatchup": "An interesting tactical matchup between two key players or teams"
}`;

        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();

        // Extract JSON in case model adds extra text
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('AI returned invalid format');

        const analysis = JSON.parse(jsonMatch[0]);
        res.json({ ...analysis, source: 'Gemini AI Analysis' });
    } catch (err) {
        console.error('❌ AI API Failed:', err.message);
        const fallbackResult = getHeuristicAnalysis(teams, format);
        res.json({ ...fallbackResult, error: err.message, source: 'Heuristic Engine (AI Unavailable)' });
    }
});

// ─── Socket.IO ─────────────────────────────────────────────
io.on('connection', (socket) => {

    // ── Create Room ──────────────────────────────────────
    socket.on('create-room', ({ roomId, teamName, username }) => {
        const id = roomId || ('#' + Math.random().toString(36).substring(2, 8).toUpperCase());
        const uname = username || teamName;

        const newRoomState = {
            adminSocket: socket.id,
            adminTeam: teamName,
            status: 'waiting',
            bids: [],
            players: [...CRICKET_PLAYERS],
            currentPlayerIndex: 0,
            currentBid: { amount: 0, bidder: null },
            budgets: { [teamName]: 100 },
            squads: { [teamName]: [] },
            teamSocketMap: { [teamName]: socket.id },
            userToTeam: { [uname]: teamName },
            holds: [],
            holdSaleWarned: false,
            globalSettings: { initialBudget: 100, allowedIncrements: [0.25, 0.5, 1, 2, 5] },
            timeLeft: AUCTION_TIMER_SECONDS,
            messages: [],
            activity: [{ type: 'SYSTEM', message: 'The Arena is Open!', id: Date.now() }],
            createdAt: Date.now()
        };

        rooms.set(id, newRoomState);
        socket.join(id);
        markDirty(id);

        // Immediate sync for creator
        socket.emit('admin-status', true);
        socket.emit('room-created', { roomId: id, state: newRoomState, isAdmin: true });
        // Also emit room-joined to ensure App.jsx receives full state and navigates correctly
        socket.emit('room-joined', { roomId: id, state: newRoomState, isAdmin: true, isRejoin: false });
    });

    // ── Join Room ─────────────────────────────────────────
    socket.on('join-room', ({ roomId, teamName, username }) => {
        if (!rooms.has(roomId)) {
            socket.emit('error', 'Room not found. Please check the Room ID.');
            return;
        }
        socket.join(roomId);
        const room = rooms.get(roomId);

        // --- HYDRATION: Ensure room has all required modern structures ---
        if (!room.userToTeam) room.userToTeam = {};
        if (!room.teamSocketMap) room.teamSocketMap = {};
        if (!room.budgets) room.budgets = {};
        if (!room.squads) room.squads = {};
        if (!room.activity) room.activity = [];

        const uname = username || teamName;
        // Rejoin detection (checks both modern and legacy mappings)
        let existingTeam = room.userToTeam[uname];

        // Legacy fallback for rooms created with older versions
        if (!existingTeam && room.usernameMap?.[uname]) {
            // Find team from old teamNames via old socketId
            const oldSocketId = room.usernameMap[uname];
            existingTeam = room.teamNames?.[oldSocketId];
            if (existingTeam) room.userToTeam[uname] = existingTeam; // Migrate to new structure
        }

        let isRejoin = !!existingTeam;

        if (isRejoin) {
            room.teamSocketMap[existingTeam] = socket.id;
            // Persist admin if the rejoining team is the creator
            if (room.adminTeam === existingTeam) {
                room.adminSocket = socket.id;
            }
            addActivity(roomId, { type: 'SYSTEM', message: `${existingTeam.toUpperCase()} REJOINED THE ARENA` });
        } else {
            // New participant (or fallback to teamName if username link not found)
            if (!room.budgets[teamName]) {
                room.budgets[teamName] = room.globalSettings?.initialBudget || 100;
                room.squads[teamName] = [];
            }
            room.userToTeam[uname] = teamName;
            room.teamSocketMap[teamName] = socket.id;

            // Critical: If creator is joining but wasn't in userToTeam, restore admin
            if (room.adminTeam === teamName) room.adminSocket = socket.id;

            addActivity(roomId, { type: 'SYSTEM', message: `${teamName.toUpperCase()} ENTERED THE ARENA` });
        }

        const isAdmin = room.adminSocket === socket.id;
        markDirty(roomId);

        // Full Real-time Sync: Everyone in the room (including joiner) gets the same updated state
        socket.emit('admin-status', isAdmin);
        socket.emit('room-joined', { roomId, state: room, isAdmin, isRejoin });
        io.to(roomId).emit('room-update', room); // FULL Update on join
    });

    // ── Team Name set (legacy compat - hardened) ──────────────────
    socket.on('set-team-name', ({ roomId, teamName, username }) => {
        const room = rooms.get(roomId);
        if (!room) return;

        const uname = username || teamName;
        if (!room.userToTeam) room.userToTeam = {};
        if (!room.teamSocketMap) room.teamSocketMap = {};

        room.userToTeam[uname] = teamName;
        room.teamSocketMap[teamName] = socket.id;

        if (room.adminTeam === teamName) room.adminSocket = socket.id;

        markDirty(roomId);
        io.to(roomId).emit('room-update', getCompactRoom(room));
    });
    // ── Hold Toggle ────────────────────────────────────────
    socket.on('toggle-hold', ({ roomId, teamName }) => {
        const room = rooms.get(roomId);
        if (!room || !['active', 'paused'].includes(room.status)) return;

        if (!room.holds) room.holds = [];
        const normalized = teamName.toUpperCase();
        const idx = room.holds.indexOf(normalized);

        if (idx === -1) {
            room.holds.push(normalized);
            addActivity(roomId, { type: 'SYSTEM', message: `${normalized} REQUESTED TACTICAL HOLD` });
        } else {
            room.holds.splice(idx, 1);
            addActivity(roomId, { type: 'SYSTEM', message: `${normalized} RELEASED HOLD` });
            if (room.holds.length === 0 && room.timeLeft === 0) processPlayerSale(roomId);
        }
        markDirty(roomId);
        io.to(roomId).emit('room-update', getCompactRoom(room));
    });

    // ── Config Update ──────────────────────────────────────
    socket.on('update-config', ({ roomId, config }) => {
        const room = rooms.get(roomId);
        if (!room || room.adminSocket !== socket.id) return;
        room.globalSettings = { ...room.globalSettings, ...config };
        if (config.initialBudget && room.status === 'waiting') {
            Object.keys(room.budgets).forEach(team => { room.budgets[team] = config.initialBudget; });
        }
        markDirty(roomId);
        io.to(roomId).emit('room-update', room); // FULL Update for lobby
    });

    // ── Set Team Budget ────────────────────────────────────
    socket.on('set-team-budget', ({ roomId, teamName, amount }) => {
        const room = rooms.get(roomId);
        if (!room || room.adminSocket !== socket.id || amount < 0) return;
        room.budgets[teamName] = amount;
        markDirty(roomId);
        io.to(roomId).emit('room-update', room); // FULL Update for lobby
    });

    // ── Load Preset ────────────────────────────────────────
    socket.on('load-preset', ({ roomId, presetType }) => {
        const room = rooms.get(roomId);
        if (!room || room.adminSocket !== socket.id) return;
        room.players = presetType === 'cricket' ? [...CRICKET_PLAYERS] : [...FOOTBALL_PLAYERS];
        if (room.status === 'finished' && room.players.length > room.currentPlayerIndex) {
            room.status = 'active';
            const cur = room.players[room.currentPlayerIndex];
            room.currentBid = { amount: cur?.basePrice || 0, bidder: null };
            room.timeLeft = AUCTION_TIMER_SECONDS;
            addActivity(roomId, { type: 'SYSTEM', message: 'AUCTION RESUMED WITH NEW ROSTER' });
        }
        markDirty(roomId);
        io.to(roomId).emit('room-update', room); // FULL Update for lobby
    });

    // ── Add Player ─────────────────────────────────────────
    socket.on('add-player', ({ roomId, player }) => {
        const room = rooms.get(roomId);
        if (!room || room.adminSocket !== socket.id || !player.name || !player.basePrice) return;

        const newPlayer = {
            name: player.name,
            basePrice: parseFloat(player.basePrice) || 1,
            ovr: parseInt(player.ovr) || 80,
            position: player.position || 'N/A',
            image: player.image || null,
            badges: player.badges || ['Manual Entry'],
            stats: player.stats || [{ label: 'VAL', value: parseInt(player.ovr) || 80 }]
        };
        room.players.push(newPlayer);

        if (room.status === 'finished' && room.players.length > room.currentPlayerIndex) {
            room.status = 'active';
            const cur = room.players[room.currentPlayerIndex];
            room.currentBid = { amount: cur?.basePrice || 0, bidder: null };
            room.timeLeft = AUCTION_TIMER_SECONDS;
            addActivity(roomId, { type: 'SYSTEM', message: `AUCTION RESUMED: ${newPlayer.name.toUpperCase()} ADDED` });
        }
        markDirty(roomId);
        io.to(roomId).emit('room-update', room); // FULL Update for lobby
    });

    // ── Update Marketplace Player ────────────────────────
    socket.on('admin-update-marketplace-player', ({ roomId, playerIndex, updatedData }) => {
        const room = rooms.get(roomId);
        if (!room || room.adminSocket !== socket.id) return;
        const idx = parseInt(playerIndex);
        if (isNaN(idx) || idx < 0 || idx >= (room.players?.length || 0)) return;

        const player = room.players[idx];
        const oldName = player.name;

        // Update marketplace entry
        room.players[idx] = { ...player, ...updatedData };

        // Synchronize with squads if player is already sold
        Object.keys(room.squads || {}).forEach(tName => {
            room.squads[tName] = (room.squads[tName] || []).map(sp => {
                if (sp.name === oldName) {
                    const oldPrice = sp.boughtPrice || 0;
                    const newPrice = updatedData.basePrice !== undefined ? (parseFloat(updatedData.basePrice) || 0) : oldPrice;

                    // Adjust budget if price changed
                    if (newPrice !== oldPrice) {
                        room.budgets[tName] = (room.budgets[tName] || 0) + (oldPrice - newPrice);
                    }

                    return { ...sp, ...updatedData, boughtPrice: newPrice };
                }
                return sp;
            });
        });

        addActivity(roomId, { type: 'SYSTEM', message: `ADMIN UPDATED ${player.name} GLOBALLY` });

        // Synchronize current bid if this player is currently under auction and no bids placed yet
        if (idx === room.currentPlayerIndex && room.currentBid.bidder === null) {
            if (updatedData.basePrice !== undefined) {
                room.currentBid.amount = parseFloat(updatedData.basePrice);
                room.timeLeft = AUCTION_TIMER_SECONDS || 60; // Refresh timer on edit
            }
        }

        markDirty(roomId);
        io.to(roomId).emit('room-update', { ...room });
    });

    // ── Remove Player (Marketplace) ───────────────────────
    socket.on('remove-player', ({ roomId, playerIndex }) => {
        const room = rooms.get(roomId);
        const idx = parseInt(playerIndex);
        if (!room || room.adminSocket !== socket.id || isNaN(idx) || idx < 0 || idx >= room.players.length) return;
        room.players = room.players.filter((_, i) => i !== idx);
        if (idx < room.currentPlayerIndex) room.currentPlayerIndex = Math.max(0, room.currentPlayerIndex - 1);
        markDirty(roomId);
        io.to(roomId).emit('room-update', { ...room });
    });

    // ── Admin: Squad Management ───────────────────────────
    socket.on('admin-update-squad-player', ({ roomId, teamName, playerIndex, updatedData }) => {
        const room = rooms.get(roomId);
        if (!room || room.adminSocket !== socket.id) return;
        const squad = room.squads[teamName];
        if (!squad || !squad[playerIndex]) return;

        const player = squad[playerIndex];
        const oldName = player.name;
        const oldPrice = player.boughtPrice || 0;
        const newPrice = parseFloat(updatedData.boughtPrice);

        // Update squad info
        squad[playerIndex] = { ...player, ...updatedData, boughtPrice: !isNaN(newPrice) ? newPrice : oldPrice };

        // Adjust budget
        if (!isNaN(newPrice) && newPrice !== oldPrice) {
            room.budgets[teamName] += (oldPrice - newPrice);
        }

        // Synchronize with marketplace
        const mIdx = room.players.findIndex(p => p.name === oldName);
        if (mIdx !== -1) {
            const mPlayer = room.players[mIdx];
            room.players[mIdx] = {
                ...mPlayer,
                ...updatedData,
                basePrice: !isNaN(newPrice) ? newPrice : mPlayer.basePrice
            };
        }

        addActivity(roomId, { type: 'SYSTEM', message: `ADMIN UPDATED ${player.name} GLOBALLY` });
        markDirty(roomId);
        io.to(roomId).emit('room-update', room);
    });

    socket.on('admin-transfer-player', ({ roomId, fromTeam, toTeam, playerIndex }) => {
        const room = rooms.get(roomId);
        if (!room || room.adminSocket !== socket.id) return;
        const fromSquad = room.squads[fromTeam];
        if (!fromSquad || !fromSquad[playerIndex] || !room.budgets[toTeam]) return;

        const [player] = fromSquad.splice(playerIndex, 1);
        if (!room.squads[toTeam]) room.squads[toTeam] = [];
        room.squads[toTeam].push(player);

        // Adjust budgets
        const price = player.boughtPrice || 0;
        room.budgets[fromTeam] += price;
        room.budgets[toTeam] -= price;

        addActivity(roomId, { type: 'SYSTEM', message: `ADMIN TRANSFERRED ${player.name}: ${fromTeam.toUpperCase()} ➔ ${toTeam.toUpperCase()}` });
        markDirty(roomId);
        io.to(roomId).emit('room-update', room);
    });

    socket.on('admin-remove-from-squad', ({ roomId, teamName, playerIndex, refund = true }) => {
        const room = rooms.get(roomId);
        if (!room || room.adminSocket !== socket.id) return;
        const squad = room.squads[teamName];
        if (!squad || !squad[playerIndex]) return;

        const [player] = squad.splice(playerIndex, 1);
        if (refund) {
            room.budgets[teamName] += (player.boughtPrice || 0);
        }

        addActivity(roomId, { type: 'SYSTEM', message: `ADMIN REMOVED ${player.name} FROM ${teamName.toUpperCase()}${refund ? ' (REFUNDED)' : ''}` });
        markDirty(roomId);
        io.to(roomId).emit('room-update', room);
    });

    socket.on('admin-add-to-squad', ({ roomId, teamName, playerData }) => {
        const room = rooms.get(roomId);
        if (!room || room.adminSocket !== socket.id) return;
        if (!room.squads[teamName]) room.squads[teamName] = [];

        const price = parseFloat(playerData.boughtPrice || 0);
        room.squads[teamName].push({
            ...playerData,
            boughtPrice: price,
            ovr: parseInt(playerData.ovr || 80),
            position: playerData.position || 'N/A'
        });

        room.budgets[teamName] -= price;

        addActivity(roomId, { type: 'SYSTEM', message: `ADMIN ADDED ${playerData.name} DIRECTLY TO ${teamName.toUpperCase()}` });
        markDirty(roomId);
        io.to(roomId).emit('room-update', room);
    });

    // ── Bulk Update Players ────────────────────────────────
    socket.on('update-players', ({ roomId, players }) => {
        const room = rooms.get(roomId);
        if (!room || room.adminSocket !== socket.id) return;
        const oldCount = room.players.length;
        room.players = players;
        if (room.status === 'finished' && players.length > room.currentPlayerIndex) {
            room.status = 'active';
            const cur = room.players[room.currentPlayerIndex];
            room.currentBid = { amount: cur?.basePrice || 0, bidder: null };
            room.timeLeft = AUCTION_TIMER_SECONDS;
            const added = players.length - oldCount;
            addActivity(roomId, { type: 'SYSTEM', message: `AUCTION RESUMED: ${added} NEW PLAYER(S) INJECTED` });
        }
        markDirty(roomId);
        io.to(roomId).emit('room-update', { ...room });
    });

    // ── Clear Players ──────────────────────────────────────
    socket.on('clear-players', (roomId) => {
        const room = rooms.get(roomId);
        if (!room || room.adminSocket !== socket.id) return;
        room.players = [];
        markDirty(roomId);
        io.to(roomId).emit('room-update', getCompactRoom(room));
    });

    // ── Start Auction ──────────────────────────────────────
    socket.on('start-auction', (roomId) => {
        const room = rooms.get(roomId);
        if (!room || room.adminSocket !== socket.id) return;

        // Safety: Ensure players exist
        if (!room.players || room.players.length === 0) {
            room.players = [...CRICKET_PLAYERS];
        }

        room.status = 'active';
        room.currentPlayerIndex = 0;
        room.bids = [];
        room.timerStarted = false; // Wait for first bid

        const cur = room.players[0];
        room.currentBid = { amount: cur?.basePrice || 0, bidder: null };
        room.timeLeft = AUCTION_TIMER_SECONDS || 60;

        addActivity(roomId, { type: 'SYSTEM', message: 'AUCTION STARTED' });
        markDirty(roomId);

        io.to(roomId).emit('auction-started', { roomId, state: room, currentPlayer: cur });
        io.to(roomId).emit('room-update', getCompactRoom(room));
    });

    // ── Pause / Resume Auction ─────────────────────────────
    socket.on('pause-auction', (roomId) => {
        const room = rooms.get(roomId);
        if (!room || room.adminSocket !== socket.id) return;
        room.status = 'paused';
        addActivity(roomId, { type: 'SYSTEM', message: 'AUCTION PAUSED BY ADMIN' });
        markDirty(roomId);
        io.to(roomId).emit('room-update', getCompactRoom(room));
    });

    socket.on('resume-auction', (roomId) => {
        const room = rooms.get(roomId);
        if (!room || room.adminSocket !== socket.id) return;
        room.status = 'active';
        if (room.timeLeft <= 0) room.timeLeft = AUCTION_TIMER_SECONDS;
        addActivity(roomId, { type: 'SYSTEM', message: 'AUCTION RESUMED BY ADMIN' });
        markDirty(roomId);
        io.to(roomId).emit('room-update', getCompactRoom(room));
    });

    // ── Sold / Unsold ──────────────────────────────────────
    socket.on('unsold-player', (roomId) => {
        const room = rooms.get(roomId);
        if (!room || room.adminSocket !== socket.id || room.currentBid.bidder) return;
        processPlayerSale(roomId);
    });

    socket.on('sold-player', (roomId) => {
        const room = rooms.get(roomId);
        if (!room || room.adminSocket !== socket.id || !room.currentBid.bidder) return;
        processPlayerSale(roomId);
    });

    // ── Place Bid ──────────────────────────────────────────
    socket.on('place-bid', ({ roomId, amount, bidder }) => {
        const room = rooms.get(roomId);
        if (!room) return;
        if (room.status !== 'active') {
            console.log(`[BID REJECTED] Team ${bidder} tried to bid on ${roomId} but it is ${room.status}`);
            return;
        }
        if (isRateLimited(socket.id)) return; // rate limit

        const bidAmount = parseFloat(amount) || 0;
        const currentAmount = room.currentBid.amount;
        const isFirstBid = room.currentBid.bidder === null;
        const isValid = isFirstBid ? bidAmount >= currentAmount : bidAmount > currentAmount;
        const budget = room.budgets[bidder] || 0;
        const hasBudget = budget >= bidAmount;

        if (isValid && hasBudget) {
            const finalAmount = bidAmount;
            room.currentBid = { amount: finalAmount, bidder };
            room.bids.push({ amount: finalAmount, bidder, time: new Date() });
            room.timeLeft = AUCTION_TIMER_SECONDS || 60;
            room.timerStarted = true; // --- START THE TIMER ON FIRST BID ---

            addActivity(roomId, {
                type: 'BID', bidder, amount,
                message: `${bidder.toUpperCase()} BID ₹${amount.toFixed(2)}Cr`
            });

            const recentBids = room.bids.slice(-10);
            if (room.bids.length > 50) room.bids = room.bids.slice(-50); // Hard cap history
            markDirty(roomId);
            io.to(roomId).emit('new-bid', { currentBid: room.currentBid, timeLeft: room.timeLeft, bids: recentBids });
        } else {
            console.log(`[BID REJECTED] from ${bidder}: amount=${bidAmount}, current=${currentAmount}, budget=${budget}, isValid=${isValid}, hasBudget=${hasBudget}`);
        }
    });

    // ── Revert / Reset Bid ─────────────────────────────────
    socket.on('revert-bid', (roomId) => {
        const room = rooms.get(roomId);
        if (!room || room.adminSocket !== socket.id) return;
        if (room.bids && room.bids.length > 0) {
            room.bids.pop();
            const prev = room.bids.length > 0 ? room.bids[room.bids.length - 1] : null;
            room.currentBid = prev
                ? { amount: prev.amount, bidder: prev.bidder }
                : { amount: room.players[room.currentPlayerIndex]?.basePrice || 0, bidder: null };
            room.timerStarted = !!prev;
            markDirty(roomId);
            io.to(roomId).emit('room-update', getCompactRoom(room));
        }
    });

    socket.on('reset-bid', (roomId) => {
        const room = rooms.get(roomId);
        if (!room || room.adminSocket !== socket.id) return;
        room.bids = [];
        room.timerStarted = false;
        room.currentBid = { amount: room.players[room.currentPlayerIndex]?.basePrice || 0, bidder: null };
        room.timeLeft = AUCTION_TIMER_SECONDS || 60;
        markDirty(roomId);
        io.to(roomId).emit('room-update', getCompactRoom(room));
    });

    // ── Set Increments ─────────────────────────────────────
    socket.on('set-increments', ({ roomId, increments }) => {
        const room = rooms.get(roomId);
        if (!room || room.adminSocket !== socket.id) return;
        room.globalSettings.allowedIncrements = increments;
        markDirty(roomId);
        io.to(roomId).emit('room-update', getCompactRoom(room));
    });

    // ── Chat Message ───────────────────────────────────────
    socket.on('send-message', ({ roomId, message, user, teamName }) => {
        if (!message?.trim()) return;
        const msg = {
            id: `${Date.now()}-${socket.id}`,
            user: user || 'Unknown',
            teamName: teamName || '',
            content: message.trim().slice(0, 500), // cap at 500 chars
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        // Store last 100 messages per room
        const room = rooms.get(roomId);
        if (room) {
            if (!room.messages) room.messages = [];
            room.messages.push(msg);
            if (room.messages.length > 100) room.messages.shift();
            markDirty(roomId);
        }
        io.to(roomId).emit('message', msg);
    });

    // ── Kick Team (admin only) ─────────────────────────────
    socket.on('kick-team', ({ roomId, teamName }) => {
        const room = rooms.get(roomId);
        if (!room || room.adminSocket !== socket.id) return;

        const targetSocketId = room.teamSocketMap?.[teamName];
        if (targetSocketId) {
            io.to(targetSocketId).emit('kicked', { message: 'You have been removed from this room.' });
        }

        // Cleanup regardless of whether socket is currently connected
        delete room.teamSocketMap?.[teamName];
        if (room.userToTeam) {
            Object.keys(room.userToTeam).forEach(u => {
                if (room.userToTeam[u] === teamName) delete room.userToTeam[u];
            });
        }

        addActivity(roomId, { type: 'SYSTEM', message: `${teamName.toUpperCase()} WAS REMOVED FROM ARENA` });
        markDirty(roomId);
        io.to(roomId).emit('room-update', getCompactRoom(room));
    });

    // ── Transfer Admin ─────────────────────────────────────
    socket.on('transfer-admin', ({ roomId, teamName }) => {
        const room = rooms.get(roomId);
        if (!room || room.adminSocket !== socket.id) return;

        const targetSocketId = room.teamSocketMap?.[teamName];
        if (targetSocketId) {
            room.adminTeam = teamName;
            room.adminSocket = targetSocketId;
            addActivity(roomId, { type: 'SYSTEM', message: `ADMIN TRANSFERRED TO ${teamName.toUpperCase()}` });
            io.to(targetSocketId).emit('admin-status', true);
            socket.emit('admin-status', false);
            markDirty(roomId);
            io.to(roomId).emit('room-update', room);
        }
    });

    // ── Jump to Player (admin) ─────────────────────────────
    socket.on('jump-to-player', ({ roomId, playerIndex }) => {
        const room = rooms.get(roomId);
        if (!room || room.adminSocket !== socket.id) return;
        const idx = parseInt(playerIndex);
        if (isNaN(idx) || idx < 0 || idx >= room.players.length) return;
        room.currentPlayerIndex = idx;
        room.bids = [];
        room.timerStarted = false;
        room.currentBid = { amount: room.players[idx]?.basePrice || 0, bidder: null };
        room.timeLeft = AUCTION_TIMER_SECONDS || 60;
        room.status = 'active';
        markDirty(roomId);
        io.to(roomId).emit('room-update', room);
    });

    // ── Disconnect ─────────────────────────────────────────
    socket.on('disconnect', () => {
        bidTimestamps.delete(socket.id);
        // Don't remove team immediately — allow fast rejoin within session
        // Any reconnect with same username will restore their session
    });
});

// ─── Start ─────────────────────────────────────────────────
httpServer.listen(PORT, () => console.log(`🏆 Elite Auction Server running on port ${PORT}`));
