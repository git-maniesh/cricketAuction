import React, { useRef } from 'react';
import { Trophy, ArrowRight, Users, Settings, Plus, Copy, CheckCircle2, FileUp, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';

const WaitingLobby = ({ roomId, roomState, isAdmin, socket, onStartAuction }) => {
    const fileInputRef = useRef(null);
    const teams = roomState ? Object.values(roomState.teamNames) : [];

    const copyRoomId = () => {
        navigator.clipboard.writeText(roomId);
        alert('Room ID copied to clipboard!');
    };

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

            // Map Excel data to player structure
            const newPlayers = jsonData.map(row => ({
                name: row.Name || row.name || 'Unknown',
                basePrice: parseFloat(row.Price || row.price || row.BasePrice || 0),
                ovr: parseInt(row.OVR || row.ovr || 80),
                position: row.Position || row.position || 'N/A',
                image: row.Image || row.image || null,
                badges: row.Badges ? row.Badges.split(',') : ["Scouted"],
                stats: [
                    { label: "VAL", value: parseInt(row.OVR || row.ovr || 80) }
                ]
            })).filter(p => p.name !== 'Unknown');

            if (newPlayers.length > 0) {
                socket.emit('update-players', { roomId, players: [...roomState.players, ...newPlayers] });
                alert(`Successfully imported ${newPlayers.length} players!`);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    return (
        <div className="min-h-screen relative flex flex-col items-center justify-center p-6 overflow-hidden bg-transparent">
            {/* Ambient Background */}
            <div className="fixed inset-0 z-0">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-50" />
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/20 rounded-full blur-[120px]" />
                <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                {/* Left Side: Room Info & Players */}
                <div className="lg:col-span-12 xl:col-span-8 flex flex-col items-center xl:items-start text-center xl:text-left">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-primary/20 p-5 rounded-3xl border border-primary/30 mb-8 shadow-[0_0_50px_rgba(234,42,51,0.2)] inline-block"
                    >
                        <Trophy className="w-10 h-10 text-primary" />
                    </motion.div>

                    <h1 className="text-7xl font-black mb-4 italic tracking-tighter uppercase leading-none">
                        Arena <span className="text-primary">{roomId}</span>
                    </h1>
                    <p className="text-white/40 mb-12 uppercase tracking-[0.4em] font-black text-xs">Waiting for rival bidders to synchronize...</p>

                    <div className="w-full bg-surface-dark/40 backdrop-blur-3xl border border-white/5 rounded-[48px] p-10 shadow-2xl relative overflow-hidden group">
                        <div className="absolute -inset-2 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-10">
                                <h3 className="text-2xl font-black italic uppercase tracking-tight flex items-center gap-3">
                                    <Users className="w-6 h-6 text-primary" />
                                    Joined Contenders
                                </h3>
                                <span className="text-xs font-black bg-white/5 border border-white/10 px-4 py-2 rounded-full opacity-60 uppercase tracking-widest">
                                    {teams.length} Teams Online
                                </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 mb-12">
                                <AnimatePresence mode="popLayout">
                                    {teams.map((name, i) => (
                                        <motion.div
                                            key={name}
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0.8, opacity: 0 }}
                                            transition={{ delay: i * 0.1 }}
                                            className="flex flex-col items-center gap-4 p-6 rounded-[32px] bg-white/5 border border-white/5 hover:border-primary/20 hover:bg-primary/5 transition-all group/team"
                                        >
                                            <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center p-2 group-hover/team:scale-110 transition-transform relative">
                                                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`} alt={name} className="w-full h-full object-cover" />
                                                <div className="absolute -top-2 -right-2 bg-green-500 w-6 h-6 rounded-lg flex items-center justify-center shadow-lg border-2 border-[#080d09]">
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                                </div>
                                            </div>
                                            <div className="text-center">
                                                <span className="text-sm font-black italic uppercase block">{name}</span>
                                                <span className="text-[8px] font-black opacity-30 uppercase tracking-[0.2em]">Ready to Raid</span>
                                            </div>
                                        </motion.div>
                                    ))}
                                    <motion.div
                                        className="flex flex-col items-center justify-center gap-4 p-6 rounded-[32px] border-2 border-dashed border-white/5 opacity-40 hover:opacity-100 transition-all cursor-pointer"
                                        onClick={copyRoomId}
                                    >
                                        <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center border border-white/5">
                                            <Plus className="w-8 h-8 opacity-20" />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-widest">Invite Rival</span>
                                    </motion.div>
                                </AnimatePresence>
                            </div>

                            <div className="flex flex-col md:flex-row gap-4">
                                {isAdmin ? (
                                    <button
                                        onClick={onStartAuction}
                                        className="flex-1 bg-primary hover:bg-red-700 text-white py-6 rounded-3xl font-black tracking-[0.2em] uppercase transition-all shadow-xl hover:shadow-primary/30 flex items-center justify-center gap-3 group"
                                    >
                                        COMMENCE AUCTION
                                        <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                                    </button>
                                ) : (
                                    <div className="flex-1 bg-white/5 border border-white/10 py-6 rounded-3xl font-black tracking-[0.2em] uppercase opacity-40 flex items-center justify-center gap-4">
                                        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                        Awaiting Admin Directives...
                                    </div>
                                )}
                                <button
                                    onClick={copyRoomId}
                                    className="px-10 bg-white/5 border border-white/10 hover:bg-white/10 text-white py-6 rounded-3xl font-black tracking-widest uppercase transition-all flex items-center justify-center gap-3"
                                >
                                    <Copy className="w-5 h-5 opacity-40" />
                                    Copy Link
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Player List & Admin Config */}
                <div className="lg:col-span-12 xl:col-span-4 space-y-6">
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-surface-dark/40 backdrop-blur-3xl border border-white/5 rounded-[40px] p-8 shadow-2xl"
                    >
                        <div className="flex items-center gap-3 mb-8">
                            <Settings className="w-5 h-5 text-primary" />
                            <h4 className="text-xl font-black italic uppercase tracking-tight">Roster Status</h4>
                        </div>

                        <div className="space-y-8">
                            {isAdmin && (
                                <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-black opacity-40 uppercase tracking-[0.2em]">Global Asset Budget</span>
                                        <span className="text-primary font-black italic">${roomState?.globalSettings.initialBudget || 100}M</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="50"
                                        max="1000"
                                        step="10"
                                        defaultValue={roomState?.globalSettings.initialBudget || 100}
                                        onMouseUp={(e) => {
                                            const val = parseInt(e.target.value);
                                            socket.emit('update-config', { roomId, config: { initialBudget: val } });
                                        }}
                                        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                                    />
                                    <div className="flex justify-between mt-2 text-[8px] font-black opacity-20 uppercase">
                                        <span>$50M</span>
                                        <span>$1000M</span>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black opacity-40 uppercase tracking-[0.2em]">Roster Registry</span>
                                    <span className="text-[10px] font-black text-primary uppercase">{roomState?.players.length || 0} Assets</span>
                                </div>

                                <div className="max-h-56 overflow-y-auto bg-black/40 rounded-3xl p-4 border border-white/5 custom-scrollbar space-y-2">
                                    {roomState?.players.map((p, i) => (
                                        <div key={`${p.name}-${i}`} className="flex justify-between items-center py-3 px-4 rounded-2xl bg-white/5 border border-white/5 group/player">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold">{p.name}</span>
                                                <span className="text-[10px] font-black text-primary italic">${p.basePrice}M</span>
                                            </div>
                                            {isAdmin && (
                                                <button
                                                    onClick={() => {
                                                        console.log('Client: Emitting remove-player', { roomId, playerIndex: i });
                                                        socket.emit('remove-player', { roomId, playerIndex: i });
                                                    }}
                                                    className="p-2 opacity-20 hover:bg-red-500/20 text-red-500 transition-all rounded-lg"
                                                    title="Remove Player"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    )) || <div className="py-10 text-center opacity-20 italic text-xs">Registry Empty</div>}
                                </div>

                                {isAdmin && (
                                    <>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                onClick={() => socket.emit('load-preset', { roomId, presetType: 'cricket' })}
                                                className="text-[10px] bg-white/5 border border-white/10 text-white px-4 py-3 rounded-2xl hover:bg-blue-500/20 hover:text-blue-400 hover:border-blue-500/30 transition-all font-black uppercase tracking-widest"
                                            >
                                                Cricket
                                            </button>
                                            <button
                                                onClick={() => socket.emit('load-preset', { roomId, presetType: 'football' })}
                                                className="text-[10px] bg-white/5 border border-white/10 text-white px-4 py-3 rounded-2xl hover:bg-green-500/20 hover:text-green-400 hover:border-green-500/30 transition-all font-black uppercase tracking-widest"
                                            >
                                                Football
                                            </button>
                                        </div>

                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleExcelUpload}
                                            accept=".xlsx, .xls"
                                            className="hidden"
                                        />
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-full flex items-center justify-center gap-2 text-[10px] bg-primary/10 border border-primary/20 text-primary px-4 py-4 rounded-2xl hover:bg-primary/20 transition-all font-black uppercase tracking-widest"
                                        >
                                            <FileUp className="w-4 h-4" />
                                            Upload Excel Registry
                                        </button>

                                        <button
                                            onClick={() => socket.emit('clear-players', roomId)}
                                            className="w-full text-[10px] bg-red-500/5 text-red-500/40 hover:text-red-500 px-4 py-2 rounded-2xl hover:bg-red-500/10 transition-all font-black uppercase tracking-widest"
                                        >
                                            Purge Registry
                                        </button>

                                        <div className="p-6 bg-white/5 rounded-3xl border border-white/5 space-y-4">
                                            <span className="text-[10px] font-black opacity-40 uppercase tracking-[0.2em] block">Manual Asset Entry</span>
                                            <div className="flex gap-2">
                                                <input
                                                    id="lobby-player-name"
                                                    placeholder="Identity"
                                                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-primary transition-all"
                                                />
                                                <input
                                                    id="lobby-player-price"
                                                    type="number"
                                                    placeholder="$$$"
                                                    className="w-20 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs outline-none focus:border-primary transition-all"
                                                />
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const name = document.getElementById('lobby-player-name').value;
                                                    const price = parseFloat(document.getElementById('lobby-player-price').value);
                                                    if (name && !isNaN(price)) {
                                                        socket.emit('add-player', { roomId, player: { name, basePrice: price } });
                                                        document.getElementById('lobby-player-name').value = '';
                                                        document.getElementById('lobby-player-price').value = '';
                                                    }
                                                }}
                                                className="w-full bg-primary/20 text-primary border border-primary/30 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-primary hover:text-white transition-all shadow-lg hover:shadow-primary/20"
                                            >
                                                Add to Registry
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </motion.div>

                    <div className="p-6 opacity-20 text-center">
                        <p className="text-[8px] font-black uppercase tracking-[0.3em]">Neural Link Stable • {isAdmin ? 'Admin Priority 01' : 'Observer Mode Active'}</p>
                    </div>
                </div>
            </div>

            <footer className="mt-16 flex gap-10 opacity-20 text-[10px] font-black uppercase tracking-[0.5em]">
                <span>Neural Stream Validated</span>
                <span>Encrypted Arena</span>
                <span>v4.2.1-PRO</span>
            </footer>
        </div>
    );
};

export default WaitingLobby;
