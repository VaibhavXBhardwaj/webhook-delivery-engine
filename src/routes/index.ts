import { Router, Request, Response } from 'express';
import { ApiResponse } from '../utils/apiResponse';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  ApiResponse.success(res, {
    status: 'healthy',
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

export default router;