import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: process.env.CORS_ORIGIN || "*",
        methods: ["GET", "POST"]
    }
});

const rooms = new Map();

const DEFAULT_PLAYERS = [
    { name: "Lionel Messi", basePrice: 20.0, ovr: 91, position: "RW", image: null, badges: ["GOAT", "Playmaker"], stats: [{ label: "VAL", value: 91 }] },
    { name: "Cristiano Ronaldo", basePrice: 18.0, ovr: 90, position: "ST", image: null, badges: ["Striker", "Leader"], stats: [{ label: "VAL", value: 90 }] },
    { name: "Kylian Mbappe", basePrice: 25.0, ovr: 91, position: "ST", image: null, badges: ["Speedster", "Clinical"], stats: [{ label: "VAL", value: 91 }] }
];

const CRICKET_PLAYERS = [
    { name: "Virat Kohli", basePrice: 20.0, ovr: 92, position: "Batter", image: null, badges: ["King", "Chase Master"], stats: [{ label: "VAL", value: 92 }] },
    { name: "MS Dhoni", basePrice: 15.0, ovr: 89, position: "WK-Batter", image: null, badges: ["Captain Cool", "Finisher"], stats: [{ label: "VAL", value: 89 }] },
    { name: "Jasprit Bumrah", basePrice: 15.0, ovr: 91, position: "Bowler", image: null, badges: ["Yorker King", "Elite"], stats: [{ label: "VAL", value: 91 }] }
];

const AUCTION_TIMER_SECONDS = 60;

// Helper to add activity entry
function addActivity(roomId, entry) {
    const room = rooms.get(roomId);
    if (!room) return;

    const activityEntry = {
        ...entry,
        id: Date.now() + Math.random().toString(36).substr(2, 9),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };

    if (!room.activity) room.activity = [];
    room.activity.push(activityEntry);
    // Keep last 50 entries
    if (room.activity.length > 50) room.activity.shift();

    io.to(roomId).emit('activity-update', activityEntry);
}

// Helper to sell/skip player
function processPlayerSale(roomId) {
    const room = rooms.get(roomId);
    if (!room) return;

    const bidder = room.currentBid.bidder;
    const amount = room.currentBid.amount;
    const player = room.players[room.currentPlayerIndex];

    // Ensure holds exists
    if (!room.holds) room.holds = [];

    // CRITICAL: Cannot sell if anyone is on hold
    if (room.holds.length > 0) {
        if (!room.holdSaleWarned) {
            addActivity(roomId, {
                type: 'SYSTEM',
                message: `SALE PENDING: ${room.holds.length} TEAM(S) STILL THINKING...`
            });
            room.holdSaleWarned = true;
            io.to(roomId).emit('room-update', room);
        }
        return;
    }
    room.holdSaleWarned = false;

    if (bidder) {
        // Successful sale
        if (!room.squads[bidder]) room.squads[bidder] = [];
        room.squads[bidder].push({ ...player, boughtPrice: amount });
        room.budgets[bidder] -= amount;

        addActivity(roomId, {
            type: 'SOLD',
            player: player.name,
            bidder: bidder,
            amount: amount,
            message: `${bidder.toUpperCase()} SECURED ${player.name} FOR ₹${amount.toFixed(2)}Cr`
        });

        io.to(roomId).emit('player-sold', {
            player,
            bidder,
            amount,
            squads: room.squads,
            budgets: room.budgets
        });
    } else {
        addActivity(roomId, {
            type: 'SYSTEM',
            message: `${player.name} went UNSOLD`
        });
        io.to(roomId).emit('player-unsold', { player });
    }

    // Move to next player
    room.currentPlayerIndex++;
    if (room.currentPlayerIndex < room.players.length) {
        const nextPlayer = room.players[room.currentPlayerIndex];
        room.currentBid = { amount: nextPlayer.basePrice, bidder: null };
        room.timeLeft = AUCTION_TIMER_SECONDS;
    } else {
        room.status = 'finished';
        room.timeLeft = 0;
        addActivity(roomId, { type: 'SYSTEM', message: 'AUCTION FINISHED' });
    }
    io.to(roomId).emit('room-update', room);
}

