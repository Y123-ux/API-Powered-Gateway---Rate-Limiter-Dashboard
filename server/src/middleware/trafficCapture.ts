import type { Request, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';
import type { TrafficLog } from '../types/index.js';
import TrafficService from '../services/trafficService.js';
import FlaggingService from '../services/flaggingService.js';
import RealtimeService from '../services/realtimeService.js';

export function createTrafficCaptureMiddleware(
  trafficService: TrafficService,
  flaggingService: FlaggingService
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();
    const logId = uuid();

    // Capture request body
    const requestBody = req.body || null;
    const requestHeaders: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') requestHeaders[key] = value;
    }

    // Intercept response to capture body
    const originalWrite = res.write.bind(res);
    const originalEnd = res.end.bind(res);
    const chunks: Buffer[] = [];

    res.write = function (chunk: any, ...args: any[]): boolean {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      return originalWrite(chunk, ...args);
    } as any;

    res.end = function (chunk: any, ...args: any[]): Response {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));

      const responseBody = chunks.length > 0 ? Buffer.concat(chunks).toString('utf-8') : null;
      const responseTimeMs = Date.now() - startTime;

      const responseHeaders: Record<string, string> = {};
      const rawHeaders = res.getHeaders();
      for (const [key, value] of Object.entries(rawHeaders)) {
        if (typeof value === 'string') responseHeaders[key] = value;
      }

      // Parse response body if possible
      let parsedResponseBody: unknown = responseBody;
      try {
        if (responseBody) parsedResponseBody = JSON.parse(responseBody);
      } catch {
        // Keep as string
      }

      const upstreamId = (req.params.upstreamId as string) || 'unknown';

      const log: TrafficLog = {
        id: logId,
        timestamp: startTime,
        clientId: (req as any).clientId || 'anonymous',
        method: req.method,
        path: req.originalUrl,
        upstreamTarget: upstreamId,
        requestHeaders,
        requestBody,
        responseStatus: res.statusCode,
        responseHeaders,
        responseBody: parsedResponseBody,
        responseTimeMs,
        rateLimited: (req as any)._rateLimited || false,
        flagged: false,
      };

      // Store async (don't block response)
      (async () => {
        try {
          // Check for flags
          const flag = await flaggingService.analyze(log);
          if (flag) {
            log.flagged = true;
            log.flagReason = flag.reason;
          }

          await trafficService.storeLog(log);

          // Emit real-time event
          try {
            RealtimeService.getInstance().emitTrafficEvent({
              id: log.id,
              timestamp: log.timestamp,
              clientId: log.clientId,
              method: log.method,
              path: log.path,
              responseStatus: log.responseStatus,
              responseTimeMs: log.responseTimeMs,
              rateLimited: log.rateLimited,
              flagged: log.flagged,
            });
          } catch {
            // RealtimeService may not be initialized
          }
        } catch (err) {
          console.error('[TrafficCapture] Failed to store log:', err);
        }
      })();

      return originalEnd(chunk, ...args);
    } as any;

    next();
  };
}
