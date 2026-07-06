import { Router } from 'express';
import { createAuthMiddleware } from '../middleware/authenticate.js';
import { createRateLimiterMiddleware } from '../middleware/rateLimiter.js';
import { createTrafficCaptureMiddleware } from '../middleware/trafficCapture.js';
import { proxyRequest } from '../controllers/gatewayController.js';
import type { RedisClientType } from 'redis';
import RateLimitService from '../services/rateLimitService.js';
import TrafficService from '../services/trafficService.js';
import FlaggingService from '../services/flaggingService.js';

export function createGatewayRoutes(
  redis: RedisClientType,
  rateLimitService: RateLimitService,
  trafficService: TrafficService,
  flaggingService: FlaggingService
): Router {
  const router = Router();

  // Middleware Chain: authenticate → rateLimiter → trafficCapture → proxy
  const auth = createAuthMiddleware(redis);
  const rateLimiter = createRateLimiterMiddleware(rateLimitService);
  const trafficCapture = createTrafficCaptureMiddleware(trafficService, flaggingService);

  router.all('/:upstreamId/*', auth, rateLimiter, trafficCapture, proxyRequest);
  router.all('/:upstreamId', auth, rateLimiter, trafficCapture, proxyRequest);

  return router;
}
