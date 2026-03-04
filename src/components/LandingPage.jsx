import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, History, Key, ArrowRight, Activity, Users, Clock, ShieldCheck, User } from 'lucide-react';

const LandingPage = ({ onJoin, onCreate, onUserChange, user, connected }) => {
    const [roomId, setRoomId] = useState('');

    return (
        <div className="min-h-screen relative flex flex-col overflow-hidden bg-transparent text-white font-display">
            {/* Background with Blur/Gradient */}
            <div className="fixed inset-0 z-0">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-50" />
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/20 rounded-full blur-[120px]" />
                <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />
            </div>

            {/* Header */}
            <header className="relative z-10 border-b border-white/5 bg-black/40 backdrop-blur-xl px-4 sm:px-8 py-4 sm:py-5">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary p-2 sm:p-2.5 rounded-xl shadow-[0_0_20px_rgba(234,42,51,0.3)] border border-primary/20">
                            <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        </div>
                        <h1 className="text-lg sm:text-2xl font-black tracking-tighter italic uppercase">
                            ELITE <span className="text-primary">AUCTION</span>
                        </h1>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-6">
                        <nav className="hidden md:flex gap-10 text-[10px] font-black uppercase tracking-[0.2em] opacity-40">
                            <a href="#" className="hover:text-primary hover:opacity-100 transition-all">Marketplace</a>
                            <a href="#" className="hover:text-primary hover:opacity-100 transition-all">Leaderboard</a>
                            <a href="#" className="hover:text-primary hover:opacity-100 transition-all">Rules</a>
                        </nav>
                        <div className="w-px h-6 bg-white/10 hidden md:block" />
                        <div className="flex items-center gap-2 sm:gap-3 bg-white/5 border border-white/10 px-2 sm:px-3 py-1.5 rounded-xl">
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                                <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                            </div>
                            <span className="text-xs font-bold truncate max-w-[80px] sm:max-w-none">{user.name}</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 md:p-12">
                <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20 items-center">

                    {/* Left: Branding */}
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                        className="space-y-8 sm:space-y-12"
                    >
                        <div className="space-y-4 sm:space-y-6">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black tracking-[0.3em] uppercase">
                                <span className="flex h-2 w-2 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                                </span>
                                Engine Live • v4.2.1
                            </div>
                            <h2 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-[0.9] tracking-tighter italic">
                                DRAFT. <br />
                                BID. <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-red-500 to-red-400">DOMINATE.</span>
                            </h2>
                            <p className="text-white/50 text-base sm:text-xl max-w-lg leading-relaxed font-medium">
                                Step into the arena where legends are built. Join a high-stakes auction room and draft your elite squad in real-time.
                            </p>
                        </div>

                        {/* Recent/Stats */}
                        <div className="grid grid-cols-2 gap-4 sm:gap-6 max-w-md">
                            <div className="bg-white/5 border border-white/10 rounded-[24px] sm:rounded-[32px] p-4 sm:p-6 backdrop-blur-xl group hover:border-primary/30 transition-all">
                                <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-primary mb-2 sm:mb-3 group-hover:scale-110 transition-transform" />
                                <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Active Drafts</p>
                                <p className="text-xl sm:text-2xl font-black italic">42 ROOMS</p>
                            </div>
                            <div className="bg-white/5 border border-white/10 rounded-[24px] sm:rounded-[32px] p-4 sm:p-6 backdrop-blur-xl group hover:border-green-400/30 transition-all">
                                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-green-400 mb-2 sm:mb-3 group-hover:scale-110 transition-transform" />
                                <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-1">Live Bidders</p>
                                <p className="text-xl sm:text-2xl font-black italic">1.2K ONLINE</p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Right: Join Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative"
                    >
                        <div className="absolute -inset-10 bg-primary/20 rounded-[80px] blur-[100px] opacity-20 animate-pulse" />
                        <div className="relative bg-surface-dark/40 backdrop-blur-3xl border border-white/5 rounded-[32px] sm:rounded-[48px] p-6 sm:p-10 md:p-14 shadow-[0_40px_100px_rgba(0,0,0,0.5)]">
                            <div className="mb-8 sm:mb-12">
                                <h3 className="text-2xl sm:text-4xl font-black mb-2 sm:mb-3 italic tracking-tight">JOIN THE ARENA</h3>
                                <p className="text-white/40 text-sm sm:text-lg font-medium">Enter your credentials to begin the bidding war.</p>
                            </div>

                            <div className="space-y-4 sm:space-y-6">
                                <div className="space-y-2 sm:space-y-3">
                                    <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] ml-2">Your Display Name</label>
                                    <div className="relative group">
                                        <User className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-white/20 group-focus-within:text-primary transition-colors" />
                                        <input
                                            type="text"
                                            placeholder="e.g. PixelPirate"
                                            value={user.name}
                                            onChange={(e) => onUserChange({ ...user, name: e.target.value })}
                                            className="w-full bg-black/40 border-2 border-white/5 rounded-[16px] sm:rounded-[20px] py-3 sm:py-4 px-12 sm:px-14 text-base sm:text-lg font-bold text-white placeholder:text-white/10 focus:border-primary/40 focus:ring-0 transition-all outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2 sm:space-y-3">
                                    <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] ml-2">Team Name</label>
                                    <div className="relative group">
                                        <Trophy className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-white/20 group-focus-within:text-primary transition-colors" />
                                        <input
                                            type="text"
                                            placeholder="e.g. Neon Strikers"
                                            value={user.teamName}
                                            onChange={(e) => onUserChange({ ...user, teamName: e.target.value })}
                                            className="w-full bg-black/40 border-2 border-white/5 rounded-[16px] sm:rounded-[20px] py-3 sm:py-4 px-12 sm:px-14 text-base sm:text-lg font-bold text-white placeholder:text-white/10 focus:border-primary/40 focus:ring-0 transition-all outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2 sm:space-y-3">
                                    <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] ml-2">Access Code / Room ID</label>
                                    <div className="relative group">
                                        <Key className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-white/20 group-focus-within:text-primary transition-colors" />
                                        <input
                                            type="text"
                                            placeholder="#R-902-AX"
                                            value={roomId}
                                            onChange={(e) => setRoomId(e.target.value)}
                                            className="w-full bg-black/40 border-2 border-white/5 rounded-[16px] sm:rounded-[20px] py-3 sm:py-4 px-12 sm:px-14 text-xl sm:text-2xl font-black text-primary placeholder:text-white/10 focus:border-primary/40 focus:ring-0 transition-all outline-none italic tracking-tighter"
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={() => onJoin(roomId, user.teamName)}
                                    className="w-full bg-primary hover:bg-red-700 text-white font-black text-base sm:text-xl py-4 sm:py-5 rounded-[20px] sm:rounded-[24px] shadow-[0_20px_40px_rgba(234,42,51,0.3)] hover:shadow-[0_25px_60px_rgba(234,42,51,0.4)] transition-all hover:-translate-y-1 active:translate-y-0 flex items-center justify-center gap-3 sm:gap-4 group"
                                >
                                    CONTINUE TO LOBBY
                                    <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-2 transition-transform" />
                                </button>

                                <div className="flex items-center gap-4 sm:gap-6 py-1">
                                    <div className="flex-1 h-px bg-white/5" />
                                    <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em]">OR</span>
                                    <div className="flex-1 h-px bg-white/5" />
                                </div>

                                <button
                                    onClick={() => onCreate(user.teamName)}
                                    className="w-full bg-white/5 border-2 border-white/5 hover:border-white/20 text-white font-black py-3 sm:py-4 rounded-[20px] sm:rounded-[24px] transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs sm:text-sm"
                                >
                                    CREATE SECURE ROOM
                                </button>
                            </div>

                            <div className="mt-8 sm:mt-12 pt-6 sm:pt-10 border-t border-white/5 grid grid-cols-2 gap-6 sm:gap-10">
                                <div className="flex items-center gap-3 sm:gap-4">
                                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                                        <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-0.5">EST. TIME</p>
                                        <span className="text-xs sm:text-sm font-bold">45 MINS</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 sm:gap-4">
                                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
                                        <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-0.5">SECURITY</p>
                                        <span className="text-xs sm:text-sm font-bold">AES-256</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                </div>
            </main>

            <footer className="relative z-10 px-4 sm:px-12 py-6 sm:py-8 text-[10px] font-black text-white/20 uppercase tracking-[0.5em] flex flex-col md:flex-row justify-between items-center gap-4 sm:gap-6">
                <p>© 2026 ELITE AUCTION • ALL RIGHTS RESERVED</p>
                <div className="flex gap-6 sm:gap-12">
                    <a href="#" className="hover:text-primary transition-colors">Documentation</a>
                    <a href="#" className="hover:text-primary transition-colors">Privacy</a>
                    <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                        <span className={`font-bold transition-colors ${connected ? 'text-green-500/50' : 'text-red-500/50'}`}>
                            {connected ? 'CONNECTED' : 'OFFLINE'}
                        </span>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
