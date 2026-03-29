import prisma from '../lib/prisma';
import logger from '../lib/logger';
import { AppError } from '../middleware/errorHandler';
import { IngestEventInput } from '../validators/event.validator';
import { getActiveWebhooksForEvent } from './webhook.service';
import { webhookDeliveryQueue } from '../lib/queue';

interface WebhookDelivery {
  deliveryAttemptId: string;
  webhookId: string;
  status: string;
}

export async function ingestEvent(clientId: string, data: IngestEventInput) {
  // Idempotency check
  if (data.idempotencyKey) {
    const existing = await prisma.event.findUnique({
      where: { idempotencyKey: data.idempotencyKey },
    });

    if (existing) {
      logger.info(`Duplicate event blocked: ${data.idempotencyKey}`);
      return {
        event: existing,
        deliveries: [] as WebhookDelivery[],
        message: 'Event already processed (idempotency key matched)',
        duplicate: true,
      };
    }
  }

  // Save event
  const event = await prisma.event.create({
    data: {
      clientId,
      eventType: data.eventType,
      payload: data.payload as any,
      idempotencyKey: data.idempotencyKey,
    },
  });

  logger.info(`Event ingested: ${event.id} (type: ${event.eventType})`);

  // Fan-out — find all matching webhooks
  const matchingWebhooks = await getActiveWebhooksForEvent(clientId, data.eventType);

  if (matchingWebhooks.length === 0) {
    logger.info(`No matching webhooks for event type: ${data.eventType}`);
    return {
      event,
      deliveries: [] as WebhookDelivery[],
      message: 'Event ingested but no matching webhooks found',
      duplicate: false,
    };
  }

  // For each matching webhook: create DB record + add BullMQ job
  const deliveries: WebhookDelivery[] = [];

  for (const webhook of matchingWebhooks) {
    // Create PENDING delivery attempt in DB
    const attempt = await prisma.deliveryAttempt.create({
      data: {
        eventId: event.id,
        webhookId: webhook.id,
        status: 'PENDING',
        attemptNumber: 1,
      },
    });

    // Add job to BullMQ queue
    await webhookDeliveryQueue.add(
      'deliver-webhook',
      {
        deliveryAttemptId: attempt.id,
        eventId: event.id,
        webhookId: webhook.id,
        webhookUrl: webhook.url,
        webhookSecret: webhook.secret,
        payload: data.payload,
        eventType: data.eventType,
        attemptNumber: 1,
      },
      {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 1000, // 1s, 2s, 4s, 8s, 16s
        },
        removeOnComplete: 100, // keep last 100 completed jobs
        removeOnFail: 200,     // keep last 200 failed jobs
      }
    );

    deliveries.push({
      deliveryAttemptId: attempt.id,
      webhookId: webhook.id,
      status: 'PENDING',
    });

    logger.info(`Job queued for webhook ${webhook.id} (event: ${event.id})`);
  }

  return {
    event,
    deliveries,
    message: `Event queued for delivery to ${deliveries.length} webhook(s)`,
    duplicate: false,
  };
}

export async function getDeliveryStatus(eventId: string, clientId: string) {
  const event = await prisma.event.findFirst({
    where: { id: eventId, clientId },
  });

  if (!event) {
    throw new AppError('Event not found', 404);
  }

  const attempts = await prisma.deliveryAttempt.findMany({
    where: { eventId },
    orderBy: { createdAt: 'desc' },
    include: {
      webhook: {
        select: { url: true, status: true },
      },
    },
  });

  return { event, attempts };
}