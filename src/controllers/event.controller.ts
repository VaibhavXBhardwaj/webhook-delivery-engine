import { Request, Response, NextFunction } from 'express';
import { ingestEventSchema } from '../validators/event.validator';
import { ingestEvent, getDeliveryStatus } from '../services/event.service';
import { ApiResponse } from '../utils/apiResponse';
import { AppError } from '../middleware/errorHandler';

export async function ingestEventController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { body } = ingestEventSchema.parse({ body: req.body });
    const result = await ingestEvent(req.client!.id, body);

    if (result.duplicate) {
      ApiResponse.success(res, result, { message: result.message });
      return;
    }

    ApiResponse.created(res, result, result.message);
  } catch (error) {
    next(error);
  }
}

export async function getDeliveryStatusController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { eventId } = req.params;

    if (!eventId) {
      throw new AppError('Event ID is required', 400);
    }

    const result = await getDeliveryStatus(eventId, req.client!.id);
    ApiResponse.success(res, result, { message: 'Delivery status fetched' });
  } catch (error) {
    next(error);
  }
}