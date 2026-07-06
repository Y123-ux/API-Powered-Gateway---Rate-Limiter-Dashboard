import { createProxyMiddleware, type RequestHandler } from 'http-proxy-middleware';
import type { UpstreamConfig } from '../types/index.js';

// Proxy Pattern: forwards requests to upstream services
class ProxyService {
  private proxyCache = new Map<string, RequestHandler>();

  getProxy(upstream: UpstreamConfig): RequestHandler {
    if (this.proxyCache.has(upstream.id)) {
      return this.proxyCache.get(upstream.id)!;
    }

    const proxy = createProxyMiddleware({
      target: upstream.targetUrl,
      changeOrigin: true,
      pathRewrite: (path) => {
        // Remove /:upstreamId prefix (router already strips /gw)
        const rewritten = path.replace(new RegExp(`^/${upstream.id}`), '') || '/';
        return rewritten;
      },
      selfHandleResponse: false,
      on: {
        proxyReq: (_proxyReq, req) => {
          // Store proxy start time for latency tracking
          (req as any)._proxyStartTime = Date.now();
        },
        error: (err, _req, res) => {
          console.error(`[Proxy] Error proxying to ${upstream.targetUrl}:`, err.message);
          if ('writeHead' in res && typeof res.writeHead === 'function') {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              error: 'Bad Gateway',
              message: `Failed to proxy to ${upstream.name}`,
            }));
          }
        },
      },
    });

    this.proxyCache.set(upstream.id, proxy);
    return proxy;
  }

  clearCache(): void {
    this.proxyCache.clear();
  }
}

export default new ProxyService();
