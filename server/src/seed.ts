import { createClient } from 'redis';
import { v4 as uuid } from 'uuid';
import crypto from 'crypto';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
const UPSTREAMS = ['httpbin', 'jsonplaceholder'];

const PATHS: Record<string, string[]> = {
  httpbin: [
    '/gw/httpbin/get',
    '/gw/httpbin/post',
    '/gw/httpbin/put',
    '/gw/httpbin/delete',
    '/gw/httpbin/status/200',
    '/gw/httpbin/status/404',
    '/gw/httpbin/delay/1',
    '/gw/httpbin/headers',
    '/gw/httpbin/ip',
    '/gw/httpbin/user-agent',
  ],
  jsonplaceholder: [
    '/gw/jsonplaceholder/posts',
    '/gw/jsonplaceholder/posts/1',
    '/gw/jsonplaceholder/posts/2',
    '/gw/jsonplaceholder/users',
    '/gw/jsonplaceholder/users/1',
    '/gw/jsonplaceholder/comments',
    '/gw/jsonplaceholder/todos',
    '/gw/jsonplaceholder/todos/1',
    '/gw/jsonplaceholder/albums',
    '/gw/jsonplaceholder/photos',
  ],
};

const CLIENT_NAMES = [
  'Frontend App',
  'Mobile API',
  'Data Pipeline',
  'Partner Integration',
  'Analytics Service',
  'Internal Dashboard',
];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomStatus(): number {
  const roll = Math.random();
  if (roll < 0.72) return 200;
  if (roll < 0.80) return 201;
  if (roll < 0.85) return 204;
  if (roll < 0.88) return 301;
  if (roll < 0.91) return 400;
  if (roll < 0.94) return 401;
  if (roll < 0.96) return 404;
  if (roll < 0.98) return 429;
  if (roll < 0.99) return 500;
  return 503;
}

