import express from 'express';
import { getKPIs } from '../controllers/productController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// GET /api/dashboard/kpis - Get KPIs (all authenticated users)
router.get('/kpis', getKPIs);

export default router;