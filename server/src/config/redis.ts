import { createClient, type RedisClientType } from 'redis';
import { env } from './env.js';

// Singleton Pattern: single Redis client shared across the app
class RedisClient {
  private static instance: RedisClientType | null = null;

  static async getInstance(): Promise<RedisClientType> {
    if (!RedisClient.instance) {
      RedisClient.instance = createClient({ url: env.REDIS_URL });

      RedisClient.instance.on('error', (err) => {
        console.error('[Redis] Connection error:', err.message);
      });

      RedisClient.instance.on('connect', () => {
        console.log('[Redis] Connected to', env.REDIS_URL);
      });

      await RedisClient.instance.connect();
    }
    return RedisClient.instance;
  }

  static async disconnect(): Promise<void> {
    if (RedisClient.instance) {
      await RedisClient.instance.quit();
      RedisClient.instance = null;
      console.log('[Redis] Disconnected');
    }
  }
}

export default RedisClient;
