
'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { getSessionToken } from '../lib/supabaseClient';

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  unit_price: number;
  version: number;
}

interface ProductFormProps {
  product: Product | null;
  onFinished: () => void;
}

export function ProductForm({ product, onFinished }: ProductFormProps) {
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [unitPrice, setUnitPrice] = useState(0);
  const [version, setVersion] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const productData = { name, sku, category, quantity, unit_price: unitPrice, version };
    const url = product ? `/api/products/${product.id}` : '/api/products';
    const method = product ? 'PUT' : 'POST';

    try {
      const token = await getSessionToken();
      console.log('Submitting product with token:', token ? 'Token exists' : 'No token');
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(productData),
      });

      console.log('Product submission response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Product submission data:', data);

      if (data.success) {
        onFinished();
      } else {
        setError(data.message || 'Failed to save product');
      }
    } catch (err) {
      console.error('Product submission error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
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
        <label htmlFor="unitPrice" className="block text-sm font-medium text-gray-700">Unit Price</label>
        <input type="number" id="unitPrice" value={unitPrice} onChange={(e) => setUnitPrice(Number(e.target.value))} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
      </div>
    </form>
  );
}
