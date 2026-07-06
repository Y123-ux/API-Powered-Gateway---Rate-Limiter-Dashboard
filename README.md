# AI-Powered API Gateway & Rate Limiter Dashboard

A self-hostable API gateway that proxies, monitors, and intelligently documents live traffic. Features token-bucket rate limiting via Redis, real-time traffic analytics, anomaly detection, and OpenAI-powered automatic OpenAPI documentation generation — all managed through a React dashboard.

<!-- Add your dashboard screenshot here -->
<!-- ![Dashboard Preview](./screenshots/dashboard.png) -->

## Features

- **Reverse Proxy Gateway** — Route requests to multiple upstream services through a single entry point with path-based routing
- **Token Bucket Rate Limiting** — Per-client rate limiting using an atomic Redis Lua script with configurable burst allowance, refill rate, and interval
- **Real-Time Dashboard** — Live traffic feed, time-series charts, KPI cards, and top endpoint analytics via Socket.IO
- **AI Doc Generation** — Analyze captured traffic patterns and auto-generate OpenAPI 3.0 specs using GPT
- **Anomaly Flagging** — Automatically detect and flag 5xx errors, slow responses, rate-limited requests, and failed mutations
- **Client Management** — Register API clients, issue API keys, assign per-client rate limit rules

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Express, TypeScript |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Database | Redis (token buckets, traffic logs, config) |
| Real-time | Socket.IO |
| Charts | Recharts |
| AI/LLM | OpenAI GPT API |
| Architecture | MVC, Proxy Pattern, Observer Pattern, Singleton, Middleware Chain |

## Architecture

```
Client Request
    │
    ▼
┌─────────────────────────────────────────────────┐
│  Express Gateway (/gw/:upstreamId/*)            │
│                                                 │
│  authenticate → rateLimiter → trafficCapture    │
│       │              │              │           │
│       ▼              ▼              ▼           │
│  Redis Lookup   Lua Token     Intercept Res     │
│  (API Key)      Bucket        (Log + Flag)      │
│                                                 │
│  ──────────── http-proxy-middleware ──────────►  │  Upstream
│                                                 │  Service
└─────────────────────────────────────────────────┘
         │
    Socket.IO ──► React Dashboard (real-time updates)
```

### Design Patterns

1. **Proxy Pattern** — Gateway forwards requests to configured upstreams via `http-proxy-middleware`
2. **Token Bucket Algorithm** — Atomic Redis Lua script handles check + refill + consume in a single `EVAL` to prevent race conditions
3. **MVC** — Controllers handle HTTP layer, Services contain business logic, Models manage Redis data
4. **Observer** — `RealtimeService` broadcasts Socket.IO events; dashboard subscribes to live updates
5. **Singleton** — Redis client shared across the application
6. **Middleware Chain** — `authenticate → rateLimiter → trafficCapture → proxy → errorHandler`

## Dashboard Pages

| Page | Description |
|---|---|
| **Dashboard** | KPI cards with trend indicators, traffic time-series chart, top endpoints bar chart, recent traffic feed, and live alerts panel |
| **Traffic** | Paginated traffic log table with method, status, latency columns. Click any row to inspect full request/response headers and body |
| **Rate Limits** | CRUD interface for rate limit rules. Configure max tokens, refill rate, burst allowance per client or globally |
| **API Docs** | Select an upstream, click "Generate with AI" to produce an OpenAPI 3.0 spec from captured traffic. View, download, or delete generated specs |
| **Flagged** | Anomalous requests auto-flagged by severity (high/medium/low). Dismiss resolved alerts |
| **Settings** | View upstream service configs, register API clients, copy API keys |

## Project Structure

```
├── package.json              # npm workspaces root
├── .env.example              # Environment template
├── server/
│   └── src/
│       ├── index.ts          # Express + Socket.IO + Redis entry point
│       ├── config/           # env validation (zod), redis singleton, socket.io, openai client, upstream loader
│       ├── middleware/       # authenticate, rateLimiter, trafficCapture, requestLogger, errorHandler
│       ├── controllers/      # gateway (proxy), analytics, rateLimit, docs, client
│       ├── services/         # proxyService, rateLimitService, trafficService, docGenerationService, realtimeService, flaggingService
│       ├── utils/            # Redis Lua scripts, OpenAPI prompt helpers, rate-limit response headers
│       ├── types/            # TypeScript interfaces, Socket.IO event types
│       ├── routes/           # gatewayRoutes (/gw/*), apiRoutes (/api/v1/*)
│       ├── data/             # upstreams.json (upstream service config)
│       └── seed.ts           # Demo data seeder (350 traffic logs, clients, rules, docs, flags)
└── client/
    └── src/
        ├── pages/            # Dashboard, Traffic, RateLimits, ApiDocs, Flagged, Settings
        ├── components/       # layout/ (Sidebar, Header), common/ (Card, Badge, Spinner)
        ├── api/              # Axios HTTP client + typed API modules (analytics, rateLimit, docs, clients)
        ├── hooks/            # useSocket, useTrafficStream, useThrottleEvents
        └── context/          # Socket.IO React context provider
```

## Getting Started

### Prerequisites

