import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getDLQController,
  retryDLQController,
} from '../controllers/dlq.controller';

const router = Router();

router.use(authenticate);

// GET  /api/v1/dlq          → view all DLQ items
router.get('/', getDLQController);

// POST /api/v1/dlq/:id/retry → manually retry a DLQ item
router.post('/:id/retry', retryDLQController);

export default router;