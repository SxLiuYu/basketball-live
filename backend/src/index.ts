import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { getRedisClient } from './services/redisService';
import {
  recordEvent as dbRecordEvent,
  cancelEvent as dbCancelEvent,
  getMatchStats as dbGetMatchStats,
  getPlayerStats as dbGetPlayerStats,
  getMatchEvents as dbGetMatchEvents,
  getLineup as dbGetLineup,
  getMatchById,
} from './services/matchService';
import {
  updateMatchStats,
  updatePlayerStats,
  addEventToList,
  removeEventFromList,
  getCachedMatchStats,
  getCachedPlayerStats,
} from './services/statsCacheService';
import { migrate } from './database/migrate';
import { seedDemoData } from './database/seed';
import matchRoutes from './routes/matches';
import teamRoutes from './routes/teams';

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3001;

const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

app.use(cors());
app.use(express.json());

// Routes - teamRoutes mounted at /api/v1/teams, matchRoutes at /api/v1/matches
app.use('/api/v1/teams', teamRoutes);
app.use('/api/v1/matches', matchRoutes);

// Health check
app.get('/health', (_req: any, res: any) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.IO
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  socket.on('join-match', async (data: { matchId: number }) => {
    const { matchId } = data;
    socket.join(`match:${matchId}`);
    console.log(`✅ ${socket.id} joined match:${matchId}`);

    try {
      const [stats, events, lineup] = await Promise.all([
        Promise.resolve(dbGetMatchStats(matchId)),
        Promise.resolve(dbGetMatchEvents(matchId, 20)),
        Promise.resolve(dbGetLineup(matchId)),
      ]);

      socket.emit('match-update', {
        matchId,
        ...stats,
        lastEvents: events,
        lineup,
      });
    } catch (error) {
      console.error('Error sending initial data:', error);
    }
  });

  socket.on('record-event', async (data: any) => {
    const { matchId, playerId, eventType, points, assistBy, reboundType } = data;
    try {
      const event = dbRecordEvent({ matchId, playerId, eventType, points, assistBy, reboundType });
      try {
        await updateMatchStats(matchId, { playerId: event.player_id, eventType: event.event_type, points: event.points || undefined, assistBy: event.assist_by || undefined, reboundType: event.rebound_type || undefined });
        await updatePlayerStats(matchId, event.player_id, { eventType: event.event_type, points: event.points || undefined });
        await addEventToList(matchId, event.id);
      } catch (cacheErr) { console.warn('Redis cache update failed:', cacheErr); }
      const stats = await getCachedMatchStats(matchId);
      const playerStats = await getCachedPlayerStats(matchId, playerId);
      io.to(`match:${matchId}`).emit('event-added', { event });
      io.to(`match:${matchId}`).emit('match-update', { matchId, ...stats });
      io.to(`match:${matchId}`).emit('player-stats-update', { matchId, playerId, stats: playerStats });
      console.log(`📊 Event: ${eventType} by player ${playerId} in match ${matchId}`);
    } catch (error) {
      console.error('Error recording event:', error);
      socket.emit('error', { message: 'Failed to record event' });
    }
  });

  socket.on('cancel-event', async (data: { eventId: number; matchId: number }) => {
    const { eventId, matchId } = data;
    try {
      const cancelled = dbCancelEvent(eventId);
      if (cancelled) {
        try { await removeEventFromList(matchId, eventId); } catch (e) {}
        io.to(`match:${matchId}`).emit('event-cancelled', { eventId });
        const stats = await getCachedMatchStats(matchId);
        io.to(`match:${matchId}`).emit('match-update', { matchId, ...stats });
        console.log(`↩️ Event ${eventId} cancelled`);
      } else { socket.emit('error', { message: 'Event not found' }); }
    } catch (error) {
      console.error('Error cancelling event:', error);
      socket.emit('error', { message: 'Failed to cancel event' });
    }
  });

  socket.on('disconnect', () => { console.log(`🔌 Client disconnected: ${socket.id}`); });
});

// Crash protection - prevent unhandled errors from killing the server
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});
process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason);
});

// Start server
async function start() {
  try {
    migrate();
    try { seedDemoData(); } catch (e: any) { if (e.message && e.message.includes('UNIQUE constraint')) { console.log('Demo data already exists'); } else { console.warn('Seed warning:', e.message); } }
    await getRedisClient();
    server.listen(PORT, () => {
      console.log(`\n🏀 Backend running on http://localhost:${PORT}`);
      console.log(`📡 Socket.IO available`);
      console.log(`🗄️  Database migrated`);
      console.log(`🔴 Redis connected\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

export { app, server, io };
