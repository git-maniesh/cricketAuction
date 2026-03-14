import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Trophy, Zap, TrendingUp, Users, Star, Target,
    Crown, Shield, ChevronDown, ChevronUp, Sparkles,
    AlertCircle, Loader, BarChart3
} from 'lucide-react';

// ── Radar / Spider Chart (pure SVG, no lib needed) ──────────
const RadarChart = ({ values, labels, color = '#ea2a33', size = 180 }) => {
    const center = size / 2;
    const radius = size * 0.38;
    const n = values.length;
    const max = Math.max(...values, 1);

    const angleStep = (2 * Math.PI) / n;
    const getPoint = (val, i, r) => {
        const angle = i * angleStep - Math.PI / 2;
        return {
            x: center + r * Math.cos(angle),
            y: center + r * Math.sin(angle)
        };
    };

    const gridLevels = [0.25, 0.5, 0.75, 1];
    const points = values.map((v, i) => getPoint(v / max, i, radius));
    const polyPoints = points.map(p => `${p.x},${p.y}`).join(' ');

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {/* Grid */}
            {gridLevels.map((level, li) => {
                const gPoints = Array.from({ length: n }, (_, i) => getPoint(level, i, radius));
                return (
                    <polygon
                        key={li}
                        points={gPoints.map(p => `${p.x},${p.y}`).join(' ')}
                        fill="none"
                        stroke="rgba(255,255,255,0.08)"
                        strokeWidth="1"
                    />
                );
            })}
            {/* Spokes */}
            {Array.from({ length: n }, (_, i) => {
                const outer = getPoint(1, i, radius);
                return (
                    <line key={i} x1={center} y1={center} x2={outer.x} y2={outer.y}
                        stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                );
            })}
            {/* Data polygon */}
            <polygon points={polyPoints} fill={color + '33'} stroke={color} strokeWidth="2" />
            {/* Labels */}
            {labels.map((label, i) => {
                const outer = getPoint(1.22, i, radius);
                return (
                    <text key={i} x={outer.x} y={outer.y} textAnchor="middle"
                        fill="rgba(255,255,255,0.5)" fontSize="9" fontWeight="bold"
                        fontFamily="sans-serif" dy="3">{label}</text>
                );
            })}
        </svg>
    );
};

// ── Score Bar ──────────────────────────────────────────────
const ScoreBar = ({ value, max = 100, color, label }) => (
    <div className="space-y-1">
        <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{label}</span>
            <span className="text-xs font-black" style={{ color }}>{value}</span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (value / max) * 100)}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ backgroundColor: color }}
            />
        </div>
    </div>
);

