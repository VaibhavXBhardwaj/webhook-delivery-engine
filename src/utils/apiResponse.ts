import { Response } from 'express';

interface ApiResponseOptions {
  message?: string;
  meta?: Record<string, unknown>;
}

export class ApiResponse {
  static success<T>(
    res: Response,
    data: T,
    options: ApiResponseOptions & { statusCode?: number } = {}
  ) {
    const { statusCode = 200, message = 'Success', meta } = options;

    const responseBody: Record<string, unknown> = {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    };

    if (meta) {
      responseBody.meta = meta;
    }

    return res.status(statusCode).json(responseBody);
  }

  static created<T>(res: Response, data: T, message = 'Created successfully') {
    return this.success(res, data, { statusCode: 201, message });
  }

  static error(
    res: Response,
    message: string,
    statusCode = 500,
    errors?: unknown
  ) {
    const responseBody: Record<string, unknown> = {
      success: false,
      message,
      timestamp: new Date().toISOString(),
    };

    if (errors) {
      responseBody.errors = errors;
    }

    return res.status(statusCode).json(responseBody);
  }

  static notFound(res: Response, message = 'Resource not found') {
    return this.error(res, message, 404);
  }

  static unauthorized(res: Response, message = 'Unauthorized') {
    return this.error(res, message, 401);
  }

  static forbidden(res: Response, message = 'Forbidden') {
    return this.error(res, message, 403);
  }

  static badRequest(res: Response, message: string, errors?: unknown) {
    return this.error(res, message, 400, errors);
  }
}