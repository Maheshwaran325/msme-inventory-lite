
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../lib/authContext';
import { Button } from './ui/Button';
import { getSessionToken } from '../lib/supabaseClient';
import { ConflictResolutionModal } from './ConflictResolutionModal';

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  unit_price: number;
  version: number;
}

interface ConflictData {
  resource: string;
  id: string;
  expected_version?: number;
  actual_version?: number;
  field?: string;
}

interface ProductFormProps {
  product: Product | null;
  onFinished: () => void;
}

export function ProductForm({ product, onFinished }: ProductFormProps) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [unitPrice, setUnitPrice] = useState(0);
  const [version, setVersion] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictData, setConflictData] = useState<ConflictData | null>(null);
  const [clientData, setClientData] = useState<Product | null>(null);
  const [isPermissionError, setIsPermissionError] = useState(false);

  useEffect(() => {
    if (product) {
      setName(product.name);
      setSku(product.sku);
      setCategory(product.category);
      setQuantity(product.quantity);
      setUnitPrice(product.unit_price);
      setVersion(product.version);
    } else {
      // Reset form for new product
      setName('');
      setSku('');
      setCategory('');
      setQuantity(0);
      setUnitPrice(0);
      setVersion(1);
    }
  }, [product]);

  const submitProduct = async (productData: Product, url: string, method: string) => {
    const token = await getSessionToken();
    console.log('Submitting product with token:', token ? 'Token exists' : 'No token');
    console.log('Product data being submitted:', productData);
    console.log('URL:', url);
    console.log('Method:', method);
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(productData),
    });

    console.log('Product submission response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorData = await response.json();
      console.log('Error response:', errorData);
      
      // Handle role-based constraint error (permission error)
      if (response.status === 403 && errorData.error?.code === 'PERMISSION_EDIT_PRICE') {
        setConflictData(errorData.error.details);
        setClientData(productData);
        setIsPermissionError(true);
        setShowConflictModal(true);
        return { success: false, permissionError: true };
      }
      
      // Handle version conflict
      if (response.status === 409 && errorData.error?.code === 'CONFLICT') {
        setConflictData(errorData.error.details);
        setClientData(productData);
        setIsPermissionError(false);
        setShowConflictModal(true);
        return { success: false, conflict: true };
      }
      
      throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Product submission data:', data);

    if (data.success) {
      console.log('Product saved successfully, calling onFinished');
      onFinished();
      return { success: true };
    } else {
      console.log('Product save failed:', data.error?.message);
      setError(data.error?.message || 'Failed to save product');
      return { success: false };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted');
    setLoading(true);
    setError('');

    const productData: Product = {
      id: product?.id || '',
      name,
      sku,
      category,
      quantity,
      unit_price: unitPrice,
      version
    };
    const url = product ? `/api/products/${product.id}` : '/api/products';
    const method = product ? 'PUT' : 'POST';

    console.log('About to submit product:', { productData, url, method });

    try {
      const result = await submitProduct(productData, url, method);
      console.log('Submit result:', result);
      if (!result.success && !result.conflict && !result.permissionError) {
        setError('Failed to save product');
      }
    } catch (err) {
      console.error('Product submission error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleConflictResolution = async (resolution: 'keep-mine' | 'accept-remote' | 'merge-manual', mergedData?: Partial<Product>) => {
    if (!product || !conflictData || !clientData) return;

    setLoading(true);
    setError('');

    try {
      let productData: Product;
      let newVersion: number;

      if (isPermissionError) {
        // Handle permission error resolution
        switch (resolution) {
          case 'keep-mine':
            // Keep all changes except unit_price (revert to original)
            productData = { 
              ...clientData,
              unit_price: product.unit_price // Revert to original price
            } as Product;
            newVersion = version + 1;
            break;
          case 'accept-remote':
            // Remove unit_price change, keep other changes
            productData = { 
              ...clientData,
              unit_price: product.unit_price // Revert to original price
            } as Product;
            newVersion = version + 1;
            break;
          default:
            throw new Error('Invalid resolution for permission error');
        }
      } else {
        // Handle regular conflict resolution
        switch (resolution) {
          case 'keep-mine':
            // Use client data but with updated version
            productData = { ...clientData } as Product;
            newVersion = conflictData.actual_version! + 1;
            break;
          case 'accept-remote':
            // Use current data and update form
            productData = { ...clientData } as Product;
            newVersion = conflictData.actual_version!;
            // Update form fields to reflect current data (we'll need to fetch it)
            const token = await getSessionToken();
            const response = await fetch(`/api/products/${product.id}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });
            if (response.ok) {
              const data = await response.json();
              const currentProduct = data.data;
              setName(currentProduct.name);
              setSku(currentProduct.sku);
              setCategory(currentProduct.category);
              setQuantity(currentProduct.quantity);
              setUnitPrice(currentProduct.unit_price);
              setVersion(currentProduct.version);
            }
            setShowConflictModal(false);
            setConflictData(null);
            setClientData(null);
            setIsPermissionError(false);
            return;
          case 'merge-manual':
            // Use merged data
            productData = { ...mergedData, version: conflictData.actual_version! + 1 } as Product;
            newVersion = conflictData.actual_version! + 1;
            break;
        }
      }

      productData.version = newVersion;
      const url = `/api/products/${product.id}`;
      
      const result = await submitProduct(productData, url, 'PUT');
      if (result.success) {
        setShowConflictModal(false);
        setConflictData(null);
        setClientData(null);
        setIsPermissionError(false);
        onFinished();
      }
    } catch (err) {
      console.error('Conflict resolution error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during conflict resolution');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-red-500">{error}</p>}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
          <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
        </div>
        <div>
          <label htmlFor="sku" className="block text-sm font-medium text-gray-700">SKU</label>
          <input type="text" id="sku" value={sku} onChange={(e) => setSku(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
        </div>
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label>
          <input type="text" id="category" value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
        </div>
        <div>
          <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">Quantity</label>
          <input type="number" id="quantity" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
        </div>
        <div>
          <label htmlFor="unitPrice" className="block text-sm font-medium text-gray-700">
            Unit Price
          </label>
          <input 
            type="number" 
            id="unitPrice" 
            value={unitPrice} 
            onChange={(e) => setUnitPrice(Number(e.target.value))} 
            required 
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
        </div>
      </form>

      {conflictData && clientData && (
        <ConflictResolutionModal
          isOpen={showConflictModal}
          onClose={() => {
            setShowConflictModal(false);
            setConflictData(null);
            setClientData(null);
            setIsPermissionError(false);
          }}
          conflictData={conflictData}
          clientData={clientData}
          onResolve={handleConflictResolution}
          isPermissionError={isPermissionError}
        />
      )}
    </>
  );
}
