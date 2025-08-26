import { Router } from 'express';
import { login } from '../controllers/authController';
import { authRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// API Contract: POST /api/auth/login
router.post('/login', authRateLimiter, login);

export default router;