import type { RedisClientType } from 'redis';
import type { RateLimitResult, RateLimitRule } from '../types/index.js';
import { TOKEN_BUCKET_SCRIPT } from '../utils/luaScripts.js';
import { env } from '../config/env.js';
import RealtimeService from './realtimeService.js';

class RateLimitService {
  constructor(private redis: RedisClientType) {}

  async consume(clientId: string, path: string): Promise<RateLimitResult> {
    const rule = await this.getRule(clientId, path);

    const bucketKey = `rl:bucket:${clientId}:${this.hashPath(path)}`;
    const now = Date.now();

    const result = (await this.redis.eval(TOKEN_BUCKET_SCRIPT, {
      keys: [bucketKey],
      arguments: [
        String(rule.maxTokens),
        String(rule.refillRate),
        String(rule.refillIntervalMs),
        String(now),
        String(rule.burstAllowance),
      ],
    })) as number[];

    const rateLimitResult: RateLimitResult = {
      allowed: result[0] === 1,
      remaining: result[1],
      limit: result[2],
      retryAfterMs: result[3] || undefined,
    };

    // Emit real-time events
    try {
      const realtime = RealtimeService.getInstance();
      realtime.emitBucketUpdate({
        clientId,
        tokens: rateLimitResult.remaining,
        maxTokens: rateLimitResult.limit,
        refillRate: rule.refillRate,
      });

      if (!rateLimitResult.allowed) {
        realtime.emitThrottleEvent({
          clientId,
          path,
          retryAfterMs: rateLimitResult.retryAfterMs || rule.refillIntervalMs,
          timestamp: now,
        });
      }
    } catch {
      // RealtimeService may not be initialized yet
    }

    return rateLimitResult;
  }

  private async getRule(clientId: string, _path: string): Promise<RateLimitRule> {
    // Try client-specific rule first
    const clientRules = await this.redis.keys(`rl:rules:*`);
    for (const key of clientRules) {
      const rule = await this.redis.hGetAll(key);
      if (rule.clientId === clientId && rule.enabled === 'true') {
        return this.parseRule(rule);
      }
    }

    // Try global default rule
    for (const key of clientRules) {
      const rule = await this.redis.hGetAll(key);
      if (rule.clientId === '*' && rule.enabled === 'true') {
        return this.parseRule(rule);
      }
    }

    // Fall back to env defaults
    return {
      id: 'default',
      clientId: '*',
      maxTokens: env.DEFAULT_MAX_TOKENS,
      refillRate: env.DEFAULT_REFILL_RATE,
      refillIntervalMs: env.DEFAULT_REFILL_INTERVAL_MS,
      burstAllowance: env.DEFAULT_BURST_ALLOWANCE,
      enabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  private parseRule(data: Record<string, string>): RateLimitRule {
    return {
      id: data.id,
      clientId: data.clientId,
      path: data.path || undefined,
      maxTokens: Number(data.maxTokens),
      refillRate: Number(data.refillRate),
      refillIntervalMs: Number(data.refillIntervalMs),
      burstAllowance: Number(data.burstAllowance),
      enabled: data.enabled === 'true',
      createdAt: Number(data.createdAt),
      updatedAt: Number(data.updatedAt),
    };
  }

  private hashPath(path: string): string {
    return path.replace(/\//g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
  }

  // CRUD for rate limit rules
  async createRule(rule: RateLimitRule): Promise<void> {
    const key = `rl:rules:${rule.id}`;
    await this.redis.hSet(key, {
      id: rule.id,
      clientId: rule.clientId,
      path: rule.path || '',
      maxTokens: String(rule.maxTokens),
      refillRate: String(rule.refillRate),
      refillIntervalMs: String(rule.refillIntervalMs),
      burstAllowance: String(rule.burstAllowance),
      enabled: String(rule.enabled),
      createdAt: String(rule.createdAt),
      updatedAt: String(rule.updatedAt),
    });
  }

  async getRules(): Promise<RateLimitRule[]> {
    const keys = await this.redis.keys('rl:rules:*');
    const rules: RateLimitRule[] = [];
    for (const key of keys) {
      const data = await this.redis.hGetAll(key);
      if (data.id) rules.push(this.parseRule(data));
    }
    return rules;
  }

  async getRule_byId(ruleId: string): Promise<RateLimitRule | null> {
    const data = await this.redis.hGetAll(`rl:rules:${ruleId}`);
    if (!data.id) return null;
    return this.parseRule(data);
  }

  async updateRule(ruleId: string, updates: Partial<RateLimitRule>): Promise<RateLimitRule | null> {
    const existing = await this.getRule_byId(ruleId);
    if (!existing) return null;

    const updated = { ...existing, ...updates, updatedAt: Date.now() };
    await this.createRule(updated);
    return updated;
  }

  async deleteRule(ruleId: string): Promise<boolean> {
    const result = await this.redis.del(`rl:rules:${ruleId}`);
    return result > 0;
  }

  async getBucketState(clientId: string): Promise<{ tokens: number; maxTokens: number } | null> {
    const keys = await this.redis.keys(`rl:bucket:${clientId}:*`);
    if (keys.length === 0) return null;
    const data = await this.redis.hGetAll(keys[0]);
    return {
      tokens: Number(data.tokens || 0),
      maxTokens: env.DEFAULT_MAX_TOKENS + env.DEFAULT_BURST_ALLOWANCE,
    };
  }
}

export default RateLimitService;