// Global timer loop
setInterval(() => {
    rooms.forEach((room, roomId) => {
        if (room.status === 'active') {
            const hasHolds = room.holds && room.holds.length > 0;
            if (room.timeLeft > 0 && !hasHolds) {
                room.timeLeft--;
                if (room.timeLeft === 0) {
                    processPlayerSale(roomId);
                } else {
                    io.to(roomId).emit('timer-update', { timeLeft: room.timeLeft });
                }
            } else if (hasHolds) {
                // Keep heartbeat update so UI sees the "on hold" state even if timer is frozen
                // Emit lightweight payload
                io.to(roomId).emit('timer-update', { timeLeft: room.timeLeft });
            }
        }
    });
}, 1000);

io.on('connection', (socket) => {
    // console.log('User connected:', socket.id);

    socket.on('create-room', (roomId) => {
        // console.log(`Server: Creating room ${roomId}`);
        rooms.set(roomId, {
            adminSocket: socket.id,
            adminTeam: null,
            status: 'waiting',
            bids: [],
            players: [...DEFAULT_PLAYERS],
            currentPlayerIndex: 0,
            currentBid: { amount: 0, bidder: null },
            budgets: {},
            squads: {},
            teamNames: {},
            holds: [],
            globalSettings: { initialBudget: 100 },
            timeLeft: AUCTION_TIMER_SECONDS,
            activity: [{ type: 'SYSTEM', message: 'Room Created', time: new Date().toLocaleTimeString() }]
        });
        socket.join(roomId);
        socket.emit('room-created', roomId);
    });

    socket.on('join-room', (roomId) => {
        if (rooms.has(roomId)) {
            socket.join(roomId);
            const room = rooms.get(roomId);
            const isAdmin = room.adminSocket === socket.id;
            socket.emit('room-joined', { roomId, state: room, isAdmin });
        } else {
            socket.emit('error', 'Room not found');
        }
    });

    socket.on('set-team-name', ({ roomId, teamName }) => {
        const room = rooms.get(roomId);
        if (room) {
            // Check for rejoin (same team name, different socket)
            const oldSocketId = Object.keys(room.teamNames).find(id => room.teamNames[id] === teamName && id !== socket.id);

            if (oldSocketId) {
                // console.log(`User ${teamName} rejoining. Old Socket: ${oldSocketId}, New Socket: ${socket.id}`);
                delete room.teamNames[oldSocketId];
                addActivity(roomId, { type: 'SYSTEM', message: `${teamName.toUpperCase()} REJOINED THE ROOM` });

                // Notify admin
                if (room.adminSocket && room.adminSocket !== socket.id) {
                    io.to(room.adminSocket).emit('admin-notification', {
                        type: 'REJOIN',
                        message: `${teamName} has re-entered the room.`,
                        teamName
                    });
                }
            }

            room.teamNames[socket.id] = teamName;

            // Re-assign admin socket if this teamName was the admin
            if (room.adminTeam === teamName) {
                room.adminSocket = socket.id;
            }

            if (!room.budgets[teamName]) {
                room.budgets[teamName] = room.globalSettings.initialBudget;
                room.squads[teamName] = [];
            }
            socket.emit('admin-status', room.adminSocket === socket.id);
            io.to(roomId).emit('room-update', room);
        }
    });

    socket.on('toggle-hold', ({ roomId, teamName }) => {
        const room = rooms.get(roomId);
        // console.log(`Hold Toggle: Room=${roomId}, Team=${teamName}, CurrentStatus=${room?.status}`);

        if (room && (room.status === 'active' || room.status === 'paused')) {
            if (!room.holds) room.holds = [];

            const normalizedName = teamName.toUpperCase();
            const index = room.holds.indexOf(normalizedName);

            if (index === -1) {
                room.holds.push(normalizedName);
                addActivity(roomId, {
                    type: 'SYSTEM',
                    message: `${normalizedName} REQUESTED TACTICAL HOLD`
                });
            } else {
                room.holds.splice(index, 1);
                addActivity(roomId, {
                    type: 'SYSTEM',
                    message: `${normalizedName} RELEASED HOLD`
                });

                // If timer was at 0 and holds are cleared, trigger sale
                if (room.holds.length === 0 && room.timeLeft === 0) {
                    processPlayerSale(roomId);
                }
            }
            io.to(roomId).emit('room-update', room);
        }
    });

    socket.on('update-config', ({ roomId, config }) => {
        const room = rooms.get(roomId);
        if (room && room.adminSocket === socket.id) {
            room.globalSettings = { ...room.globalSettings, ...config };
            if (config.initialBudget && room.status === 'waiting') {
                Object.keys(room.budgets).forEach(team => {
                    room.budgets[team] = room.globalSettings.initialBudget;
                });
            }
            io.to(roomId).emit('room-update', room);
        }
    });

    socket.on('set-team-budget', ({ roomId, teamName, amount }) => {
        const room = rooms.get(roomId);
        if (room && room.adminSocket === socket.id && amount >= 0) {
            room.budgets[teamName] = amount;
            io.to(roomId).emit('room-update', room);
        }
    });

    socket.on('load-preset', ({ roomId, presetType }) => {
        const room = rooms.get(roomId);
        if (room && room.adminSocket === socket.id) {
            room.players = presetType === 'cricket' ? [...CRICKET_PLAYERS] : [...DEFAULT_PLAYERS];

            // Auto-resume if it was finished and players were added
            if (room.status === 'finished' && room.players.length > room.currentPlayerIndex) {
                room.status = 'active';
                const currentPlayer = room.players[room.currentPlayerIndex];
                room.currentBid = { amount: currentPlayer ? currentPlayer.basePrice : 0, bidder: null };
                room.timeLeft = AUCTION_TIMER_SECONDS;
                addActivity(roomId, { type: 'SYSTEM', message: 'AUCTION RESUMED WITH NEW ROSTER' });
            }

            io.to(roomId).emit('room-update', room);
        }
    });

    socket.on('add-player', ({ roomId, player }) => {
        const room = rooms.get(roomId);
        if (room && room.adminSocket === socket.id && player.name && player.basePrice) {
            if (!player.image) player.image = null;
            player.ovr = player.ovr || 80;
            player.position = player.position || "N/A";
            player.stats = player.stats || [{ label: "VAL", value: player.ovr }];
            player.badges = player.badges || ["Manual Entry"];
            room.players.push(player);

            // Auto-resume if it was finished and players were added
            if (room.status === 'finished' && room.players.length > room.currentPlayerIndex) {
                room.status = 'active';
                const currentPlayer = room.players[room.currentPlayerIndex];
                room.currentBid = { amount: currentPlayer ? currentPlayer.basePrice : 0, bidder: null };
                room.timeLeft = AUCTION_TIMER_SECONDS;
                addActivity(roomId, { type: 'SYSTEM', message: `AUCTION RESUMED: ${player.name.toUpperCase()} ADDED` });
            }

            io.to(roomId).emit('room-update', room);
        }
    });

    socket.on('remove-player', ({ roomId, playerIndex }) => {
        const room = rooms.get(roomId);
        const index = parseInt(playerIndex);
        if (room && room.adminSocket === socket.id) {
            if (!isNaN(index) && index >= 0 && index < room.players.length) {
                // Return a new array to ensure state detection
                room.players = room.players.filter((_, i) => i !== index);
                // console.log(`Server: Removed player at index ${index} in room ${roomId}`);
                io.to(roomId).emit('room-update', { ...room });
            }
        }
    });

    socket.on('update-players', ({ roomId, players }) => {
        const room = rooms.get(roomId);
        if (room && room.adminSocket === socket.id) {
            const oldCount = room.players.length;
            room.players = players;
            // console.log(`Server: Updated player list for room ${roomId}, count: ${players.length}`);

            // Auto-resume if it was finished and players were added
            if (room.status === 'finished' && room.players.length > room.currentPlayerIndex) {
                room.status = 'active';
                const currentPlayer = room.players[room.currentPlayerIndex];
                room.currentBid = { amount: currentPlayer ? currentPlayer.basePrice : 0, bidder: null };
                room.timeLeft = AUCTION_TIMER_SECONDS;
                addActivity(roomId, { type: 'SYSTEM', message: `AUCTION RESUMED: ${players.length - oldCount} NEW PLAYERS INJECTED` });
            }

            io.to(roomId).emit('room-update', { ...room });
        }
    });

    socket.on('clear-players', (roomId) => {
        const room = rooms.get(roomId);
        if (room && room.adminSocket === socket.id) {
            room.players = [];
            io.to(roomId).emit('room-update', room);
        }
    });

    socket.on('start-auction', (roomId) => {
        const room = rooms.get(roomId);
        if (room && room.adminSocket === socket.id) {
            if (room.players.length === 0) room.players = [...CRICKET_PLAYERS];
            room.status = 'active';
            room.currentPlayerIndex = 0;
            const currentPlayer = room.players[0];
            room.currentBid = { amount: currentPlayer ? currentPlayer.basePrice : 0, bidder: null };
            room.timeLeft = AUCTION_TIMER_SECONDS;
            io.to(roomId).emit('auction-started', { roomId, state: room, currentPlayer });
            addActivity(roomId, { type: 'SYSTEM', message: 'AUCTION STARTED' });
            io.to(roomId).emit('room-update', room);
        }
    });

    socket.on('pause-auction', (roomId) => {
        // console.log(`Server: Received pause-auction for room ${roomId} from socket ${socket.id}`);
        const room = rooms.get(roomId);
        if (room) {
            if (room.adminSocket === socket.id) {
                room.status = 'paused';
                // console.log(`Server: Room ${roomId} status set to PAUSED`);
                addActivity(roomId, { type: 'SYSTEM', message: 'AUCTION PAUSED BY ADMIN' });
                io.to(roomId).emit('room-update', room);
            } else {
                // console.log(`Server: Pause rejected - not admin. Admin: ${room.adminSocket}, Requester: ${socket.id}`);
            }
        } else {
            // console.log(`Server: Pause failed - room ${roomId} not found`);
        }
    });

    socket.on('resume-auction', (roomId) => {
        // console.log(`Server: Received resume-auction for room ${roomId} from socket ${socket.id}`);
        const room = rooms.get(roomId);
        if (room) {
            if (room.adminSocket === socket.id) {
                room.status = 'active';
                // If timer was at 0, reset it to give time for bids
                if (room.timeLeft <= 0) {
                    room.timeLeft = AUCTION_TIMER_SECONDS;
                }
                // console.log(`Server: Room ${roomId} status set to ACTIVE`);
                addActivity(roomId, { type: 'SYSTEM', message: 'AUCTION RESUMED BY ADMIN' });
                io.to(roomId).emit('room-update', room);
            } else {
                // console.log(`Server: Resume rejected - not admin. Admin: ${room.adminSocket}, Requester: ${socket.id}`);
            }
        } else {
            //  console.log(`Server: Resume failed - room ${roomId} not found`);
        }
    });

    socket.on('unsold-player', (roomId) => {
        const room = rooms.get(roomId);
        if (room && room.adminSocket === socket.id && !room.currentBid.bidder) {
            processPlayerSale(roomId);
        }
    });

    socket.on('sold-player', (roomId) => {
        const room = rooms.get(roomId);
        if (room && room.adminSocket === socket.id && room.currentBid.bidder) {
            processPlayerSale(roomId);
        }
    });

    socket.on('place-bid', ({ roomId, amount, bidder }) => {
        const room = rooms.get(roomId);
        if (room && room.status === 'active') {
            const currentAmount = room.currentBid.amount;
            const isValidAmount = room.currentBid.bidder === null ? amount >= currentAmount : amount > currentAmount;
            const hasBudget = (room.budgets[bidder] || 0) >= amount;

            // console.log(`Bid Attempt: Team ${bidder} bid ${amount} in room ${roomId}. Valid: ${isValidAmount}, HasBudget: ${hasBudget} (Budget: ${room.budgets[bidder]})`);

            if (isValidAmount && hasBudget) {
                room.currentBid = { amount, bidder };
                room.bids.push({ amount, bidder, time: new Date() });
                room.timeLeft = AUCTION_TIMER_SECONDS; // Reset timer on bid

                addActivity(roomId, {
                    type: 'BID',
                    bidder: bidder,
                    amount: amount,
                    message: `${bidder.toUpperCase()} PLACED A BID OF ₹${amount.toFixed(2)}Cr`
                });

                // Add bid commentary - randomly only sometimes to not spam history
                if (Math.random() > 0.5) {
                    addActivity(roomId, {
                        type: 'SYSTEM',
                        message: `Oops ${bidder} enters again 😅`
                    });
                }

                // Send a lightweight representation of the bids array (just the last few) to save bandwidth
                const lightweightBids = room.bids.slice(-5);
                io.to(roomId).emit('new-bid', { currentBid: room.currentBid, timeLeft: room.timeLeft, bids: lightweightBids });
                // console.log(`Bid Accepted: ${bidder} now leading with ${amount}`);
            } else {
                // console.log(`Bid Rejected: ${bidder} attempt of ${amount} failed. Reason: ${!isValidAmount ? 'Invalid Amount' : 'Insufficient Budget'}`);
            }
        } else {
            if (room) {
                // console.log(`Bid Ignored: Auction status is ${room.status} (Room ${roomId})`);
            } else {
                // console.log(`Bid Ignored: Room ${roomId} not found`);
            }
        }
    });

    socket.on('revert-bid', (roomId) => {
        const room = rooms.get(roomId);
        if (room && room.adminSocket === socket.id) {
            if (room.bids && room.bids.length > 0) {
                room.bids.pop(); // remove last bid
                const prevBid = room.bids.length > 0 ? room.bids[room.bids.length - 1] : null;
                if (prevBid) {
                    room.currentBid = { amount: prevBid.amount, bidder: prevBid.bidder };
                } else {
                    const currentPlayer = room.players[room.currentPlayerIndex];
                    room.currentBid = { amount: currentPlayer ? currentPlayer.basePrice : 0, bidder: null };
                }
                io.to(roomId).emit('room-update', room);
            }
        }
    });

    socket.on('reset-bid', (roomId) => {
        const room = rooms.get(roomId);
        if (room && room.adminSocket === socket.id) {
            room.bids = [];
            const currentPlayer = room.players[room.currentPlayerIndex];
            room.currentBid = { amount: currentPlayer ? currentPlayer.basePrice : 0, bidder: null };
            room.timeLeft = AUCTION_TIMER_SECONDS;
            io.to(roomId).emit('room-update', room);
        }
    });

    socket.on('set-increments', ({ roomId, increments }) => {
        const room = rooms.get(roomId);
        if (room && room.adminSocket === socket.id) {
            room.globalSettings.allowedIncrements = increments;
            io.to(roomId).emit('room-update', room);
        }
    });

    socket.on('send-message', ({ roomId, message, user }) => {
        io.to(roomId).emit('message', {
            user,
            content: message,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
    });

    socket.on('disconnect', () => {
        // console.log('User disconnected:', socket.id);

        // Basic cleanup: find if this socket was a team, but don't delete immediately to allow fast rejoins
        // We could implement a real timeout garbage collection here if needed for super high scales
        rooms.forEach((room, roomId) => {
            if (room.teamNames[socket.id]) {
                // console.log(`Socket ${socket.id} (Team: ${room.teamNames[socket.id]}) disconnected from room ${roomId}`);
            }
        });
    });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => console.log(`Auction Server running on port ${PORT}`));