// ── Team Colors ────────────────────────────────────────────
const TEAM_COLORS = ['#ea2a33', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const AIAnalysis = ({ roomState, apiUrl, isAdmin }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState(null);
    const [analysis, setAnalysis] = useState(null);
    const [expandedTeam, setExpandedTeam] = useState(null);
    const [selectedFormat, setSelectedFormat] = useState('T20');
    const [customFormat, setCustomFormat] = useState('');
    const [showCustomInput, setShowCustomInput] = useState(false);
    const containerRef = useRef(null);

    const teamNames = roomState ? Object.keys(roomState.squads || {}) : [];
    const hasEnoughData = teamNames.filter(t => (roomState?.squads[t]?.length || 0) > 0).length >= 2;

    const formatPrice = (n) => n >= 1 ? `₹${n.toFixed(2)} Cr` : `₹${(n * 100).toFixed(0)} L`;

    const runAnalysis = async () => {
        setLoading(true);
        setError(null);
        setAnalysis(null);

        const teamsPayload = roomState.squads;
        const finalFormat = showCustomInput ? customFormat : selectedFormat;

        try {
            const res = await fetch(`${apiUrl}/api/compare-teams`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ teams: teamsPayload, format: finalFormat || 'Standard' })
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Server error');
            }
            const data = await res.json();
            setAnalysis(data);
            setExpandedTeam(data.winner);
            // Scroll into view
            setTimeout(() => containerRef.current?.scrollIntoView({ behavior: 'smooth' }), 300);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!roomState) return null;

    return (
        <div ref={containerRef} className="space-y-10 pb-12">
            {/* Header */}
            <div className="space-y-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-purple-400" />
                    </div>
                    <h2 className="text-4xl font-black italic uppercase tracking-tighter">
                        AI <span className="text-purple-400">Verdict</span>
                    </h2>
                </div>
                <p className="text-white/30 text-sm font-medium uppercase tracking-widest ml-1">
                    Powered by Google Gemini • Elite Squad Analysis
                </p>
            </div>

            {/* Team Snapshot Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {teamNames.map((team, idx) => {
                    const players = roomState.squads[team] || [];
                    const budget  = roomState.budgets[team] || 0;
                    const spent   = (roomState.globalSettings?.initialBudget || 100) - budget;
                    const color   = TEAM_COLORS[idx % TEAM_COLORS.length];
                    return (
                        <motion.div
                            key={team}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="p-5 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl space-y-3"
                        >
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                                <span className="text-xs font-black uppercase tracking-tight truncate">{team}</span>
                            </div>
                            <div>
                                <p className="text-[10px] opacity-30 uppercase tracking-widest">Players</p>
                                <p className="text-2xl font-black italic" style={{ color }}>{players.length}</p>
                            </div>
                            <div>
                                <p className="text-[10px] opacity-30 uppercase tracking-widest">Spent</p>
                                <p className="text-sm font-black">{formatPrice(spent)}</p>
                            </div>
                            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full rounded-full"
                                    style={{ width: `${Math.min(100, (players.length / Math.max(1, Math.max(...teamNames.map(t => (roomState.squads[t] || []).length)))) * 100)}%`, backgroundColor: color }} />
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Format Selection & Activity */}
            {!analysis && !loading && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-8 py-10 bg-white/5 rounded-[40px] border border-white/10 p-10 w-full max-w-2xl mx-auto shadow-2xl">
                    <div className="text-center space-y-2">
                        <h3 className="text-xl font-black uppercase tracking-widest italic text-primary">Strategic Protocol</h3>
                        <p className="text-[10px] uppercase tracking-[0.3em] opacity-30">Define the combat format for AI evaluation</p>
                    </div>

                    {!isAdmin ? (
                        <div className="p-8 text-center bg-black/40 rounded-3xl border border-white/5 w-full">
                            <AlertCircle className="w-10 h-10 text-primary/40 mx-auto mb-4" />
                            <p className="text-sm font-bold opacity-60 uppercase tracking-widest">Awaiting Admin Authorization</p>
                            <p className="text-[9px] opacity-20 uppercase mt-2">Only the Room Commander can trigger strategic analysis</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex flex-wrap justify-center gap-2">
                                {['T20', 'ODI', 'TEST', 'IPL'].map(f => (
                                    <button
                                        key={f}
                                        onClick={() => { setSelectedFormat(f); setShowCustomInput(false); }}
                                        className={`px-6 py-3 rounded-2xl font-black text-[10px] transition-all border ${!showCustomInput && selectedFormat === f ? 'bg-primary border-primary shadow-[0_0_20px_rgba(234,42,51,0.3)]' : 'bg-white/5 border-white/10 opacity-40 hover:opacity-100'}`}
                                    >
                                        {f}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setShowCustomInput(true)}
                                    className={`px-6 py-3 rounded-2xl font-black text-[10px] transition-all border ${showCustomInput ? 'bg-primary border-primary shadow-[0_0_20px_rgba(234,42,51,0.3)]' : 'bg-white/5 border-white/10 opacity-40 hover:opacity-100'}`}
                                >
                                    CUSTOM
                                </button>
                            </div>

                            {showCustomInput && (
                                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="w-full">
                                    <input 
                                        type="text" 
                                        placeholder="Enter Custom Format (e.g. World Cup Final)..." 
                                        value={customFormat}
                                        onChange={(e) => setCustomFormat(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-xs font-bold outline-none focus:border-primary transition-all text-center"
                                    />
                                </motion.div>
                            )}

                            {!hasEnoughData && (
                                <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-yellow-500/10 border border-yellow-500/20">
                                    <AlertCircle className="w-5 h-5 text-yellow-400" />
                                    <p className="text-[10px] font-black uppercase text-yellow-300/80 tracking-widest">Incomplete Data: 2 Teams Required</p>
                                </div>
                            )}

                            <div className="space-y-4 text-center w-full">
                                <motion.button
                                    whileHover={{ scale: 1.04 }}
                                    whileTap={{ scale: 0.96 }}
                                    onClick={runAnalysis}
                                    disabled={!hasEnoughData || (showCustomInput && !customFormat.trim())}
                                    className="w-full py-6 rounded-3xl bg-gradient-to-r from-primary to-red-700 text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl disabled:opacity-20 disabled:cursor-not-allowed flex items-center justify-center gap-4 transition-all"
                                >
                                    <Sparkles className="w-5 h-5" />
                                    Launch Tactical Comparison
                                </motion.button>
                                <p className="text-[9px] font-black uppercase tracking-[0.4em] opacity-20">
                                    Zero-Stats evaluation enabled • Format: {showCustomInput ? (customFormat || '???') : selectedFormat}
                                </p>
                            </div>
                        </>
                    )}
                </motion.div>
            )}

            {/* Loading */}
            <AnimatePresence>
                {loading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center gap-6 py-20"
                    >
                        <div className="relative">
                            <div className="w-20 h-20 rounded-full border-2 border-purple-500/20 flex items-center justify-center">
                                <Loader className="w-8 h-8 text-purple-400 animate-spin" />
                            </div>
                            <div className="absolute inset-0 bg-purple-500/10 rounded-full blur-xl animate-pulse" />
                        </div>
                        <div className="text-center">
                            <p className="font-black text-lg uppercase tracking-widest animate-pulse">Consulting Gemini AI...</p>
                            <p className="text-[10px] uppercase tracking-[0.3em] opacity-30 mt-2">Analyzing every player • Computing strategies • Predicting outcomes</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Error */}
            {error && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center gap-4"
                >
                    <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
                    <div>
                        <p className="font-black text-sm uppercase">Analysis Failed</p>
                        <p className="text-[11px] opacity-60 mt-1">{error}</p>
                    </div>
                    <button onClick={runAnalysis} className="ml-auto px-6 py-3 bg-red-500/20 hover:bg-red-500/30 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
                        Retry
                    </button>
                </motion.div>
            )}

            {/* Results */}
            <AnimatePresence>
                {analysis && (
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="space-y-10"
                    >
                        {/* Winner Banner */}
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
                            className="relative overflow-hidden p-10 rounded-[40px] bg-gradient-to-br from-yellow-500/20 via-orange-500/10 to-transparent border border-yellow-500/30 shadow-[0_0_100px_rgba(234,179,8,0.15)]"
                        >
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-yellow-500/10 rounded-full blur-3xl" />
                            <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8">
                                <div className="w-20 h-20 rounded-3xl bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center flex-shrink-0">
                                    <Crown className="w-10 h-10 text-yellow-400" />
                                </div>
                                <div className="text-center md:text-left">
                                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-yellow-400 mb-2">🏆 Predicted Winner</p>
                                    <h3 className="text-5xl font-black italic uppercase tracking-tighter text-yellow-300">{analysis.winner}</h3>
                                    <p className="mt-4 text-white/60 font-medium leading-relaxed max-w-2xl">{analysis.winnerReasoning}</p>
                                    {analysis.keyMatchup && (
                                        <p className="mt-3 text-[11px] font-black uppercase tracking-widest text-yellow-400/60">
                                            Key Matchup: {analysis.keyMatchup}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                        {analysis.comparisonTable && (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                                <h3 className="text-xl font-black italic uppercase tracking-tight flex items-center gap-3">
                                    <BarChart3 className="w-5 h-5 text-primary" />
                                    Technical Comparison
                                </h3>
                                <div className="bg-white/5 border border-white/10 rounded-[40px] overflow-hidden backdrop-blur-3xl shadow-2xl">
                                    <div className="overflow-x-auto no-scrollbar">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-white/5">
                                                    {analysis.comparisonTable.headers.map((h, i) => (
                                                        <th key={i} className={`p-6 text-[10px] font-black uppercase tracking-[0.3em] ${i === 0 ? 'opacity-40' : 'text-primary'}`}>
                                                            {h}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {analysis.comparisonTable.rows.map((row, idx) => (
                                                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                                                        {row.map((cell, cidx) => (
                                                            <td key={cidx} className={`p-6 text-xs font-bold ${cidx === 0 ? 'opacity-30 uppercase' : 'text-white/80'}`}>
                                                                <div className="flex items-center gap-2">
                                                                    {cidx > 0 && <span className={`w-1.5 h-1.5 rounded-full ${cell.includes('ELITE') || cell.includes('SURGICAL') ? 'bg-primary' : 'bg-white/20'}`} />}
                                                                    {cell}
                                                                </div>
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Team Analyses */}
                        <div className="space-y-4">
                            <h3 className="text-xl font-black italic uppercase tracking-tight flex items-center gap-3">
                                <Target className="w-5 h-5 text-purple-400" />
                                Team Breakdown
                            </h3>
                            {(analysis.teamAnalyses || []).map((team, idx) => {
                                const color = TEAM_COLORS[idx % TEAM_COLORS.length];
                                const isWinner = team.teamName === analysis.winner;
                                const isExpanded = expandedTeam === team.teamName;
                                const tm = team.tacticalMetrics || {};
                                const radarValues = [
                                    tm.Attack || (team.teamScore || 70),
                                    tm.Defense || 75,
                                    tm.Versatility || 80,
                                    tm.Clutch || 85,
                                    (team.strengths?.length || 1) * 20
                                ];

                                return (
                                    <motion.div
                                        key={team.teamName}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.15 }}
                                        className={`rounded-3xl border overflow-hidden transition-all ${isWinner ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-white/10 bg-white/5'}`}
                                    >
                                        <button
                                            onClick={() => setExpandedTeam(isExpanded ? null : team.teamName)}
                                            className="w-full p-6 flex items-center gap-6 text-left"
                                        >
                                            <div className="w-3 h-12 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3">
                                                    <h4 className="font-black text-xl uppercase italic tracking-tight">{team.teamName}</h4>
                                                    {isWinner && <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full font-black uppercase">Winner</span>}
                                                </div>
                                                <p className="text-sm text-white/40 mt-1 line-clamp-1">{team.verdict}</p>
                                            </div>
                                            <div className="flex items-center gap-6 flex-shrink-0">
                                                <div className="text-right">
                                                    <p className="text-[10px] opacity-30 uppercase tracking-widest">Score</p>
                                                    <p className="text-2xl font-black italic" style={{ color }}>{team.teamScore || '—'}</p>
                                                </div>
                                                {isExpanded ? <ChevronUp className="w-5 h-5 opacity-40" /> : <ChevronDown className="w-5 h-5 opacity-40" />}
                                            </div>
                                        </button>

                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.3 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="px-6 pb-8 grid grid-cols-1 md:grid-cols-3 gap-8 border-t border-white/5 pt-6">
                                                        {/* Radar */}
                                                        <div className="flex flex-col items-center gap-4">
                                                            <RadarChart
                                                                values={radarValues}
                                                                labels={['Score', 'Attack', 'Defense', 'Value', 'Depth']}
                                                                color={color}
                                                                size={180}
                                                            />
                                                            <div className="space-y-2 w-full max-w-[200px]">
                                                                <ScoreBar value={team.teamScore || 0} max={100} color={color} label="Overall" />
                                                                <ScoreBar value={team.totalInvested || 0} max={roomState?.globalSettings?.initialBudget || 100} color={color} label="Investment" />
                                                            </div>
                                                        </div>

                                                        {/* Strengths */}
                                                        <div className="space-y-4">
                                                            <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-green-400">Strengths</h5>
                                                            <ul className="space-y-2">
                                                                {(team.strengths || []).map((s, i) => (
                                                                    <li key={i} className="flex items-start gap-3">
                                                                        <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                                            <Star className="w-3 h-3 text-green-400" />
                                                                        </div>
                                                                        <span className="text-sm text-white/60">{s}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                            <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-red-400 mt-6">Weaknesses</h5>
                                                            <ul className="space-y-2">
                                                                {(team.weaknesses || []).map((w, i) => (
                                                                    <li key={i} className="flex items-start gap-3">
                                                                        <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                                            <Shield className="w-3 h-3 text-red-400" />
                                                                        </div>
                                                                        <span className="text-sm text-white/60">{w}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>

                                                        {/* Key Players */}
                                                        <div className="space-y-4">
                                                            <h5 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Key Players</h5>
                                                            <div className="space-y-2">
                                                                {(team.keyPlayers || []).map((p, i) => (
                                                                    <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
                                                                        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black"
                                                                            style={{ backgroundColor: color + '33', color }}>
                                                                            {i + 1}
                                                                        </div>
                                                                        <span className="text-sm font-bold">{p}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 mt-4">
                                                                <p className="text-[10px] opacity-30 uppercase tracking-widest mb-2">Team Verdict</p>
                                                                <p className="text-sm text-white/70 leading-relaxed">{team.verdict}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                );
                            })}
                        </div>

                        {/* Head to Head */}
                        {(analysis.headToHead || []).length > 0 && (
                            <div className="space-y-4">
                                <h3 className="text-xl font-black italic uppercase tracking-tight flex items-center gap-3">
                                    <TrendingUp className="w-5 h-5 text-blue-400" />
                                    Head-to-Head Comparison
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {analysis.headToHead.map((h, i) => {
                                        const winnerIdx = teamNames.indexOf(h.winner);
                                        const winColor = TEAM_COLORS[winnerIdx >= 0 ? winnerIdx % TEAM_COLORS.length : 0];
                                        return (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.08 }}
                                                className="p-5 rounded-3xl bg-white/5 border border-white/10 space-y-3"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{h.category}</span>
                                                    <span className="text-[10px] font-black px-3 py-1 rounded-full" style={{ backgroundColor: winColor + '33', color: winColor }}>
                                                        {h.winner} wins
                                                    </span>
                                                </div>
                                                <p className="text-sm text-white/50">{h.reasoning}</p>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Player Comparisons */}
                        {(analysis.playerComparisons || []).length > 0 && (
                            <div className="space-y-4">
                                <h3 className="text-xl font-black italic uppercase tracking-tight flex items-center gap-3">
                                    <Users className="w-5 h-5 text-green-400" />
                                    Position-by-Position Comparison
                                </h3>
                                <div className="space-y-3">
                                    {analysis.playerComparisons.map((comp, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.1 }}
                                            className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-4"
                                        >
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-black uppercase italic tracking-tight">{comp.position}</h4>
                                                <span className="text-[10px] font-black text-green-400 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                                                    Best: {comp.bestPlayer}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                                {(comp.players || []).map((p, pi) => {
                                                    const teamIdx = teamNames.indexOf(p.teamName);
                                                    const pc = TEAM_COLORS[teamIdx >= 0 ? teamIdx % TEAM_COLORS.length : 0];
                                                    const isTop = p.playerName === comp.bestPlayer;
                                                    return (
                                                        <div key={pi}
                                                            className={`p-4 rounded-2xl border ${isTop ? 'border-green-500/30 bg-green-500/5' : 'border-white/5 bg-black/20'}`}>
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: pc }} />
                                                                <span className="text-[10px] font-black opacity-40 uppercase">{p.teamName}</span>
                                                            </div>
                                                            <p className="text-xs font-black truncate">{p.playerName}</p>
                                                            <div className="mt-2 flex items-center justify-between">
                                                                <span className="text-[10px] opacity-30">Rating</span>
                                                                <span className="text-sm font-black" style={{ color: pc }}>{p.rating}</span>
                                                            </div>
                                                            <p className="text-[10px] opacity-40 mt-1">{p.note}</p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Re-analyze */}
                        <div className="flex justify-center pt-6">
                            <button
                                onClick={runAnalysis}
                                disabled={loading}
                                className="px-10 py-4 rounded-2xl bg-white/5 border border-white/10 text-[11px] font-black uppercase tracking-widest hover:bg-purple-500/10 hover:border-purple-500/30 transition-all"
                            >
                                {loading ? <Loader className="w-4 h-4 animate-spin" /> : 'Re-analyze'}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AIAnalysis;
