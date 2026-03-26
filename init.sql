CREATE TYPE "WebhookStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'INACTIVE');
CREATE TYPE "DeliveryStatus" AS ENUM ('SUCCESS', 'FAILED', 'PENDING', 'DLQ');

CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  api_key VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  url TEXT NOT NULL,
  secret VARCHAR(255) NOT NULL,
  event_types TEXT[] NOT NULL,
  status "WebhookStatus" DEFAULT 'ACTIVE',
  failure_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  idempotency_key VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE delivery_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id),
  webhook_id UUID REFERENCES webhooks(id),
  status "DeliveryStatus" NOT NULL,
  http_status_code INT,
  response_time_ms INT,
  attempt_number INT NOT NULL,
  next_retry_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE dead_letter_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id),
  webhook_id UUID REFERENCES webhooks(id),
  last_error TEXT,
  total_attempts INT,
  moved_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_delivery_event ON delivery_attempts(event_id);
CREATE INDEX idx_delivery_webhook ON delivery_attempts(webhook_id);
CREATE INDEX idx_webhook_status ON webhooks(status);
CREATE INDEX idx_events_type ON events(event_type);
