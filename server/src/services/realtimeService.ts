import type { Server as SocketIOServer } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents } from '../types/socket-events.js';
import type {
  TrafficLogSummary,
  RealtimeStats,
  ThrottleEvent,
  BucketState,
  GenerationProgress,
  ApiDoc,
  FlaggedRequest,
} from '../types/index.js';

// Observer Pattern: Central hub for broadcasting real-time events
class RealtimeService {
  private static instance: RealtimeService | null = null;
  private io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>;

  private constructor(io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>) {
    this.io = io;
  }

  static init(io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>): RealtimeService {
    RealtimeService.instance = new RealtimeService(io);
    return RealtimeService.instance;
  }

  static getInstance(): RealtimeService {
    if (!RealtimeService.instance) {
      throw new Error('RealtimeService not initialized. Call init() first.');
    }
    return RealtimeService.instance;
  }

  emitTrafficEvent(log: TrafficLogSummary): void {
    this.io.to('traffic').emit('traffic:new', log);
    // Also emit to upstream-specific room
    this.io.emit('traffic:new', log);
  }

  emitStatsUpdate(stats: RealtimeStats): void {
    this.io.emit('traffic:stats-update', stats);
  }

  emitThrottleEvent(data: ThrottleEvent): void {
    this.io.to(`ratelimit:${data.clientId}`).emit('ratelimit:throttled', data);
    this.io.emit('ratelimit:throttled', data);
  }

  emitBucketUpdate(data: BucketState): void {
    this.io.to(`ratelimit:${data.clientId}`).emit('ratelimit:bucket-update', data);
    this.io.emit('ratelimit:bucket-update', data);
  }

  emitDocProgress(data: GenerationProgress): void {
    this.io.emit('docs:generation-progress', data);
  }

  emitDocComplete(data: ApiDoc): void {
    this.io.emit('docs:generation-complete', data);
  }

  emitFlaggedRequest(data: FlaggedRequest): void {
    this.io.emit('flagged:new', data);
  }
}

export default RealtimeService;
