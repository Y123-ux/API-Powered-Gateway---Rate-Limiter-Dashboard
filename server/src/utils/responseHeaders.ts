import type { Response } from 'express';
import type { RateLimitResult } from '../types/index.js';

export function setRateLimitHeaders(res: Response, result: RateLimitResult): void {
  res.setHeader('X-RateLimit-Limit', result.limit);
  res.setHeader('X-RateLimit-Remaining', result.remaining);
  res.setHeader('X-RateLimit-Reset', Math.ceil(Date.now() / 1000) + 1);

  if (!result.allowed && result.retryAfterMs) {
    res.setHeader('Retry-After', Math.ceil(result.retryAfterMs / 1000));
  }
}
