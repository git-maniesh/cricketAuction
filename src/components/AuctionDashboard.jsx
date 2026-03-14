import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { animate as anime } from 'animejs';
import {
    Gavel, Trophy, Users, ShieldCheck, Send, Activity,
    MessageSquare, TrendingUp, Zap, Pause, Play,
    CheckCircle, Bell, Settings, Coins, Copy,
    Plus, FileUp, Trash2, XCircle, LogOut, Sparkles,
    BarChart3, Edit, Save, X, ArrowRightLeft
} from 'lucide-react';
import PlayerDisplay from './PlayerDisplay';
import HammerEffects from './HammerEffects';
import AIAnalysis from './AIAnalysis';
import confetti from 'canvas-confetti';

// ─── High-Performance Virtualized Components ──────────────────
const TeamLeaderboard = React.memo(({ budgets, squads, userTeam, formatPrice }) => (
    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {Object.keys(budgets || {}).sort((a, b) => budgets[b] - budgets[a]).map((team) => (
            <div key={team} className={`p-4 rounded-2xl border transition-all duration-300 ${team === userTeam ? 'bg-primary/5 border-primary/20 scale-[1.02]' : 'bg-white/5 border-white/5'}`}>
                <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-black uppercase tracking-tight truncate max-w-[120px]">{team}</span>
                    <span className="text-[10px] font-black text-primary italic">{formatPrice(budgets[team])}</span>
                </div>
                <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(10, squads[team]?.length || 0) }).map((_, i) => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                    ))}
                    <span className="text-[8px] font-bold opacity-20 ml-auto uppercase">{(squads[team] || []).length} Units</span>
                </div>
            </div>
        ))}
    </div>
));

const ActivityLog = React.memo(({ activity, scrollRef }) => (
    <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
        {activity?.length === 0 && <div className="py-20 text-center opacity-10 font-black uppercase text-[8px] tracking-[0.4em]">Listening for signals...</div>}
        {activity?.map((entry) => (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} key={entry.id} className="flex gap-4">
                <div className="flex flex-col items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${entry.type === 'BID' ? 'bg-primary shadow-[0_0_8px_rgba(234,42,51,0.5)]' : entry.type === 'SOLD' ? 'bg-green-500' : 'bg-white/20'}`} />
                    <div className="flex-1 w-[1px] bg-white/5" />
                </div>
                <div className="pb-1">
                    <div className="flex items-center gap-3 mb-1">
                        <span className="text-[7px] font-black opacity-20">{entry.time}</span>
                        <span className={`text-[7px] font-black uppercase tracking-widest ${entry.type === 'BID' ? 'text-primary' : entry.type === 'SOLD' ? 'text-green-500' : 'opacity-40'}`}>{entry.type}</span>
                    </div>
                    <p className="text-[10px] font-bold leading-relaxed tracking-tight text-white/70 uppercase">
                        {entry.message}
                    </p>
                </div>
            </motion.div>
        ))}
        <div ref={scrollRef} />
    </div>
));

const ChatMessages = React.memo(({ messages, sidebarEndRef }) => (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {messages.map((m, i) => (
            <div key={i} className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <span className="text-[9px] font-black uppercase tracking-widest text-primary">{m.user}</span>
                    <div className="h-[1px] flex-1 bg-white/5" />
                </div>
                <div className="bg-white/5 border border-white/5 p-4 rounded-2xl rounded-tl-none">
                    <p className="font-medium text-xs leading-relaxed">{m.content}</p>
                </div>
            </div>
        ))}
        <div ref={sidebarEndRef} />
    </div>
));

