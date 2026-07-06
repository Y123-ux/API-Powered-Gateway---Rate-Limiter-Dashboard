import type { RedisClientType } from 'redis';
import type {
  TrafficLog,
  TrafficLogSummary,
  AnalyticsOverview,
  TimeseriesPoint,
} from '../types/index.js';

class TrafficService {
  constructor(private redis: RedisClientType) {}

  async storeLog(log: TrafficLog): Promise<void> {
    // Store full log detail
    await this.redis.hSet(`traffic:detail:${log.id}`, {
      id: log.id,
      timestamp: String(log.timestamp),
      clientId: log.clientId,
      method: log.method,
      path: log.path,
      upstreamTarget: log.upstreamTarget,
      requestHeaders: JSON.stringify(log.requestHeaders),
      requestBody: JSON.stringify(log.requestBody),
      responseStatus: String(log.responseStatus),
      responseHeaders: JSON.stringify(log.responseHeaders),
      responseBody: JSON.stringify(log.responseBody),
      responseTimeMs: String(log.responseTimeMs),
      rateLimited: String(log.rateLimited),
      flagged: String(log.flagged),
      flagReason: log.flagReason || '',
    });

    // Add to sorted set for range queries
    await this.redis.zAdd('traffic:logs', {
      score: log.timestamp,
      value: log.id,
    });

    // Increment hourly counter
    const date = new Date(log.timestamp);
    const dayKey = `stats:requests:${date.toISOString().split('T')[0]}`;
    const hour = String(date.getHours());
    await this.redis.hIncrBy(dayKey, hour, 1);
    await this.redis.expire(dayKey, 86400 * 7); // Keep 7 days of stats

    // Trim old entries (keep last 10000)
    const count = await this.redis.zCard('traffic:logs');
    if (count > 10000) {
      const toRemove = count - 10000;
      const oldIds = await this.redis.zRange('traffic:logs', 0, toRemove - 1);
      for (const id of oldIds) {
        await this.redis.del(`traffic:detail:${id}`);
      }
      await this.redis.zRemRangeByRank('traffic:logs', 0, toRemove - 1);
    }

    // Set TTL on detail
    await this.redis.expire(`traffic:detail:${log.id}`, 86400); // 24h TTL
  }

  async getLogs(
    from?: number,
    to?: number,
    clientId?: string,
    limit = 50,
    offset = 0
  ): Promise<{ logs: TrafficLog[]; total: number }> {
    const min = from ? String(from) : '-inf';
    const max = to ? String(to) : '+inf';

    const allIds = await this.redis.zRange('traffic:logs', max, min, {
      BY: 'SCORE',
      REV: true,
    });

    let total = allIds.length;
    let filteredIds = allIds;

    if (clientId) {
      const filtered: string[] = [];
      for (const id of allIds) {
        const data = await this.redis.hGet(`traffic:detail:${id}`, 'clientId');
        if (data === clientId) filtered.push(id);
      }
      filteredIds = filtered;
      total = filtered.length;
    }

    const paginatedIds = filteredIds.slice(offset, offset + limit);
    const logs: TrafficLog[] = [];

    for (const id of paginatedIds) {
      const log = await this.getLogById(id);
      if (log) logs.push(log);
    }

    return { logs, total };
  }

  async getLogById(logId: string): Promise<TrafficLog | null> {
    const data = await this.redis.hGetAll(`traffic:detail:${logId}`);
    if (!data.id) return null;

    return {
      id: data.id,
      timestamp: Number(data.timestamp),
      clientId: data.clientId,
      method: data.method,
      path: data.path,
      upstreamTarget: data.upstreamTarget,
      requestHeaders: JSON.parse(data.requestHeaders || '{}'),
      requestBody: JSON.parse(data.requestBody || 'null'),
      responseStatus: Number(data.responseStatus),
      responseHeaders: JSON.parse(data.responseHeaders || '{}'),
      responseBody: JSON.parse(data.responseBody || 'null'),
      responseTimeMs: Number(data.responseTimeMs),
      rateLimited: data.rateLimited === 'true',
      flagged: data.flagged === 'true',
      flagReason: data.flagReason || undefined,
    };
  }

  async getByUpstream(upstreamTarget: string, limit = 100): Promise<TrafficLog[]> {
    const allIds = await this.redis.zRange('traffic:logs', 0, -1, { REV: true });
    const logs: TrafficLog[] = [];

    for (const id of allIds) {
      if (logs.length >= limit) break;
      const target = await this.redis.hGet(`traffic:detail:${id}`, 'upstreamTarget');
      if (target === upstreamTarget) {
        const log = await this.getLogById(id);
        if (log) logs.push(log);
      }
    }

    return logs;
  }

  async getOverview(): Promise<AnalyticsOverview> {
    const now = Date.now();
    const dayAgo = now - 86400000;

    const ids = await this.redis.zRange('traffic:logs', String(dayAgo), String(now), {
      BY: 'SCORE',
    });

    let totalLatency = 0;
    let errorCount = 0;
    let throttledCount = 0;
    let flaggedCount = 0;
    const clients = new Set<string>();

    for (const id of ids) {
      const data = await this.redis.hGetAll(`traffic:detail:${id}`);
      if (!data.id) continue;

      totalLatency += Number(data.responseTimeMs || 0);
      if (Number(data.responseStatus) >= 400) errorCount++;
      if (data.rateLimited === 'true') throttledCount++;
      if (data.flagged === 'true') flaggedCount++;
      clients.add(data.clientId);
    }

    return {
      totalRequests24h: ids.length,
      avgLatencyMs: ids.length > 0 ? Math.round(totalLatency / ids.length) : 0,
      errorRate: ids.length > 0 ? Math.round((errorCount / ids.length) * 100) : 0,
      activeClients: clients.size,
      totalFlagged: flaggedCount,
      totalThrottled: throttledCount,
    };
  }

  async getTimeseries(
    from: number,
    to: number,
    intervalMs = 3600000
  ): Promise<TimeseriesPoint[]> {
    const points: TimeseriesPoint[] = [];

    for (let t = from; t < to; t += intervalMs) {
      const ids = await this.redis.zRange(
        'traffic:logs',
        String(t),
        String(t + intervalMs - 1),
        { BY: 'SCORE' }
      );

      let errors = 0;
      let totalLatency = 0;

      for (const id of ids) {
        const status = await this.redis.hGet(`traffic:detail:${id}`, 'responseStatus');
        const latency = await this.redis.hGet(`traffic:detail:${id}`, 'responseTimeMs');
        if (Number(status) >= 400) errors++;
        totalLatency += Number(latency || 0);
      }

      points.push({
        timestamp: t,
        count: ids.length,
        errors,
        avgLatency: ids.length > 0 ? Math.round(totalLatency / ids.length) : 0,
      });
    }

    return points;
  }

  async getTopPaths(limit = 10): Promise<Array<{ path: string; count: number }>> {
    const allIds = await this.redis.zRange('traffic:logs', 0, -1, { REV: true });
    const pathCounts = new Map<string, number>();

    for (const id of allIds.slice(0, 1000)) {
      const path = await this.redis.hGet(`traffic:detail:${id}`, 'path');
      if (path) {
        pathCounts.set(path, (pathCounts.get(path) || 0) + 1);
      }
    }

    return Array.from(pathCounts.entries())
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }
}

export default TrafficService;
