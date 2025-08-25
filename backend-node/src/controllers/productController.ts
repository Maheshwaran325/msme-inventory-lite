
import { Request, Response } from 'express';
import { supabase } from '../config/database';

export const getProducts = async (req: Request, res: Response) => {
    try {
        const { search, category } = req.query as { search?: string; category?: string };
        const limitParam = parseInt((req.query.limit as string) || '100', 10);
        const offsetParam = parseInt((req.query.offset as string) || '0', 10);

        let query = supabase
            .from('products')
            .select('id, name, sku, category, quantity, unit_price, version', { count: 'estimated' })
            .order('name', { ascending: true })
            .limit(Math.min(Math.max(limitParam, 1), 500))
            .range(offsetParam, offsetParam + Math.min(Math.max(limitParam, 1), 500) - 1);

        if (search && search.trim()) {
            // Exact name match (case-insensitive) to mirror UI behavior
            query = query.ilike('name', search.trim());
        }

        if (category && category !== 'All') {
            query = query.eq('category', category);
        }

        const { data, error, count } = await query;
        if (error) throw error;
        res.json({ success: true, data, count });
    } catch (error) {
        res.status(500).json({ 
            error: { 
                code: 'INTERNAL_ERROR', 
                message: (error as Error).message 
            } 
        });
    }
};

export const getProductById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ 
            error: { 
                code: 'INTERNAL_ERROR', 
                message: (error as Error).message 
            } 
        });
    }
};

export const createProduct = async (req: Request, res: Response) => {
    try {
        const { name, sku, category, quantity, unit_price } = req.body;
        const { data, error } = await supabase
            .from('products')
            .insert([{ name, sku, category, quantity, unit_price }])
            .select();
        if (error) throw error;
        res.status(201).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ 
            error: { 
                code: 'INTERNAL_ERROR', 
                message: (error as Error).message 
            } 
        });
    }
};

export const updateProduct = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, sku, category, quantity, unit_price, version } = req.body;
        const userRole = req.user?.role;

        // Get current product data for version check and price comparison
        const { data: currentProduct, error: fetchError } = await supabase
            .from('products')
            .select('version, unit_price')
            .eq('id', id)
            .single();

        if (fetchError) {
            return res.status(404).json({ 
                error: { 
                    code: 'NOT_FOUND', 
                    message: 'Product not found',
                    details: { resource: 'product', id: id }
                } 
            });
        }

        // Role-based constraint: Staff cannot modify unit_price
        // Only check if staff is actually trying to change the price
        if (userRole === 'staff' && unit_price !== undefined && unit_price !== currentProduct.unit_price) {
            return res.status(403).json({ 
                error: { 
                    code: 'PERMISSION_EDIT_PRICE', 
                    message: 'Staff members cannot modify unit price',
                    details: {
                        resource: 'product',
                        id: id,
                        field: 'unit_price'
                    }
                } 
            });
        }

        // Optimistic concurrency check
        if (currentProduct.version !== version) {
            return res.status(409).json({ 
                error: { 
                    code: 'CONFLICT', 
                    message: 'Stale update — product has changed',
                    details: { 
                        resource: 'product',
                        id: id,
                        expected_version: version,
                        actual_version: currentProduct.version
                    } 
                } 
            });
        }

        // Prepare update data based on role
        const updateData: any = { 
            name, 
            sku, 
            category, 
            quantity, 
            version: version + 1 
        };

        // Only include unit_price if user is owner OR if staff is not changing it
        if (userRole === 'owner') {
            updateData.unit_price = unit_price;
        } else if (userRole === 'staff' && unit_price !== undefined) {
            // Staff can keep the same price, but not change it
            updateData.unit_price = currentProduct.unit_price;
        }

        const { data, error } = await supabase
            .from('products')
            .update(updateData)
            .eq('id', id)
            .select();
            
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ 
            error: { 
                code: 'INTERNAL_ERROR', 
                message: (error as Error).message 
            } 
        });
    }
};

export const deleteProduct = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) throw error;
        res.json({ success: true, message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ 
            error: { 
                code: 'INTERNAL_ERROR', 
                message: (error as Error).message 
            } 
        });
    }
};

export const getKPIs = async (req: Request, res: Response) => {
    try {
        const totalItemsPromise = supabase
            .from('products')
            .select('*', { count: 'exact', head: true });

        const stockDataPromise = supabase
            .from('products')
            .select('quantity, unit_price');

        const lowStockCountPromise = supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .lt('quantity', 5);

        const [totalItemsRes, stockDataRes, lowStockRes] = await Promise.all([
            totalItemsPromise,
            stockDataPromise,
            lowStockCountPromise,
        ]);

        if (totalItemsRes.error) throw totalItemsRes.error;
        if (stockDataRes.error) throw stockDataRes.error;
        if (lowStockRes.error) throw lowStockRes.error;

        const totalItems = totalItemsRes.count || 0;
        const totalStockValue = (stockDataRes.data || []).reduce((sum: number, product: any) => {
            return sum + (Number(product.quantity) * parseFloat(product.unit_price as string));
        }, 0);
        const lowStockCount = lowStockRes.count || 0;

        res.json({
            success: true,
            data: {
                totalItems,
                totalStockValue,
                lowStockCount,
            },
        });
    } catch (error) {
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: (error as Error).message,
            },
        });
    }
};
