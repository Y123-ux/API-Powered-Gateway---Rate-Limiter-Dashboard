import { Router } from 'express';
import type { RedisClientType } from 'redis';
import type OpenAI from 'openai';
import { createAnalyticsController } from '../controllers/analyticsController.js';
import { createRateLimitController } from '../controllers/rateLimitController.js';
import { createDocsController } from '../controllers/docsController.js';
import { createClientController } from '../controllers/clientController.js';
import TrafficService from '../services/trafficService.js';
import RateLimitService from '../services/rateLimitService.js';
import DocGenerationService from '../services/docGenerationService.js';
import FlaggingService from '../services/flaggingService.js';
import { getUpstreams } from '../config/upstream.js';

export function createApiRoutes(
  redis: RedisClientType,
  openai: OpenAI,
  trafficService: TrafficService,
  rateLimitService: RateLimitService,
  flaggingService: FlaggingService
): Router {
  const router = Router();

  const docService = new DocGenerationService(redis, openai, trafficService);
  const analyticsCtrl = createAnalyticsController(trafficService);
  const rateLimitCtrl = createRateLimitController(rateLimitService);
  const docsCtrl = createDocsController(docService);
  const clientCtrl = createClientController(redis);

  // Analytics
  router.get('/analytics/overview', analyticsCtrl.getOverview);
  router.get('/analytics/traffic', analyticsCtrl.getTrafficLogs);
  router.get('/analytics/traffic/:logId', analyticsCtrl.getTrafficLogById);
  router.get('/analytics/timeseries', analyticsCtrl.getTimeseries);
  router.get('/analytics/top-paths', analyticsCtrl.getTopPaths);

  // Rate Limits
  router.get('/rate-limits', rateLimitCtrl.getRules);
  router.post('/rate-limits', rateLimitCtrl.createRule);
  router.put('/rate-limits/:ruleId', rateLimitCtrl.updateRule);
  router.delete('/rate-limits/:ruleId', rateLimitCtrl.deleteRule);
  router.get('/rate-limits/status/:clientId', rateLimitCtrl.getBucketStatus);

  // Docs
  router.post('/docs/generate', docsCtrl.generate);
  router.get('/docs', docsCtrl.getAll);
  router.get('/docs/:docId', docsCtrl.getById);
  router.delete('/docs/:docId', docsCtrl.delete);

  // Clients
  router.get('/clients', clientCtrl.getClients);
  router.post('/clients', clientCtrl.createClient);
  router.put('/clients/:clientId', clientCtrl.updateClient);
  router.delete('/clients/:clientId', clientCtrl.deleteClient);

  // Flagged Requests
  router.get('/flagged', async (req, res) => {
    try {
      const limit = Number(req.query.limit) || 50;
      const offset = Number(req.query.offset) || 0;
      const result = await flaggingService.getFlagged(limit, offset);
      res.json(result);
    } catch {
      res.status(500).json({ error: 'Failed to fetch flagged requests' });
    }
  });

  router.put('/flagged/:logId/dismiss', async (req, res) => {
    try {
      const success = await flaggingService.dismiss(req.params.logId);
      if (!success) {
        res.status(404).json({ error: 'Flagged request not found' });
        return;
      }
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: 'Failed to dismiss flagged request' });
    }
  });

  // Upstreams config
  router.get('/upstreams', (_req, res) => {
    res.json(getUpstreams());
  });

  return router;
}
