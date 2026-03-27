import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  createWebhookController,
  getWebhooksController,
  getWebhookByIdController,
  updateWebhookController,
  deleteWebhookController,
} from '../controllers/webhook.controller';

const router = Router();

// All webhook routes require authentication
router.use(authenticate);

// POST   /api/v1/webhooks       → register a webhook
// GET    /api/v1/webhooks       → list all webhooks
router
  .route('/')
  .post(createWebhookController)
  .get(getWebhooksController);

// GET    /api/v1/webhooks/:id   → get single webhook
// PUT    /api/v1/webhooks/:id   → update webhook
// DELETE /api/v1/webhooks/:id   → delete webhook
router
  .route('/:id')
  .get(getWebhookByIdController)
  .put(updateWebhookController)
  .delete(deleteWebhookController);

export default router;