const AuctionDashboard = ({ roomId, user, socket, isAdmin, roomState, onExit }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [activeTab, setActiveTab] = useState('marketplace'); // marketplace, dashboard, players, squad, rules, ai, manage
    const [sidebarTab, setSidebarTab] = useState('activity');
    const [selectedTeamForSquad, setSelectedTeamForSquad] = useState(null);
    const [adminNotify, setAdminNotify] = useState(null);
    const [showCopied, setShowCopied] = useState(false);
    const [showHammer, setShowHammer] = useState(false);
    const [hammerType, setHammerType] = useState('SOLD');
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [editingPlayer, setEditingPlayer] = useState(null); // { team, index, name, price }
    const [transferringPlayer, setTransferringPlayer] = useState(null); // { team, index }
    const [notification, setNotification] = useState(null);
    const fileInputRef = useRef(null);
    const sidebarEndRef = useRef(null);
    const logEndRef = useRef(null);
    const lastClosingTriggered = useRef(null);
    const sidebarTabRef = useRef(sidebarTab);

    // Auto-scroll chat
    useEffect(() => {
        if (sidebarTab === 'chat' || activeTab === 'chat') {
            setTimeout(() => sidebarEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
    }, [messages, sidebarTab, activeTab]);

    // Auto-scroll activity log
    useEffect(() => {
        if (sidebarTab === 'activity' || activeTab === 'marketplace') {
            logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [roomState?.activity]);

    const formatPrice = (amount) => {
        if (typeof amount !== 'number') return '₹0 Cr';
        if (amount >= 1) return `₹${amount.toFixed(2)} Cr`;
        return `₹${(amount * 100).toFixed(0)} L`;
    };

    const triggerEliteConfetti = () => {
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
        const randomInRange = (min, max) => Math.random() * (max - min) + min;

        const interval = setInterval(function () {
            const timeLeft = animationEnd - Date.now();
            if (timeLeft <= 0) return clearInterval(interval);
            const particleCount = 50 * (timeLeft / duration);
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
        }, 250);
    };

    const showNotification = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 4000);
    };

    const copyRoomId = () => {
        navigator.clipboard.writeText(roomId);
        setShowCopied(true);
        showNotification('Room ID copied!');
        setTimeout(() => setShowCopied(false), 2000);
    };

    // Socket listeners for TRANSIENT / COSMETIC events only
    useEffect(() => {
        if (!socket) return;

        socket.on('admin-notification', (data) => {
            setAdminNotify(data);
            setTimeout(() => setAdminNotify(null), 5000);
        });

        socket.on('message', (msg) => {
            setMessages(prev => [...prev, msg].slice(-100));
            if (sidebarTabRef.current !== 'chat') setUnreadMessages(prev => prev + 1);
        });

        socket.on('player-sold', () => {
            setHammerType('SOLD');
            setShowHammer(true);
            triggerEliteConfetti();
        });

        socket.on('player-unsold', () => {
            setHammerType('UNSOLD');
            setShowHammer(true);
        });

        socket.on('auction-started', () => {
            setHammerType('OPEN');
            setShowHammer(true);
        });

        return () => {
            socket.off('admin-notification');
            socket.off('message');
            socket.off('player-sold');
            socket.off('player-unsold');
            socket.off('auction-started');
        };
    }, [socket]);

    // Timer monitoring for "Closing" hammer
    useEffect(() => {
        if (roomState?.status === 'active' && (roomState?.timeLeft || 0) <= 8 && (roomState?.timeLeft || 0) > 0) {
            const playerKey = roomState?.players?.[roomState?.currentPlayerIndex]?.name;
            if (playerKey && lastClosingTriggered.current !== playerKey && roomState.currentBid?.bidder) {
                setHammerType('CLOSING');
                setShowHammer(true);
                lastClosingTriggered.current = playerKey;
            }
        }
        if ((roomState?.timeLeft || 0) > 8) lastClosingTriggered.current = null;
    }, [roomState?.timeLeft, roomState?.status]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        socket.emit('send-message', { roomId, message: newMessage, user: user.name });
        setNewMessage('');
    };

    const handleHold = () => {
        socket.emit('toggle-hold', { roomId, teamName: user.teamName });
    };

    const handleBid = (amount) => {
        if (roomState?.status !== 'active') return showNotification('Auction is paused', 'error');
        socket.emit('place-bid', { roomId, amount, bidder: user.teamName });
    };

    const handleAdminAction = (action) => socket.emit(action, roomId);

    if (!roomState) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-[#080d09] text-white">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Calibrating Marketplace...</p>
            </div>
        );
    }

    const currentPlayer = (roomState?.players && roomState.currentPlayerIndex !== undefined)
        ? roomState.players[roomState.currentPlayerIndex]
        : null;
    const userSquad = roomState?.squads?.[user.teamName] || [];
    const userBudget = roomState?.budgets?.[user.teamName] || 0;

    return (
        <div className="flex flex-col h-screen w-full bg-[#080d09] overflow-hidden text-white font-display selection:bg-primary/30">
            <HammerEffects show={showHammer} type={hammerType} onComplete={() => setShowHammer(false)} />

            {/* Notifications */}
            <AnimatePresence>
                {notification && (
                    <motion.div initial={{ opacity: 0, y: -20, x: '-50%' }} animate={{ opacity: 1, y: 20, x: '-50%' }} exit={{ opacity: 0, y: -20, x: '-50%' }}
                        className="fixed top-0 left-1/2 z-[100] px-6 py-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 flex items-center gap-3 shadow-2xl">
                        <span className="text-xs font-black uppercase tracking-widest">{notification.message}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/5 bg-black/40 backdrop-blur-2xl z-20">
                <div className="flex items-center gap-4 sm:gap-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
                            <Gavel className="w-6 h-6 text-primary" />
                        </div>
                        <h2 className="hidden sm:block text-2xl font-black italic tracking-tighter uppercase">Elite <span className="text-primary italic">Auction</span></h2>
                    </div>

                    <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-3 py-1.5 rounded-2xl">
                        <div className="flex flex-col">
                            <span className="text-[7px] font-black opacity-30 uppercase tracking-[0.2em]">{socket?.connected ? 'Live' : 'Disconnected'}</span>
                            <span className="font-bold text-xs text-primary tracking-widest">{roomId}</span>
                        </div>
                        <button onClick={copyRoomId} className="p-1.5 hover:bg-primary/20 rounded-lg transition-all">
                            {showCopied ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 opacity-40" />}
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-6">
                    <div className="hidden md:flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-2xl">
                        <Coins className="w-4 h-4 text-primary" />
                        <span className="text-[10px] font-black opacity-40 uppercase tracking-widest">Cap</span>
                        <span className="font-bold text-sm tracking-tight">{formatPrice(userBudget)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button onClick={() => setActiveTab('ai')} className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl transition-all border ${activeTab === 'ai' ? 'bg-primary text-white border-primary' : 'bg-white/5 border-white/10 hover:bg-white/10 text-white/60'}`}>
                            <Sparkles className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">AI Analysis</span>
                        </button>
                        <button onClick={onExit} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-red-500/10 hover:text-red-500 transition-all">
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex flex-1 overflow-hidden relative">
                {/* Left Drawer - Stats */}
                <aside className="w-80 border-r border-white/5 bg-black/20 hidden xl:flex flex-col">
                    <div className="p-6 border-b border-white/5 flex items-center justify-between">
                        <h3 className="font-black text-[10px] tracking-[0.3em] opacity-40 uppercase italic">Leaderboard</h3>
                        <Activity className="w-4 h-4 opacity-20" />
                    </div>
                    <TeamLeaderboard
                        budgets={roomState?.budgets}
                        squads={roomState?.squads}
                        userTeam={user.teamName}
                        formatPrice={formatPrice}
                    />
                </aside>

                {/* Main Engine */}
                <div className="flex-1 flex flex-col min-w-0 bg-transparent relative">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(234,42,51,0.03),transparent)] pointer-events-none" />

                    {/* Navigation Tabs (Mobile/Tablet Friendly) */}
                    <div className="flex items-center gap-1 p-2 bg-black/40 border-b border-white/5 overflow-x-auto no-scrollbar">
                        {['Marketplace', 'Dashboard', 'Players', 'Squad', 'Rules', ...(isAdmin ? ['Manage'] : [])].map(tab => (
                            <button key={tab} onClick={() => setActiveTab(tab.toLowerCase())}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.toLowerCase() ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-white/40 hover:text-white hover:bg-white/5'}`}>
                                {tab}
                            </button>
                        ))}
                        <button onClick={() => setActiveTab('ai')} className={`sm:hidden px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'ai' ? 'bg-primary text-white' : 'text-white/40'}`}>
                            AI View
                        </button>
                    </div>

                    <section className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-8">
                        <div className="max-w-6xl mx-auto">

                            {activeTab === 'marketplace' && (
                                <div className="space-y-8">
                                    {isAdmin && (
                                        <div className="bg-white/5 border border-white/5 p-4 rounded-3xl flex flex-wrap gap-4 items-center justify-between backdrop-blur-xl">
                                            <div className="flex gap-2">
                                                <button onClick={() => handleAdminAction(roomState?.status === 'active' ? 'pause-auction' : 'resume-auction')} className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all">
                                                    {roomState?.status === 'active' ? <Pause className="w-4 h-4 text-yellow-500" /> : <Play className="w-4 h-4 text-green-500" />}
                                                </button>
                                                <button onClick={() => handleAdminAction('revert-bid')} className="px-4 py-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 text-[10px] font-black uppercase tracking-widest">Undo Bid</button>
                                            </div>
                                            <div className="flex gap-3">
                                                <button onClick={() => handleAdminAction('unsold-player')} className="px-6 py-3 bg-white/5 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 transition-all">Unsold</button>
                                                <button onClick={() => handleAdminAction('sold-player')} className="px-8 py-3 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">Execute Sale</button>
                                            </div>
                                        </div>
                                    )}

                                    {currentPlayer ? (
                                        <PlayerDisplay
                                            highestBid={roomState?.currentBid}
                                            onBid={handleBid}
                                            onHold={handleHold}
                                            holds={roomState?.holds || []}
                                            userTeam={user.teamName}
                                            timeLeft={roomState?.timeLeft || 0}
                                            player={currentPlayer}
                                            status={roomState?.status}
                                            timerStarted={roomState?.timerStarted}
                                            globalSettings={roomState?.globalSettings}
                                        />
                                    ) : (
                                        <div className="py-20 text-center bg-white/5 rounded-[48px] border-2 border-dashed border-white/10">
                                            <Trophy className="w-16 h-16 text-primary mx-auto mb-4 opacity-20" />
                                            <h2 className="text-3xl font-black italic uppercase italic tracking-tighter">Arena Cleared</h2>
                                            <p className="text-[10px] font-black opacity-30 mt-2 uppercase tracking-[0.3em]">The final hammer has fallen. Analyze squads to predict the champion.</p>
                                            <button onClick={() => setActiveTab('ai')} className="mt-8 px-10 py-4 bg-primary rounded-2xl font-black uppercase italic tracking-widest shadow-2xl hover:bg-primary/80 transition-all">Launch AI Comparison</button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'dashboard' && (
                                <div className="space-y-8">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-2xl font-black italic uppercase italic">Synchronized Market</h3>
                                        {selectedTeamForSquad && <button onClick={() => setSelectedTeamForSquad(null)} className="text-[10px] font-black text-primary uppercase">← Back</button>}
                                    </div>
                                    {!selectedTeamForSquad ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                            {Object.keys(roomState?.budgets || {}).map(team => (
                                                <div key={team} onClick={() => setSelectedTeamForSquad(team)} className="bg-white/5 border border-white/5 p-6 rounded-3xl hover:border-primary/30 transition-all cursor-pointer group">
                                                    <h4 className="text-sm font-black italic uppercase truncate mb-4 group-hover:text-primary transition-colors">{team}</h4>
                                                    <div className="space-y-1">
                                                        <p className="text-[8px] font-black opacity-20 uppercase">Treasury</p>
                                                        <p className="text-xl font-black text-primary italic">{formatPrice(roomState.budgets[team])}</p>
                                                    </div>
                                                    <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-4">
                                                        <div className="flex -space-x-2">
                                                            {(roomState.squads[team] || []).slice(0, 3).map((p, i) => (
                                                                <div key={i} className="w-6 h-6 rounded-full bg-white/10 border border-black flex items-center justify-center text-[8px] font-black truncate">{p.name[0]}</div>
                                                            ))}
                                                        </div>
                                                        <span className="text-[9px] font-bold opacity-30 uppercase">{(roomState.squads[team] || []).length} Units</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {(roomState.squads[selectedTeamForSquad] || []).map((p, i) => (
                                                <div key={i} className="bg-white/5 border border-white/5 p-5 rounded-3xl flex items-center gap-6">
                                                    <div className="w-16 h-20 bg-black/40 rounded-xl flex items-center justify-center text-primary font-black italic text-xl border border-white/5">{p.ovr || 80}</div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-black uppercase italic tracking-tight truncate text-sm">{p.name}</h4>
                                                        <p className="text-[10px] opacity-20 uppercase font-bold">{p.position}</p>
                                                        <div className="mt-3 flex items-center justify-between bg-black/20 p-2 px-4 rounded-xl">
                                                            <span className="text-[8px] opacity-30 font-black uppercase">Acquired</span>
                                                            <span className="text-sm font-black italic text-primary">{formatPrice(p.boughtPrice)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'ai' && <AIAnalysis roomState={roomState} apiUrl={import.meta.env.VITE_API_URL || 'http://localhost:3001'} isAdmin={isAdmin} />}

                            {activeTab === 'players' && (
                                <div className="space-y-8">
                                    <h3 className="text-2xl font-black italic uppercase italic">Asset Registry</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {roomState?.players.map((p, i) => {
                                            const isSold = Object.values(roomState.squads || {}).some(s => s.some(sp => sp.name === p.name));
                                            return (
                                                <div key={i} className={`p-4 rounded-3xl border transition-all ${i === roomState.currentPlayerIndex ? 'bg-primary/10 border-primary/40' : isSold ? 'bg-green-500/5 border-green-500/10 opacity-60' : 'bg-white/5 border-white/5'}`}>
                                                    <div className="flex gap-4 items-center">
                                                        <div className="w-12 h-14 bg-black/40 rounded-xl flex items-center justify-center text-primary font-black italic border border-white/5">{p.ovr || 80}</div>
                                                        <div className="min-w-0">
                                                            <h4 className="text-xs font-black italic uppercase truncate">{p.name}</h4>
                                                            <p className="text-[8px] opacity-30 font-bold uppercase">{p.position}</p>
                                                            {isSold && <p className="text-[8px] text-green-500 font-black mt-1 italic uppercase tracking-widest">Secured</p>}
                                                            {i === roomState.currentPlayerIndex && <p className="text-[8px] text-primary font-black mt-1 italic uppercase tracking-widest animate-pulse">Live</p>}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'squad' && (
                                <div className="space-y-8">
                                    <h3 className="text-2xl font-black italic uppercase italic">Your Command</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {userSquad.map((p, i) => (
                                            <div key={i} className="bg-primary/5 border border-primary/20 p-6 rounded-[32px] flex items-center gap-8 relative overflow-hidden group">
                                                <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
                                                <div className="w-24 h-32 bg-black/40 rounded-2xl flex items-center justify-center text-primary font-black italic text-5xl border border-white/10 relative z-10">{p.ovr || 80}</div>
                                                <div className="flex-1 relative z-10">
                                                    <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em] mb-1">Combatant Personnel</p>
                                                    <h3 className="text-2xl font-black italic uppercase tracking-tighter italic">{p.name}</h3>
                                                    <div className="mt-6 flex justify-between items-center bg-black/40 p-3 px-5 rounded-2xl border border-white/5">
                                                        <span className="text-[9px] font-black opacity-30 uppercase">Fee</span>
                                                        <span className="text-xl font-black text-primary italic">{formatPrice(p.boughtPrice)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {userSquad.length === 0 && (
                                            <div className="col-span-2 text-center py-32 rounded-[48px] border-2 border-dashed border-white/5 opacity-10 italic">
                                                <p className="text-4xl font-black uppercase italic tracking-widest">Hangar Empty</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'chat' && (
                                <div className="flex flex-col h-[calc(100vh-180px)] bg-black/40 rounded-[40px] border border-white/5 overflow-hidden">
                                    <div className="p-6 border-b border-white/5 bg-white/5">
                                        <h3 className="text-xl font-black italic uppercase italic tracking-tighter">Team Comms</h3>
                                        <p className="text-[10px] opacity-30 font-black uppercase tracking-widest mt-1">Satellite Link: {roomId}</p>
                                    </div>
                                    <ChatMessages messages={messages} sidebarEndRef={sidebarEndRef} />
                                    <div className="p-6 bg-white/5 border-t border-white/5">
                                        <form onSubmit={handleSendMessage} className="relative">
                                            <input className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-xs outline-none focus:border-primary transition-all placeholder:text-white/10 font-bold"
                                                placeholder="Transmit message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} />
                                            <button className="absolute right-3 top-3.5 p-1 text-primary hover:scale-110 transition-transform"><Send className="w-5 h-5" /></button>
                                        </form>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'manage' && isAdmin && (
                                <div className="space-y-8">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-2xl font-black italic uppercase italic">Room Management</h3>
                                        <div className="flex gap-2">
                                            <button onClick={() => socket.emit('clear-players', roomId)} className="px-4 py-2 bg-red-500/10 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">Format Roster</button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* Increments Control */}
                                        <div className="p-8 bg-white/5 border border-white/5 rounded-[40px] backdrop-blur-xl">
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 mb-6">Bid Modulation</h4>
                                            <div className="grid grid-cols-3 gap-2">
                                                {[0.1, 0.25, 0.5, 1, 2, 5].map(val => {
                                                    const isChecked = roomState?.globalSettings?.allowedIncrements?.includes(val);
                                                    return (
                                                        <button
                                                            key={val}
                                                            onClick={() => {
                                                                const current = roomState?.globalSettings?.allowedIncrements || [];
                                                                const next = isChecked ? current.filter(c => c !== val) : [...current, val].sort((a, b) => a - b);
                                                                socket.emit('set-increments', { roomId, increments: next });
                                                            }}
                                                            className={`py-3 rounded-xl text-[10px] font-black border transition-all ${isChecked ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'bg-white/5 border-white/5 text-white/40'}`}
                                                        >
                                                            {val >= 1 ? `${val} Cr` : `${val * 100} L`}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Deployment Registry */}
                                        <div className="p-8 bg-white/5 border border-white/5 rounded-[40px] backdrop-blur-xl">
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 mb-6">Manual Deployment</h4>
                                            <div className="space-y-4">
                                                <input id="new-player-name" placeholder="Name" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-primary transition-all" />
                                                <div className="grid grid-cols-2 gap-4">
                                                    <input id="new-player-price" type="number" step="0.1" placeholder="Base (Cr)" className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-primary transition-all" />
                                                    <input id="new-player-ovr" type="number" placeholder="OVR" className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-primary transition-all" />
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        const name = document.getElementById('new-player-name').value;
                                                        const p = document.getElementById('new-player-price').value;
                                                        const o = document.getElementById('new-player-ovr').value;
                                                        if (!name || !p) return;
                                                        socket.emit('add-player', { roomId, player: { name, basePrice: p, ovr: o } });
                                                        document.getElementById('new-player-name').value = '';
                                                        document.getElementById('new-player-price').value = '';
                                                        document.getElementById('new-player-ovr').value = '';
                                                    }}
                                                    className="w-full py-4 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all"
                                                >
                                                    Deploy Asset
                                                </button>
                                            </div>
                                        </div>

                                        {/* Team Registry */}
                                        <div className="p-8 bg-white/5 border border-white/5 rounded-[40px] backdrop-blur-xl md:col-span-2">
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 mb-6">Team Authorization</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {Object.keys(roomState?.budgets || {}).map(team => (
                                                    <div key={team} className="p-5 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between">
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-black uppercase truncate">{team}</p>
                                                            <p className="text-[9px] text-primary italic font-black">{formatPrice(roomState.budgets[team])}</p>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            {team !== user.teamName && (
                                                                <button onClick={() => socket.emit('kick-team', { roomId, teamName: team })} className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all">
                                                                    <XCircle className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                            <button onClick={() => socket.emit('transfer-admin', { roomId, teamName: team })} className={`p-2 rounded-lg transition-all ${roomState?.adminTeam === team ? 'bg-primary text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>
                                                                <ShieldCheck className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Squad Management */}
                                        <div className="p-8 bg-white/5 border border-white/5 rounded-[40px] backdrop-blur-xl md:col-span-2">
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 mb-6">Strategic Roster Command</h4>
                                            <div className="space-y-6">
                                                {Object.keys(roomState?.squads || {}).map(teamName => (
                                                    <div key={teamName} className="space-y-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-1 h-4 bg-primary rounded-full" />
                                                            <h5 className="text-sm font-black uppercase italic tracking-tight">{teamName} Squad</h5>
                                                            <span className="text-[10px] opacity-20 font-bold">{(roomState.squads[teamName] || []).length} ASSETS</span>
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                            {(roomState.squads[teamName] || []).map((player, pIdx) => (
                                                                <div key={pIdx} className="p-4 rounded-2xl bg-black/40 border border-white/5 group hover:border-primary/20 transition-all">
                                                                    <div className="flex justify-between items-start gap-3">
                                                                        <div className="flex-1 min-w-0">
                                                                            {editingPlayer?.team === teamName && editingPlayer?.index === pIdx ? (
                                                                                <div className="space-y-2">
                                                                                    <input
                                                                                        className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-[11px] outline-none focus:border-primary"
                                                                                        value={editingPlayer.name}
                                                                                        onChange={e => setEditingPlayer({ ...editingPlayer, name: e.target.value })}
                                                                                    />
                                                                                    <div className="flex items-center gap-2">
                                                                                        <input
                                                                                            type="number" step="0.1"
                                                                                            className="flex-1 bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-[11px] outline-none focus:border-primary"
                                                                                            value={editingPlayer.price}
                                                                                            onChange={e => setEditingPlayer({ ...editingPlayer, price: e.target.value })}
                                                                                        />
                                                                                        <button onClick={() => {
                                                                                            socket.emit('admin-update-squad-player', {
                                                                                                roomId, teamName, playerIndex: pIdx,
                                                                                                updatedData: { name: editingPlayer.name, boughtPrice: editingPlayer.price }
                                                                                            });
                                                                                            setEditingPlayer(null);
                                                                                        }} className="p-2 bg-primary rounded-lg text-white"><Save className="w-4 h-4" /></button>
                                                                                        <button onClick={() => setEditingPlayer(null)} className="p-2 bg-white/5 rounded-lg text-white/40"><X className="w-4 h-4" /></button>
                                                                                    </div>
                                                                                </div>
                                                                            ) : (
                                                                                <>
                                                                                    <p className="text-xs font-black uppercase truncate group-hover:text-primary transition-colors">{player.name}</p>
                                                                                    <p className="text-[10px] font-black italic text-primary mt-1">{formatPrice(player.boughtPrice)}</p>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                        {!editingPlayer && (
                                                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                <button
                                                                                    onClick={() => setEditingPlayer({ team: teamName, index: pIdx, name: player.name, price: player.boughtPrice })}
                                                                                    className="p-1.5 bg-white/5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                                                                                >
                                                                                    <Edit className="w-3.5 h-3.5" />
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => setTransferringPlayer({ team: teamName, index: pIdx })}
                                                                                    className="p-1.5 bg-white/5 text-white/40 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all"
                                                                                >
                                                                                    <ArrowRightLeft className="w-3.5 h-3.5" />
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => {
                                                                                        if (confirm(`Remove ${player.name} from ${teamName}?`)) {
                                                                                            socket.emit('admin-remove-from-squad', { roomId, teamName, playerIndex: pIdx });
                                                                                        }
                                                                                    }}
                                                                                    className="p-1.5 bg-white/5 text-white/40 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                                                                >
                                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    {transferringPlayer?.team === teamName && transferringPlayer?.index === pIdx && (
                                                                        <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                                                                            <p className="text-[9px] font-black uppercase opacity-30 text-center tracking-widest">Select Target Team</p>
                                                                            <div className="flex flex-wrap gap-2">
                                                                                {Object.keys(roomState.squads).filter(t => t !== teamName).map(targetTeam => (
                                                                                    <button
                                                                                        key={targetTeam}
                                                                                        onClick={() => {
                                                                                            socket.emit('admin-transfer-player', { roomId, fromTeam: teamName, toTeam: targetTeam, playerIndex: pIdx });
                                                                                            setTransferringPlayer(null);
                                                                                        }}
                                                                                        className="px-3 py-2 bg-primary/10 text-primary rounded-lg text-[9px] font-black uppercase hover:bg-primary hover:text-white transition-all"
                                                                                    >
                                                                                        {targetTeam}
                                                                                    </button>
                                                                                ))}
                                                                                <button onClick={() => setTransferringPlayer(null)} className="px-3 py-2 bg-white/5 text-white/40 rounded-lg text-[9px] font-black uppercase">Cancel</button>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            )}

                        </div>
                    </section>
                </div>

                {/* Right Sidebar - Social & Activity */}
                <aside className="w-80 border-l border-white/5 bg-black/40 hidden lg:flex flex-col">
                    <div className="p-4 border-b border-white/5 flex items-center gap-1 bg-black/40">
                        <button onClick={() => setSidebarTab('activity')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${sidebarTab === 'activity' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-white/40 hover:text-white hover:bg-white/5'}`}>
                            <Activity className="w-3.5 h-3.5" /> Log
                        </button>
                        <button onClick={() => { setSidebarTab('chat'); setUnreadMessages(0); }} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all relative ${sidebarTab === 'chat' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-white/40 hover:text-white hover:bg-white/5'}`}>
                            <MessageSquare className="w-3.5 h-3.5" /> Comms
                            {unreadMessages > 0 && sidebarTab !== 'chat' && <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-[8px] font-black rounded-lg flex items-center justify-center border-2 border-black">{unreadMessages}</span>}
                        </button>
                    </div>

                    {sidebarTab === 'activity' ? (
                        <ActivityLog activity={roomState?.activity} scrollRef={logEndRef} />
                    ) : (
                        <ChatMessages messages={messages} sidebarEndRef={sidebarEndRef} />
                    )}

                    <div className="p-4 border-t border-white/5 bg-black/40">
                        <form onSubmit={handleSendMessage} className="relative">
                            <input className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs outline-none focus:border-primary transition-all placeholder:text-white/10 font-bold"
                                placeholder="Transmit comms..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} />
                            <button className="absolute right-3 top-3.5 p-1 text-primary hover:scale-110 transition-transform"><Send className="w-5 h-5" /></button>
                        </form>
                    </div>
                </aside>
            </main>

            {/* Mobile Footer Stats */}
            <div className="lg:hidden h-14 bg-black border-t border-white/5 flex items-center justify-around px-2 z-30">
                {['marketplace', 'dashboard', 'squad', 'ai', 'chat'].map(tab => (
                    <button key={tab} onClick={() => { setActiveTab(tab); if (tab === 'chat') setUnreadMessages(0); }} className={`flex flex-col items-center gap-1 px-3 transition-all ${activeTab === tab ? 'text-primary' : 'text-white/30'}`}>
                        {tab === 'marketplace' && <Gavel className="w-5 h-5" />}
                        {tab === 'dashboard' && <BarChart3 className="w-5 h-5" />}
                        {tab === 'squad' && <Users className="w-5 h-5" />}
                        {tab === 'ai' && <Sparkles className="w-5 h-5" />}
                        {tab === 'chat' && <div className="relative"><MessageSquare className="w-5 h-5" />{unreadMessages > 0 && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-lg flex items-center justify-center text-[7px] text-white font-black border border-black">{unreadMessages}</span>}</div>}
                        <span className="text-[7px] font-black uppercase tracking-widest">{tab === 'ai' ? 'AI' : tab}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default AuctionDashboard;
