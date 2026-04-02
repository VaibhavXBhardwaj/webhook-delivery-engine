import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  ingestEventController,
  getDeliveryStatusController,
} from '../controllers/event.controller';
import { eventIngestionRateLimit } from '../middleware/rateLimit.middleware';
import { idempotencyMiddleware } from '../middleware/idempotency.middleware';

const router = Router();

router.use(authenticate);

// POST /api/v1/events
router.post(
  '/',
  eventIngestionRateLimit,
  idempotencyMiddleware,
  ingestEventController
);

// GET /api/v1/events/:eventId/status
router.get('/:eventId/status', getDeliveryStatusController);

export default router;