import { Request, Response, NextFunction } from 'express';
import { registerClientSchema } from '../validators/client.validator';
import { registerClient } from '../services/client.service';
import { ApiResponse } from '../utils/apiResponse';

export async function registerClientController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { body } = registerClientSchema.parse({ body: req.body });
    const result = await registerClient(body.name);
    ApiResponse.created(res, result, 'Client registered successfully');
  } catch (error) {
    next(error);
  }
}