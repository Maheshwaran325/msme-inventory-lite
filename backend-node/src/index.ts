import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { supabase } from './config/database';
import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import importRoutes from './routes/import';
import dashboardRoutes from './routes/dashboard';
import metricsRoutes from './routes/metrics';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors({ 
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true 
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Error handling middleware for multer
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'File size too large. Maximum size is 10MB.',
                    details: { field: 'file', max_size: '10MB' }
                }
            });
        }
    }
    
    if (error.message === 'Only CSV files are allowed') {
        return res.status(400).json({
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Only CSV files are allowed',
                details: { field: 'file', allowed_types: ['csv'] }
            }
        });
    }
    
    next(error);
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const { count, error } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error("Supabase health error:", error);
      throw error;
    }

    res.status(200).json({
      status: 'ok',
      message: 'MSME Inventory API is healthy',
      database: 'connected',
      rows: count,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error("Health check failed:", err);
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      error: err instanceof Error ? err.message : JSON.stringify(err)
    });
  }
});

// Public products endpoint (for testing)
app.get('/api/products/public', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .limit(10);

    if (error) throw error;

    res.json({ 
      success: true,
      count: data?.length || 0,
      products: data 
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Authentication routes
app.use('/api/auth', authRoutes);

// Protected products routes
app.use('/api/products', productRoutes);

// Protected import routes
app.use('/api/import', importRoutes);

// Protected dashboard routes
app.use('/api/dashboard', dashboardRoutes);

// Protected metrics routes
app.use('/api/metrics', metricsRoutes);

app.get('/api', (req, res) => {
  res.json({
    message: 'MSME Inventory Lite API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      products: {
        public: '/api/products/public',
        protected: '/api/products'
      },
      auth: '/api/auth',
      import: '/api/import',
      dashboard: '/api/dashboard',
      metrics: '/api/metrics'
    }
  });
});

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred'
        }
    });
});

const server = app.listen(port, () => {
  console.log(`Server listening on ${port}`);
});

const shutdown = () => {
  console.log('Shutting down gracefully...');
  server.close(() => process.exit(0));
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
