import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import AuctionDashboard from './components/AuctionDashboard';
import WaitingLobby from './components/WaitingLobby';
import { Trophy, ArrowRight } from 'lucide-react';
import { io } from 'socket.io-client';

const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001', { transports: ['websocket'] });

function App() {
  const [view, setView] = useState('landing');
  const [roomId, setRoomId] = useState('');
  const [user, setUser] = useState(() => ({ name: 'User_' + Math.floor(Math.random() * 1000), teamName: '' }));
  const [roomState, setRoomState] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [connected, setConnected] = useState(socket.connected);

  useEffect(() => {
    socket.on('connect', () => {
      console.log('Client: Socket connected', socket.id);
      setConnected(true);
    });
    socket.on('disconnect', () => {
      console.log('Client: Socket disconnected');
      setConnected(false);
    });
    socket.on('connect_error', (err) => {
      console.error('Client: Socket connect error', err);
      setConnected(false);
    });

    socket.on('room-created', (id) => {
      console.log('Client: room-created received', id);
      setRoomId(id);
      setIsAdmin(true);
      setView('waiting');
    });

    socket.on('room-joined', ({ roomId, state, isAdmin }) => {
      console.log('Client: room-joined received', roomId);
      setRoomId(roomId);
      setRoomState(state);
      setIsAdmin(isAdmin);

      // Auto-redirect if auction is already active or finished
      if (['active', 'paused', 'finished'].includes(state.status)) {
        setView('auction');
      } else {
        setView('waiting');
      }
    });

    socket.on('admin-status', (status) => {
      console.log('Client: admin-status updated', status);
      setIsAdmin(status);
    });

    socket.on('room-update', (state) => {
      console.log('Client: room-update received', state.players?.length, 'players');
      setRoomState({ ...state });
    });

    socket.on('auction-started', ({ state }) => {
      console.log('Client: auction-started received', state);
      if (state) setRoomState(state);
      setView('auction');
    });

    socket.on('error', (msg) => {
      console.error('Client: socket error', msg);
      alert(msg);
    });

    return () => {
      socket.off('room-created');
      socket.off('room-joined');
      socket.off('room-update');
      socket.off('auction-started');
      socket.off('error');
    };
  }, []);

  const handleJoin = (id, teamName) => {
    console.log('Client: handleJoin called with id', id);
    if (!id) return alert('Please enter a Room ID');
    if (!teamName) return alert('Please enter a Team Name');
    setUser(prev => ({ ...prev, teamName }));
    socket.emit('join-room', id);
    socket.emit('set-team-name', { roomId: id, teamName });
  };

  const handleCreate = (teamName) => {
    console.log('Client: handleCreate called');
    if (!teamName) return alert('Please enter a Team Name');
    const id = '#' + Math.random().toString(36).substring(2, 8).toUpperCase();
    console.log('Client: Generated roomId', id);
    setUser(prev => ({ ...prev, teamName }));
    socket.emit('create-room', id);
    socket.emit('set-team-name', { roomId: id, teamName });
  };

  const handleStartAuction = () => {
    socket.emit('start-auction', roomId);
  };

  return (
    <div className="min-h-screen text-white bg-transparent">
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
          onStartAuction={handleStartAuction}
        />
      )}

      {view === 'auction' && (
        <AuctionDashboard roomId={roomId} user={user} socket={socket} isAdmin={isAdmin} initialRoomState={roomState} />
      )}
    </div>
  );
}

export default App;
