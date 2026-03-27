import crypto from 'crypto';
import prisma from '../lib/prisma';
import logger from '../lib/logger';
import { AppError } from '../middleware/errorHandler';
import { CreateWebhookInput, UpdateWebhookInput } from '../validators/webhook.validator';

export async function createWebhook(
  clientId: string,
  data: CreateWebhookInput
) {
  // Generate a webhook secret for HMAC signing
  const secret = crypto.randomBytes(32).toString('hex');

  const webhook = await prisma.webhook.create({
    data: {
      clientId,
      url: data.url,
      secret,
      eventTypes: data.eventTypes,
    },
  });

  logger.info(`Webhook created: ${webhook.id} for client ${clientId}`);

  return webhook;
}

export async function getWebhooks(clientId: string) {
  const webhooks = await prisma.webhook.findMany({
    where: { clientId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      url: true,
      eventTypes: true,
      status: true,
      failureCount: true,
      createdAt: true,
      updatedAt: true,
      // Never expose the secret
    },
  });

  return webhooks;
}

export async function getWebhookById(id: string, clientId: string) {
  const webhook = await prisma.webhook.findFirst({
    where: { id, clientId },
    select: {
      id: true,
      url: true,
      eventTypes: true,
      status: true,
      failureCount: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!webhook) {
    throw new AppError('Webhook not found', 404);
  }

  return webhook;
}

export async function updateWebhook(
  id: string,
  clientId: string,
  data: UpdateWebhookInput
) {
  // Make sure webhook belongs to this client
  const existing = await prisma.webhook.findFirst({
    where: { id, clientId },
  });

  if (!existing) {
    throw new AppError('Webhook not found', 404);
  }

  if (existing.status === 'SUSPENDED') {
    throw new AppError(
      'Cannot update a suspended webhook. Contact support.',
      400
    );
  }

  const updated = await prisma.webhook.update({
    where: { id },
    data: {
      ...(data.url && { url: data.url }),
      ...(data.eventTypes && { eventTypes: data.eventTypes }),
      ...(data.status && { status: data.status }),
    },
    select: {
      id: true,
      url: true,
      eventTypes: true,
      status: true,
      failureCount: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  logger.info(`Webhook updated: ${id}`);
  return updated;
}

export async function deleteWebhook(id: string, clientId: string) {
  const existing = await prisma.webhook.findFirst({
    where: { id, clientId },
  });

  if (!existing) {
    throw new AppError('Webhook not found', 404);
  }

  await prisma.webhook.delete({ where: { id } });

  logger.info(`Webhook deleted: ${id}`);
  return { deleted: true };
}

// Used by event service to find matching webhooks for fan-out
export async function getActiveWebhooksForEvent(
  clientId: string,
  eventType: string
) {
  const webhooks = await prisma.webhook.findMany({
    where: {
      clientId,
      status: 'ACTIVE',
      OR: [
        { eventTypes: { has: eventType } },  // exact match
        { eventTypes: { has: '*' } },          // wildcard
      ],
    },
  });

  return webhooks;
}