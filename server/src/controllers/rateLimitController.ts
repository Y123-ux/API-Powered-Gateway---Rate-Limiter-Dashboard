import type { Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import RateLimitService from '../services/rateLimitService.js';
import type { RateLimitRule } from '../types/index.js';

export function createRateLimitController(rateLimitService: RateLimitService) {
  return {
    async getRules(_req: Request, res: Response): Promise<void> {
      try {
        const rules = await rateLimitService.getRules();
        res.json(rules);
      } catch (err) {
        res.status(500).json({ error: 'Failed to fetch rate limit rules' });
      }
    },

    async createRule(req: Request, res: Response): Promise<void> {
      try {
        const { clientId, path, maxTokens, refillRate, refillIntervalMs, burstAllowance } =
          req.body;

        const rule: RateLimitRule = {
          id: uuid(),
          clientId: clientId || '*',
          path,
          maxTokens: maxTokens || 100,
          refillRate: refillRate || 10,
          refillIntervalMs: refillIntervalMs || 1000,
          burstAllowance: burstAllowance || 20,
          enabled: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        await rateLimitService.createRule(rule);
        res.status(201).json(rule);
      } catch (err) {
        res.status(500).json({ error: 'Failed to create rate limit rule' });
      }
    },

    async updateRule(req: Request, res: Response): Promise<void> {
      try {
        const ruleId = req.params.ruleId as string;
        const updates = req.body;
        const updated = await rateLimitService.updateRule(ruleId, updates);

        if (!updated) {
          res.status(404).json({ error: 'Rule not found' });
          return;
        }

        res.json(updated);
      } catch (err) {
        res.status(500).json({ error: 'Failed to update rate limit rule' });
      }
    },

    async deleteRule(req: Request, res: Response): Promise<void> {
      try {
        const deleted = await rateLimitService.deleteRule(req.params.ruleId as string);
        if (!deleted) {
          res.status(404).json({ error: 'Rule not found' });
          return;
        }
        res.json({ success: true });
      } catch (err) {
        res.status(500).json({ error: 'Failed to delete rate limit rule' });
      }
    },

    async getBucketStatus(req: Request, res: Response): Promise<void> {
      try {
        const state = await rateLimitService.getBucketState(req.params.clientId as string);
        if (!state) {
          res.status(404).json({ error: 'No bucket state found for this client' });
          return;
        }
        res.json(state);
      } catch (err) {
        res.status(500).json({ error: 'Failed to fetch bucket status' });
      }
    },
  };
}
