import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { ApiResponse } from '../utils/apiResponse';
import logger from '../lib/logger';

// Extend Express Request to carry the authenticated client
declare global {
  namespace Express {
    interface Request {
      client?: {
        id: string;
        name: string;
        apiKey: string;
        createdAt: Date;
      };
    }
  }
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey || typeof apiKey !== 'string') {
      ApiResponse.unauthorized(
        res,
        'Missing API key. Pass it in the x-api-key header.'
      );
      return;
    }

    const client = await prisma.client.findUnique({
      where: { apiKey },
    });

    if (!client) {
      ApiResponse.unauthorized(res, 'Invalid API key.');
      return;
    }

    req.client = client;
    logger.debug(`Authenticated client: ${client.name} (${client.id})`);
    next();
  } catch (error) {
    next(error);
  }
}