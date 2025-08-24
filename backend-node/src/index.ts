import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { supabase } from './config/database';
import authRoutes from './routes/auth';
import productRoutes from './routes/products';

dotenv.config();

console.log("Supabase URL:", process.env.SUPABASE_URL);
console.log("Supabase Key length:", process.env.SUPABASE_SERVICE_KEY?.length);

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
