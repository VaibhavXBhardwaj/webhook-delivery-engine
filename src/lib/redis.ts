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

redis.on('connect', () => logger.info('✅ Redis connected'));
redis.on('error', (err) => logger.error('❌ Redis error', { error: err.message }));
redis.on('close', () => logger.warn('Redis connection closed'));

export async function connectRedis(): Promise<void> {
  return new Promise((resolve, reject) => {
    redis.once('ready', () => {
      logger.info('✅ Redis ready');
      resolve();
    });
    redis.once('error', reject);
  });
}

export default redis;