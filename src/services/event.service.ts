import prisma from '../lib/prisma';
import logger from '../lib/logger';
import { AppError } from '../middleware/errorHandler';
import { IngestEventInput } from '../validators/event.validator';
import { getActiveWebhooksForEvent } from './webhook.service';

interface WebhookDelivery {
  deliveryAttemptId: string;
  webhookId: string;
  status: string;
}

export async function ingestEvent(
  clientId: string,
  data: IngestEventInput
) {
  // Idempotency check — same key = same event, don't process twice
  if (data.idempotencyKey) {
    const existing = await prisma.event.findUnique({
      where: { idempotencyKey: data.idempotencyKey },
    });

    if (existing) {
      logger.info(`Duplicate event blocked by idempotency key: ${data.idempotencyKey}`);
      return {
        event: existing,
        deliveries: [] as WebhookDelivery[],
        message: 'Event already processed (idempotency key matched)',
        duplicate: true,
      };
    }
  }

  // Save event to database
  const event = await prisma.event.create({
    data: {
      clientId,
      eventType: data.eventType,
      payload: data.payload as any,
      idempotencyKey: data.idempotencyKey,
    },
  });

  logger.info(`Event ingested: ${event.id} (type: ${event.eventType})`);

  // Fan-out — find ALL active webhooks that match this event type
  const matchingWebhooks = await getActiveWebhooksForEvent(
    clientId,
    data.eventType
  );

  if (matchingWebhooks.length === 0) {
    logger.info(`No matching webhooks for event type: ${data.eventType}`);
    return {
      event,
      deliveries: [] as WebhookDelivery[],
      message: 'Event ingested but no matching webhooks found',
      duplicate: false,
    };
  }

  // Create a PENDING delivery attempt for each matching webhook
  const deliveryAttempts = await Promise.all(
    matchingWebhooks.map((webhook: { id: string }) =>
      prisma.deliveryAttempt.create({
        data: {
          eventId: event.id,
          webhookId: webhook.id,
          status: 'PENDING',
          attemptNumber: 1,
        },
      })
    )
  );

  logger.info(
    `Fan-out complete: ${deliveryAttempts.length} delivery attempts created for event ${event.id}`
  );

  return {
    event,
    deliveries: deliveryAttempts.map((d) => ({
      deliveryAttemptId: d.id,
      webhookId: d.webhookId,
      status: d.status,
    })),
    message: `Event queued for delivery to ${deliveryAttempts.length} webhook(s)`,
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