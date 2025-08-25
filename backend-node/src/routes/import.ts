import express from 'express';
import multer from 'multer';
import { importCSV } from '../controllers/importController';
import { authenticateToken, authorizeRole } from '../middleware/auth';

const router = express.Router();

// Configure multer for CSV file upload
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed'));
        }
    }
});

// Apply authentication to all routes
router.use(authenticateToken);

// POST /api/import/csv - Import CSV file (owners only)
router.post('/csv', authorizeRole(['owner']), upload.single('file'), importCSV);

export default router;
