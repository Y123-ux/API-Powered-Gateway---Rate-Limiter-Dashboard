import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents } from '../types/socket-events.js';
import { env } from './env.js';

let io: SocketIOServer<ClientToServerEvents, ServerToClientEvents> | null = null;

export function initSocketIO(
  httpServer: HttpServer
): SocketIOServer<ClientToServerEvents, ServerToClientEvents> {
  io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN,
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    socket.on('subscribe:traffic', (upstreamId) => {
      const room = upstreamId ? `traffic:${upstreamId}` : 'traffic';
      socket.join(room);
    });

    socket.on('subscribe:ratelimit', (clientId) => {
      socket.join(`ratelimit:${clientId}`);
    });

    socket.on('unsubscribe:traffic', () => {
      socket.rooms.forEach((room) => {
        if (room.startsWith('traffic')) socket.leave(room);
      });
    });

    socket.on('unsubscribe:ratelimit', () => {
      socket.rooms.forEach((room) => {
        if (room.startsWith('ratelimit')) socket.leave(room);
      });
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  console.log('[Socket.IO] Initialized');
  return io;
}

export function getIO(): SocketIOServer<ClientToServerEvents, ServerToClientEvents> {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}
