import type { Request, Response, NextFunction } from 'express';
import type { RedisClientType } from 'redis';
import type { ApiClient } from '../types/index.js';

export function createAuthMiddleware(redis: RedisClientType) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      // Allow unauthenticated requests with a default client ID
      (req as any).clientId = 'anonymous';
      (req as any).clientName = 'Anonymous';
      next();
      return;
    }

    try {
      // Look up client by API key
      const clientKeys = await redis.keys('clients:*');
      let matchedClient: ApiClient | null = null;

      for (const key of clientKeys) {
        const clientData = await redis.hGetAll(key);
        if (clientData.apiKey === apiKey && clientData.enabled === 'true') {
          matchedClient = {
            id: clientData.id,
            name: clientData.name,
            apiKey: clientData.apiKey,
            rateLimitRuleId: clientData.rateLimitRuleId,
            enabled: clientData.enabled === 'true',
            createdAt: Number(clientData.createdAt),
          };
          break;
        }
      }

      if (!matchedClient) {
        res.status(401).json({ error: 'Invalid API key' });
        return;
      }

      (req as any).clientId = matchedClient.id;
      (req as any).clientName = matchedClient.name;
      (req as any).rateLimitRuleId = matchedClient.rateLimitRuleId;
      next();
    } catch (err) {
      next(err);
    }
  };
}
