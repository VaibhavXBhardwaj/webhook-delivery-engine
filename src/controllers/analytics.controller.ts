import { Request, Response, NextFunction } from 'express';
import {
  getOverviewAnalytics,
  getWebhookAnalytics,
} from '../services/analytics.service';
import { ApiResponse } from '../utils/apiResponse';

export async function getOverviewController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await getOverviewAnalytics(req.client!.id);
    ApiResponse.success(res, result, {
      message: 'Analytics overview fetched successfully',
    });
  } catch (error) {
    next(error);
  }
}

export async function getWebhookAnalyticsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const result = await getWebhookAnalytics(id, req.client!.id);
    ApiResponse.success(res, result, {
      message: 'Webhook analytics fetched successfully',
    });
  } catch (error) {
    next(error);
  }
}