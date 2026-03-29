import { createDeliveryWorker } from './delivery.worker';
import { connectDatabase } from '../lib/prisma';
import { connectRedis } from '../lib/redis';
import logger from '../lib/logger';

async function bootWorker() {
  try {
    logger.info('Starting delivery worker...');

    await connectDatabase();
    await connectRedis();

    const worker = createDeliveryWorker();

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received — shutting down worker`);
      await worker.close();
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    logger.info('Worker is running and waiting for jobs...');
  } catch (error) {
    logger.error('Failed to start worker', { error });
    process.exit(1);
  }
}

bootWorker();