import { Router, Request, Response } from 'express';
import { ApiResponse } from '../utils/apiResponse';
import clientRoutes from './client.routes';
import webhookRoutes from './webhook.routes';
import eventRoutes from './event.routes';
import dlqRoutes from './dlq.routes';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  ApiResponse.success(res, {
    status: 'healthy',
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

router.use('/clients', clientRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/events', eventRoutes);
router.use('/dlq', dlqRoutes);

export default router;