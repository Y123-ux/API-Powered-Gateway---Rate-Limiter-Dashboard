import type { Request, Response, NextFunction } from 'express';
import { getUpstreamById } from '../config/upstream.js';
import proxyService from '../services/proxyService.js';

export function proxyRequest(req: Request, res: Response, next: NextFunction): void {
  const upstreamId = req.params.upstreamId as string;
  const upstream = getUpstreamById(upstreamId);

  if (!upstream) {
    res.status(404).json({ error: `Upstream "${upstreamId}" not found` });
    return;
  }

  if (!upstream.enabled) {
    res.status(503).json({ error: `Upstream "${upstreamId}" is disabled` });
    return;
  }

  const proxy = proxyService.getProxy(upstream);
  proxy(req, res, next);
}
