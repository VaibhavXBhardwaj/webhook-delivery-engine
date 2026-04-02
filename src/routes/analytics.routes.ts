import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getOverviewController,
  getWebhookAnalyticsController,
} from '../controllers/analytics.controller';

const router = Router();

router.use(authenticate);

// GET /api/v1/analytics/overview          → overall stats
router.get('/overview', getOverviewController);

// GET /api/v1/analytics/webhook/:id       → per-webhook stats
router.get('/webhook/:id', getWebhookAnalyticsController);

export default router;