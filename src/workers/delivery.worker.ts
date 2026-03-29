import { Worker, Job } from 'bullmq';
import { redisConnection } from '../lib/queue';
import { deliverWebhook, logDeliveryAttempt, moveToDeadLetterQueue, DeliveryPayload } from '../services/delivery.service';
import logger from '../lib/logger';
import config from '../config';
import prisma from '../lib/prisma';

export function createDeliveryWorker() {
  const worker = new Worker<DeliveryPayload>(
    'webhook-delivery',
    async (job: Job<DeliveryPayload>) => {
      const data = job.data;
      const attemptNumber = job.attemptsMade + 1;

      logger.info(`Processing delivery job`, {
        jobId: job.id,
        webhookId: data.webhookId,
        url: data.webhookUrl,
        attempt: attemptNumber,
      });

      // Check if webhook is still active (might have been suspended)
      const webhook = await prisma.webhook.findUnique({
        where: { id: data.webhookId },
      });

      if (!webhook || webhook.status === 'SUSPENDED') {
        logger.warn(`Skipping delivery — webhook is ${webhook?.status || 'deleted'}`, {
          webhookId: data.webhookId,
        });

        await moveToDeadLetterQueue(
          data.eventId,
          data.webhookId,
          `Webhook is ${webhook?.status || 'deleted'}`,
          attemptNumber
        );
        return;
      }

      // Attempt delivery
      const result = await deliverWebhook({
        ...data,
        attemptNumber,
      });

      const isLastAttempt = attemptNumber >= config.webhook.maxRetries;
      const nextAttemptNumber = attemptNumber + 1;

      // Log to DB
      await logDeliveryAttempt(
        data.deliveryAttemptId,
        data.webhookId,
        result,
        attemptNumber,
        nextAttemptNumber
      );

      // If failed and last attempt — move to DLQ
      if (!result.success && isLastAttempt) {
        await moveToDeadLetterQueue(
          data.eventId,
          data.webhookId,
          result.errorMessage || 'Max retries exceeded',
          attemptNumber
        );
        return;
      }

      // If failed — throw error so BullMQ retries with backoff
      if (!result.success) {
        throw new Error(result.errorMessage || 'Delivery failed');
      }
    },
    {
      connection: redisConnection,
      concurrency: 10, // process 10 jobs at the same time
    }
  );

  // Worker event listeners
  worker.on('completed', (job) => {
    logger.info(`Job completed`, { jobId: job.id, webhookId: job.data.webhookId });
  });

  worker.on('failed', (job, error) => {
    if (job) {
      logger.warn(`Job failed (will retry)`, {
        jobId: job.id,
        webhookId: job.data.webhookId,
        attempt: job.attemptsMade,
        error: error.message,
      });
    }
  });

  worker.on('error', (error) => {
    logger.error('Worker error', { error: error.message });
  });

  logger.info('Delivery worker started (concurrency: 10)');
  return worker;
}