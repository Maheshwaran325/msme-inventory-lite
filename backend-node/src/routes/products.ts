
import { Router } from 'express';
import {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct
} from '../controllers/productController';
import { authenticateToken, authorizeRole } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', getProducts);
router.get('/:id', getProductById);
router.post('/', authorizeRole(['owner']), createProduct);
router.put('/:id', authorizeRole(['owner', 'staff']), updateProduct);
router.delete('/:id', authorizeRole(['owner']), deleteProduct);

export default router;
