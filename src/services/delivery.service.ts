import crypto from 'crypto';
import axios, { AxiosError } from 'axios';
import prisma from '../lib/prisma';
import logger from '../lib/logger';
import config from '../config';

export interface DeliveryPayload {
  deliveryAttemptId: string;
  eventId: string;
  webhookId: string;
  webhookUrl: string;
  webhookSecret: string;
  payload: Record<string, unknown>;
  eventType: string;
  attemptNumber: number;
}

// HMAC-SHA256 signature — exactly how Stripe does it
export function signPayload(payload: unknown, secret: string): string {
  const signature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return `sha256=${signature}`;
}

export async function deliverWebhook(data: DeliveryPayload): Promise<{
  success: boolean;
  statusCode?: number;
  responseTimeMs: number;
  errorMessage?: string;
}> {
  const startTime = Date.now();
  const timestamp = Math.floor(startTime / 1000);
  const signature = signPayload(data.payload, data.webhookSecret);

  try {
    const response = await axios.post(data.webhookUrl, data.payload, {
      timeout: config.webhook.deliveryTimeout,
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-id': data.eventId,
        'x-webhook-timestamp': timestamp.toString(),
        'x-webhook-signature': signature,
        'x-webhook-attempt': data.attemptNumber.toString(),
        'user-agent': 'WebhookEngine/1.0',
      },
    });

    const responseTimeMs = Date.now() - startTime;

    logger.info(`Webhook delivered successfully`, {
      webhookId: data.webhookId,
      url: data.webhookUrl,
      statusCode: response.status,
      responseTimeMs,
      attempt: data.attemptNumber,
    });

    return {
      success: true,
      statusCode: response.status,
      responseTimeMs,
    };
  } catch (error) {
    const responseTimeMs = Date.now() - startTime;
    const axiosError = error as AxiosError;

    const statusCode = axiosError.response?.status;
    const errorMessage = axiosError.response
      ? `HTTP ${statusCode}: ${axiosError.message}`
      : `Network error: ${axiosError.message}`;

    logger.warn(` Webhook delivery failed`, {
      webhookId: data.webhookId,
      url: data.webhookUrl,
      statusCode,
      responseTimeMs,
      attempt: data.attemptNumber,
      error: errorMessage,
    });

    return {
      success: false,
      statusCode,
      responseTimeMs,
      errorMessage,
    };
  }
}

// Log delivery attempt result to DB
export async function logDeliveryAttempt(
  deliveryAttemptId: string,
  webhookId: string,
  result: {
    success: boolean;
    statusCode?: number;
    responseTimeMs: number;
    errorMessage?: string;
  },
  attemptNumber: number,
  nextAttemptNumber?: number
) {
  const status = result.success ? 'SUCCESS' : 'FAILED';

  // Calculate next retry time for failed attempts
  const retryDelays = config.webhook.retryDelays;
  const nextRetryAt =
    !result.success && nextAttemptNumber && nextAttemptNumber <= config.webhook.maxRetries
      ? new Date(Date.now() + retryDelays[attemptNumber - 1])
      : null;

  await prisma.deliveryAttempt.update({
    where: { id: deliveryAttemptId },
    data: {
      status,
      httpStatusCode: result.statusCode,
      responseTimeMs: result.responseTimeMs,
      errorMessage: result.errorMessage,
      nextRetryAt,
    },
  });

  // On success reset failure count (circuit breaker recovery)
  if (result.success) {
    await prisma.webhook.update({
      where: { id: webhookId },
      data: { failureCount: 0 },
    });
  } else {
    // Increment failure count (circuit breaker)
    const webhook = await prisma.webhook.update({
      where: { id: webhookId },
      data: { failureCount: { increment: 1 } },
    });

    // Circuit breaker — suspend after 10 consecutive failures
    if (webhook.failureCount >= config.webhook.circuitBreakerThreshold) {
      await prisma.webhook.update({
        where: { id: webhookId },
        data: { status: 'SUSPENDED' },
      });
      logger.warn(`Webhook SUSPENDED (circuit breaker): ${webhookId}`);
    }
  }
}

// Move to Dead Letter Queue after all retries exhausted
export async function moveToDeadLetterQueue(
  eventId: string,
  webhookId: string,
  lastError: string,
  totalAttempts: number
) {
  await prisma.deadLetterQueue.create({
    data: {
      eventId,
      webhookId,
      lastError,
      totalAttempts,
    },
  });

  // Mark delivery attempt as DLQ
  await prisma.deliveryAttempt.updateMany({
    where: { eventId, webhookId },
    data: { status: 'DLQ' },
  });

  logger.error(`Event moved to DLQ`, { eventId, webhookId, totalAttempts });
}