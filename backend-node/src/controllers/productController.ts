
import { Request, Response } from 'express';
import { supabase } from '../config/database';

export const getProducts = async (req: Request, res: Response) => {
    try {
        const { data, error } = await supabase.from('products').select('*');
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: (error as Error).message });
    }
};

export const getProductById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: (error as Error).message });
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
        res.status(500).json({ success: false, message: (error as Error).message });
    }
};

export const updateProduct = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, sku, category, quantity, unit_price, version } = req.body;

        // Optimistic concurrency check
        const { data: existingProduct, error: fetchError } = await supabase
            .from('products')
            .select('version')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;

        if (existingProduct.version !== version) {
            return res.status(409).json({ success: false, message: 'Conflict: Product has been updated by someone else.' });
        }

        const { data, error } = await supabase
            .from('products')
            .update({ name, sku, category, quantity, unit_price, version: version + 1 })
            .eq('id', id)
            .select();
            
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: (error as Error).message });
    }
};

export const deleteProduct = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) throw error;
        res.json({ success: true, message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: (error as Error).message });
    }
};
