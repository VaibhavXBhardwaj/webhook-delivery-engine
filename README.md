     Webhook Delivery Engine

 Production grade distributed webhook delivery system with retry logic, dead letter queues, circuit breakers, and real time analytics replicating the core infrastructure used by Stripe, GitHub, and Razorpay.

**Live API:** `http://100.26.107.105/api/v1/health`

## Architecture
┌─────────────────────────────────────────────────────────────────┐
│                                                                   │
│   Client App          REST API              BullMQ Queue          │
│   ─────────           ────────              ────────────          │
│   POST /events  ───▶  Fan-out logic  ───▶  Redis-backed          │
│                        │                    job queue             │
│                        │                         │                │
│                        ▼                         ▼                │
│                   PostgreSQL              Delivery Worker         │
│                   (events,               (HMAC signing,          │
│                    webhooks,              HTTP delivery,          │
│                    attempts)              retry logic)            │
│                        │                         │                │
│                        │              ┌──────────┴──────────┐     │
│                        │              │                     │     │
│                        │         SUCCESS           FAILED      │
│                        │              │                     │     │
│                        │         Reset circuit        Increment   │
│                        │         breaker counter      failure     │
│                        │                              count       │
│                        │                                 │        │
│                        │                         ┌──────┘        │
│                        │                         │               │
│                        │                  10 failures?           │
│                        │                    SUSPEND              │
│                        │                  Max retries?           │
│                        └──────────────▶   DEAD LETTER QUEUE      │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

## Features

**Core Delivery System**
- Event fan-out to multiple webhook subscribers
- Async delivery via BullMQ + Redis queue
- HMAC-SHA256 payload signing on every request (Stripe-style)
- Exponential backoff retry: 1s → 2s → 4s → 8s → 16s
- 30 second delivery timeout per attempt

**Reliability Patterns**
- Circuit breaker — auto-suspends endpoints after 10 consecutive failures
- Dead Letter Queue — captures all events that exhaust max retries
- Manual DLQ retry via API
- Idempotency key support — prevents duplicate event processing
- Webhook reactivation after circuit breaker suspension

**Security**
- API key authentication on all protected routes
- HMAC-SHA256 request signing with per-webhook secrets
- Multi-layer rate limiting (global, per API key, per IP)
- Helmet.js security headers
- Non-root Docker user in production

**Observability**
- Real-time analytics API (success rate, avg latency, DLQ count)
- Per-webhook delivery history with attempt-level granularity
- Every delivery attempt logged (HTTP status, response time, error)
- Winston structured logging (JSON in production)

**Dashboard**
- React + Tailwind CSS dark theme UI
- Register/login with API key
- Webhook CRUD from browser (no curl needed)
- Fire events with JSON editor
- DLQ viewer with retry button
- Per-webhook analytics drawer

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20 + TypeScript |
| Framework | Express.js |
| Database | PostgreSQL + Prisma ORM |
| Queue | BullMQ + Redis |
| Security | HMAC-SHA256, API Keys, Helmet |
| Validation | Zod |
| Frontend | React + Vite + Tailwind CSS |
| Reverse Proxy | Nginx |
| Deployment | Docker + AWS EC2 |
| CI/CD | GitHub Actions |

---

## API Reference

### Authentication
All endpoints (except `/clients/register` and `/health`) require:
x-api-key: whe_your_api_key_here

### Endpoints

#### Client Registration
```http
POST /api/v1/clients/register
Content-Type: application/json

{
  "name": "My Project"
}
```
Response includes your API key — **save it, it won't be shown again.**

---

#### Webhooks
```http
# Register a webhook
POST /api/v1/webhooks
{
  "url": "https://your-server.com/webhook",
  "eventTypes": ["payment.success", "order.created"]
}

# List all webhooks
GET /api/v1/webhooks

# Get single webhook
GET /api/v1/webhooks/:id

# Update webhook
PUT /api/v1/webhooks/:id
{
  "url": "https://new-url.com/webhook",
  "status": "ACTIVE"
}

# Delete webhook
DELETE /api/v1/webhooks/:id

# Delivery history + stats
GET /api/v1/webhooks/:id/history

# Reactivate suspended webhook
POST /api/v1/webhooks/:id/reactivate
```

#### Supported Event Types
payment.success    payment.failed
order.created      order.updated      order.cancelled
user.created       user.deleted
subscription.created  subscription.cancelled

(wildcard — receives all events)


---

