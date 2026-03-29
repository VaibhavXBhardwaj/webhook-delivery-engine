import { Queue } from 'bullmq';
import logger from './logger';

// Hardcode connection for reliability instead of parsing URL
export const redisConnection = {
  host: '127.0.0.1',
  port: 6380,
};

// The main delivery queue
export const webhookDeliveryQueue = new Queue('webhook-delivery', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});

webhookDeliveryQueue.on('error', (error) => {
  logger.error('Queue error', { error: error.message });
});

logger.info('✅ BullMQ webhook delivery queue initialized');