import { Request, Response, NextFunction } from 'express';
import {
  getDLQItems,
  retryDLQItem,
  getWebhookDeliveryHistory,
  reactivateWebhook,
} from '../services/dlq.service';
import { ApiResponse } from '../utils/apiResponse';

export async function getDLQController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const items = await getDLQItems(req.client!.id);
    ApiResponse.success(res, items, {
      message: 'Dead Letter Queue fetched successfully',
      meta: { count: items.length },
    });
  } catch (error) {
    next(error);
  }
}

export async function retryDLQController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const result = await retryDLQItem(id, req.client!.id);
    ApiResponse.success(res, result, { message: 'Retry queued successfully' });
  } catch (error) {
    next(error);
  }
}

export async function getDeliveryHistoryController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const result = await getWebhookDeliveryHistory(id, req.client!.id);
    ApiResponse.success(res, result, {
      message: 'Delivery history fetched successfully',
    });
  } catch (error) {
    next(error);
  }
}

export async function reactivateWebhookController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const result = await reactivateWebhook(id, req.client!.id);
    ApiResponse.success(res, result, {
      message: 'Webhook reactivated successfully',
    });
  } catch (error) {
    next(error);
  }
}