async function seed() {
  console.log('Connecting to Redis...');
  const redis = createClient({ url: REDIS_URL });
  await redis.connect();
  console.log('Connected.');

  // --- 1. Seed Clients ---
  console.log('\nSeeding clients...');
  const clientIds: string[] = [];
  for (const name of CLIENT_NAMES) {
    const id = uuid();
    const apiKey = `gw_${crypto.randomBytes(24).toString('hex')}`;
    clientIds.push(id);
    await redis.hSet(`clients:${id}`, {
      id,
      name,
      apiKey,
      rateLimitRuleId: 'default',
      enabled: 'true',
      createdAt: String(Date.now() - randomInt(86400000, 604800000)),
    });
    console.log(`  + Client: ${name} (${id})`);
  }

  // --- 2. Seed Rate Limit Rules ---
  console.log('\nSeeding rate limit rules...');
  const rules = [
    {
      id: 'rule-global',
      clientId: '*',
      path: '',
      maxTokens: 100,
      refillRate: 10,
      refillIntervalMs: 1000,
      burstAllowance: 20,
      enabled: true,
    },
    {
      id: 'rule-premium',
      clientId: clientIds[0],
      path: '',
      maxTokens: 500,
      refillRate: 50,
      refillIntervalMs: 1000,
      burstAllowance: 100,
      enabled: true,
    },
    {
      id: 'rule-partner',
      clientId: clientIds[3],
      path: '/gw/jsonplaceholder/*',
      maxTokens: 200,
      refillRate: 20,
      refillIntervalMs: 1000,
      burstAllowance: 40,
      enabled: true,
    },
    {
      id: 'rule-restricted',
      clientId: clientIds[2],
      path: '',
      maxTokens: 30,
      refillRate: 5,
      refillIntervalMs: 2000,
      burstAllowance: 5,
      enabled: true,
    },
  ];
  for (const rule of rules) {
    const now = Date.now();
    await redis.hSet(`rl:rules:${rule.id}`, {
      id: rule.id,
      clientId: rule.clientId,
      path: rule.path,
      maxTokens: String(rule.maxTokens),
      refillRate: String(rule.refillRate),
      refillIntervalMs: String(rule.refillIntervalMs),
      burstAllowance: String(rule.burstAllowance),
      enabled: String(rule.enabled),
      createdAt: String(now - 86400000 * 3),
      updatedAt: String(now - randomInt(0, 86400000)),
    });
    console.log(`  + Rule: ${rule.id} (client: ${rule.clientId === '*' ? 'global' : rule.clientId.slice(0, 8)})`);
  }

  // --- 3. Seed Traffic Logs (spread over the last 24 hours) ---
  console.log('\nSeeding traffic logs...');
  const now = Date.now();
  const DAY_MS = 86400000;
  const LOG_COUNT = 350;

  for (let i = 0; i < LOG_COUNT; i++) {
    const logId = uuid();
    const timestamp = now - randomInt(0, DAY_MS);
    const upstream = pick(UPSTREAMS);
    const path = pick(PATHS[upstream]);
    const method = path.includes('/post') || path.includes('/users')
      ? pick(['GET', 'POST'])
      : path.includes('/delete')
        ? 'DELETE'
        : path.includes('/put')
          ? 'PUT'
          : pick(['GET', 'GET', 'GET', 'POST']);
    const status = randomStatus();
    const responseTimeMs = status >= 500
      ? randomInt(800, 6000)
      : status === 429
        ? randomInt(5, 30)
        : randomInt(20, 400);
    const clientId = pick(clientIds);
    const rateLimited = status === 429;
    let flagged = false;
    let flagReason = '';

    if (status >= 500) {
      flagged = true;
      flagReason = `Server error (${status})`;
    } else if (rateLimited) {
      flagged = true;
      flagReason = 'Rate limited';
    } else if (responseTimeMs > 5000) {
      flagged = true;
      flagReason = `Slow response (${responseTimeMs}ms)`;
    } else if (['DELETE', 'PUT', 'PATCH'].includes(method) && status >= 400) {
      flagged = true;
      flagReason = `Failed ${method} request`;
    }

    const sampleResponseBodies: Record<string, unknown> = {
      '/gw/jsonplaceholder/posts/1': { userId: 1, id: 1, title: 'sunt aut facere repellat provident', body: 'quia et suscipit...' },
      '/gw/jsonplaceholder/posts/2': { userId: 1, id: 2, title: 'qui est esse', body: 'est rerum tempore vitae...' },
      '/gw/jsonplaceholder/users/1': { id: 1, name: 'Leanne Graham', username: 'Bret', email: 'Sincere@april.biz' },
      '/gw/httpbin/get': { args: {}, headers: { Host: 'httpbin.org', 'X-Api-Key': '***' }, origin: '203.0.113.42', url: 'https://httpbin.org/get' },
      '/gw/httpbin/ip': { origin: '203.0.113.42' },
      '/gw/httpbin/headers': { headers: { Accept: '*/*', Host: 'httpbin.org' } },
    };

    const responseBody = status >= 400
      ? { error: `HTTP ${status}`, message: status === 429 ? 'Too Many Requests' : status === 404 ? 'Not Found' : 'Internal Server Error' }
      : sampleResponseBodies[path] || { data: 'ok' };

    const requestHeaders: Record<string, string> = {
      'content-type': 'application/json',
      'x-api-key': `gw_${'*'.repeat(24)}`,
      'user-agent': pick([
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'axios/1.7.9',
        'PostmanRuntime/7.36.0',
        'node-fetch/1.0',
      ]),
      accept: 'application/json',
    };

    const responseHeaders: Record<string, string> = {
      'content-type': 'application/json',
      'x-ratelimit-limit': '100',
      'x-ratelimit-remaining': String(randomInt(0, 100)),
      'x-powered-by': 'Express',
    };

    // Store the traffic log
    await redis.hSet(`traffic:detail:${logId}`, {
      id: logId,
      timestamp: String(timestamp),
      clientId,
      method,
      path,
      upstreamTarget: upstream,
      requestHeaders: JSON.stringify(requestHeaders),
      requestBody: JSON.stringify(method === 'POST' ? { title: 'foo', body: 'bar', userId: 1 } : null),
      responseStatus: String(status),
      responseHeaders: JSON.stringify(responseHeaders),
      responseBody: JSON.stringify(responseBody),
      responseTimeMs: String(responseTimeMs),
      rateLimited: String(rateLimited),
      flagged: String(flagged),
      flagReason,
    });

    await redis.zAdd('traffic:logs', { score: timestamp, value: logId });
    await redis.expire(`traffic:detail:${logId}`, 86400);

    // Increment hourly stats
    const date = new Date(timestamp);
    const dayKey = `stats:requests:${date.toISOString().split('T')[0]}`;
    const hour = String(date.getHours());
    await redis.hIncrBy(dayKey, hour, 1);
    await redis.expire(dayKey, 86400 * 7);

    // Store flagged entry
    if (flagged) {
      const flagId = uuid();
      const severity = status >= 500 ? 'high' : rateLimited ? 'medium' : responseTimeMs > 5000 ? 'medium' : 'low';
      await redis.hSet(`flagged:detail:${flagId}`, {
        id: flagId,
        logId,
        reason: flagReason,
        severity,
        timestamp: String(timestamp),
        dismissed: String(Math.random() < 0.3),
      });
      await redis.zAdd('flagged:requests', { score: timestamp, value: flagId });
    }

    if ((i + 1) % 50 === 0) console.log(`  ${i + 1}/${LOG_COUNT} logs seeded...`);
  }
  console.log(`  ${LOG_COUNT} traffic logs seeded.`);

  // --- 4. Seed Generated API Docs ---
  console.log('\nSeeding API documentation...');

  const sampleOpenApiSpec = {
    openapi: '3.0.3',
    info: {
      title: 'JSONPlaceholder API',
      version: '1.0.0',
      description: 'Auto-generated OpenAPI documentation from observed traffic patterns. This spec was generated by analyzing 87 traffic samples captured through the API Gateway.',
    },
    servers: [{ url: 'https://jsonplaceholder.typicode.com', description: 'JSONPlaceholder API' }],
    paths: {
      '/posts': {
        get: {
          summary: 'List all posts',
          operationId: 'listPosts',
          tags: ['Posts'],
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: { type: 'array', items: { $ref: '#/components/schemas/Post' } },
                },
              },
            },
          },
        },
        post: {
          summary: 'Create a new post',
          operationId: 'createPost',
          tags: ['Posts'],
          requestBody: {
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PostInput' },
              },
            },
          },
          responses: {
            '201': { description: 'Post created successfully' },
          },
        },
      },
      '/posts/{id}': {
        get: {
          summary: 'Get a post by ID',
          operationId: 'getPost',
          tags: ['Posts'],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: {
            '200': {
              description: 'Successful response',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Post' } } },
            },
            '404': { description: 'Post not found' },
          },
        },
      },
      '/users': {
        get: {
          summary: 'List all users',
          operationId: 'listUsers',
          tags: ['Users'],
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: { type: 'array', items: { $ref: '#/components/schemas/User' } },
                },
              },
            },
          },
        },
      },
      '/users/{id}': {
        get: {
          summary: 'Get a user by ID',
          operationId: 'getUser',
          tags: ['Users'],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: {
            '200': { description: 'Successful response', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } },
          },
        },
      },
      '/todos': {
        get: {
          summary: 'List all todos',
          operationId: 'listTodos',
          tags: ['Todos'],
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: { type: 'array', items: { $ref: '#/components/schemas/Todo' } },
                },
              },
            },
          },
        },
      },
      '/comments': {
        get: {
          summary: 'List all comments',
          operationId: 'listComments',
          tags: ['Comments'],
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: { type: 'array', items: { $ref: '#/components/schemas/Comment' } },
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        Post: {
          type: 'object',
          properties: {
            userId: { type: 'integer' },
            id: { type: 'integer' },
            title: { type: 'string' },
            body: { type: 'string' },
          },
        },
        PostInput: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            body: { type: 'string' },
            userId: { type: 'integer' },
          },
          required: ['title', 'body', 'userId'],
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            username: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            website: { type: 'string' },
          },
        },
        Todo: {
          type: 'object',
          properties: {
            userId: { type: 'integer' },
            id: { type: 'integer' },
            title: { type: 'string' },
            completed: { type: 'boolean' },
          },
        },
        Comment: {
          type: 'object',
          properties: {
            postId: { type: 'integer' },
            id: { type: 'integer' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            body: { type: 'string' },
          },
        },
      },
    },
  };

  const sampleHttpbinSpec = {
    openapi: '3.0.3',
    info: {
      title: 'HTTPBin API',
      version: '1.0.0',
      description: 'Auto-generated OpenAPI documentation from observed traffic patterns for HTTPBin test API.',
    },
    servers: [{ url: 'https://httpbin.org', description: 'HTTPBin Test API' }],
    paths: {
      '/get': {
        get: {
          summary: 'Returns GET data',
          operationId: 'httpGet',
          tags: ['HTTP Methods'],
          responses: {
            '200': { description: 'Successful response with request metadata' },
          },
        },
      },
      '/post': {
        post: {
          summary: 'Returns POST data',
          operationId: 'httpPost',
          tags: ['HTTP Methods'],
          responses: {
            '200': { description: 'Successful response with posted data echoed back' },
          },
        },
      },
      '/headers': {
        get: {
          summary: 'Returns request headers',
          operationId: 'getHeaders',
          tags: ['Request Inspection'],
          responses: {
            '200': { description: 'Request headers returned' },
          },
        },
      },
      '/ip': {
        get: {
          summary: 'Returns origin IP',
          operationId: 'getIp',
          tags: ['Request Inspection'],
          responses: {
            '200': { description: 'Origin IP address' },
          },
        },
      },
      '/status/{code}': {
        get: {
          summary: 'Returns given HTTP status code',
          operationId: 'getStatus',
          tags: ['Status Codes'],
          parameters: [{ name: 'code', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: {
            '200': { description: 'The requested status code response' },
          },
        },
      },
    },
  };

  const docs = [
    {
      id: uuid(),
      upstreamTarget: 'jsonplaceholder',
      version: 'v1',
      openApiSpec: sampleOpenApiSpec,
      trafficSampleCount: 87,
      generatedAt: now - 7200000,
      promptTokensUsed: 2340,
      completionTokensUsed: 1856,
    },
    {
      id: uuid(),
      upstreamTarget: 'httpbin',
      version: 'v1',
      openApiSpec: sampleHttpbinSpec,
      trafficSampleCount: 52,
      generatedAt: now - 3600000,
      promptTokensUsed: 1680,
      completionTokensUsed: 1245,
    },
    {
      id: uuid(),
      upstreamTarget: 'jsonplaceholder',
      version: 'v2',
      openApiSpec: { ...sampleOpenApiSpec, info: { ...sampleOpenApiSpec.info, version: '2.0.0', description: 'Updated spec with additional endpoints discovered from 142 traffic samples.' } },
      trafficSampleCount: 142,
      generatedAt: now - 1200000,
      promptTokensUsed: 3120,
      completionTokensUsed: 2480,
    },
  ];

  for (const doc of docs) {
    await redis.set(`docs:${doc.id}`, JSON.stringify(doc));
    await redis.zAdd('docs:index', { score: doc.generatedAt, value: doc.id });
    console.log(`  + Doc: ${doc.upstreamTarget} ${doc.version}`);
  }

  // --- 5. Seed Rate Limit Bucket State (simulate partially consumed buckets) ---
  console.log('\nSeeding rate limit bucket states...');
  for (const cid of clientIds.slice(0, 3)) {
    const bucketKey = `rl:bucket:${cid}:_gw_jsonplaceholder_posts`;
    await redis.hSet(bucketKey, {
      tokens: String(randomInt(15, 85)),
      maxTokens: '120',
      lastRefill: String(now - randomInt(500, 5000)),
    });
    await redis.expire(bucketKey, 3600);
  }

  // --- Done ---
  console.log(`\n--- Seed complete ---`);
  console.log(`  ${CLIENT_NAMES.length} clients`);
  console.log(`  ${rules.length} rate limit rules`);
  console.log(`  ${LOG_COUNT} traffic logs`);
  console.log(`  ${docs.length} API docs`);
  console.log(`  Flagged requests included in traffic logs`);
  console.log(`\nStart the server with "npm run dev" and open the dashboard.\n`);

  await redis.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
