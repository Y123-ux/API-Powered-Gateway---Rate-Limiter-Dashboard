import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { env } from './config/env.js';
import RedisClient from './config/redis.js';
import { initSocketIO } from './config/socket.js';
import { getOpenAIClient } from './config/openai.js';
import { loadUpstreams } from './config/upstream.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { createGatewayRoutes } from './routes/gatewayRoutes.js';
import { createApiRoutes } from './routes/apiRoutes.js';
import RealtimeService from './services/realtimeService.js';
import RateLimitService from './services/rateLimitService.js';
import TrafficService from './services/trafficService.js';
import FlaggingService from './services/flaggingService.js';

async function main() {
  // Initialize Express
  const app = express();
  const httpServer = createServer(app);

  // Connect to Redis (Singleton)
  const redis = await RedisClient.getInstance();

  // Initialize Socket.IO
  const io = initSocketIO(httpServer);

  // Initialize Observer hub
  RealtimeService.init(io);

  // Load upstream config
  loadUpstreams();

  // Initialize OpenAI client
  const openai = getOpenAIClient();

  // Initialize services
  const rateLimitService = new RateLimitService(redis);
  const trafficService = new TrafficService(redis);
  const flaggingService = new FlaggingService(redis);

  // Global middleware
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(requestLogger);
  app.use(express.json({ limit: '10mb' }));

  // Dashboard API routes
  app.use(
    '/api/v1',
    createApiRoutes(redis, openai, trafficService, rateLimitService, flaggingService)
  );

  // Gateway proxy routes
  app.use(
    '/gw',
    createGatewayRoutes(redis, rateLimitService, trafficService, flaggingService)
  );

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  // Error handler (must be last)
  app.use(errorHandler);

  // Start server
  httpServer.listen(env.PORT, () => {
    console.log(`\n🚀 API Gateway running on http://localhost:${env.PORT}`);
    console.log(`   Dashboard API: http://localhost:${env.PORT}/api/v1`);
    console.log(`   Gateway Proxy: http://localhost:${env.PORT}/gw/:upstreamId/*`);
    console.log(`   Health Check:  http://localhost:${env.PORT}/health\n`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\nShutting down...');
    httpServer.close();
    await RedisClient.disconnect();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
