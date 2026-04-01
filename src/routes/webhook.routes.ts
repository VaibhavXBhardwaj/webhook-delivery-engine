import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  createWebhookController,
  getWebhooksController,
  getWebhookByIdController,
  updateWebhookController,
  deleteWebhookController,
} from '../controllers/webhook.controller';
import {
  getDeliveryHistoryController,
  reactivateWebhookController,
} from '../controllers/dlq.controller';

const router = Router();

router.use(authenticate);

// POST   /api/v1/webhooks
// GET    /api/v1/webhooks
router
  .route('/')
  .post(createWebhookController)
  .get(getWebhooksController);

// GET    /api/v1/webhooks/:id
// PUT    /api/v1/webhooks/:id
// DELETE /api/v1/webhooks/:id
router
  .route('/:id')
  .get(getWebhookByIdController)
  .put(updateWebhookController)
  .delete(deleteWebhookController);

// GET  /api/v1/webhooks/:id/history      → delivery history
router.get('/:id/history', getDeliveryHistoryController);

// POST /api/v1/webhooks/:id/reactivate   → reactivate suspended webhook
router.post('/:id/reactivate', reactivateWebhookController);

export default router;