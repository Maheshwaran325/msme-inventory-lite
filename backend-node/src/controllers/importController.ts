import { Request, Response } from 'express';
import { supabase } from '../config/database';
import { createHash } from 'crypto';

interface CSVRow {
    name: string;
    sku: string;
    category: string;
    quantity: string;
    unit_price: string;
    [key: string]: string; // For unknown columns
}

interface ImportResult {
    row: number;
    sku: string;
    status: 'created' | 'updated' | 'skipped' | 'error';
    message?: string;
    data?: any;
    row_data?: CSVRow // original row for re-upload of failures
}

interface ValidationError {
    field: string;
    message: string;
}

export const importCSV = async (req: Request, res: Response) => {
    try {
        // Check if file exists
        if (!req.file) {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'No CSV file provided',
                    details: { field: 'file' }
                }
            });
        }

        // Get user role
        const userRole = req.user?.role;
        if (!userRole) {
            return res.status(401).json({
                error: {
                    code: 'AUTH_ERROR',
                    message: 'User role not found'
                }
            });
        }

        // Parse CSV content
        const csvContent = req.file.buffer.toString('utf-8');
        const lines = csvContent.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'CSV file must contain at least a header and one data row',
                    details: { min_rows: 2, actual_rows: lines.length }
                }
            });
        }

        // Parse header
        const header = lines[0].split(',').map(h => h.trim().toLowerCase());
        const requiredColumns = ['name', 'sku', 'category', 'quantity', 'unit_price'];
        
        // Check for required columns
        const missingColumns = requiredColumns.filter(col => !header.includes(col));
        if (missingColumns.length > 0) {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: `Missing required columns: ${missingColumns.join(', ')}`,
                    details: { missing_columns: missingColumns }
                }
            });
        }

        // Warn about unknown columns
        const unknownColumns = header.filter(col => !requiredColumns.includes(col));
        if (unknownColumns.length > 0) {
            console.warn(`Unknown columns in CSV: ${unknownColumns.join(', ')}`);
        }

        // Generate file hash for idempotency
        const fileHash = createHash('md5').update(csvContent).digest('hex');

        // Check if this file was already processed
        const { data: existingImport } = await supabase
            .from('import_logs')
            .select('*')
            .eq('file_hash', fileHash)
            .single();

        if (existingImport) {
            return res.status(200).json({
                success: true,
                message: 'File already processed',
                import_id: existingImport.id,
                results: existingImport.results
            });
        }

        // Process data rows
        const results: ImportResult[] = [];
        const dataRows = lines.slice(1);
        const processedSkus: Set<string> = new Set(); // Track SKUs processed in this file

        for (let i = 0; i < dataRows.length; i++) {
            const rowNumber = i + 2; // +2 because we start from line 2 (after header)
            const row = dataRows[i];
            
            try {
                // Parse CSV row
                const values = parseCSVRow(row);
                const csvRow: CSVRow = {} as CSVRow;
                
                header.forEach((col, index) => {
                    csvRow[col] = values[index] || '';
                });

                // Validate row
                const validationErrors = validateRow(csvRow, rowNumber);
                if (validationErrors.length > 0) {
                    results.push({
                        row: rowNumber,
                        sku: csvRow.sku || 'unknown',
                        status: 'error',
                        message: validationErrors.map(e => `${e.field}: ${e.message}`).join('; ')
                    });
                    continue;
                }

                // Check for duplicates in the same file
                const sku = csvRow.sku.trim();
                if (processedSkus.has(sku)) {
                    results.push({
                        row: rowNumber,
                        sku: sku,
                        status: 'skipped',
                        message: 'Duplicate in same file'
                    });
                    continue;
                }
                processedSkus.add(sku);

                // Check if product exists by SKU
                const { data: existingProduct } = await supabase
                    .from('products')
                    .select('id, version, name, category, quantity, unit_price')
                    .eq('sku', sku)
                    .single();

                const productData = {
                    name: csvRow.name.trim(),
                    sku: sku,
                    category: csvRow.category.trim(),
                    quantity: parseInt(csvRow.quantity),
                    unit_price: parseFloat(csvRow.unit_price)
                };

                // Check if this is a unit_price change
                const isUnitPriceChange = existingProduct &&
                    parseFloat(csvRow.unit_price) !== existingProduct.unit_price;

                // For staff users, skip unit_price changes but allow other updates
                const isStaffSkippingUnitPrice = userRole === 'staff' && isUnitPriceChange;

                let result: ImportResult;

                if (existingProduct) {
                    // Update existing product - all fields except SKU can be updated
                    const updateData = {
                        name: productData.name,
                        category: productData.category,
                        quantity: productData.quantity,
                        version: existingProduct.version + 1,
                        ...( (!isUnitPriceChange || userRole === 'owner') && { unit_price: productData.unit_price } )
                    };

                    const { data: updatedProduct, error: updateError } = await supabase
                        .from('products')
                        .update(updateData)
                        .eq('id', existingProduct.id)
                        .select()
                        .single();

                    if (updateError) {
                        result = {
                            row: rowNumber,
                            sku: sku,
                            status: 'error',
                            message: `Update failed: ${updateError.message}`
                        };
                    } else {
                        // Create detailed message about what was updated
                        const changes: string[] = [];
                        if (productData.name !== existingProduct.name) {
                            changes.push(`name: "${existingProduct.name}" → "${productData.name}"`);
                        }
                        if (productData.category !== existingProduct.category) {
                            changes.push(`category: "${existingProduct.category}" → "${productData.category}"`);
                        }
                        if (productData.quantity !== existingProduct.quantity) {
                            changes.push(`quantity: ${existingProduct.quantity} → ${productData.quantity}`);
                        }
                        if (isUnitPriceChange && userRole === 'owner') {
                            changes.push(`unit_price: ${existingProduct.unit_price} → ${productData.unit_price}`);
                        }
                        
                        // Create message based on user role and changes
                        let message = '';
                        if (changes.length > 0) {
                            message = `Updated: ${changes.join(', ')}`;
                            if (isStaffSkippingUnitPrice) {
                                message += '; unit_price skipped (staff restriction)';
                            }
                        } else {
                            message = isStaffSkippingUnitPrice ? 'unit_price skipped (staff restriction)' : 'No changes detected';
                        }
                        
                        result = {
                            row: rowNumber,
                            sku: sku,
                            status: 'updated',
                            message: message,
                            data: updatedProduct
                        };
                    }
                } else {
                    // Create new product
                    // For staff users, exclude unit_price from creation if it's being provided
                    const createData = isStaffSkippingUnitPrice ? {
                        name: productData.name,
                        sku: productData.sku,
                        category: productData.category,
                        quantity: productData.quantity,
                        unit_price: 0 // Default to 0 for staff users
                    } : productData;

                    const { data: newProduct, error: insertError } = await supabase
                        .from('products')
                        .insert([createData])
                        .select()
                        .single();

                    if (insertError) {
                        result = {
                            row: rowNumber,
                            sku: sku,
                            status: 'error',
                            message: `Insert failed: ${insertError.message}`
                        };
                    } else {
                        const message = isStaffSkippingUnitPrice ?
                            'Product created successfully (unit_price skipped due to staff restriction)' :
                            'Product created successfully';
                        result = {
                            row: rowNumber,
                            sku: sku,
                            status: 'created',
                            message: message,
                            data: newProduct
                        };
                    }
                }

                results.push(result);

            } catch (error) {
                results.push({
                    row: rowNumber,
                    sku: 'unknown',
                    status: 'error',
                    message: `Row parsing failed: ${(error as Error).message}`
                });
            }
        }

        // Log the import
        const { data: importLog } = await supabase
            .from('import_logs')
            .insert([{
                file_hash: fileHash,
                filename: req.file.originalname,
                total_rows: dataRows.length,
                results: results,
                imported_by: req.user?.id
            }])
            .select()
            .single();

        res.status(200).json({
            success: true,
            message: 'CSV import completed',
            import_id: importLog?.id,
            summary: {
                total_rows: dataRows.length,
                created: results.filter(r => r.status === 'created').length,
                updated: results.filter(r => r.status === 'updated').length,
                errors: results.filter(r => r.status === 'error').length
            },
            results: results
        });

    } catch (error) {
        console.error('CSV import error:', error);
        res.status(500).json({
            error: {
                code: 'INTERNAL_ERROR',
                message: (error as Error).message
            }
        });
    }
};

