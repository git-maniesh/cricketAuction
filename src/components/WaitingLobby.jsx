import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Users, Plus, Trash2, Play, Upload, Settings, 
    Shield, ChevronRight, X, UserMinus, Crown, 
    LogOut, FileSpreadsheet, Info, Copy, CheckCircle2
} from 'lucide-react';

const WaitingLobby = ({ roomId, roomState, isAdmin, socket, onStartAuction, onExit }) => {
    const [activeTab, setActiveTab] = useState('players'); // 'players', 'teams', 'settings'
    const [showAddModal, setShowAddModal] = useState(false);
    const [notification, setNotification] = useState(null);
    const [newPlayer, setNewPlayer] = useState({ name: '', basePrice: '', ovr: '', position: '', image: '' });
    const fileInputRef = useRef(null);

    if (!roomState) return null;

    const teams = Object.values(roomState.userToTeam || {});
    const players = roomState.players || [];

    const showNotification = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 4000);
    };

    const copyRoomId = () => {
        navigator.clipboard.writeText(roomId);
        showNotification('Room ID copied!', 'success');
    };

    const handleExcelUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                const formattedPlayers = data.map(row => ({
                    name: row.Name || row.name || 'Unknown',
                    basePrice: parseFloat(row.Price || row.price || row.BasePrice || 1),
                    ovr: parseInt(row.OVR || row.ovr || row.Rating || 80),
                    position: row.Position || row.position || 'N/A',
                    image: row.Image || row.image || 'https://img.freepik.com/free-vector/shining-fist-man-white-background-strong-muscles-athlete_1142-43097.jpg',
                    badges: row.Badges ? String(row.Badges).split(',') : ['Registry Entry'],
                    stats: [{ label: 'VAL', value: parseInt(row.OVR || row.ovr || 80) }]
                }));

                socket.emit('update-players', { roomId, players: formattedPlayers });
                showNotification(`Imported ${formattedPlayers.length} players`, 'success');
            } catch (err) {
                showNotification('Excel parse error', 'error');
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleAddPlayer = () => {
        if (!newPlayer.name || !newPlayer.basePrice) return;
        const playerToEmit = {
            ...newPlayer,
            image: newPlayer.image || 'https://img.freepik.com/free-vector/shining-fist-man-white-background-strong-muscles-athlete_1142-43097.jpg'
        };
        socket.emit('add-player', { roomId, player: playerToEmit });
        setNewPlayer({ name: '', basePrice: '', ovr: '', position: '', image: '' });
        setShowAddModal(false);
        showNotification('Player registered successfully', 'success');
    };

    return (
        <div className="min-h-screen bg-[#080d09] flex flex-col font-display text-white">
            {/* Global Notifications */}
            <AnimatePresence>
                {notification && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, x: '-50%' }}
                        animate={{ opacity: 1, y: 20, x: '-50%' }}
                        exit={{ opacity: 0, y: -20, x: '-50%' }}
                        className="fixed top-0 left-1/2 z-[100] px-6 py-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 flex items-center gap-3 shadow-2xl"
                    >
                        {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Info className="w-4 h-4 text-red-400" />}
                        <span className="text-xs font-black uppercase tracking-widest">{notification.message}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <header className="p-4 sm:p-6 border-b border-white/5 flex items-center justify-between backdrop-blur-md bg-black/20 sticky top-0 z-30">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <Users className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30">Synchronizing Lobby</h2>
                        <h1 className="text-xl sm:text-2xl font-black italic uppercase tracking-tight flex items-center gap-2">
                            {roomId}
                            <button onClick={copyRoomId} className="p-1 hover:text-primary transition-colors"><Copy className="w-3 h-3 h-3" /></button>
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-3 sm:gap-4">
                    {isAdmin && players.length > 0 && (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={onStartAuction}
                            className="bg-primary hover:bg-red-700 text-white px-4 sm:px-8 py-2.5 sm:py-3 rounded-xl font-black italic uppercase tracking-widest text-[10px] sm:text-xs flex items-center gap-2 sm:gap-3 shadow-xl transition-all"
                        >
                            <Play className="w-3 h-3 sm:w-4 sm:h-4 fill-white" />
                            Launch
                        </motion.button>
                    )}
                    <button 
                        onClick={onExit}
                        className="p-2.5 sm:p-3 rounded-xl bg-white/5 hover:bg-red-500/10 hover:text-red-500 transition-all border border-white/5"
                    >
                        <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                </div>
            </header>

            <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Left: Navigation */}
                <div className="lg:col-span-3 space-y-6">
                    <div className="space-y-2">
                        {['players', 'teams', 'settings'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all border ${
                                    activeTab === tab 
                                    ? 'bg-primary/10 border-primary/30 text-primary' 
                                    : 'bg-white/5 border-transparent text-white/40 hover:bg-white/10 hover:text-white/60'
                                }`}
                            >
                                <span className="text-[10px] font-black uppercase tracking-widest">{tab}</span>
                                {tab === 'players' && <span className="text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded-full">{players.length}</span>}
                                {tab === 'teams' && <span className="text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded-full">{teams.length}</span>}
                                {activeTab === tab && <ChevronRight className="w-4 h-4" />}
                            </button>
                        ))}
                    </div>

                    <div className="p-6 rounded-[32px] bg-white/5 border border-white/10 space-y-4">
                        <div className="flex items-center gap-3 text-white/30">
                            <Shield className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Protocol</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold opacity-60">Your Role</span>
                            <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase ${isAdmin ? 'bg-primary/20 text-primary' : 'bg-blue-500/20 text-blue-400'}`}>
                                {isAdmin ? 'ADMIN' : 'USER'}
                            </span>
                        </div>
                        <div className="pt-4 border-t border-white/5">
                            <p className="text-[10px] text-white/20 leading-relaxed font-medium">
                                {isAdmin 
                                    ? "Full administrative access. Manage roster, kick players, and initiate the draft."
                                    : "Observer/Bidder mode. Waiting for the administrator to finalize coordinates."
                                }
                            </p>
                        </div>
                    </div>
                </div>

                {/* Center Content */}
                <div className="lg:col-span-9">
                    {activeTab === 'players' && (
                        <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <h3 className="text-xl sm:text-2xl font-black italic uppercase tracking-tight">Draft Assets</h3>
                                {isAdmin && (
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => fileInputRef.current?.click()}
                                            className="bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all"
                                        >
                                            <Upload className="w-3 h-3 text-primary" />
                                            Import
                                            <input type="file" ref={fileInputRef} onChange={handleExcelUpload} accept=".xlsx, .xls" className="hidden" />
                                        </button>
                                        <button 
                                            onClick={() => setShowAddModal(true)}
                                            className="bg-primary hover:bg-red-700 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg"
                                        >
                                            <Plus className="w-3 h-3" />
                                            Manual
                                        </button>
                                        <button 
                                            onClick={() => socket.emit('clear-players', roomId)}
                                            className="p-2.5 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all border border-red-500/20"
                                            title="Clear List"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                                {players.map((p, idx) => (
                                    <motion.div
                                        key={idx}
                                        layout
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="group relative p-4 rounded-3xl bg-white/5 border border-white/5 hover:border-primary/20 transition-all overflow-hidden"
                                    >
                                        {isAdmin && (
                                            <button 
                                                onClick={() => socket.emit('remove-player', { roomId, playerIndex: idx })}
                                                className="absolute top-2 right-2 p-2 rounded-lg bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        )}
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center text-sm font-black italic text-primary">
                                                {p.ovr || 80}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-black uppercase italic tracking-tight truncate text-sm">{p.name}</h4>
                                                <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">{p.position || 'N/A'}</p>
                                            </div>
                                        </div>
                                        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                                            <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Base</span>
                                            <span className="text-sm font-black italic text-primary">₹{p.basePrice}Cr</span>
                                        </div>
                                    </motion.div>
                                ))}
                                {players.length === 0 && (
                                    <div className="col-span-full py-20 flex flex-col items-center justify-center text-white/10 border-2 border-dashed border-white/5 rounded-[40px]">
                                        <FileSpreadsheet className="w-10 h-10 mb-4 opacity-20" />
                                        <p className="font-black uppercase tracking-widest text-xs italic">Asset Registry Empty</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'teams' && (
                        <div className="space-y-6">
                            <h3 className="text-xl sm:text-2xl font-black italic uppercase tracking-tight">Active Contenders</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {Object.keys(roomState.budgets || {}).map((name) => (
                                    <div key={name} className="p-5 rounded-3xl bg-white/5 border border-white/5 flex items-center justify-between group overflow-hidden relative">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                                                {roomState.adminTeam === name ? <Crown className="w-5 h-5 text-yellow-500" /> : <Users className="w-5 h-5 text-blue-400" />}
                                            </div>
                                            <div>
                                                <h4 className="font-black uppercase italic tracking-tight text-sm">{name}</h4>
                                                <div className="flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                                    <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Active</span>
                                                </div>
                                            </div>
                                        </div>
                                        {isAdmin && name !== roomState.adminTeam && (
                                            <button 
                                                onClick={() => socket.emit('kick-team', { roomId, teamName: name })}
                                                className="p-2.5 rounded-xl bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                                            >
                                                <UserMinus className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="space-y-6">
                            <h3 className="text-xl sm:text-2xl font-black italic uppercase tracking-tight">Arena Configuration</h3>
                            {isAdmin ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="p-6 rounded-[32px] bg-white/5 border border-white/5 space-y-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center"><Settings className="w-4 h-4 text-primary" /></div>
                                            <h4 className="text-[11px] font-black uppercase tracking-widest">Financial Protocol</h4>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-[9px] font-black text-white/20 uppercase tracking-widest block mb-2 px-1">Initial Cap (Cr)</label>
                                                <div className="flex gap-2">
                                                    <input 
                                                        type="number" 
                                                        value={roomState.globalSettings?.initialBudget || 100}
                                                        onChange={(e) => socket.emit('update-config', { roomId, config: { initialBudget: parseFloat(e.target.value) || 0 }})}
                                                        className="flex-1 bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white font-bold outline-none focus:border-primary/40 focus:bg-black/60 transition-all"
                                                    />
                                                </div>
                                            </div>
                                            <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex gap-3 italic">
                                                <div className="mt-1"><Info className="w-3 h-3 text-yellow-500" /></div>
                                                <p className="text-[9px] text-white/40 leading-relaxed uppercase tracking-widest">Note: Synchronizes all team wallets to the new cap instantly.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-6 rounded-[32px] bg-white/5 border border-white/5 space-y-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center"><Plus className="w-4 h-4 text-blue-400" /></div>
                                            <h4 className="text-[11px] font-black uppercase tracking-widest">Neural Presets</h4>
                                        </div>
                                        <div className="grid grid-cols-1 gap-2">
                                            <button 
                                                onClick={() => socket.emit('load-preset', { roomId, presetType: 'cricket' })}
                                                className="w-full p-4 rounded-xl bg-white/5 border border-white/5 hover:border-blue-500/30 text-left transition-all group"
                                            >
                                                <p className="text-[10px] font-black uppercase italic group-hover:text-blue-400 transition-colors">IPL Arena 2026</p>
                                                <p className="text-[8px] opacity-30 mt-1 uppercase tracking-[0.2em]">Mega Auction Roster</p>
                                            </button>
                                            <button 
                                                onClick={() => socket.emit('load-preset', { roomId, presetType: 'football' })}
                                                className="w-full p-4 rounded-xl bg-white/5 border border-white/5 hover:border-green-500/30 text-left transition-all group"
                                            >
                                                <p className="text-[10px] font-black uppercase italic group-hover:text-green-500 transition-colors">Pro League Draft</p>
                                                <p className="text-[8px] opacity-30 mt-1 uppercase tracking-[0.2em]">Global Elite Pool</p>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-20 flex flex-col items-center justify-center text-center opacity-20 italic">
                                    <Shield className="w-12 h-12 mb-4" />
                                    <p className="font-black uppercase tracking-[0.3em] text-xs">Read-Only Mode</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* Manual Add Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setShowAddModal(false)} className="absolute inset-0 bg-black/90 backdrop-blur-3xl" />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="relative w-full max-w-md bg-[#0e120f] border border-white/10 rounded-[32px] p-6 sm:p-8 shadow-2xl"
                        >
                            <h3 className="text-2xl font-black italic uppercase tracking-tight mb-6">Register Asset</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[9px] font-black text-white/30 uppercase tracking-widest block mb-2 px-1">Asset Identity</label>
                                    <input type="text" placeholder="e.g. MS Dhoni" value={newPlayer.name}
                                        onChange={(e) => setNewPlayer({ ...newPlayer, name: e.target.value })}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white font-bold outline-none focus:border-primary/40 transition-all"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[9px] font-black text-white/30 uppercase tracking-widest block mb-2 px-1">Price (Cr)</label>
                                        <input type="number" placeholder="2.0" value={newPlayer.basePrice}
                                            onChange={(e) => setNewPlayer({ ...newPlayer, basePrice: e.target.value })}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white font-bold outline-none focus:border-primary/40 transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black text-white/30 uppercase tracking-widest block mb-2 px-1">OVR</label>
                                        <input type="number" placeholder="90" value={newPlayer.ovr}
                                            onChange={(e) => setNewPlayer({ ...newPlayer, ovr: e.target.value })}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white font-bold outline-none focus:border-primary/40 transition-all"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-white/30 uppercase tracking-widest block mb-2 px-1">Position</label>
                                    <input type="text" placeholder="WK-Batter" value={newPlayer.position}
                                        onChange={(e) => setNewPlayer({ ...newPlayer, position: e.target.value })}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white font-bold outline-none focus:border-primary/40 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-white/30 uppercase tracking-widest block mb-2 px-1">Profile Photo URL</label>
                                    <input type="text" placeholder="https://..." value={newPlayer.image}
                                        onChange={(e) => setNewPlayer({ ...newPlayer, image: e.target.value })}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white font-bold outline-none focus:border-primary/40 transition-all text-xs"
                                    />
                                </div>
                                <button onClick={handleAddPlayer} className="w-full bg-primary hover:bg-red-700 py-4 rounded-2xl font-black uppercase text-sm shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] mt-2">
                                    Inject into Roster
                                </button>
                                <button onClick={() => setShowAddModal(false)} className="w-full bg-white/5 hover:bg-white/10 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all">
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default WaitingLobby;
