import { Request, Response, NextFunction } from 'express';
import {
  createWebhookSchema,
  updateWebhookSchema,
  webhookParamsSchema,
} from '../validators/webhook.validator';
import {
  createWebhook,
  getWebhooks,
  getWebhookById,
  updateWebhook,
  deleteWebhook,
} from '../services/webhook.service';
import { ApiResponse } from '../utils/apiResponse';

export async function createWebhookController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { body } = createWebhookSchema.parse({ body: req.body });
    const webhook = await createWebhook(req.client!.id, body);
    ApiResponse.created(res, webhook, 'Webhook registered successfully');
  } catch (error) {
    next(error);
  }
}

export async function getWebhooksController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const webhooks = await getWebhooks(req.client!.id);
    ApiResponse.success(res, webhooks, {
      message: 'Webhooks fetched successfully',
      meta: { count: webhooks.length },
    });
  } catch (error) {
    next(error);
  }
}

export async function getWebhookByIdController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { params } = webhookParamsSchema.parse({ params: req.params });
    const webhook = await getWebhookById(params.id, req.client!.id);
    ApiResponse.success(res, webhook);
  } catch (error) {
    next(error);
  }
}

export async function updateWebhookController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { body, params } = updateWebhookSchema.parse({
      body: req.body,
      params: req.params,
    });
    const webhook = await updateWebhook(params.id, req.client!.id, body);
    ApiResponse.success(res, webhook, { message: 'Webhook updated successfully' });
  } catch (error) {
    next(error);
  }
}

export async function deleteWebhookController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { params } = webhookParamsSchema.parse({ params: req.params });
    const result = await deleteWebhook(params.id, req.client!.id);
    ApiResponse.success(res, result, { message: 'Webhook deleted successfully' });
  } catch (error) {
    next(error);
  }
}