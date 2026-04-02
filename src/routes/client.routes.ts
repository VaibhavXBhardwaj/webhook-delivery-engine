import { Router } from 'express';
import { registerClientController } from '../controllers/client.controller';
import { registrationRateLimit } from '../middleware/rateLimit.middleware';

const router = Router();

// POST /api/v1/clients/register
router.post('/register', registrationRateLimit, registerClientController);

export default router;