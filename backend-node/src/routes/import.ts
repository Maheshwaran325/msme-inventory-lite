import express from 'express';
import multer from 'multer';
import { importCSV } from '../controllers/importController';
import { authenticateToken, authorizeRole } from '../middleware/auth';
import path from 'path';

const router = express.Router();

// Configure multer for CSV file upload
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 1,                  // enforce single file at busboy level too
    },
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = new Set([
            'text/csv',
            'application/csv',
            'application/vnd.ms-excel'
        ]);
        const ext = path.extname(file.originalname || '').toLowerCase();
        if (allowedMimeTypes.has(file.mimetype) || ext === '.csv') {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed'));
        }
    }
});
// Apply authentication to all routes
router.use(authenticateToken);

// POST /api/import/csv - Import CSV file (owners and staff only)
router.post('/csv', authorizeRole(['owner', 'staff']), upload.single('file'), importCSV);

export default router;
