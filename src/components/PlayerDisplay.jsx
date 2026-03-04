import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, Zap, Timer, Star, Award, TrendingUp, Pause } from 'lucide-react';
import gsap from 'gsap';
import defaultPlayerImg from '../assets/default-player.png';

const PlayerDisplay = ({ highestBid, onBid, onHold, holds = [], userTeam, timeLeft, player, status, isAdmin, onUnsold }) => {
    const portraitRef = useRef(null);
    const [imageError, setImageError] = useState(false);
    const isUserOnHold = holds.some(h => h.toUpperCase() === userTeam?.toUpperCase());
    const someonesOnHold = holds.length > 0;

    const formatPrice = (amount) => {
        if (amount >= 1) return `₹${amount.toFixed(2)} Cr`;
        return `₹${(amount * 100).toFixed(0)} L`;
    };

    const formatPriceOnly = (amount) => {
        if (amount >= 1) return `${amount.toFixed(2)} Cr`;
        return `${(amount * 100).toFixed(0)} L`;
    };

    useEffect(() => {
        setImageError(false);
        if (portraitRef.current) {
            gsap.to(portraitRef.current, {
                y: -15,
                duration: 3,
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
        <div className="w-full bg-surface-dark/40 border border-white/5 rounded-[32px] sm:rounded-[48px] overflow-hidden shadow-2xl relative backdrop-blur-3xl group">
            {/* Countdown Badge */}
            <div className="absolute top-4 sm:top-8 right-4 sm:right-8 z-20 flex flex-col items-end gap-2 sm:gap-3">
                <div className={`bg-black/60 backdrop-blur-xl border ${timeLeft <= 5 ? 'border-red-600 shadow-[0_0_30px_rgba(220,38,38,0.5)]' : timeLeft < 10 ? 'border-red-500 animate-pulse' : 'border-primary/20'} px-3 sm:px-6 py-2 sm:py-4 rounded-2xl sm:rounded-3xl flex flex-col items-center min-w-[90px] sm:min-w-[140px]`}>
                    <span className={`text-[8px] sm:text-[10px] font-black uppercase tracking-[0.3em] mb-1 ${timeLeft < 10 ? 'text-red-500' : 'text-primary'}`}>{timeLeft <= 5 ? 'HAMMER FALLING' : 'Closing In'}</span>
                    <span className={`text-2xl sm:text-4xl font-black tabular-nums italic ${timeLeft < 10 ? 'text-red-500' : 'text-white'}`}>
                        {formatTime(timeLeft)}
                    </span>
                </div>

                {someonesOnHold && (
                    <motion.div
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        className="bg-yellow-500/20 border border-yellow-500/40 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl backdrop-blur-md flex items-center gap-2"
                    >
                        <Pause className="w-3 h-3 text-yellow-400 fill-current" />
                        <span className="text-[8px] sm:text-[9px] font-black text-yellow-400 uppercase tracking-widest leading-none">
                            {timeLeft === 0 ? 'SALE PENDING' : 'HOLD ACTIVE'}
                        </span>
                    </motion.div>
                )}
            </div>

            <div className="flex flex-col lg:flex-row h-full">
                {/* Left: Player Visual */}
                <div className="lg:w-[480px] xl:w-[600px] bg-gradient-to-br from-primary/30 via-transparent to-transparent flex items-center justify-center p-6 sm:p-8 lg:border-r border-b lg:border-b-0 border-white/5 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_70%)] opacity-30" />

                    {/* Repeated Name Background */}
                    <div className="absolute inset-0 overflow-hidden opacity-[0.07] pointer-events-none select-none flex flex-col justify-around py-4">
                        {[1, 2, 3, 4, 5, 6].map((_, i) => (
                            <div key={i} className={`text-5xl sm:text-7xl font-black italic whitespace-nowrap uppercase tracking-tighter ${i % 2 === 0 ? 'ml-[-20%]' : 'ml-[-40%]'}`}>
                                {Array(10).fill(player.name).join(' • ')}
                            </div>
                        ))}
                    </div>

                    <motion.div
                        ref={portraitRef}
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="relative z-10 w-full max-w-[400px] lg:max-w-none"
                    >
                        <div className="absolute -inset-16 bg-primary/30 rounded-full blur-[100px] opacity-0 group-hover:opacity-60 transition-opacity duration-1000" />
                        <div className="relative">
                            {/* Blinking Name Overlay */}
                            <motion.div
                                key={player.name}
                                animate={{
                                    opacity: [1, 0.8, 1],
                                    color: ["#ea2a33", "#000000", "#ea2a33"],
                                    textShadow: [
                                        "0 0 20px rgba(234,42,51,0.8)",
                                        "0 0 0px rgba(0,0,0,0)",
                                        "0 0 20px rgba(234,42,51,0.8)"
                                    ]
                                }}
                                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                                className="absolute -top-10 sm:-top-12 left-0 w-full text-center z-20 pointer-events-none"
                            >
                                <span className="text-3xl sm:text-5xl font-black italic uppercase tracking-tighter drop-shadow-[0_2px_4px_rgba(255,255,255,0.1)]">
                                    {player.name}
                                </span>
                            </motion.div>

                            {imageError || !player.image ? (
                                <img
                                    src={defaultPlayerImg}
                                    alt={player.name}
                                    className="w-full h-[220px] sm:h-[280px] lg:h-[300px] object-contain rounded-[32px] sm:rounded-[48px] border-2 border-primary/50 shadow-[0_0_80px_rgba(234,42,51,0.4)]"
                                />
                            ) : (
                                <img
                                    src={player.image}
                                    alt={player.name}
                                    className="w-full h-[220px] sm:h-[280px] lg:h-[300px] object-cover rounded-[32px] sm:rounded-[48px] border-2 border-primary/50 shadow-[0_0_80px_rgba(234,42,51,0.4)]"
                                    onError={() => setImageError(true)}
                                />
                            )}
                        </div>
                    </motion.div>
                </div>

                {/* Right: Bidding Controls */}
                <div className="flex-1 p-6 sm:p-10 lg:p-12 flex flex-col justify-between relative">
                    <div>
                        <div className="flex flex-wrap gap-2 mb-4 sm:mb-6">
                            {player.badges?.map((badge, i) => (
                                <span key={i} className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-[9px] sm:text-[10px] font-black tracking-widest uppercase italic">
                                    {badge}
                                </span>
                            )) || <span className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-[9px] sm:text-[10px] font-black tracking-widest uppercase italic">Premium Asset</span>}
                        </div>

                        <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black italic text-white leading-none mb-6 sm:mb-8 tracking-tighter uppercase">
                            {player.name}
                        </h1>

                        <div className="grid grid-cols-3 gap-3 sm:gap-6 mb-8 sm:mb-12">
                            {(player.stats || [
                                { label: "PAC", value: 94 },
                                { label: "SHO", value: 93 },
                                { label: "PHY", value: 88 }
                            ]).map((stat, i) => (
                                <div key={i} className="bg-white/5 border border-white/10 p-3 sm:p-5 rounded-2xl sm:rounded-3xl text-center group/stat hover:border-primary/40 transition-all">
                                    <p className="text-[9px] sm:text-[10px] font-black opacity-30 uppercase tracking-[0.2em] mb-1 sm:mb-2">{stat.label}</p>
                                    <p className="text-2xl sm:text-3xl font-black italic group-hover:text-primary transition-colors">{stat.value}</p>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-4 sm:space-y-6">
                            <div className="flex justify-between items-center text-white/40 font-black uppercase tracking-[0.2em] text-[10px] px-2">
                                <span>Starting Price</span>
                                <span className="text-sm sm:text-base italic">{formatPrice(player.basePrice)}</span>
                            </div>

                            <div className="bg-primary/5 border border-primary/20 p-5 sm:p-8 rounded-[24px] sm:rounded-[32px] flex justify-between items-center relative overflow-hidden">
                                {isPaused && <div className="absolute inset-0 bg-yellow-500/20 backdrop-blur-sm z-20 flex items-center justify-center font-black italic text-yellow-400 uppercase tracking-widest text-sm">Auction Paused</div>}
                                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-40 animate-pulse" />
                                <div className="relative z-10">
                                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] block mb-2">Highest Bidder</span>
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                                            <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                                        </div>
                                        <span className="text-lg sm:text-2xl font-black italic">{highestBid?.bidder || 'Waiting For Entry'}</span>
                                    </div>
                                </div>
                                <div className="relative z-10 text-right">
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={highestBid?.amount}
                                            initial={{ y: 20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            className="flex flex-col"
                                        >
                                            <span className="text-[10px] font-black opacity-30 uppercase tracking-[0.3em] mb-1">Current Value</span>
                                            <span className="text-3xl sm:text-5xl lg:text-6xl font-black italic text-white tracking-tighter leading-none">
                                                {formatPrice(highestBid?.amount || player.basePrice)}
                                            </span>
                                        </motion.div>
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 sm:mt-12 space-y-3 sm:space-y-4">
                        <div className="bg-white/5 border border-white/10 rounded-[24px] sm:rounded-[32px] p-1.5 sm:p-2 flex gap-1.5 sm:gap-2 overflow-x-auto">
                            {[0.25, 0.5, 1, 2, 5].map((inc) => {
                                const bidAmt = (highestBid?.amount || player.basePrice) + inc;
                                return (
                                    <button
                                        key={inc}
                                        disabled={isPaused}
                                        onClick={() => onBid(bidAmt)}
                                        className="flex-1 min-w-[52px] py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm hover:bg-primary hover:text-white transition-all border border-white/5 hover:border-primary disabled:opacity-20 disabled:cursor-not-allowed group"
                                    >
                                        <span className="opacity-40 group-hover:opacity-100 transition-opacity block text-[9px] sm:text-xs">+{formatPriceOnly(inc)}</span>
                                        <div className="text-[8px] sm:text-[10px] font-bold text-primary group-hover:text-white">{formatPrice(bidAmt)}</div>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="flex gap-3 sm:gap-4">
                            <motion.button
                                whileHover={!isPaused ? { y: -5, scale: 1.02 } : {}}
                                whileTap={!isPaused ? { scale: 0.98 } : {}}
                                onClick={() => !isPaused && onBid(nextBidAmount)}
                                disabled={isPaused}
                                className={`flex-[3] font-black py-4 sm:py-6 rounded-[24px] sm:rounded-[32px] shadow-[0_20px_50px_rgba(234,42,51,0.4)] transition-all flex items-center justify-center gap-2 sm:gap-4 group ${isPaused ? 'bg-white/10 text-white/20 cursor-not-allowed shadow-none' : 'bg-primary hover:bg-red-700 text-white'}`}
                            >
                                {isPaused ? <Pause className="w-5 h-5 sm:w-7 sm:h-7" /> : <Rocket className="w-5 h-5 sm:w-7 sm:h-7 group-hover:animate-bounce" />}
                                <span className="text-base sm:text-2xl italic uppercase">{isPaused ? 'PAUSED' : `RAISE TO ${formatPrice(nextBidAmount)}`}</span>
                            </motion.button>

                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={onHold}
                                className={`flex-1 py-4 sm:py-6 rounded-[24px] sm:rounded-[32px] border-2 transition-all flex flex-col items-center justify-center ${isUserOnHold ? 'bg-yellow-500 border-yellow-600 text-black shadow-[0_10px_30px_rgba(234,179,8,0.3)]' : 'border-white/10 bg-white/5 text-white/40 hover:border-yellow-500/50 hover:text-yellow-500'}`}
                            >
                                <Pause className={`w-5 h-5 sm:w-6 sm:h-6 mb-1 ${isUserOnHold ? 'fill-current' : ''}`} />
                                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">{isUserOnHold ? 'RELEASE' : 'HOLD'}</span>
                            </motion.button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlayerDisplay;
