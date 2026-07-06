import type {
  TrafficLogSummary,
  RealtimeStats,
  ThrottleEvent,
  BucketState,
  GenerationProgress,
  ApiDoc,
  FlaggedRequest,
} from './index.js';

export interface ServerToClientEvents {
  'traffic:new': (log: TrafficLogSummary) => void;
  'traffic:stats-update': (stats: RealtimeStats) => void;
  'ratelimit:throttled': (data: ThrottleEvent) => void;
  'ratelimit:bucket-update': (data: BucketState) => void;
  'docs:generation-progress': (data: GenerationProgress) => void;
  'docs:generation-complete': (data: ApiDoc) => void;
  'flagged:new': (data: FlaggedRequest) => void;
}

export interface ClientToServerEvents {
  'subscribe:traffic': (upstreamId?: string) => void;
  'subscribe:ratelimit': (clientId: string) => void;
  'unsubscribe:traffic': () => void;
  'unsubscribe:ratelimit': () => void;
}
