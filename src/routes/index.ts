import { Router, Request, Response } from 'express';
import { ApiResponse } from '../utils/apiResponse';
import clientRoutes from './client.routes';
import webhookRoutes from './webhook.routes';
import eventRoutes from './event.routes';

const router = Router();

// Health check — public
router.get('/health', (_req: Request, res: Response) => {
  ApiResponse.success(res, {
    status: 'healthy',
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// API routes
router.use('/clients', clientRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/events', eventRoutes);

export default router;