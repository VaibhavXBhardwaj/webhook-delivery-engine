import Redis from 'ioredis';
import config from '../config';
import logger from './logger';

const redis = new Redis(config.redis.url, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    logger.warn(`Redis reconnecting... attempt ${times}`);
    return delay;
  },
});

redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', (err) => logger.error('Redis error', { error: err.message }));
redis.on('close', () => logger.warn('Redis connection closed'));

export async function connectRedis(): Promise<void> {
  // If already connected, resolve immediately
  if (redis.status === 'ready' || redis.status === 'connect') {
    logger.info('Redis ready');
    return;
  }

  return new Promise((resolve) => {
    redis.once('connect', () => {
      logger.info(' Redis ready');
      resolve();
    });
  });
}

export default redis;