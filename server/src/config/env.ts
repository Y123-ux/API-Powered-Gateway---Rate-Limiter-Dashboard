import dotenv from 'dotenv';
import { z } from 'zod';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env from project root (handles running from server/ subdirectory)
dotenv.config({ path: resolve(__dirname, '../../../.env') });
dotenv.config(); // Also try CWD as fallback

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),
  OPENAI_MODEL: z.string().default('gpt-4o'),
  DEFAULT_UPSTREAM_URL: z.string().default('https://httpbin.org'),
  DEFAULT_MAX_TOKENS: z.coerce.number().default(100),
  DEFAULT_REFILL_RATE: z.coerce.number().default(10),
  DEFAULT_REFILL_INTERVAL_MS: z.coerce.number().default(1000),
  DEFAULT_BURST_ALLOWANCE: z.coerce.number().default(20),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
