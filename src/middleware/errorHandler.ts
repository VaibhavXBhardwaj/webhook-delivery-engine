import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import logger from '../lib/logger';
import { ApiResponse } from '../utils/apiResponse';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Prisma error interface — avoids import issues before generation
interface PrismaKnownError extends Error {
  code: string;
}

function isPrismaKnownError(err: unknown): err is PrismaKnownError {
  return (
    err instanceof Error &&
    'code' in err &&
    typeof (err as PrismaKnownError).code === 'string'
  );
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error('Error caught', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Zod validation errors
  if (err instanceof ZodError) {
    ApiResponse.badRequest(res, 'Validation failed', err.issues);
    return;
  }

  // Custom app errors
  if (err instanceof AppError) {
    ApiResponse.error(res, err.message, err.statusCode);
    return;
  }

  // Prisma known errors
  if (isPrismaKnownError(err)) {
    if (err.code === 'P2002') {
      ApiResponse.error(res, 'A record with this value already exists', 409);
      return;
    }
    if (err.code === 'P2025') {
      ApiResponse.notFound(res, 'Record not found');
      return;
    }
  }

  // Unknown errors
  ApiResponse.error(res, 'Internal server error', 500);
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}