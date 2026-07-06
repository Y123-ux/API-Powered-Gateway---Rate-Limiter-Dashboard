import type { Request, Response } from 'express';
import type { RedisClientType } from 'redis';
import { v4 as uuid } from 'uuid';
import type { ApiClient } from '../types/index.js';
import crypto from 'crypto';

export function createClientController(redis: RedisClientType) {
  return {
    async getClients(_req: Request, res: Response): Promise<void> {
      try {
        const keys = await redis.keys('clients:*');
        const clients: ApiClient[] = [];

        for (const key of keys) {
          const data = await redis.hGetAll(key);
          if (data.id) {
            clients.push({
              id: data.id,
              name: data.name,
              apiKey: data.apiKey,
              rateLimitRuleId: data.rateLimitRuleId,
              enabled: data.enabled === 'true',
              createdAt: Number(data.createdAt),
            });
          }
        }

        res.json(clients);
      } catch (err) {
        res.status(500).json({ error: 'Failed to fetch clients' });
      }
    },

    async createClient(req: Request, res: Response): Promise<void> {
      try {
        const { name, rateLimitRuleId } = req.body;
        if (!name) {
          res.status(400).json({ error: 'name is required' });
          return;
        }

        const apiKey = `gw_${crypto.randomBytes(24).toString('hex')}`;
        const client: ApiClient = {
          id: uuid(),
          name,
          apiKey,
          rateLimitRuleId: rateLimitRuleId || 'default',
          enabled: true,
          createdAt: Date.now(),
        };

        await redis.hSet(`clients:${client.id}`, {
          id: client.id,
          name: client.name,
          apiKey: client.apiKey,
          rateLimitRuleId: client.rateLimitRuleId,
          enabled: String(client.enabled),
          createdAt: String(client.createdAt),
        });

        res.status(201).json(client);
      } catch (err) {
        res.status(500).json({ error: 'Failed to create client' });
      }
    },

    async updateClient(req: Request, res: Response): Promise<void> {
      try {
        const { clientId } = req.params;
        const existing = await redis.hGetAll(`clients:${clientId}`);

        if (!existing.id) {
          res.status(404).json({ error: 'Client not found' });
          return;
        }

        const updates = req.body;
        const updated = {
          ...existing,
          ...updates,
          id: clientId,
          enabled: String(updates.enabled ?? existing.enabled),
        };

        await redis.hSet(`clients:${clientId}`, updated);
        res.json({
          ...updated,
          enabled: updated.enabled === 'true',
          createdAt: Number(updated.createdAt),
        });
      } catch (err) {
        res.status(500).json({ error: 'Failed to update client' });
      }
    },

    async deleteClient(req: Request, res: Response): Promise<void> {
      try {
        const result = await redis.del(`clients:${req.params.clientId}`);
        if (!result) {
          res.status(404).json({ error: 'Client not found' });
          return;
        }
        res.json({ success: true });
      } catch (err) {
        res.status(500).json({ error: 'Failed to delete client' });
      }
    },
  };
}