- **Node.js** 18+
- **Redis** — [Install Redis](https://redis.io/download) or use [Memurai](https://www.memurai.com/) on Windows
- **OpenAI API key** — [Get one here](https://platform.openai.com/api-keys) (required for AI doc generation only)

### Installation

```bash
# Clone the repo
git clone https://github.com/Y123-ux/API-Powered-Gateway---Rate-Limiter-Dashboard.git
cd API-Powered-Gateway---Rate-Limiter-Dashboard

# Install dependencies (both server and client via npm workspaces)
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

### Running

```bash
# Make sure Redis is running first

# Seed demo data (optional — populates the dashboard with sample traffic)
npm run seed

# Start both server and client in development mode
npm run dev
```

| Service | URL |
|---|---|
| Dashboard | http://localhost:5173 |
| API Server | http://localhost:3001 |
| Gateway Proxy | http://localhost:3001/gw/:upstreamId/* |
| Health Check | http://localhost:3001/health |

## API Endpoints

### Gateway

| Route | Method | Description |
|---|---|---|
| `/gw/:upstreamId/*` | ALL | Proxy request through the full middleware chain (auth → rate limit → capture → forward) |

### Analytics

| Route | Method | Description |
|---|---|---|
| `/api/v1/analytics/overview` | GET | 24-hour KPI summary (total requests, avg latency, error rate, active clients) |
| `/api/v1/analytics/traffic` | GET | Paginated traffic logs with optional `from`, `to`, `clientId` filters |
| `/api/v1/analytics/traffic/:logId` | GET | Full request/response detail for a single log |
| `/api/v1/analytics/timeseries` | GET | Time-series data points (1h or 15m intervals) |
| `/api/v1/analytics/top-paths` | GET | Most frequently hit endpoint paths |

### Rate Limits

| Route | Method | Description |
|---|---|---|
| `/api/v1/rate-limits` | GET | List all rate limit rules |
| `/api/v1/rate-limits` | POST | Create a new rule |
| `/api/v1/rate-limits/:ruleId` | PUT | Update a rule |
| `/api/v1/rate-limits/:ruleId` | DELETE | Delete a rule |
| `/api/v1/rate-limits/status/:clientId` | GET | Current token bucket state for a client |

### Documentation

| Route | Method | Description |
|---|---|---|
| `/api/v1/docs/generate` | POST | Trigger AI-powered OpenAPI spec generation for an upstream |
| `/api/v1/docs` | GET | List all generated specs |
| `/api/v1/docs/:docId` | GET | Get a specific spec |
| `/api/v1/docs/:docId` | DELETE | Delete a spec |

### Clients & Flagged

| Route | Method | Description |
|---|---|---|
| `/api/v1/clients` | GET/POST | List or register API clients |
| `/api/v1/clients/:clientId` | PUT/DELETE | Update or remove a client |
| `/api/v1/flagged` | GET | List flagged/anomalous requests |
| `/api/v1/flagged/:logId/dismiss` | PUT | Dismiss a flagged request |

## Usage

1. **Register a client** — Go to Settings page or call the API:
   ```bash
   curl -X POST http://localhost:3001/api/v1/clients \
     -H "Content-Type: application/json" \
     -d '{"name": "My App"}'
   ```

2. **Send requests through the gateway** — Use the API key in the `X-Api-Key` header:
   ```bash
   curl http://localhost:3001/gw/jsonplaceholder/posts/1 \
     -H "X-Api-Key: gw_your_key_here"
   ```

3. **Monitor traffic** — Open the Dashboard to watch requests flow in real-time

4. **Configure rate limits** — Create rules on the Rate Limits page:
   ```bash
   curl -X POST http://localhost:3001/api/v1/rate-limits \
     -H "Content-Type: application/json" \
     -d '{"clientId": "*", "maxTokens": 100, "refillRate": 10, "refillIntervalMs": 1000, "burstAllowance": 20}'
   ```

5. **Generate API docs** — Once traffic is captured, use the API Docs page to auto-generate an OpenAPI 3.0 spec with AI

## Rate Limiting Deep Dive

The rate limiter uses the **Token Bucket** algorithm implemented as an atomic Redis Lua script to prevent race conditions under concurrent requests.

**How it works:**
- Each client gets a bucket with a configured capacity (`maxTokens` + `burstAllowance`)
- Every request consumes 1 token
- Tokens refill at `refillRate` tokens per `refillIntervalMs`
- When the bucket is empty, requests receive `429 Too Many Requests`

**Configuration per rule:**
| Parameter | Description | Default |
|---|---|---|
| `maxTokens` | Base bucket capacity | 100 |
| `refillRate` | Tokens added per interval | 10 |
| `refillIntervalMs` | Refill interval in ms | 1000 |
| `burstAllowance` | Extra tokens above max for burst traffic | 20 |

**Response headers on every proxied request:**
```
X-RateLimit-Limit: 120
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1704067200
Retry-After: 1            ← only on 429 responses
```

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | 3001 | Server port |
| `NODE_ENV` | No | development | Environment mode |
| `REDIS_URL` | No | redis://localhost:6379 | Redis connection URL |
| `OPENAI_API_KEY` | Yes | — | OpenAI API key for doc generation |
| `OPENAI_MODEL` | No | gpt-4o | GPT model to use |
| `DEFAULT_MAX_TOKENS` | No | 100 | Default rate limit bucket size |
| `DEFAULT_REFILL_RATE` | No | 10 | Default token refill rate |
| `DEFAULT_REFILL_INTERVAL_MS` | No | 1000 | Default refill interval (ms) |
| `DEFAULT_BURST_ALLOWANCE` | No | 20 | Default burst token allowance |
| `CORS_ORIGIN` | No | http://localhost:5173 | Allowed CORS origin |

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start server and client concurrently in dev mode |
| `npm run build` | Build both server and client for production |
| `npm run start` | Start the production server |
| `npm run seed` | Populate Redis with demo data (350 traffic logs, 6 clients, 4 rules, 3 API docs) |

## License

MIT
