import request from 'supertest';
import express from 'express';
import { authenticateToken } from '../../middleware/auth';
import { updateProduct } from '../../controllers/productController';
import { supabase } from '../../config/database';

// Create test app
const app = express();
app.use(express.json());
app.put('/api/products/:id', authenticateToken, updateProduct);

describe('API Optimistic Concurrency Failure Tests', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    role: 'owner'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock authentication middleware
    (authenticateToken as jest.Mock).mockImplementation((req, res, next) => {
      req.user = mockUser;
      next();
    });
  });

  describe('PUT /api/products/:id - Optimistic Concurrency Failure', () => {
    it('should handle optimistic concurrency failure during update operation', async () => {
      // Mock Supabase to return matching version for initial check but fail during update
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { version: 1, unit_price: 9.99 },
              error: null
            })
          })
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({
              data: null,
              error: {
                message: 'Row was updated by another transaction',
                code: 'PGRST116'
              }
            })
          })
        })
      } as any);

      const response = await request(app)
        .put('/api/products/1')
        .send({
          name: 'Updated Product',
          sku: 'TEST-001',
          category: 'Test Category',
          quantity: 15,
          unit_price: 12.99,
          version: 1
        })
        .expect(409);

      expect(response.body).toEqual({
        error: {
          code: 'NOT_FOUND',
          message: 'product not found',
          details: {
            resource: 'product',
            id: '1'
          }
        }
      });
    });
  });
});