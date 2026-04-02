import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { ApiResponse } from '../utils/apiResponse';

// Global rate limit — applies to all routes
export const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    ApiResponse.error(
      res,
      'Too many requests. Please try again in 15 minutes.',
      429
    );
  },
});

// Strict limit for event ingestion — per API key
export const eventIngestionRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 events per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Rate limit per API key instead of IP
    return (req.headers['x-api-key'] as string) || req.ip || 'unknown';
  },
  handler: (_req: Request, res: Response) => {
    ApiResponse.error(
      res,
      'Event ingestion rate limit exceeded. Maximum 60 events per minute.',
      429
    );
  },
});

// Strict limit for client registration — prevent abuse
export const registrationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 registrations per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    ApiResponse.error(
      res,
      'Too many registration attempts. Please try again in 1 hour.',
      429
    );
  },
});