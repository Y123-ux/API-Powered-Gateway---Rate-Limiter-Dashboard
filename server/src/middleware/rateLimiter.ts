import type { Request, Response, NextFunction } from 'express';
import RateLimitService from '../services/rateLimitService.js';
import { setRateLimitHeaders } from '../utils/responseHeaders.js';

export function createRateLimiterMiddleware(rateLimitService: RateLimitService) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const clientId = (req as any).clientId || 'anonymous';
    const path = req.path;

    try {
      const result = await rateLimitService.consume(clientId, path);
      setRateLimitHeaders(res, result);

      // Store result on request for traffic capture
      (req as any)._rateLimited = !result.allowed;

      if (!result.allowed) {
        res.status(429).json({
          error: 'Too Many Requests',
          retryAfterMs: result.retryAfterMs,
          remaining: result.remaining,
          limit: result.limit,
        });
        return;
      }

      next();
    } catch (err) {
      // If rate limiting fails, allow the request through
      console.error('[RateLimiter] Error:', err);
      next();
    }
  };
}
