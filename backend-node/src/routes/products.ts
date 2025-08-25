
import express from 'express';
import { getProducts, getProductById, createProduct, updateProduct, deleteProduct, getKPIs } from '../controllers/productController';
import { authenticateToken, authorizeRole } from '../middleware/auth';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// GET /api/products - Get all products (all authenticated users)
router.get('/', getProducts);

// GET /api/products/:id - Get product by ID (all authenticated users)
router.get('/:id', getProductById);

// POST /api/products - Create product (owners only)
router.post('/', authorizeRole(['owner']), createProduct);

// PUT /api/products/:id - Update product (all authenticated users, with role-based constraints)
router.put('/:id', updateProduct);

// DELETE /api/products/:id - Delete product (owners only)
router.delete('/:id', authorizeRole(['owner']), deleteProduct);

// GET /api/dashboard/kpis - Get KPIs (all authenticated users)
router.get('/kpis', getKPIs);

export default router;
