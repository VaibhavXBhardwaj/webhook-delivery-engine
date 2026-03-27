import { Router } from 'express';
import { registerClientController } from '../controllers/client.controller';

const router = Router();

// POST /api/v1/clients/register
router.post('/register', registerClientController);

export default router;