#### Events
```http
# Ingest event (triggers delivery to all matching webhooks)
POST /api/v1/events
{
  "eventType": "payment.success",
  "payload": { "amount": 1000, "currency": "INR" },
  "idempotencyKey": "optional-unique-key"
}

# Get delivery status
GET /api/v1/events/:eventId/status
```

---

#### Dead Letter Queue
```http
# View all failed deliveries
GET /api/v1/dlq

# Manually retry a failed delivery
POST /api/v1/dlq/:id/retry
```

---

#### Analytics
```http
# System overview
GET /api/v1/analytics/overview

# Per-webhook analytics
GET /api/v1/analytics/webhook/:id
```

---

#### Health Check
```http
GET /api/v1/health
```

---

### Webhook Delivery Headers
Every webhook delivery includes these headers so receivers can verify authenticity:
x-webhook-signature: sha256=abc123...   (HMAC-SHA256 of payload)
x-webhook-timestamp: 1234567890         (Unix timestamp)
x-webhook-id: evt_uuid                  (Event ID)
x-webhook-attempt: 1                    (Attempt number)

### Verifying Signatures (receiver side)
```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return signature === `sha256=${expected}`;
}
```

---

## Running Locally

### Prerequisites
- Node.js 20+
- Docker Desktop

### Setup
```bash
# Clone the repo
git clone https://github.com/VaibhavXBhardwaj/webhook-delivery-engine.git
cd webhook-delivery-engine

# Install dependencies
npm install

# Start PostgreSQL and Redis
docker-compose up postgres redis -d

# Set up environment variables
cp .env.example .env
# Edit .env with your values

# Generate Prisma client
npx prisma generate

# Create database tables
npx prisma db push

# Start the API server
npm run dev

# Start the delivery worker (new terminal)
npm run dev:worker

# Start mock webhook receiver (new terminal)
npm run dev:mock
```

The server runs on `http://localhost:3000`
The mock receiver runs on `http://localhost:4000`

### Dashboard
```bash
cd dashboard
npm install
npm run dev
```
Open `http://localhost:5173` → Register → get API key → use dashboard.

---

## Production Deployment

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

### Docker Compose (Production)
```bash
# Build and start all services
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop everything
docker-compose -f docker-compose.prod.yml down
```

This starts 5 containers:
- `webhook_app` — Express API server
- `webhook_worker` — BullMQ delivery worker
- `webhook_postgres_prod` — PostgreSQL database
- `webhook_redis_prod` — Redis queue
- `webhook_nginx` — Nginx reverse proxy (port 80)

---

## Database Schema
clients
└── webhooks (one client → many webhooks)
└── delivery_attempts (one webhook → many attempts)
└── dead_letter_queue (failed deliveries)
events
└── delivery_attempts (one event → many attempts, one per webhook)
└── dead_letter_queue

---

## How Retry Works
Event fires
│
▼
Attempt 1 fails → wait 1s
│
▼
Attempt 2 fails → wait 2s
│
▼
Attempt 3 fails → wait 4s
│
▼
Attempt 4 fails → wait 8s  ← failure count hits 10 → SUSPEND webhook
│
▼
Attempt 5 fails → wait 16s
│
▼
Max retries exceeded → DEAD LETTER QUEUE

---

## Project Structure
webhook-delivery-engine/
├── src/
│   ├── config/          # Environment config + constants
│   ├── controllers/     # Request handlers
│   ├── lib/             # Prisma, Redis, Queue, Logger
│   ├── middleware/       # Auth, error handler, rate limit, idempotency
│   ├── mock-server/     # Test webhook receiver
│   ├── routes/          # Express routes
│   ├── services/        # Business logic
│   ├── validators/      # Zod schemas
│   ├── workers/         # BullMQ delivery worker
│   └── server.ts        # Entry point
├── dashboard/           # React frontend
├── prisma/              # Database schema
├── nginx/               # Nginx config
├── docker-compose.yml          # Development
├── docker-compose.prod.yml     # Production
├── Dockerfile           # Multi-stage build
└── .github/workflows/   # CI/CD

---

## Live Demo

**API Base URL:** `http://100.26.107.105/api/v1`
```bash
# Test the live API
curl http://100.26.107.105/api/v1/health

# Register a client
curl -X POST http://100.26.107.105/api/v1/clients/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Your Name"}'
```

---

## Author

**Vaibhav Bhardwaj**
- GitHub: [@VaibhavXBhardwaj](https://github.com/VaibhavXBhardwaj)

---

*Built to understand how Stripe, GitHub, and Razorpay deliver webhooks at scale.*
