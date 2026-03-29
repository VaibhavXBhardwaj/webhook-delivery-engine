import express from 'express';
import crypto from 'crypto';

const app = express();
app.use(express.json());

const RECEIVED_WEBHOOKS: any[] = [];

// Receive webhooks and verify signature
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const timestamp = req.headers['x-webhook-timestamp'];
  const webhookId = req.headers['x-webhook-id'];
  const attempt = req.headers['x-webhook-attempt'];

  console.log('\n🔔 WEBHOOK RECEIVED!');
  console.log('─────────────────────────────');
  console.log(`📦 Event ID:   ${webhookId}`);
  console.log(`🔄 Attempt:    ${attempt}`);
  console.log(`⏰ Timestamp:  ${timestamp}`);
  console.log(`🔐 Signature:  ${signature}`);
  console.log(`📄 Payload:    ${JSON.stringify(req.body, null, 2)}`);
  console.log('─────────────────────────────');

  RECEIVED_WEBHOOKS.push({
    receivedAt: new Date().toISOString(),
    headers: {
      signature,
      timestamp,
      webhookId,
      attempt,
    },
    body: req.body,
  });

  // Always return 200 to signal successful receipt
  res.status(200).json({ received: true });
});

// View all received webhooks
app.get('/webhooks', (req, res) => {
  res.json({
    total: RECEIVED_WEBHOOKS.length,
    webhooks: RECEIVED_WEBHOOKS,
  });
});

// Simulate a failing endpoint (returns 500)
app.post('/webhook-fail', (req, res) => {
  console.log('\n❌ FAILING WEBHOOK (returning 500)');
  res.status(500).json({ error: 'Simulated failure' });
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`\n🎯 Mock webhook receiver running on http://localhost:${PORT}`);
  console.log(`📬 Send webhooks to: http://localhost:${PORT}/webhook`);
  console.log(`❌ Failing endpoint:  http://localhost:${PORT}/webhook-fail`);
  console.log(`📋 View received:     http://localhost:${PORT}/webhooks\n`);
});