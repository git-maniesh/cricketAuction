import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, Zap, Timer, Star, Award, TrendingUp, Pause, ShieldCheck, Hammer } from 'lucide-react';
import { animate as anime } from 'animejs';
import gsap from 'gsap';

const PlayerDisplay = ({ highestBid, onBid, onHold, holds = [], userTeam, timeLeft, player, status, timerStarted, isAdmin, globalSettings }) => {
    const portraitRef = useRef(null);
    const soldStampRef = useRef(null);
    const [imageError, setImageError] = useState(false);
    const isUserOnHold = (holds || []).some(h => String(h).toUpperCase() === String(userTeam).toUpperCase());
    const someonesOnHold = (holds || []).length > 0;
    const isFirstBid = highestBid?.bidder === null || highestBid?.bidder === undefined;
    const allowedIncrements = globalSettings?.allowedIncrements || [0.25, 0.5, 1, 2, 5];

    const formatPrice = (amount) => {
        if (typeof amount !== 'number') return '₹0 Cr';
        if (amount >= 1) return `₹${amount.toFixed(2)} Cr`;
        return `₹${(amount * 100).toFixed(0)} L`;
    };

    const formatPriceOnly = (amount) => {
        if (amount >= 1) return `${amount.toFixed(2)} Cr`;
        return `${(amount * 100).toFixed(0)} L`;
    };

    useEffect(() => {
        setImageError(false);
        
        // Reset sold-stamp visibility when player changes using ref
        if (soldStampRef.current) {
            soldStampRef.current.style.opacity = '0';
            soldStampRef.current.style.transform = 'scale(5) rotate(15deg)';
        }

        if (portraitRef.current) {
            gsap.to(portraitRef.current, {
                y: -10,
                duration: 2.5,
                ease: "sine.inOut",
                repeat: -1,
                yoyo: true
            });
        }
    }, [player]);

    if (!player) return null;

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const nextBidAmount = (highestBid?.amount || player.basePrice) + 0.25;
    const isPaused = status === 'paused';

    return (
        <div className="w-full bg-white/5 border border-white/5 rounded-[40px] overflow-hidden shadow-2xl relative backdrop-blur-3xl group">
            {/* Countdown HUD */}
            <div className="absolute top-6 right-6 z-20 flex flex-col items-end gap-3 pointer-events-none">
                <div className={`backdrop-blur-xl border ${timeLeft <= 8 && timerStarted ? 'bg-red-500/20 border-red-500/40 shadow-[0_0_30px_rgba(220,38,38,0.2)]' : 'bg-black/60 border-primary/20'} px-6 py-4 rounded-3xl flex flex-col items-center min-w-[140px] transition-all duration-300`}>
                    <span className={`text-[9px] font-black uppercase tracking-[0.3em] mb-1 ${timeLeft <= 8 && timerStarted ? 'text-red-400' : 'text-primary'}`}>
                        {!timerStarted ? 'Awaiting First Bid' : timeLeft <= 5 ? 'COMMAND EXECUTING' : timeLeft <= 15 ? 'FINAL CALL' : 'AUCTION LIVE'}
                    </span>
                    <span className={`text-4xl font-black tabular-nums italic ${timeLeft <= 8 && timerStarted ? 'text-red-400' : 'text-white'}`}>
                        {formatTime(timeLeft)}
                    </span>
                </div>

                {someonesOnHold && (
                    <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                        className="bg-yellow-500/20 border border-yellow-500/40 px-4 py-2 rounded-2xl backdrop-blur-md flex items-center gap-2">
                        <Pause className="w-3 h-3 text-yellow-500 fill-current animate-pulse" />
                        <span className="text-[9px] font-black text-yellow-500 uppercase tracking-widest">HOLD ACTIVE</span>
                    </motion.div>
                )}
            </div>

            <div className="flex flex-col lg:flex-row h-full min-h-[500px]">
                {/* Visual Section */}
                <div className="lg:w-[45%] bg-gradient-to-br from-primary/20 via-transparent to-transparent flex items-center justify-center p-8 lg:border-r border-white/5 relative overflow-hidden group/portrait">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(234,42,51,0.1)_0%,transparent_70%)]" />
                    
                    {/* Dynamic Name Background */}
                    <div className="absolute inset-0 overflow-hidden opacity-[0.03] select-none flex flex-col justify-around py-4">
                        {[1, 2, 3, 4].map((_, i) => (
                            <div key={i} className={`text-8xl font-black italic whitespace-nowrap uppercase tracking-tighter ${i % 2 === 0 ? 'translate-x-[-10%]' : 'translate-x-[-30%]'}`}>
                                {player.name} • {player.name} • {player.name}
                            </div>
                        ))}
                    </div>

                    <motion.div ref={portraitRef} className="relative z-10 w-full max-w-[320px] lg:max-w-none">
                        <div className="absolute -inset-20 bg-primary/20 rounded-full blur-[100px] group-hover/portrait:bg-primary/30 transition-all duration-1000" />
                        
                        <div className="relative aspect-[3/4] rounded-[40px] border-2 border-primary/40 shadow-[0_0_80px_rgba(234,42,51,0.3)] overflow-hidden bg-black/40">
                            {imageError || !player.image || player.image.includes('freepik') || player.image.includes('placeholder') ? (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-[#0a0a0a] relative p-8">
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(234,42,51,0.15)_0%,transparent_100%)] opacity-50" />
                                    <div className="absolute top-0 left-0 w-full h-1 bg-primary/30" />
                                    <div className="absolute bottom-0 left-0 w-full h-1 bg-primary/30" />
                                    
                                    <div className="relative z-10 flex flex-col items-center text-center">
                                        <div className="w-32 h-32 bg-primary/10 rounded-full border border-primary/20 flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(234,42,51,0.1)]">
                                            <Star className="w-16 h-16 text-primary animate-pulse" />
                                        </div>
                                        <h2 className="text-4xl font-black italic uppercase tracking-tighter text-white/90 leading-tight">
                                            {player.name.split(' ').map((n, i) => (
                                                <span key={i} className="block">{n}</span>
                                            ))}
                                        </h2>
                                        <div className="mt-4 px-4 py-1.5 bg-white/5 border border-white/10 rounded-xl">
                                            <span className="text-[10px] font-black text-primary uppercase tracking-[0.4em] italic">{player.position || 'Elite Asset'}</span>
                                        </div>
                                    </div>

                                    {/* Abstract Background Initials */}
                                    <div className="absolute inset-0 flex items-center justify-center opacity-[0.05] pointer-events-none">
                                        <span className="text-[20rem] font-black italic tracking-tighter uppercase whitespace-nowrap">
                                            {player.name.split(' ').map(n => n[0]).join('')}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <img 
                                    src={player.image} 
                                    alt={player.name} 
                                    className="w-full h-full object-cover group-hover/portrait:scale-110 transition-transform duration-[3s] ease-out shadow-2xl" 
                                    onError={() => setImageError(true)} 
                                />
                            )}
                            
                            {/* Sold Stamp Placeholder for Anime.js */}
                            <div ref={soldStampRef} className="sold-stamp absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 z-30">
                                <div className="border-8 border-primary text-primary px-8 py-4 rounded-2xl transform text-6xl font-black uppercase italic tracking-tighter shadow-2xl bg-black/80 backdrop-blur-md">
                                    SOLD
                                </div>
                            </div>

                            {/* Position & OVR HUD */}
                            <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end z-20">
                                <div className="bg-black/60 backdrop-blur-lg border border-white/10 p-3 px-5 rounded-2xl">
                                    <p className="text-[9px] font-black opacity-40 uppercase tracking-widest mb-1">Position</p>
                                    <p className="text-xl font-black italic uppercase text-white">{player.position || 'N/A'}</p>
                                </div>
                                <div className="bg-primary border border-white/20 p-4 rounded-3xl shadow-xl">
                                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">OVR</p>
                                    <p className="text-3xl font-black italic text-white leading-none">{player.ovr || 80}</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Bidding Section */}
                <div className="flex-1 p-8 sm:p-12 flex flex-col justify-between relative bg-black/20">
                    <div>
                        <div className="flex flex-wrap gap-2 mb-6">
                            {(player.badges || ['Premium Asset']).map((badge, i) => (
                                <span key={i} className="px-3 py-1 bg-primary/10 border border-primary/20 text-primary text-[9px] font-black tracking-widest uppercase italic rounded-lg">
                                    {badge}
                                </span>
                            ))}
                        </div>

                        <h1 className="text-4xl sm:text-6xl font-black italic text-white leading-tight mb-8 tracking-tighter uppercase">
                            {player.name}
                        </h1>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                            <div className="bg-white/5 border border-white/5 p-4 rounded-2xl">
                                <p className="text-[9px] font-black opacity-30 uppercase tracking-widest mb-1">Reserve</p>
                                <p className="text-xl font-black italic text-white/60">{formatPrice(player.basePrice)}</p>
                            </div>
                            <div className="bg-white/5 border border-white/5 p-4 rounded-2xl lg:col-span-3 flex items-center justify-between group/bid transition-all hover:bg-white/10">
                                <div>
                                    <p className="text-[9px] font-black text-primary uppercase tracking-widest mb-1 italic">Highest Bid</p>
                                    <p className="text-2xl font-black italic text-white truncate max-w-[200px]">{highestBid?.bidder || 'NO BIDS'}</p>
                                </div>
                                <div className="text-right">
                                    <motion.p key={highestBid?.amount} initial={{ scale: 1.2, color: '#ea2a33' }} animate={{ scale: 1, color: '#ffffff' }}
                                        className="text-4xl font-black italic tracking-tighter leading-none">
                                        {formatPrice(highestBid?.amount || player.basePrice)}
                                    </motion.p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {isFirstBid ? (
                            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                onClick={() => onBid(player.basePrice)} disabled={isPaused}
                                className="w-full py-5 rounded-2xl font-black text-lg bg-primary hover:bg-red-700 text-white shadow-xl shadow-primary/20 transition-all uppercase tracking-widest flex items-center justify-center gap-3">
                                <Hammer className="w-5 h-5" /> Open Bid: {formatPrice(player.basePrice)}
                            </motion.button>
                        ) : (
                            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                                {allowedIncrements.map(inc => {
                                    const bidAmt = (highestBid?.amount || player.basePrice) + inc;
                                    return (
                                        <button key={inc} onClick={() => onBid(bidAmt)} disabled={isPaused}
                                            className="py-4 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-primary/40 rounded-2xl transition-all group flex flex-col items-center">
                                            <span className="text-[9px] font-black opacity-30 group-hover:text-primary transition-colors">+{formatPriceOnly(inc)}</span>
                                            <span className="text-[10px] font-black italic text-white">{formatPrice(bidAmt)}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        <div className="flex gap-4">
                            {!isFirstBid && (
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                    onClick={() => onBid(nextBidAmount)} disabled={isPaused}
                                    className="flex-[3] py-5 rounded-3xl bg-primary hover:bg-red-700 text-white font-black text-xl italic uppercase tracking-widest shadow-2xl shadow-primary/30 flex items-center justify-center gap-4 group">
                                    <Zap className="w-6 h-6 group-hover:animate-pulse" /> Raise to {formatPrice(nextBidAmount)}
                                </motion.button>
                            )}
                            <button onClick={onHold} className={`flex-1 flex flex-col items-center justify-center py-5 rounded-3xl border-2 transition-all ${isUserOnHold ? 'bg-yellow-500 border-yellow-600 text-black' : 'bg-white/5 border-white/10 hover:border-yellow-500/50 hover:text-yellow-500'}`}>
                                <Pause className={`w-6 h-6 mb-1 ${isUserOnHold ? 'fill-current' : ''}`} />
                                <span className="text-[9px] font-black uppercase tracking-widest">{isUserOnHold ? 'RELEASE' : 'HOLD'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlayerDisplay;
