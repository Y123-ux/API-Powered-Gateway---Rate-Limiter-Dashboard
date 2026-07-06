export interface TrafficLog {
  id: string;
  timestamp: number;
  clientId: string;
  method: string;
  path: string;
  upstreamTarget: string;
  requestHeaders: Record<string, string>;
  requestBody: unknown | null;
  responseStatus: number;
  responseHeaders: Record<string, string>;
  responseBody: unknown | null;
  responseTimeMs: number;
  rateLimited: boolean;
  flagged: boolean;
  flagReason?: string;
}

export interface RateLimitRule {
  id: string;
  clientId: string;
  path?: string;
  maxTokens: number;
  refillRate: number;
  refillIntervalMs: number;
  burstAllowance: number;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ApiDoc {
  id: string;
  upstreamTarget: string;
  version: string;
  openApiSpec: object;
  trafficSampleCount: number;
  generatedAt: number;
  promptTokensUsed: number;
  completionTokensUsed: number;
}

export interface ApiClient {
  id: string;
  name: string;
  apiKey: string;
  rateLimitRuleId: string;
  enabled: boolean;
  createdAt: number;
}

export interface UpstreamConfig {
  id: string;
  name: string;
  targetUrl: string;
  pathRewrite?: Record<string, string>;
  enabled: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  retryAfterMs?: number;
}

export interface TrafficLogSummary {
  id: string;
  timestamp: number;
  clientId: string;
  method: string;
  path: string;
  responseStatus: number;
  responseTimeMs: number;
  rateLimited: boolean;
  flagged: boolean;
}

export interface RealtimeStats {
  totalRequests24h: number;
  avgLatencyMs: number;
  errorRate: number;
  activeClients: number;
  requestsPerMinute: number;
}

export interface ThrottleEvent {
  clientId: string;
  path: string;
  retryAfterMs: number;
  timestamp: number;
}

export interface BucketState {
  clientId: string;
  tokens: number;
  maxTokens: number;
  refillRate: number;
}

export interface GenerationProgress {
  stage: 'collecting' | 'analyzing' | 'generating' | 'validating' | 'complete';
  percent: number;
  message?: string;
}

export interface FlaggedRequest {
  id: string;
  logId: string;
  reason: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: number;
  dismissed: boolean;
}

export interface AnalyticsOverview {
  totalRequests24h: number;
  avgLatencyMs: number;
  errorRate: number;
  activeClients: number;
  totalFlagged: number;
  totalThrottled: number;
}

export interface TimeseriesPoint {
  timestamp: number;
  count: number;
  errors: number;
  avgLatency: number;
}
