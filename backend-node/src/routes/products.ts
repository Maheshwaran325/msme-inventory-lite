import { Router, Request, Response } from 'express';
import { supabase } from '../config/database';
import { authenticateToken, authorizeRole } from '../middleware/auth';

const router = Router();

// Get all products (protected route)
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .limit(100);

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

// Get product by ID (protected route)
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({ 
      success: true,
      product: data 
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create product (owner only)
router.post('/', authenticateToken, authorizeRole(['owner']), async (req: Request, res: Response) => {
  try {
    const { name, sku, category, quantity, unit_price } = req.body;
    
    // Validate input
    if (!name || !sku || quantity === undefined || unit_price === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Name, SKU, quantity, and unit_price are required'
      });
    }

    // Create product
    const { data, error } = await supabase
      .from('products')
      .insert([
        {
          name,
          sku,
          category: category || '',
          quantity,
          unit_price,
          created_by: req.user?.id
        }
      ])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ 
      success: true,
      message: 'Product created successfully',
      product: data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update product (owner only)
router.put('/:id', authenticateToken, authorizeRole(['owner']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, sku, category, quantity, unit_price } = req.body;
    
    // Check if product exists
    const { data: existingProduct, error: fetchError } = await supabase
      .from('products')
      .select('id')
      .eq('id', id)
      .single();

    if (fetchError || !existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Update product
    const { data, error } = await supabase
      .from('products')
      .update({
        name,
        sku,
        category: category || '',
        quantity,
        unit_price,
        updated_by: req.user?.id,
        updated_at: new Date().toISOString(),
        version: (existingProduct as any).version ? (existingProduct as any).version + 1 : 1
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ 
      success: true,
      message: 'Product updated successfully',
      product: data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete product (owner only)
router.delete('/:id', authenticateToken, authorizeRole(['owner']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if product exists
    const { data: existingProduct, error: fetchError } = await supabase
      .from('products')
      .select('id')
      .eq('id', id)
      .single();

    if (fetchError || !existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Delete product
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ 
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;