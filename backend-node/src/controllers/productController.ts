
import { Request, Response } from 'express';
import { supabase } from '../config/database';
import { logger } from '../utils/logger';
import { ErrorTypes, sendErrorResponse, mapSupabaseError } from '../utils/errors';

export const getProducts = async (req: Request, res: Response) => {
    const startTime = Date.now();
    
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
        if (error) throw mapSupabaseError(error, 'products');

        // Log successful operation
        logger.log(logger.createLogEntry('READ', startTime, req, 'SUCCESS'));

        res.json({ success: true, data, count });
    } catch (error) {
        // Log failed operation
        const appError = error instanceof Error ? mapSupabaseError(error, 'products') : ErrorTypes.INTERNAL_ERROR();
        logger.log(logger.createLogEntry('READ', startTime, req, 'ERROR', undefined, appError.code, appError.message));
        
        sendErrorResponse(res, appError);
    }
};

export const getProductById = async (req: Request, res: Response) => {
    const startTime = Date.now();
    const { id } = req.params;
    
    try {
        const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
        if (error) throw mapSupabaseError(error, 'product', id);

        // Log successful operation
        logger.log(logger.createLogEntry('READ', startTime, req, 'SUCCESS', id));

        res.json({ success: true, data });
    } catch (error) {
        // Log failed operation
        const appError = error instanceof Error ? mapSupabaseError(error, 'product', id) : ErrorTypes.INTERNAL_ERROR();
        logger.log(logger.createLogEntry('READ', startTime, req, 'ERROR', id, appError.code, appError.message));
        
        sendErrorResponse(res, appError);
    }
};

export const createProduct = async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
        const { name, sku, category, quantity, unit_price } = req.body;
        
        // Basic validation
        if (!name || !sku || !category || quantity === undefined || unit_price === undefined) {
            throw ErrorTypes.VALIDATION_ERROR('Missing required fields', {
                resource: 'product',
                required_fields: ['name', 'sku', 'category', 'quantity', 'unit_price']
            });
        }

        const { data, error } = await supabase
            .from('products')
            .insert([{ name, sku, category, quantity, unit_price }])
            .select();
        
        if (error) throw mapSupabaseError(error, 'product');

        const productId = data?.[0]?.id;

        // Log successful operation
        logger.log(logger.createLogEntry('CREATE', startTime, req, 'SUCCESS', productId));

        res.status(201).json({ success: true, data });
    } catch (error) {
        // Log failed operation
        const appError = error instanceof Error ? mapSupabaseError(error, 'product') : ErrorTypes.INTERNAL_ERROR();
        logger.log(logger.createLogEntry('CREATE', startTime, req, 'ERROR', undefined, appError.code, appError.message));
        
        sendErrorResponse(res, appError);
    }
};

export const updateProduct = async (req: Request, res: Response) => {
    const startTime = Date.now();
    const { id } = req.params;
    
    try {
        const { name, sku, category, quantity, unit_price, version } = req.body;
        const userRole = req.user?.role;

        // Get current product data for version check and price comparison
        const { data: currentProduct, error: fetchError } = await supabase
            .from('products')
            .select('version, unit_price')
            .eq('id', id)
            .single();

        if (fetchError) {
            const notFoundError = ErrorTypes.NOT_FOUND('product', id);
            logger.log(logger.createLogEntry('UPDATE', startTime, req, 'NOT_FOUND', id, notFoundError.code, notFoundError.message));
            return sendErrorResponse(res, notFoundError);
        }

        // Role-based constraint: Staff cannot modify unit_price
        // Only check if staff is actually trying to change the price
        if (userRole === 'staff' && unit_price !== undefined && unit_price !== currentProduct.unit_price) {
            const permissionError = ErrorTypes.PERMISSION_EDIT_PRICE(id);
            logger.log(logger.createLogEntry('UPDATE', startTime, req, 'PERMISSION_DENIED', id, permissionError.code, permissionError.message));
            return sendErrorResponse(res, permissionError);
        }

        // Optimistic concurrency check
        if (currentProduct.version !== version) {
            const conflictError = ErrorTypes.CONFLICT('product', id, version, currentProduct.version);
            logger.log(logger.createLogEntry('UPDATE', startTime, req, 'CONFLICT', id, conflictError.code, conflictError.message, {
                expected_version: version,
                actual_version: currentProduct.version
            }));
            return sendErrorResponse(res, conflictError);
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
            
        if (error) throw mapSupabaseError(error, 'product', id);

        // Log successful operation
        logger.log(logger.createLogEntry('UPDATE', startTime, req, 'SUCCESS', id));

        res.json({ success: true, data });
    } catch (error) {
        // Log failed operation
        const appError = error instanceof Error ? mapSupabaseError(error, 'product', id) : ErrorTypes.INTERNAL_ERROR();
        logger.log(logger.createLogEntry('UPDATE', startTime, req, 'ERROR', id, appError.code, appError.message));
        
        sendErrorResponse(res, appError);
    }
};

export const deleteProduct = async (req: Request, res: Response) => {
    const startTime = Date.now();
    const { id } = req.params;
    
    try {
        // First check if product exists
        const { data: existingProduct, error: fetchError } = await supabase
            .from('products')
            .select('id')
            .eq('id', id)
            .single();

        if (fetchError) {
            const notFoundError = ErrorTypes.NOT_FOUND('product', id);
            logger.log(logger.createLogEntry('DELETE', startTime, req, 'NOT_FOUND', id, notFoundError.code, notFoundError.message));
            return sendErrorResponse(res, notFoundError);
        }

        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) throw mapSupabaseError(error, 'product', id);

        // Log successful operation
        logger.log(logger.createLogEntry('DELETE', startTime, req, 'SUCCESS', id));

        res.json({ success: true, message: 'Product deleted successfully' });
    } catch (error) {
        // Log failed operation
        const appError = error instanceof Error ? mapSupabaseError(error, 'product', id) : ErrorTypes.INTERNAL_ERROR();
        logger.log(logger.createLogEntry('DELETE', startTime, req, 'ERROR', id, appError.code, appError.message));
        
        sendErrorResponse(res, appError);
    }
};

export const getKPIs = async (req: Request, res: Response) => {
    const startTime = Date.now();
    
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

        if (totalItemsRes.error) throw mapSupabaseError(totalItemsRes.error, 'products');
        if (stockDataRes.error) throw mapSupabaseError(stockDataRes.error, 'products');
        if (lowStockRes.error) throw mapSupabaseError(lowStockRes.error, 'products');

        const totalItems = totalItemsRes.count || 0;
        const totalStockValue = (stockDataRes.data || []).reduce((sum: number, product: any) => {
            return sum + (Number(product.quantity) * parseFloat(product.unit_price as string));
        }, 0);
        const lowStockCount = lowStockRes.count || 0;

        // Log successful operation (KPIs are READ operations)
        logger.log(logger.createLogEntry('READ', startTime, req, 'SUCCESS'));

        res.json({
            success: true,
            data: {
                totalItems,
                totalStockValue,
                lowStockCount,
            },
        });
    } catch (error) {
        // Log failed operation
        const appError = error instanceof Error ? mapSupabaseError(error, 'products') : ErrorTypes.INTERNAL_ERROR();
        logger.log(logger.createLogEntry('READ', startTime, req, 'ERROR', undefined, appError.code, appError.message));
        
        sendErrorResponse(res, appError);
    }
};
