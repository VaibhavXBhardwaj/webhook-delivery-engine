<div align="center">

<img src="https://img.shields.io/badge/-WebhookEngine-6366f1?style=for-the-badge&labelColor=0a0a0a" alt="WebhookEngine" height="60"/>

# Webhook Delivery Engine

### Production-grade distributed webhook delivery system

*Replicating the core infrastructure used by **Stripe**, **GitHub**, and **Razorpay***

<br/>

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis&logoColor=white)](https://redis.io/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)
[![AWS](https://img.shields.io/badge/AWS-EC2-FF9900?style=flat-square&logo=amazonaws&logoColor=white)](https://aws.amazon.com/)
[![License](https://img.shields.io/badge/License-MIT-22c55e?style=flat-square)](LICENSE)

<br/>

**[ Live Dashboard](https://webhook-delivery-engine.vercel.app)** &nbsp;•&nbsp; **[ Live API](http://100.26.107.105/api/v1/health)** &nbsp;•&nbsp; **[ API Docs](#-api-reference)**

<br/>

</div>

---

## 📌 What Is This?

When a payment succeeds on Stripe, dozens of services need to know — your email system, your analytics platform, your accounting software. Stripe notifies them all via **webhooks**: HTTP POST requests sent to registered URLs.

This project is the **infrastructure that powers that system** — built from scratch.

```
Your App fires an event
        │
        ▼
┌───────────────────┐
│   Webhook Engine  │  ──▶  Subscriber A  ✅ Delivered in 45ms
│                   │  ──▶  Subscriber B  ❌ Failed → retry in 2s → ✅
│  Fan-out + Queue  │  ──▶  Subscriber C  ❌ All retries failed →  DLQ
└───────────────────┘
```

---

##  Architecture
![c4004e00-aff5-4491-b40f-bfc8fce455a6 (1)](https://github.com/user-attachments/assets/4f6db838-7092-47b1-9591-620c49aac662)


##  Features

###  Core Delivery
| Feature | Description |
|---------|-------------|
| **Event Fan-out** | One event → delivered to ALL matching webhook subscribers |
| **Async Queue** | BullMQ + Redis for reliable async job processing |
| **HMAC-SHA256** | Every delivery signed with webhook secret (Stripe-style) |
| **Wildcard Events** | Subscribe to `*` to receive all event types |

###  Reliability
| Feature | Description |
|---------|-------------|
| **Exponential Backoff** | `1s → 2s → 4s → 8s → 16s` retry delays |
| **Circuit Breaker** | Auto-suspends endpoints after 10 consecutive failures |
| **Dead Letter Queue** | Captures events that exhaust all retry attempts |
| **Manual DLQ Retry** | Retry failed events via API or dashboard |
| **Idempotency Keys** | Prevent duplicate event processing |

###  Security
| Feature | Description |
|---------|-------------|
| **API Key Auth** | Every request authenticated via `x-api-key` header |
| **HMAC Signing** | Per-webhook secrets, signature on every delivery |
| **Rate Limiting** | 3 layers — global, per API key, per IP |
| **Helmet.js** | Security headers on all responses |
| **Non-root Docker** | Production container runs as non-root user |

### Observability
| Feature | Description |
|---------|-------------|
| **Analytics API** | Success rate, avg latency, DLQ count in real time |
| **Delivery History** | Every attempt logged with HTTP status + response time |
| **Per-webhook Stats** | Min/avg/max latency per endpoint |
| **Structured Logs** | Winston JSON logging in production |

---

##  How Retry Works

```
Event fires → Attempt 1
                   │
              ❌ FAILS
                   │
              wait 1 second
                   │
             Attempt 2
                   │
              ❌ FAILS
                   │
              wait 2 seconds
                   │
             Attempt 3
                   │
              ❌ FAILS  ──── failure_count hits 10 ────▶ 🚨 WEBHOOK SUSPENDED
                   │
              wait 4 seconds
                   │
             Attempt 4
                   │
              ❌ FAILS
                   │
              wait 8 seconds
                   │
             Attempt 5 (FINAL)
                   │
              ❌ FAILS
                   │
              ▼
         DEAD LETTER QUEUE
        (manual retry available)
```

---

##  Tech Stack

```
Backend          Node.js 20 + TypeScript + Express.js
Database         PostgreSQL 15 + Prisma ORM
Queue            BullMQ + Redis 7
Validation       Zod
Security         HMAC-SHA256 + Helmet + express-rate-limit
Logging          Winston (colorized dev, JSON prod)
Frontend         React 18 + Vite + Tailwind CSS + Lucide Icons
Reverse Proxy    Nginx (rate limiting + security headers)
Containerization Docker + Docker Compose (multi-stage builds)
Cloud            AWS EC2 t2.micro (free tier)
Frontend CDN     Vercel
CI/CD            GitHub Actions
```

---

##  Quick Start

### Prerequisites
- Node.js 20+
- Docker Desktop

### 1. Clone and install

```bash
git clone https://github.com/VaibhavXBhardwaj/webhook-delivery-engine.git
cd webhook-delivery-engine
npm install
```

### 2. Start infrastructure

```bash
docker-compose up postgres redis -d
```

### 3. Set up environment

```bash
cp .env.example .env
```

```env
PORT=3000
NODE_ENV=development
DATABASE_URL="postgresql://webhookuser:webhookpass@localhost:5434/webhookdb"
REDIS_URL="redis://localhost:6380"
JWT_SECRET="your-secret-here"
API_KEY_PREFIX="whe"
```

### 4. Set up database

```bash
npx prisma generate
npx prisma db push
```

### 5. Start all services

```bash
# Terminal 1 — API Server
npm run dev

# Terminal 2 — Delivery Worker
npm run dev:worker

# Terminal 3 — Mock Webhook Receiver (for testing)
npm run dev:mock
```

### 6. Start Dashboard

```bash
cd dashboard
npm install
npm run dev
```

Open `http://localhost:5173` → Register → get API key → explore dashboard.

---

##  API Reference

### Authentication

All protected endpoints require:
```http
x-api-key: whe_your_api_key_here
```

### Base URL
```
Production:   http://100.26.107.105/api/v1
Development:  http://localhost:3000/api/v1
```

---

###  Clients

#### Register a client
```http
POST /clients/register

{
  "name": "My Project"
}
```

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "My Project",
    "apiKey": "whe_abc123...",
    "message": "Store your API key safely. It will not be shown again."
  }
}
```

---

###  Webhooks

```http
POST   /webhooks              Register a webhook URL
GET    /webhooks              List all webhooks
GET    /webhooks/:id          Get single webhook
PUT    /webhooks/:id          Update webhook
DELETE /webhooks/:id          Delete webhook
GET    /webhooks/:id/history  Delivery history + stats
POST   /webhooks/:id/reactivate  Reactivate suspended webhook
```

#### Register webhook
```http
POST /webhooks

{
  "url": "https://your-server.com/webhook",
  "eventTypes": ["payment.success", "order.created"]
}
```

#### Supported event types
```
payment.success      payment.failed
order.created        order.updated        order.cancelled
user.created         user.deleted
subscription.created subscription.cancelled
*  (wildcard — receive all events)
```

---

###  Events

```http
POST /events              Ingest event (triggers fan-out)
GET  /events/:id/status   Get delivery status
```

#### Fire an event
```http
POST /events

{
  "eventType": "payment.success",
  "payload": {
    "amount": 1000,
    "currency": "INR",
    "orderId": "ord_123"
  },
  "idempotencyKey": "optional-unique-key"
}
```

```json
{
  "success": true,
  "message": "Event queued for delivery to 2 webhook(s)",
  "data": {
    "event": { "id": "uuid", "eventType": "payment.success" },
    "deliveries": [
      { "deliveryAttemptId": "uuid", "webhookId": "uuid", "status": "PENDING" }
    ]
  }
}
```

---

###  Dead Letter Queue

```http
GET  /dlq           View all failed deliveries
POST /dlq/:id/retry Manually retry a failed delivery
```

---

###  Analytics

```http
GET /analytics/overview        System-wide stats
GET /analytics/webhook/:id     Per-webhook analytics
```

#### Overview response
```json
{
  "totalWebhooks": 5,
  "activeWebhooks": 4,
  "suspendedWebhooks": 1,
  "totalEvents": 1247,
  "successRate": "94.20%",
  "avgResponseTimeMs": 127,
  "dlqCount": 3,
  "last24Hours": {
    "events": 84,
    "deliveries": 91,
    "successRate": "97.80%"
  }
}
```

---

###  Health Check

```http
GET /health

{
  "success": true,
  "data": {
    "status": "healthy",
    "uptime": 3600,
    "environment": "production"
  }
}
```

---

##  Webhook Signature Verification

Every delivery includes these headers:

```
x-webhook-signature: sha256=abc123...
x-webhook-timestamp: 1234567890
x-webhook-id:        evt_uuid
x-webhook-attempt:   1
```

### Verify on your server

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return signature === `sha256=${expected}`;
}

// In your Express route:
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const isValid = verifyWebhook(req.body, signature, YOUR_WEBHOOK_SECRET);

  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Process the event
  res.status(200).json({ received: true });
});
```

---

##  Production Deployment

### Environment Variables

```env
DATABASE_URL=postgresql://user:pass@postgres:5432/webhookdb
POSTGRES_DB=webhookdb
POSTGRES_USER=user
POSTGRES_PASSWORD=strongpassword
REDIS_URL=redis://redis:6379
PORT=3000
NODE_ENV=production
JWT_SECRET=your-long-random-secret
API_KEY_PREFIX=whe
```

### Start with Docker Compose

```bash
# Build and start all 5 services
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# View logs
npm run prod:logs

# Stop everything
npm run prod:down
```

### Services started

| Container | Purpose | Port |
|-----------|---------|------|
| `webhook_app` | Express API server | 3000 (internal) |
| `webhook_worker` | BullMQ delivery worker | — |
| `webhook_postgres_prod` | PostgreSQL database | 5432 (internal) |
| `webhook_redis_prod` | Redis queue | 6379 (internal) |
| `webhook_nginx` | Reverse proxy | 80 (public) |

---

##  Project Structure

```
webhook-delivery-engine/
│
├── src/
│   ├── config/              # Environment config + constants
│   │   └── index.ts
│   │
│   ├── controllers/         # Request handlers (thin layer)
│   │   ├── client.controller.ts
│   │   ├── webhook.controller.ts
│   │   ├── event.controller.ts
│   │   ├── analytics.controller.ts
│   │   └── dlq.controller.ts
│   │
│   ├── services/            # Business logic
│   │   ├── client.service.ts
│   │   ├── webhook.service.ts
│   │   ├── event.service.ts
│   │   ├── delivery.service.ts
│   │   ├── analytics.service.ts
│   │   └── dlq.service.ts
│   │
│   ├── lib/                 # Infrastructure clients
│   │   ├── prisma.ts        # PostgreSQL client
│   │   ├── redis.ts         # Redis client
│   │   ├── queue.ts         # BullMQ queue
│   │   └── logger.ts        # Winston logger
│   │
│   ├── middleware/          # Express middleware
│   │   ├── auth.middleware.ts
│   │   ├── errorHandler.ts
│   │   ├── rateLimit.middleware.ts
│   │   └── idempotency.middleware.ts
│   │
│   ├── validators/          # Zod schemas
│   │   ├── client.validator.ts
│   │   ├── webhook.validator.ts
│   │   └── event.validator.ts
│   │
│   ├── routes/              # Express routes
│   │   ├── index.ts
│   │   ├── client.routes.ts
│   │   ├── webhook.routes.ts
│   │   ├── event.routes.ts
│   │   ├── analytics.routes.ts
│   │   └── dlq.routes.ts
│   │
│   ├── workers/             # BullMQ workers
│   │   ├── delivery.worker.ts
│   │   └── worker.boot.ts
│   │
│   ├── mock-server/         # Test webhook receiver
│   │   └── server.ts
│   │
│   └── server.ts            # Application entry point
│
├── dashboard/               # React frontend (Vite + Tailwind)
│   └── src/
│       ├── components/      # Reusable UI components
│       ├── pages/           # Page components
│       └── lib/             # API client
│
├── prisma/
│   └── schema.prisma        # Database schema
│
├── nginx/
│   └── nginx.conf           # Reverse proxy config
│
├── .github/
│   └── workflows/
│       └── deploy.yml       # CI/CD pipeline
│
├── Dockerfile               # Multi-stage production build
├── docker-compose.yml       # Development environment
└── docker-compose.prod.yml  # Production environment
```

---

##  Database Schema

```sql
clients
  id, name, api_key, created_at

webhooks
  id, client_id, url, secret, event_types[],
  status (ACTIVE|SUSPENDED|INACTIVE),
  failure_count, created_at, updated_at

events
  id, client_id, event_type, payload (JSONB),
  idempotency_key, created_at

delivery_attempts
  id, event_id, webhook_id,
  status (SUCCESS|FAILED|PENDING|DLQ),
  http_status_code, response_time_ms,
  attempt_number, next_retry_at,
  error_message, created_at

dead_letter_queue
  id, event_id, webhook_id,
  last_error, total_attempts, moved_at
```

---

##  Available Scripts

```bash
# Development
npm run dev              # Start API server with hot reload
npm run dev:worker       # Start delivery worker with hot reload
npm run dev:mock         # Start mock webhook receiver

# Production
npm run prod:up          # Start all production containers
npm run prod:down        # Stop all production containers
npm run prod:logs        # Tail production logs
npm run prod:build       # Build production Docker images

# Database
npm run db:migrate       # Run Prisma migrations
npm run db:generate      # Generate Prisma client
npm run db:studio        # Open Prisma Studio (DB browser)
npm run db:push          # Push schema without migration

# Build
npm run build            # Compile TypeScript
npm start                # Start compiled server
```

---

##  Live Demo

| | URL |
|--|-----|
| **Dashboard** | [https://webhook-delivery-engine.vercel.app](https://webhook-delivery-engine.vercel.app) |
| **API Health** | [http://100.26.107.105/api/v1/health](http://100.26.107.105/api/v1/health) |
| **GitHub** | [github.com/VaibhavXBhardwaj/webhook-delivery-engine](https://github.com/VaibhavXBhardwaj/webhook-delivery-engine) |

### Try it live

```bash
# 1. Check API health
curl http://100.26.107.105/api/v1/health

# 2. Register a client
curl -X POST http://100.26.107.105/api/v1/clients/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Your Name"}'

# 3. Save your API key from the response, then register a webhook
curl -X POST http://100.26.107.105/api/v1/webhooks \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"url": "https://webhook.site/your-id", "eventTypes": ["payment.success"]}'

# 4. Fire an event and watch it deliver
curl -X POST http://100.26.107.105/api/v1/events \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"eventType": "payment.success", "payload": {"amount": 1000}}'
```

---

##  Key Engineering Decisions

**Why BullMQ over a simple async function?**
Async functions die with the process. BullMQ persists jobs in Redis — if the server crashes mid-delivery, jobs survive and get retried automatically.

**Why exponential backoff?**
Linear retry hammers a struggling server. Exponential backoff gives it time to recover while still retrying.

**Why circuit breaker?**
Without it, a dead endpoint would consume queue workers indefinitely. The circuit breaker stops the bleeding and protects system resources.

**Why idempotency keys?**
Networks fail. Clients retry. Without idempotency keys, a payment event could be processed twice — charging a customer twice. Idempotency keys make retries safe.

**Why a Dead Letter Queue?**
Events are valuable. Rather than silently dropping events that fail all retries, the DLQ preserves them for human inspection and manual retry.

---

##  License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

Built with  by **[Vaibhav Bhardwaj](https://github.com/VaibhavXBhardwaj)**

*If this project helped you understand distributed systems, give it a ⭐*

</div>
