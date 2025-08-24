import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { supabase } from './config/database';
import authRoutes from './routes/auth';
import productRoutes from './routes/products';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors({ 
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true 
}));
app.use(express.json());

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    const { data, error } = await supabase
      .from('products')
      .select('count(*)')
      .limit(1);

    if (error) throw error;

    res.status(200).json({ 
      status: 'ok', 
      message: 'MSME Inventory API is healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
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
      auth: '/api/auth'
    }
  });
});

app.listen(port, () => {
  console.log(`🚀 Backend server running at http://localhost:${port}`);
  console.log(`📊 Health check: http://localhost:${port}/api/health`);
  console.log(`📦 Public products: http://localhost:${port}/api/products/public`);
  console.log(`🔐 Auth routes: http://localhost:${port}/api/auth`);
  console.log(`🔒 Protected products: http://localhost:${port}/api/products`);
});
