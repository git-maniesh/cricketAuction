import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import {
    Gavel,
    Trophy,
    Users,
    ShieldCheck,
    Send,
    Activity,
    MessageSquare,
    TrendingUp,
    Zap,
    Pause,
    Play,
    CheckCircle,
    Bell,
    Settings,
    Coins,
    Copy,
    Check,
    Plus,
    FileUp,
    Trash2,
    XCircle
} from 'lucide-react';
import PlayerDisplay from './PlayerDisplay';
import HammerEffects from './HammerEffects';
import confetti from 'canvas-confetti';

const AuctionDashboard = ({ roomId, user, socket, isAdmin, initialRoomState }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [activeTab, setActiveTab] = useState('marketplace');
    const [sidebarTab, setSidebarTab] = useState('activity');
    const [roomState, setRoomState] = useState(initialRoomState);
    const [selectedTeamForSquad, setSelectedTeamForSquad] = useState(null);
    const [adminNotify, setAdminNotify] = useState(null);
    const [showCopied, setShowCopied] = useState(false);
    const [showHammer, setShowHammer] = useState(false);
    const [hammerType, setHammerType] = useState('SOLD');
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const fileInputRef = React.useRef(null);
    const sidebarEndRef = React.useRef(null);
    const lastClosingTriggered = React.useRef(null);

    const formatPrice = (amount) => {
        if (amount >= 1) return `₹${amount.toFixed(2)} Cr`;
        return `₹${(amount * 100).toFixed(0)} L`;
    };

    const triggerEliteConfetti = () => {
        const duration = 5 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        const randomInRange = (min, max) => Math.random() * (max - min) + min;

        const interval = setInterval(function () {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);
            // since particles fall down, start a bit higher than random
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
        }, 250);
    };

    const copyRoomId = () => {
        navigator.clipboard.writeText(roomId);
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
    };

    useEffect(() => {
        if (!socket || !isAdmin) return;

        socket.on('admin-notification', (data) => {
            console.log('Admin Notification received:', data);
            setAdminNotify(data);
            // Auto hide after 5 seconds
            setTimeout(() => setAdminNotify(null), 5000);
        });

        return () => socket.off('admin-notification');
    }, [socket, isAdmin]);

    useEffect(() => {
        if (initialRoomState) setRoomState(initialRoomState);
    }, [initialRoomState]);

    useEffect(() => {
        socket.on('message', (msg) => {
            setMessages(prev => [...prev, msg].slice(-20));
            // FIXED: Only increment if not on chat tab
            setSidebarTab(currentTab => {
                if (currentTab !== 'chat') {
                    setUnreadMessages(prev => prev + 1);
                }
                return currentTab;
            });
        });

        socket.on('activity-update', (entry) => {
            console.log('Activity Update:', entry);
            if (entry.message === 'AUCTION STARTED') {
                setHammerType('OPEN');
                setShowHammer(true);
            }
        });

        socket.on('new-bid', (bid) => {
            setRoomState(prev => ({
                ...prev,
                currentBid: bid,
                timeLeft: 45
            }));
            // Clear selected team view if a bid happens to keep focus on live auction? 
            // Actually better to keep it unless user switches.
        });

        socket.on('room-update', (state) => {
            setRoomState(state);
        });

        socket.on('player-sold', ({ player, bidder, amount }) => {
            setShowHammer(true);
            triggerEliteConfetti();

            if (bidder === user.teamName) {
                // Secondary burst for the winner
                confetti({
                    particleCount: 200,
                    spread: 80,
                    origin: { y: 0.6 },
                    colors: ['#ea2a33', '#ffffff', '#000000']
                });
            }
        });

        socket.on('player-unsold', ({ player }) => {
            setHammerType('UNSOLD');
            setShowHammer(true);
        });

        return () => {
            socket.off('message');
            socket.off('activity-update');
            socket.off('new-bid');
            socket.off('room-update');
            socket.off('player-sold');
        };
    }, [socket, user.teamName]);

    // Monitor for 5s closing animation
    useEffect(() => {
        if (roomState?.status === 'active' && roomState?.timeLeft === 8) {
            const playerKey = roomState.players[roomState.currentPlayerIndex]?.name;
            if (lastClosingTriggered.current !== playerKey) {
                setHammerType('CLOSING');
                setShowHammer(true);
                lastClosingTriggered.current = playerKey;
            }
        }
        // Reset trigger ref if time moves back above 5 (e.g. on new bid)
        if (roomState?.timeLeft > 5) {
            lastClosingTriggered.current = null;
        }
    }, [roomState?.timeLeft, roomState?.status, roomState?.currentPlayerIndex, roomState?.players]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        socket.emit('send-message', { roomId, message: newMessage, user: user.name });
        setNewMessage('');
    };

    const handleHold = () => {
        if (!socket || !user.teamName) {
            console.warn('Hold failed: socket or teamName missing', { socket: !!socket, teamName: user.teamName });
            return;
        }
        console.log(`Emitting toggle-hold for ${user.teamName} in room ${roomId}`);
        socket.emit('toggle-hold', { roomId, teamName: user.teamName });
    };

    const scrollToBottom = () => {
        sidebarEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, roomState?.activity, sidebarTab]);

    const handleExcelUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const data = new Uint8Array(event.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            const newPlayers = jsonData.map(row => ({
                name: row.Name || row.name || 'Unknown',
                basePrice: parseFloat(row.Price || row.price || row.BasePrice || 0),
                ovr: parseInt(row.OVR || row.ovr || 80),
                position: row.Position || row.position || 'N/A',
                image: row.Image || row.image || `https://api.dicebear.com/7.x/initials/svg?seed=${row.Name || 'Player'}&backgroundColor=03001C`,
                badges: row.Badges ? row.Badges.split(',') : ["Mid-Auction Entry"],
                stats: [
                    { label: "VAL", value: parseInt(row.OVR || row.ovr || 80) }
                ]
            })).filter(p => p.name !== 'Unknown');

            if (newPlayers.length > 0) {
                socket.emit('update-players', { roomId, players: [...roomState.players, ...newPlayers] });
                alert(`Successfully injected ${newPlayers.length} players into the live roster!`);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleAddPlayer = () => {
        const name = document.getElementById('admin-player-name').value;
        const price = parseFloat(document.getElementById('admin-player-price').value);
        if (name && !isNaN(price)) {
            socket.emit('add-player', { roomId, player: { name, basePrice: price } });
            document.getElementById('admin-player-name').value = '';
            document.getElementById('admin-player-price').value = '';
        } else {
            alert('Please provide valid Name and Price');
        }
    };

    const handleBid = (amount) => {
        if (roomState?.status !== 'active') return alert('Auction is not active');
        socket.emit('place-bid', { roomId, amount, bidder: user.teamName });
    };

    const handleAdminAction = (action) => {
        socket.emit(action, roomId);
    };

    const currentPlayer = roomState?.players[roomState.currentPlayerIndex];
    const userSquad = roomState?.squads[user.teamName] || [];
    const userBudget = roomState?.budgets[user.teamName] || 0;

    return (
        <div className="flex flex-col h-screen w-full bg-[#080d09] overflow-hidden text-white font-display relative">
            <HammerEffects
                show={showHammer}
                type={hammerType}
                onComplete={() => {
                    setShowHammer(false);
                    setHammerType('SOLD'); // Reset to default
                }}
            />

            {/* ADMIN REJOIN NOTIFICATION */}
            <AnimatePresence>
                {isAdmin && adminNotify && (
                    <motion.div
                        initial={{ opacity: 0, y: -100, x: '-50%' }}
                        animate={{ opacity: 1, y: 20, x: '-50%' }}
                        exit={{ opacity: 0, y: -100, x: '-50%' }}
                        className="fixed top-0 left-1/2 z-[200] w-full max-w-md"
                    >
                        <div className="bg-primary/20 backdrop-blur-2xl border border-primary/40 p-6 rounded-3xl shadow-[0_0_50px_rgba(234,42,51,0.3)] flex items-center gap-6">
                            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
                                <Bell className="w-6 h-6 text-primary animate-bounce" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-black italic text-[10px] uppercase tracking-[0.3em] text-primary mb-1">Elite Alert</h3>
                                <p className="text-sm font-black italic text-white/90 uppercase">{adminNotify.message}</p>
                            </div>
                            <button onClick={() => setAdminNotify(null)} className="opacity-20 hover:opacity-100 transition-opacity">
                                <Zap className="w-4 h-4 rotate-45" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {roomState?.status === 'paused' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={`fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex flex-col items-center justify-center p-10 ${isAdmin ? '' : 'pointer-events-none'}`}
                    >
                        <motion.div
                            initial={{ scale: 0.8, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            className="bg-surface-dark/80 border border-yellow-500/30 p-12 rounded-[48px] flex flex-col items-center gap-8 shadow-[0_0_100px_rgba(234,179,8,0.15)] pointer-events-auto"
                        >
                            <div className="relative">
                                <div className="absolute inset-0 bg-yellow-500/20 rounded-full blur-3xl animate-pulse" />
                                <div className="w-24 h-24 bg-yellow-500/20 border border-yellow-500/50 rounded-full flex items-center justify-center relative z-10">
                                    <Pause className="w-12 h-12 text-yellow-500 animate-pulse" />
                                </div>
                            </div>
                            <div className="text-center">
                                <h1 className="text-5xl font-black italic tracking-tighter mb-2 uppercase">Auction Paused</h1>
                                <p className="text-yellow-500/60 font-black text-xs uppercase tracking-[0.4em]">Operational Standby • Admin Reviewing State</p>
                            </div>
                            <div className="flex flex-col items-center gap-6">
                                <div className="flex gap-4">
                                    <div className="px-6 py-2 rounded-full border border-white/5 bg-white/5 text-[10px] font-black uppercase tracking-widest opacity-40 italic">
                                        Market Frozen
                                    </div>
                                    <div className="px-6 py-2 rounded-full border border-white/5 bg-white/5 text-[10px] font-black uppercase tracking-widest opacity-40 italic">
                                        Timer Suspended
                                    </div>
                                </div>

                                {isAdmin && (
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => handleAdminAction('resume-auction')}
                                        className="mt-4 px-12 py-4 bg-green-500 text-black font-black uppercase italic rounded-2xl shadow-[0_20px_40px_rgba(34,197,94,0.3)] flex items-center gap-3 hover:bg-green-400 transition-all pointer-events-auto"
                                    >
                                        <Play className="w-5 h-5 fill-current" /> Resume Auction
                                    </motion.button>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <header className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b border-white/5 bg-black/40 backdrop-blur-2xl relative z-20">
                <div className="flex items-center gap-2 sm:gap-6">
                    <div className="flex items-center gap-2 sm:gap-3 text-primary">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
                            <Gavel className="w-4 h-4 sm:w-6 sm:h-6" />
                        </div>
                        <h2 className="hidden sm:block text-xl sm:text-2xl font-black italic tracking-tighter uppercase">Elite <span className="text-primary italic">Auction</span></h2>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4 bg-white/5 border border-white/10 px-2 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl">
                        <div className="flex flex-col">
                            <span className="text-[7px] sm:text-[8px] font-black opacity-30 uppercase tracking-[0.2em]">Room</span>
                            <span className="font-bold text-xs sm:text-sm text-primary tracking-widest">{roomId}</span>
                        </div>
                        <button
                            onClick={copyRoomId}
                            className="p-1.5 sm:p-2 hover:bg-primary/20 rounded-lg transition-all border border-white/5"
                            title="Copy Room ID"
                        >
                            {showCopied ? (
                                <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500" />
                            ) : (
                                <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4 opacity-40" />
                            )}
                        </button>
                    </div>

                    <div className="hidden md:flex items-center gap-2 sm:gap-4 bg-white/5 border border-white/10 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl">
                        <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                        <span className="text-[9px] sm:text-[10px] font-black opacity-40 uppercase tracking-widest">Budget</span>
                        <span className="font-bold text-xs sm:text-sm">{formatPrice(userBudget)}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-6">
                    <nav className="hidden lg:flex items-center gap-6">
                        {['Dashboard', 'Marketplace', 'Players', 'Squad', 'Rules', ...(isAdmin ? ['Manage'] : [])].map(item => (
                            <button
                                key={item}
                                onClick={() => setActiveTab(item.toLowerCase())}
                                className={`text-xs sm:text-sm font-bold transition-all uppercase tracking-widest ${activeTab === item.toLowerCase() ? 'text-primary opacity-100' : 'opacity-40 hover:opacity-100'}`}
                            >
                                {item}
                            </button>
                        ))}
                    </nav>
                    {/* Mobile Budget badge */}
                    <div className="flex md:hidden items-center gap-1.5 bg-white/5 border border-white/10 px-2.5 py-1.5 rounded-xl">
                        <Coins className="w-3 h-3 text-primary" />
                        <span className="font-bold text-[10px]">{formatPrice(userBudget)}</span>
                    </div>
                    <button className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-primary/10 transition-colors">
                        <Bell className="w-4 h-4 sm:w-5 sm:h-5 opacity-40" />
                    </button>
                </div>
            </header>

            {/* Mobile Bottom Tab Nav */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-black/80 backdrop-blur-xl border-t border-white/5 flex items-center justify-around px-1 py-2">
                {['Marketplace', 'Dashboard', 'Squad', 'Activity', 'Chat', ...(isAdmin ? ['Manage'] : [])].map(item => (
                    <button
                        key={item}
                        onClick={() => {
                            setActiveTab(item.toLowerCase());
                            if (item === 'Chat') setUnreadMessages(0);
                        }}
                        className={`flex flex-col items-center gap-0.5 px-1 py-1 rounded-xl transition-all relative ${activeTab === item.toLowerCase() ? 'text-primary' : 'text-white/30'}`}
                    >
                        {item === 'Marketplace' && <Gavel className="w-4 h-4" />}
                        {item === 'Dashboard' && <TrendingUp className="w-4 h-4" />}
                        {item === 'Squad' && <Users className="w-4 h-4" />}
                        {item === 'Activity' && <Activity className="w-4 h-4" />}
                        {item === 'Chat' && (
                            <span className="relative">
                                <MessageSquare className="w-4 h-4" />
                                {unreadMessages > 0 && item !== 'Chat' && (
                                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white text-[6px] font-black rounded-full flex items-center justify-center">{unreadMessages}</span>
                                )}
                            </span>
                        )}
                        {item === 'Manage' && <Settings className="w-4 h-4" />}
                        <span className="text-[7px] font-black uppercase tracking-wider">{item}</span>
                        {item === 'Chat' && unreadMessages > 0 && activeTab !== 'chat' && (
                            <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 text-white text-[6px] font-black rounded-full flex items-center justify-center border border-black">{unreadMessages}</span>
                        )}
                    </button>
                ))}
            </nav>

            <main className="flex flex-1 overflow-hidden">
                {/* Left Sidebar - Leaderboard */}
                <aside className="w-80 border-r border-white/5 bg-black/20 flex flex-col hidden xl:flex">
                    <div className="p-6 border-b border-white/5 flex items-center justify-between">
                        <h3 className="font-black text-[10px] tracking-[0.3em] opacity-40 uppercase italic">Leaderboard</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {roomState && Object.keys(roomState.budgets).map((teamName, idx) => {
                            const isUserTeam = teamName === user.teamName;
                            const budget = roomState.budgets[teamName] || 0;
                            const squadCount = roomState.squads[teamName]?.length || 0;
                            return (
                                <div key={idx} className={`p-4 rounded-2xl border transition-all ${isUserTeam ? 'bg-primary/5 border-primary/20' : 'bg-white/5 border-white/5 hover:border-white/10'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-sm font-bold tracking-tight">{teamName}</span>
                                        {isUserTeam && <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded font-black uppercase italic">Me</span>}
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] font-black opacity-40 uppercase tracking-widest">
                                        <span>{formatPrice(budget)}</span>
                                        <span>{squadCount} Players</span>
                                    </div>
                                    <div className="mt-3 w-full bg-white/5 h-1 rounded-full overflow-hidden">
                                        <div className={`h-full ${isUserTeam ? 'bg-primary' : 'bg-white/20'}`} style={{ width: `${Math.min(100, (budget / (roomState.globalSettings?.initialBudget || 100)) * 100)}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </aside>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col min-w-0 bg-transparent">
                    {/* Content Section */}
                    <section className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-6 lg:p-8 pb-20 lg:pb-8">
                        <div className="max-w-5xl mx-auto">
                            {/* Admin Controls Overlay */}
                            {isAdmin && (
                                <div className="flex flex-wrap items-center justify-between gap-3 mb-6 sm:mb-8 bg-white/5 border border-white/10 p-3 sm:p-4 rounded-[24px] sm:rounded-[32px] backdrop-blur-xl">
                                    <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-4">
                                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                        <span className="text-[10px] font-black uppercase tracking-widest opacity-40 text-primary">Admin Console</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {roomState?.status === 'active' ? (
                                            <button onClick={() => handleAdminAction('pause-auction')} className="p-2 sm:p-3 bg-yellow-500/20 text-yellow-400 rounded-xl sm:rounded-2xl hover:bg-yellow-500/30 transition-all border border-yellow-500/20 flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6">
                                                <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Pause</span>
                                            </button>
                                        ) : (
                                            <button onClick={() => handleAdminAction('resume-auction')} className="p-2 sm:p-3 bg-green-500/20 text-green-400 rounded-xl sm:rounded-2xl hover:bg-green-500/30 transition-all border border-green-500/20 flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6">
                                                <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Resume</span>
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleAdminAction('sold-player')}
                                            disabled={!roomState?.currentBid.bidder || roomState?.status === 'paused'}
                                            className="px-4 sm:px-8 py-2 sm:py-3 bg-primary text-white font-black text-[10px] sm:text-xs rounded-xl sm:rounded-2xl hover:bg-red-700 transition-all disabled:opacity-50 flex items-center gap-1.5 sm:gap-2 shadow-lg shadow-primary/20"
                                        >
                                            <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> SOLD
                                        </button>
                                        <button
                                            onClick={() => handleAdminAction('unsold-player')}
                                            disabled={roomState?.currentBid.bidder || roomState?.status === 'paused'}
                                            className="px-4 sm:px-8 py-2 sm:py-3 bg-gray-600 text-white font-black text-[10px] sm:text-xs rounded-xl sm:rounded-2xl hover:bg-gray-700 transition-all disabled:opacity-50 flex items-center gap-1.5 sm:gap-2 shadow-lg"
                                        >
                                            <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> UNSOLD
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'marketplace' && (currentPlayer ? (
                                <div className="space-y-8">
                                    <PlayerDisplay
                                        highestBid={roomState?.currentBid}
                                        onBid={handleBid}
                                        onHold={handleHold}
                                        holds={roomState?.holds || []}
                                        userTeam={user.teamName}
                                        timeLeft={roomState?.timeLeft || 0}
                                        player={currentPlayer}
                                        status={roomState?.status}
                                    />

                                    {/* Upcoming Players Card */}
                                    {roomState?.players.slice(roomState.currentPlayerIndex + 1, roomState.currentPlayerIndex + 4).length > 0 && (
                                        <div className="flex flex-col gap-4">
                                            <div className="flex items-center gap-3 px-2">
                                                <TrendingUp className="w-4 h-4 text-primary" />
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 italic">Next in Queue</h4>
                                            </div>
                                            <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
                                                {roomState.players.slice(roomState.currentPlayerIndex + 1, roomState.currentPlayerIndex + 4).map((p, idx) => (
                                                    <motion.div
                                                        key={`upcoming-${idx}`}
                                                        initial={{ opacity: 0, y: 20 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: idx * 0.1 }}
                                                        className="flex-shrink-0 w-64 p-4 rounded-3xl bg-white/5 border border-white/10 flex items-center gap-4 group hover:border-primary/40 transition-all backdrop-blur-sm"
                                                    >
                                                        <div className="w-12 h-16 rounded-xl bg-black/40 border border-white/10 overflow-hidden relative flex-shrink-0">
                                                            <img
                                                                src={p.image}
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => { e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${p.name}&backgroundColor=03001C`; }}
                                                            />
                                                            <div className="absolute top-0 left-0 bg-primary/20 text-primary text-[6px] px-1 font-black">+{idx + 1}</div>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h4 className="text-xs font-black uppercase tracking-tight leading-tight truncate group-hover:text-primary transition-colors">{p.name}</h4>
                                                            <p className="text-[10px] font-black italic opacity-40 mt-1">{formatPrice(p.basePrice)}</p>
                                                            <p className="text-[8px] font-bold opacity-20 uppercase mt-0.5">{p.position}</p>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-white/5 border border-white/10 p-20 rounded-[48px] text-center">
                                    <Trophy className="w-20 h-20 text-primary mx-auto mb-6" />
                                    <h2 className="text-4xl font-black italic uppercase">Auction Finished</h2>
                                    <p className="opacity-40 mt-4 uppercase tracking-[0.3em] font-bold">The hammer has fallen.</p>
                                </div>
                            ))}

                            {activeTab === 'dashboard' && (
                                <div className="space-y-10">
                                    <div className="flex justify-between items-center">
                                        <h2 className="text-4xl font-black italic uppercase italic">
                                            {selectedTeamForSquad ? `${selectedTeamForSquad}'s Squad` : 'Market Overview'}
                                        </h2>
                                        {selectedTeamForSquad && (
                                            <button
                                                onClick={() => setSelectedTeamForSquad(null)}
                                                className="px-6 py-2 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 hover:border-primary/40 transition-all italic"
                                            >
                                                ← Back to Overview
                                            </button>
                                        )}
                                    </div>

                                    {!selectedTeamForSquad ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                            {roomState && Object.keys(roomState.budgets).map(team => (
                                                <button
                                                    key={team}
                                                    onClick={() => setSelectedTeamForSquad(team)}
                                                    className="bg-white/5 border border-white/10 p-6 rounded-3xl text-left hover:border-primary/40 hover:bg-white/10 transition-all group relative overflow-hidden"
                                                >
                                                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Activity className="w-4 h-4 text-primary" />
                                                    </div>
                                                    <p className="font-black text-xs mb-4 uppercase tracking-tighter group-hover:text-primary transition-colors">{team}</p>
                                                    <p className="text-[10px] opacity-30 uppercase font-black mb-1">Balance</p>
                                                    <p className="text-2xl font-black italic text-primary">{formatPrice(roomState.budgets[team])}</p>
                                                    <div className="mt-4 flex items-center gap-2">
                                                        <div className="flex -space-x-2">
                                                            {(roomState.squads[team] || []).slice(0, 3).map((p, i) => (
                                                                <img
                                                                    key={i}
                                                                    src={p.image}
                                                                    className="w-6 h-6 rounded-full border border-black object-cover"
                                                                    onError={(e) => { e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${p.name}`; }}
                                                                />
                                                            ))}
                                                        </div>
                                                        <span className="text-[8px] font-black opacity-40 uppercase">
                                                            {(roomState.squads[team] || []).length} Players Secured
                                                        </span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {(roomState?.squads[selectedTeamForSquad] || []).map((p, i) => (
                                                <div key={i} className="bg-white/5 border border-white/10 p-6 rounded-[48px] flex items-center gap-8 group hover:border-primary/40 transition-all backdrop-blur-xl">
                                                    <img
                                                        src={p.image}
                                                        className="w-24 h-32 object-cover rounded-3xl border border-white/10"
                                                        onError={(e) => {
                                                            e.target.onerror = null;
                                                            e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${p.name}&backgroundColor=03001C`;
                                                        }}
                                                    />
                                                    <div className="flex-1">
                                                        <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.3em] mb-1">Elite Personnel</p>
                                                        <h3 className="text-2xl font-black italic uppercase tracking-tighter">{p.name}</h3>
                                                        <div className="mt-6 flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
                                                            <span className="text-[8px] font-black opacity-30 uppercase">Fee</span>
                                                            <span className="text-xl font-black text-primary italic">{formatPrice(p.boughtPrice)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {(roomState?.squads[selectedTeamForSquad] || []).length === 0 && (
                                                <div className="col-span-2 text-center py-32 rounded-[48px] border-2 border-dashed border-white/5">
                                                    <div className="opacity-10 italic font-black uppercase tracking-[0.5em] text-4xl">Roster Empty</div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'players' && (
                                <div className="space-y-10">
                                    <h2 className="text-4xl font-black italic uppercase italic">Player Registry</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {roomState?.players.map((p, i) => {
                                            const isCurrent = i === roomState.currentPlayerIndex;
                                            const isSold = Object.values(roomState.squads).some(s => s.some(sp => sp.name === p.name));
                                            return (
                                                <div key={i} className={`p-6 rounded-[32px] border transition-all ${isCurrent ? 'bg-primary/10 border-primary/40 shadow-lg shadow-primary/10' : isSold ? 'bg-green-500/5 border-green-500/20' : 'bg-white/5 border-white/5'}`}>
                                                    <div className="flex gap-4 items-center">
                                                        <img
                                                            src={p.image}
                                                            className="w-16 h-20 object-cover rounded-xl border border-white/10"
                                                            onError={(e) => {
                                                                e.target.onerror = null;
                                                                e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${p.name}&backgroundColor=03001C`;
                                                            }}
                                                        />
                                                        <div>
                                                            <h3 className="font-black italic text-lg uppercase tracking-tight">{p.name}</h3>
                                                            <p className="text-[10px] opacity-40 font-bold uppercase">{p.position} • {p.ovr} OVR</p>
                                                            {isSold && <p className="text-[10px] text-green-400 font-black mt-2 italic uppercase">Secured</p>}
                                                            {isCurrent && <p className="text-[10px] text-primary font-black mt-2 italic uppercase animate-pulse">Live Now</p>}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'squad' && (
                                <div className="space-y-10">
                                    <h2 className="text-4xl font-black italic uppercase italic">Your Acquisitions</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {userSquad.map((p, i) => (
                                            <div key={i} className="bg-white/5 border border-white/10 p-6 rounded-[48px] flex items-center gap-8 group hover:border-primary/40 transition-all backdrop-blur-xl">
                                                <img
                                                    src={p.image}
                                                    className="w-24 h-32 object-cover rounded-3xl border border-white/10"
                                                    onError={(e) => {
                                                        e.target.onerror = null;
                                                        e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${p.name}&backgroundColor=03001C`;
                                                    }}
                                                />
                                                <div className="flex-1">
                                                    <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.3em] mb-1">Elite Personnel</p>
                                                    <h3 className="text-2xl font-black italic uppercase tracking-tighter">{p.name}</h3>
                                                    <div className="mt-6 flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
                                                        <span className="text-[8px] font-black opacity-30 uppercase">Fee</span>
                                                        <span className="text-xl font-black text-primary italic">{formatPrice(p.boughtPrice)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {userSquad.length === 0 && (
                                            <div className="col-span-2 text-center py-32 rounded-[48px] border-2 border-dashed border-white/5">
                                                <div className="opacity-10 italic font-black uppercase tracking-[0.5em] text-4xl">Hangar Empty</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'rules' && (
                                <div className="max-w-2xl mx-auto space-y-10">
                                    <h2 className="text-4xl font-black italic uppercase italic">Operating Protocol</h2>
                                    <div className="p-10 bg-white/5 border border-white/10 rounded-[48px] backdrop-blur-3xl">
                                        <div className="space-y-8">
                                            {[
                                                { title: "Financial Constraints", text: `Each team operates within a ${formatPrice(roomState?.globalSettings.initialBudget || 100)} starting budget. Minimum bid increments are set at ${formatPrice(0.25)}.` },
                                                { title: "Chronological Reset", text: "The countdown resets to 45 seconds upon any validated bid interaction." },
                                                { title: "Final Authority", text: "Auction Administrators hold absolute power over the 'SOLD' authorization signature." }
                                            ].map((rule, i) => (
                                                <div key={i} className="flex gap-6">
                                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-black text-xs">{i + 1}</div>
                                                    <div>
                                                        <h4 className="font-black italic uppercase tracking-tighter mb-2">{rule.title}</h4>
                                                        <p className="text-sm font-medium text-white/40 leading-relaxed">{rule.text}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'manage' && isAdmin && (
                                <div className="space-y-10">
                                    <h2 className="text-4xl font-black italic uppercase italic">Roster Management</h2>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                        {/* Individual Entry */}
                                        <div className="p-10 bg-white/5 border border-white/10 rounded-[48px] backdrop-blur-3xl space-y-8">
                                            <div>
                                                <h3 className="text-xl font-black italic uppercase tracking-widest mb-2 flex items-center gap-3">
                                                    <Plus className="w-5 h-5 text-primary" /> Manual Entry
                                                </h3>
                                                <p className="text-xs text-white/40 uppercase tracking-widest font-bold">Inject a single asset</p>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 px-2">Identity</label>
                                                    <input
                                                        id="admin-player-name"
                                                        placeholder="Name of the player"
                                                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm outline-none focus:border-primary transition-all font-bold"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 px-2">Reserve Price (Cr)</label>
                                                    <input
                                                        id="admin-player-price"
                                                        type="number"
                                                        step="0.25"
                                                        placeholder="Base price in Crores"
                                                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm outline-none focus:border-primary transition-all font-bold"
                                                    />
                                                </div>
                                                <button
                                                    onClick={handleAddPlayer}
                                                    className="w-full bg-primary hover:bg-red-700 text-white py-6 rounded-3xl font-black tracking-widest uppercase transition-all shadow-xl hover:shadow-primary/30 mt-4"
                                                >
                                                    Incorporate Asset
                                                </button>
                                            </div>
                                        </div>

                                        {/* Bulk Import */}
                                        <div className="p-10 bg-white/5 border border-white/10 rounded-[48px] backdrop-blur-3xl flex flex-col justify-between">
                                            <div>
                                                <h3 className="text-xl font-black italic uppercase tracking-widest mb-2 flex items-center gap-3">
                                                    <FileUp className="w-5 h-5 text-primary" /> Bulk Deployment
                                                </h3>
                                                <p className="text-xs text-white/40 uppercase tracking-widest font-bold">Upload Excel Registry (.xlsx)</p>
                                            </div>

                                            <div className="mt-10 p-8 border-2 border-dashed border-white/10 rounded-[32px] flex flex-col items-center justify-center gap-6 group hover:border-primary/40 transition-all">
                                                <FileUp className="w-12 h-12 opacity-20 group-hover:text-primary group-hover:opacity-100 transition-all" />
                                                <div className="text-center">
                                                    <input
                                                        type="file"
                                                        ref={fileInputRef}
                                                        onChange={handleExcelUpload}
                                                        accept=".xlsx, .xls"
                                                        className="hidden"
                                                    />
                                                    <button
                                                        onClick={() => fileInputRef.current?.click()}
                                                        className="bg-white/5 border border-white/10 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-primary hover:text-white transition-all"
                                                    >
                                                        Select Spreadsheet
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Unauctioned Roster */}
                                    <div className="p-10 bg-white/5 border border-white/10 rounded-[48px] backdrop-blur-3xl">
                                        <div className="flex justify-between items-center mb-8">
                                            <div>
                                                <h3 className="text-xl font-black italic uppercase tracking-widest">Pending Roster</h3>
                                                <p className="text-xs text-white/40 uppercase tracking-widest font-bold">Manage assets awaiting sequence</p>
                                            </div>
                                            <span className="bg-primary/20 text-primary border border-primary/4px px-6 py-2 rounded-full font-black text-[10px] uppercase italic">
                                                {roomState?.players.length - (roomState?.currentPlayerIndex + 1) > 0 ? roomState.players.length - (roomState.currentPlayerIndex + 1) : 0} Remaining
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                                            {roomState?.players.map((p, i) => {
                                                if (i <= roomState.currentPlayerIndex) return null;
                                                return (
                                                    <div key={i} className="p-5 rounded-3xl bg-black/40 border border-white/5 flex justify-between items-center group">
                                                        <div className="flex gap-4 items-center">
                                                            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center font-black italic text-primary">{i + 1}</div>
                                                            <div>
                                                                <p className="font-bold text-sm leading-tight">{p.name}</p>
                                                                <p className="text-[10px] font-black italic text-primary">{formatPrice(p.basePrice)}</p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => socket.emit('remove-player', { roomId, playerIndex: i })}
                                                            className="p-3 opacity-0 group-hover:opacity-100 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 transition-all hover:text-white"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                            {roomState?.players.length <= roomState?.currentPlayerIndex + 1 && (
                                                <div className="col-span-full py-20 text-center opacity-20 font-black uppercase tracking-widest italic">
                                                    No assets queued
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                </div>

                {/* Mobile-only Activity/Chat panel */}
                {(activeTab === 'activity' || activeTab === 'chat') && (
                    <div className="lg:hidden fixed inset-0 top-[57px] bottom-[56px] z-20 bg-[#080d09] flex flex-col overflow-hidden">
                        <div className="p-3 border-b border-white/5 bg-black/60">
                            <div className="flex p-1 bg-black/60 rounded-xl border border-white/5">
                                <button
                                    onClick={() => setActiveTab('activity')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'activity' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-white/40 hover:text-white'}`}
                                >
                                    <Activity className="w-3 h-3" /> Activity
                                </button>
                                <button
                                    onClick={() => { setActiveTab('chat'); setUnreadMessages(0); }}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'chat' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-white/40 hover:text-white'}`}
                                >
                                    <MessageSquare className="w-3 h-3" /> Chat
                                    {unreadMessages > 0 && activeTab !== 'chat' && (
                                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[7px] font-black rounded-full flex items-center justify-center border border-black">{unreadMessages}</span>
                                    )}
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            <AnimatePresence mode="popLayout">
                                {activeTab === 'activity' ? (
                                    <div className="space-y-3">
                                        {(roomState?.activity || []).map((entry, i) => (
                                            <motion.div
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                key={entry.id || i}
                                                className={`p-3 rounded-xl border transition-all ${entry.type === 'SOLD' ? 'bg-green-500/10 border-green-500/30' :
                                                        entry.type === 'SYSTEM' ? 'bg-primary/5 border-primary/20' :
                                                            'bg-white/5 border-white/5'
                                                    }`}
                                            >
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className={`text-[8px] font-black uppercase ${entry.type === 'SOLD' ? 'text-green-400' : 'opacity-40'}`}>{entry.type}</span>
                                                    <span className="text-[8px] opacity-20">{entry.time}</span>
                                                </div>
                                                <p className={`text-xs font-bold uppercase tracking-tight ${entry.type === 'SOLD' ? 'text-white' : 'text-white/70'}`}>{entry.message}</p>
                                                {entry.type === 'SOLD' && (
                                                    <div className="mt-2 pt-2 border-t border-green-500/10 flex justify-between items-center">
                                                        <span className="text-[9px] font-black italic text-green-400 uppercase">{entry.bidder}</span>
                                                        <span className="text-xs font-black text-primary italic">{formatPrice(entry.amount)}</span>
                                                    </div>
                                                )}
                                                {entry.type === 'BID' && (
                                                    <div className="mt-1.5 flex justify-between items-center bg-white/5 p-1.5 rounded-lg border border-white/5">
                                                        <span className="text-[9px] font-black text-primary uppercase italic">{entry.bidder}</span>
                                                        <span className="text-[10px] font-black text-white italic">{formatPrice(entry.amount)}</span>
                                                    </div>
                                                )}
                                            </motion.div>
                                        ))}
                                        {(!roomState?.activity || roomState.activity.length === 0) && (
                                            <div className="py-20 text-center opacity-20 font-black uppercase tracking-widest text-xs italic">No Activity Yet</div>
                                        )}
                                        <div ref={sidebarEndRef} />
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {messages.map((m, i) => (
                                            <div key={i} className={`flex flex-col ${m.user === user.name ? 'items-end' : 'items-start'}`}>
                                                <div className={`p-3 rounded-xl text-[11px] max-w-[90%] leading-relaxed ${m.user === user.name ? 'bg-primary/20 border border-primary/20 rounded-br-none' : 'bg-white/5 border border-white/5 rounded-bl-none'}`}>
                                                    <p className="font-black text-[9px] opacity-30 uppercase mb-1 tracking-widest">{m.user}</p>
                                                    <p className="font-medium">{m.content}</p>
                                                </div>
                                            </div>
                                        ))}
                                        {messages.length === 0 && <div className="py-20 text-center opacity-10 font-black uppercase tracking-widest text-xs italic">Frequency Quiet</div>}
                                        <div ref={sidebarEndRef} />
                                    </div>
                                )}
                            </AnimatePresence>
                        </div>
                        {activeTab === 'chat' && (
                            <div className="p-3 border-t border-white/5 bg-black/60">
                                <form onSubmit={handleSendMessage} className="relative">
                                    <input
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-primary transition-all placeholder:opacity-20 font-bold pr-10"
                                        placeholder="Broadcast tactical message..."
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                    />
                                    <button className="absolute right-2.5 top-2.5 p-1 text-primary hover:scale-110 transition-transform">
                                        <Send className="w-4 h-4" />
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                )}

                {/* Right Sidebar - Activity/Chat (desktop only) */}
                <aside className="w-80 xl:w-96 border-l border-white/5 bg-black/40 flex-col hidden lg:flex">
                    <div className="p-4 border-b border-white/5">
                        <div className="flex p-1 bg-black/60 rounded-xl border border-white/5">
                            <button
                                onClick={() => setSidebarTab('activity')}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${sidebarTab === 'activity' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-white/40 hover:text-white'}`}
                            >
                                <Activity className="w-3 h-3" /> Activity
                            </button>
                            <button
                                onClick={() => {
                                    setSidebarTab('chat');
                                    setUnreadMessages(0);
                                }}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all relative ${sidebarTab === 'chat' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-white/40 hover:text-white'}`}
                            >
                                <MessageSquare className="w-3 h-3" /> Chat
                                {unreadMessages > 0 && sidebarTab !== 'chat' && (
                                    <motion.span
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-black animate-pulse"
                                    >
                                        {unreadMessages}
                                    </motion.span>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                        <AnimatePresence mode="popLayout">
                            {sidebarTab === 'activity' ? (
                                <div className="space-y-4">
                                    {(roomState?.activity || []).map((entry, i) => (
                                        <motion.div
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            key={entry.id || i}
                                            className={`p-4 rounded-2xl border transition-all ${entry.type === 'SOLD' ? 'bg-green-500/10 border-green-500/30' :
                                                entry.type === 'SYSTEM' ? 'bg-primary/5 border-primary/20' :
                                                    'bg-white/5 border-white/5'
                                                }`}
                                        >
                                            <div className="flex justify-between items-center mb-1">
                                                <span className={`text-[8px] font-black uppercase ${entry.type === 'SOLD' ? 'text-green-400' : 'opacity-40'}`}>{entry.type}</span>
                                                <span className="text-[8px] opacity-20">{entry.time}</span>
                                            </div>
                                            <p className={`text-xs font-bold uppercase tracking-tight ${entry.type === 'SOLD' ? 'text-white' : 'text-white/70'}`}>{entry.message}</p>
                                            {entry.type === 'SOLD' && (
                                                <div className="mt-3 pt-3 border-t border-green-500/10 flex justify-between items-center">
                                                    <div className="flex flex-col">
                                                        <span className="text-[8px] font-black opacity-30 uppercase tracking-widest">Acquired By</span>
                                                        <span className="text-[10px] font-black italic text-green-400 uppercase">{entry.bidder}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-[8px] font-black opacity-30 uppercase tracking-widest">Final Fee</span>
                                                        <p className="text-sm font-black text-primary italic leading-none">{formatPrice(entry.amount)}</p>
                                                    </div>
                                                </div>
                                            )}
                                            {entry.type === 'BID' && (
                                                <div className="mt-2 flex justify-between items-center bg-white/5 p-2 rounded-xl border border-white/5">
                                                    <span className="text-[9px] font-black text-primary uppercase italic">{entry.bidder}</span>
                                                    <span className="text-xs font-black text-white italic">{formatPrice(entry.amount)}</span>
                                                </div>
                                            )}
                                            {entry.type !== 'SOLD' && entry.type !== 'BID' && entry.amount && <p className="text-sm font-black text-primary mt-1 italic">{formatPrice(entry.amount)}</p>}
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {messages.map((m, i) => (
                                        <div key={i} className={`flex flex-col ${m.user === user.name ? 'items-end' : 'items-start'}`}>
                                            <div className={`p-4 rounded-2xl text-[11px] max-w-[90%] leading-relaxed ${m.user === user.name ? 'bg-primary/20 border border-primary/20 rounded-br-none' : 'bg-white/5 border border-white/5 rounded-bl-none'}`}>
                                                <p className="font-black text-[9px] opacity-30 uppercase mb-2 tracking-widest">{m.user}</p>
                                                <p className="font-medium">{m.content}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {messages.length === 0 && <div className="py-20 text-center opacity-10 font-black uppercase tracking-widest text-xs italic">Frequency Quiet</div>}
                                </div>
                            )}
                            <div ref={sidebarEndRef} />
                        </AnimatePresence>
                    </div>

                    <div className="p-6 border-t border-white/5 bg-black/40">
                        <form onSubmit={handleSendMessage} className="relative">
                            <input
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs outline-none focus:border-primary transition-all placeholder:opacity-20 font-bold"
                                placeholder="Broadcast tactical message..."
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                            />
                            <button className="absolute right-3 top-3 p-1.5 text-primary hover:scale-110 transition-transform">
                                <Send className="w-5 h-5 shadow-glow" />
                            </button>
                        </form>
                    </div>
                </aside>
            </main>

            <footer className="px-6 py-2 bg-black border-t border-white/5 flex justify-between text-[8px] font-black opacity-30 uppercase tracking-[0.4em]">
                <div className="flex gap-8">
                    <span>Room Protocol: {roomId}</span>
                    <span className="text-green-500 italic">Sync Active</span>
                </div>
                <span className="text-primary italic">Live Engine 4.2.1</span>
            </footer>
        </div>
    );
};

export default AuctionDashboard;
