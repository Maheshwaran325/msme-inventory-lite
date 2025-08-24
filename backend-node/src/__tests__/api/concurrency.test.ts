import request from 'supertest';
import express from 'express';
import { authenticateToken } from '../../middleware/auth';
import { updateProduct } from '../../controllers/productController';
import { supabase } from '../../config/database';

// Create test app
const app = express();
app.use(express.json());
app.put('/api/products/:id', authenticateToken, updateProduct);

describe('API Concurrency Tests', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    role: 'owner'
  };

  const mockProduct = {
    id: '1',
    name: 'Test Product',
    sku: 'TEST-001',
    category: 'Test Category',
    quantity: 10,
    unit_price: 9.99,
    version: 1
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock authentication middleware
    (authenticateToken as jest.Mock).mockImplementation((req, res, next) => {
      req.user = mockUser;
      next();
    });
  });

  describe('PUT /api/products/:id - Concurrency Conflict', () => {
    it('should return 409 CONFLICT when version mismatch occurs', async () => {
      // Mock Supabase to return different version
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { version: 3 }, // Different from client's version 1
              error: null
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
          version: 1 // Client's version
        })
        .expect(409);

      expect(response.body).toEqual({
        error: {
          code: 'CONFLICT',
          message: 'Stale update — product has changed',
          details: {
            resource: 'product',
            id: '1',
            expected_version: 1,
            actual_version: 3
          }
        }
      });
    });

    it('should return 403 PERMISSION_EDIT_PRICE when staff tries to modify unit_price', async () => {
      // Mock staff user
      (authenticateToken as jest.Mock).mockImplementation((req, res, next) => {
        req.user = { ...mockUser, role: 'staff' };
        next();
      });

      // Mock Supabase to return current version
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { version: 1, unit_price: 9.99 },
              error: null
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
          unit_price: 12.99, // Staff trying to modify price
          version: 1
        })
        .expect(403);

      expect(response.body).toEqual({
        error: {
          code: 'PERMISSION_EDIT_PRICE',
          message: 'Staff members cannot modify unit price',
          details: {
            resource: 'product',
            id: '1',
            field: 'unit_price'
          }
        }
      });
    });

    it('should successfully update when version matches and user is owner', async () => {
      // Mock Supabase to return matching version
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
              data: [{ ...mockProduct, version: 2 }],
              error: null
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
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: [{ ...mockProduct, version: 2 }]
      });
    });

    it('should return 404 when product not found', async () => {
      // Mock Supabase to return not found
      const mockSupabase = supabase as jest.Mocked<typeof supabase>;
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Product not found' }
            })
          })
        })
      } as any);

      const response = await request(app)
        .put('/api/products/999')
        .send({
          name: 'Updated Product',
          sku: 'TEST-001',
          category: 'Test Category',
          quantity: 15,
          unit_price: 12.99,
          version: 1
        })
        .expect(404);

      expect(response.body).toEqual({
        error: {
          code: 'NOT_FOUND',
          message: 'Product not found',
          details: {
            resource: 'product',
            id: '999'
          }
        }
      });
    });
  });
});
