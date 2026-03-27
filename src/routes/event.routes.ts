import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  ingestEventController,
  getDeliveryStatusController,
} from '../controllers/event.controller';

const router = Router();

// All event routes require authentication
router.use(authenticate);

// POST /api/v1/events                    → ingest event (triggers fan-out)
router.post('/', ingestEventController);

// GET  /api/v1/events/:eventId/status    → get delivery status
router.get('/:eventId/status', getDeliveryStatusController);

export default router;