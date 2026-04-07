import { Queue } from 'bullmq';
import logger from './logger';

const isProduction = process.env.NODE_ENV === 'production';

export const redisConnection = {
  host: isProduction ? 'redis' : '127.0.0.1',
  port: isProduction ? 6379 : 6380,
};

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