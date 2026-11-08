import { Router } from 'express';
import { login, getMe } from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validate.middleware';
import { loginSchema } from '../validations/auth.validation';

const router = Router();

router.post('/login', validate(loginSchema), login);
router.get('/me', authenticateToken, getMe);

export default router;

