import type { RedisClientType } from 'redis';
import { v4 as uuid } from 'uuid';
import type { TrafficLog, FlaggedRequest } from '../types/index.js';
import RealtimeService from './realtimeService.js';

class FlaggingService {
  constructor(private redis: RedisClientType) {}

  async analyze(log: TrafficLog): Promise<FlaggedRequest | null> {
    const reasons: string[] = [];
    let severity: 'low' | 'medium' | 'high' = 'low';

    // Flag 5xx errors
    if (log.responseStatus >= 500) {
      reasons.push(`Server error (${log.responseStatus})`);
      severity = 'high';
    }

    // Flag very slow requests (>5s)
    if (log.responseTimeMs > 5000) {
      reasons.push(`Slow response (${log.responseTimeMs}ms)`);
      severity = severity === 'high' ? 'high' : 'medium';
    }

    // Flag rate-limited requests
    if (log.rateLimited) {
      reasons.push('Rate limited');
      severity = severity === 'high' ? 'high' : 'medium';
    }

    // Flag unusual HTTP methods
    if (['DELETE', 'PATCH', 'PUT'].includes(log.method) && log.responseStatus >= 400) {
      reasons.push(`Failed ${log.method} request`);
      severity = severity === 'high' ? 'high' : 'medium';
    }

    if (reasons.length === 0) return null;

    const flagged: FlaggedRequest = {
      id: uuid(),
      logId: log.id,
      reason: reasons.join('; '),
      severity,
      timestamp: log.timestamp,
      dismissed: false,
    };

    // Store in Redis
    await this.redis.hSet(`flagged:detail:${flagged.id}`, {
      id: flagged.id,
      logId: flagged.logId,
      reason: flagged.reason,
      severity: flagged.severity,
      timestamp: String(flagged.timestamp),
      dismissed: 'false',
    });

    await this.redis.zAdd('flagged:requests', {
      score: flagged.timestamp,
      value: flagged.id,
    });

    // Emit real-time event
    try {
      RealtimeService.getInstance().emitFlaggedRequest(flagged);
    } catch {
      // RealtimeService may not be initialized
    }

    return flagged;
  }

  async getFlagged(limit = 50, offset = 0): Promise<{ items: FlaggedRequest[]; total: number }> {
    const total = await this.redis.zCard('flagged:requests');
    const ids = await this.redis.zRange('flagged:requests', offset, offset + limit - 1, {
      REV: true,
    });

    const items: FlaggedRequest[] = [];
    for (const id of ids) {
      const data = await this.redis.hGetAll(`flagged:detail:${id}`);
      if (data.id) {
        items.push({
          id: data.id,
          logId: data.logId,
          reason: data.reason,
          severity: data.severity as 'low' | 'medium' | 'high',
          timestamp: Number(data.timestamp),
          dismissed: data.dismissed === 'true',
        });
      }
    }

    return { items, total };
  }

  async dismiss(flagId: string): Promise<boolean> {
    const exists = await this.redis.exists(`flagged:detail:${flagId}`);
    if (!exists) return false;

    await this.redis.hSet(`flagged:detail:${flagId}`, 'dismissed', 'true');
    return true;
  }
}

export default FlaggingService;
