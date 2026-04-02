import { Request, Response, NextFunction } from 'express';
import redis from '../lib/redis';
import { ApiResponse } from '../utils/apiResponse';
import logger from '../lib/logger';

const IDEMPOTENCY_TTL = 86400; // 24 hours in seconds

export async function idempotencyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Only apply to POST requests
  if (req.method !== 'POST') {
    next();
    return;
  }

  const idempotencyKey = req.headers['x-idempotency-key'] as string;

  // If no idempotency key provided, proceed normally
  if (!idempotencyKey) {
    next();
    return;
  }

  const clientId = req.client?.id || 'anonymous';
  const cacheKey = `idempotency:${clientId}:${idempotencyKey}`;

  try {
    // Check if we've seen this key before
    const cached = await redis.get(cacheKey);

    if (cached) {
      logger.info(`Idempotency cache hit: ${idempotencyKey}`);
      const cachedResponse = JSON.parse(cached);

      // Return exact same response as before
      res.status(cachedResponse.statusCode).json(cachedResponse.body);
      return;
    }

    // Intercept the response to cache it
    const originalJson = res.json.bind(res);

    res.json = (body: unknown) => {
      // Cache the response for 24 hours
      const responseToCache = {
        statusCode: res.statusCode,
        body,
      };

      redis
        .setex(cacheKey, IDEMPOTENCY_TTL, JSON.stringify(responseToCache))
        .catch((err) => {
          logger.error('Failed to cache idempotency response', {
            error: err.message,
          });
        });

      return originalJson(body);
    };

    next();
  } catch (error) {
    // If Redis fails, proceed without idempotency (fail open)
    logger.error('Idempotency middleware error', { error });
    next();
  }
}