import type { Request, Response } from 'express';
import TrafficService from '../services/trafficService.js';

export function createAnalyticsController(trafficService: TrafficService) {
  return {
    async getOverview(_req: Request, res: Response): Promise<void> {
      try {
        const overview = await trafficService.getOverview();
        res.json(overview);
      } catch (err) {
        res.status(500).json({ error: 'Failed to fetch analytics overview' });
      }
    },

    async getTrafficLogs(req: Request, res: Response): Promise<void> {
      try {
        const from = req.query.from ? Number(req.query.from) : undefined;
        const to = req.query.to ? Number(req.query.to) : undefined;
        const clientId = req.query.clientId as string | undefined;
        const limit = Number(req.query.limit) || 50;
        const offset = Number(req.query.offset) || 0;

        const result = await trafficService.getLogs(from, to, clientId, limit, offset);
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: 'Failed to fetch traffic logs' });
      }
    },

    async getTrafficLogById(req: Request, res: Response): Promise<void> {
      try {
        const log = await trafficService.getLogById(req.params.logId as string);
        if (!log) {
          res.status(404).json({ error: 'Traffic log not found' });
          return;
        }
        res.json(log);
      } catch (err) {
        res.status(500).json({ error: 'Failed to fetch traffic log' });
      }
    },

    async getTimeseries(req: Request, res: Response): Promise<void> {
      try {
        const now = Date.now();
        const from = req.query.from ? Number(req.query.from) : now - 86400000;
        const to = req.query.to ? Number(req.query.to) : now;
        const interval = req.query.interval === '1h' ? 3600000 :
                         req.query.interval === '15m' ? 900000 : 3600000;

        const points = await trafficService.getTimeseries(from, to, interval);
        res.json(points);
      } catch (err) {
        res.status(500).json({ error: 'Failed to fetch timeseries data' });
      }
    },

    async getTopPaths(req: Request, res: Response): Promise<void> {
      try {
        const limit = Number(req.query.limit) || 10;
        const paths = await trafficService.getTopPaths(limit);
        res.json(paths);
      } catch (err) {
        res.status(500).json({ error: 'Failed to fetch top paths' });
      }
    },
  };
}
