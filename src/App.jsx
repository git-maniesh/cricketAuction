import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import AuctionDashboard from './components/AuctionDashboard';
import WaitingLobby from './components/WaitingLobby';
import { useLocalSession } from './hooks/useLocalSession';
import { io } from 'socket.io-client';

const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001', { 
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: 10
});

function App() {
  const { session, saveSession, clearSession } = useLocalSession();
  const [view, setView] = useState('landing');
  const [roomId, setRoomId] = useState('');
  const [user, setUser] = useState(() => ({ 
    name: session?.username || '', 
    teamName: session?.teamName || '',
    username: session?.username || ''
  }));
  const [roomState, setRoomState] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(socket.connected);

  // Auto-rejoin from session on mount
  useEffect(() => {
    if (session?.roomId && session?.teamName) {
      // Small timeout to ensure socket is ready
      setTimeout(() => {
        const normalizedId = session.roomId.startsWith('#') ? session.roomId : `#${session.roomId.toUpperCase()}`;
        socket.emit('join-room', { 
          roomId: normalizedId, 
          teamName: session.teamName, 
          username: session.username 
        });
      }, 500);
    }
  }, []);

  useEffect(() => {
    socket.on('connect', () => {
      setConnected(true);
      // If we have a session, rejoin on reconnect
      if (session?.roomId && session?.teamName) {
        socket.emit('join-room', { 
          roomId: session.roomId, 
          teamName: session.teamName, 
          username: session.username 
        });
      }
    });

    socket.on('disconnect', () => setConnected(false));
    
    socket.on('room-created', ({ roomId, state, isAdmin }) => {
      setRoomId(roomId);
      setIsAdmin(true);
      if (state) setRoomState(state);
      setLoading(false);
      setView('waiting');
      // Save session
      saveSession({
        roomId,
        teamName: user.teamName,
        username: user.username || user.name,
        role: 'admin'
      });
    });

    socket.on('room-joined', ({ roomId, state, isAdmin, isRejoin }) => {
      setRoomId(roomId);
      setRoomState(state);
      setIsAdmin(isAdmin);
      setLoading(false);
      
      // Update local user state from server state if it's a rejoin
      if (isRejoin) {
        const username = user.username || user.name;
        const teamName = state.userToTeam?.[username];
        if (teamName) setUser(prev => ({ ...prev, teamName }));
      }

      // Save/refresh session
      const currentUsername = user.username || user.name;
      const currentTeam = state.userToTeam?.[currentUsername] || user.teamName;
      
      saveSession({
        roomId,
        teamName: currentTeam,
        username: currentUsername,
        role: isAdmin ? 'admin' : 'user'
      });

      if (['active', 'paused', 'finished'].includes(state.status)) {
        setView('auction');
      } else {
        setView('waiting');
      }
    });

    socket.on('admin-status', (status) => {
      setIsAdmin(status);
    });

    socket.on('room-update', (state) => {
      setRoomState(prev => {
        if (!prev) return state;
        // Merge state but PRESERVE the players list if it's missing from the delta (Compact Sync)
        return { ...prev, ...state, players: state.players || prev.players };
      });
    });

    socket.on('auction-started', ({ state }) => {
      if (state) {
        setRoomState(state);
        setView('auction');
      }
    });

    socket.on('new-bid', ({ currentBid, timeLeft, bids }) => {
      setRoomState(prev => prev ? { ...prev, currentBid, timeLeft, bids } : null);
    });

    socket.on('player-sold', ({ player, bidder, amount, squads, budgets }) => {
      setRoomState(prev => prev ? { 
        ...prev, 
        squads, 
        budgets, 
        currentBid: { amount: 0, bidder: null },
        activity: [...(prev.activity || [])] // will be updated by activity-update soon anyway
      } : null);
    });

    socket.on('player-unsold', () => {
      // Logic handled by room-update usually, but can preempt here
    });

    socket.on('activity-update', (item) => {
      setRoomState(prev => {
        if (!prev) return null;
        const newActivity = [...(prev.activity || []), item].slice(-100);
        return { ...prev, activity: newActivity };
      });
    });

    socket.on('timer-update', (timeLeft) => {
      setRoomState(prev => prev ? { ...prev, timeLeft } : null);
    });

    socket.on('kicked', ({ message }) => {
      alert(message);
      clearSession();
      window.location.reload();
    });

    socket.on('error', (msg) => {
      console.error('Socket error:', msg);
      alert(msg);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('room-created');
      socket.off('room-joined');
      socket.off('room-update');
      socket.off('auction-started');
      socket.off('new-bid');
      socket.off('player-sold');
      socket.off('player-unsold');
      socket.off('activity-update');
      socket.off('timer-update');
      socket.off('kicked');
      socket.off('error');
    };
  }, [user, session, saveSession, clearSession]);

  const handleJoin = (id, teamName, username) => {
    if (!id) return alert('Please enter a Room ID');
    if (!teamName) return alert('Please enter a Team Name');
    if (!username) return alert('Please enter a Username');
    
    setLoading(true);
    const formattedId = id.startsWith('#') ? id : `#${id.toUpperCase()}`;
    setUser({ name: username, teamName, username });
    socket.emit('join-room', { roomId: formattedId, teamName, username });
  };

  const handleCreate = (teamName, username) => {
    if (!teamName) return alert('Please enter a Team Name');
    if (!username) return alert('Please enter a Username');
    
    setLoading(true);
    const id = '#' + Math.random().toString(36).substring(2, 8).toUpperCase();
    setUser({ name: username, teamName, username });
    socket.emit('create-room', { roomId: id, teamName, username });
  };

  const handleExit = () => {
    clearSession();
    window.location.reload();
  };

  return (
    <div className="min-h-screen text-white bg-transparent">
      {loading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl">
           <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50 animate-pulse">Synchronizing with Arena...</p>
           </div>
        </div>
      )}
      {view === 'landing' && (
        <LandingPage
          onJoin={handleJoin}
          onCreate={handleCreate}
          onUserChange={setUser}
          user={user}
          connected={connected}
        />
      )}

      {view === 'waiting' && (
        <WaitingLobby
          roomId={roomId}
          roomState={roomState}
          isAdmin={isAdmin}
          socket={socket}
          onStartAuction={() => socket.emit('start-auction', roomId)}
          onExit={handleExit}
        />
      )}

      {view === 'auction' && (
        <AuctionDashboard 
          roomId={roomId} 
          user={user} 
          socket={socket} 
          isAdmin={isAdmin} 
          roomState={roomState}
          onExit={handleExit}
        />
      )}
    </div>
  );
}

export default App;