function parseCSVRow(row: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < row.length; i++) {
        const char = row[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current.trim());
    return result;
}

function validateRow(row: CSVRow, rowNumber: number): ValidationError[] {
    const errors: ValidationError[] = [];

    // Validate name
    if (!row.name || row.name.trim().length === 0) {
        errors.push({ field: 'name', message: 'Name is required' });
    }

    // Validate SKU
    if (!row.sku || row.sku.trim().length === 0) {
        errors.push({ field: 'sku', message: 'SKU is required' });
    } else if (row.sku.trim().length > 64) {
        errors.push({ field: 'sku', message: 'SKU must be 64 characters or less' });
    }

    // Validate quantity
    const quantity = parseInt(row.quantity);
    if (isNaN(quantity)) {
        errors.push({ field: 'quantity', message: 'Quantity must be a valid integer' });
    } else if (quantity < 0) {
        errors.push({ field: 'quantity', message: 'Quantity must be non-negative' });
    }

    // Validate unit_price
    const unitPrice = parseFloat(row.unit_price);
    if (isNaN(unitPrice)) {
        errors.push({ field: 'unit_price', message: 'Unit price must be a valid number' });
    } else if (unitPrice < 0) {
        errors.push({ field: 'unit_price', message: 'Unit price must be non-negative' });
    }

    return errors;
}
