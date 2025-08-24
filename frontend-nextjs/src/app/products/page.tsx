'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/authContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { ProductForm } from '../../components/ProductForm';
import { getSessionToken } from '../../lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  unit_price: number;
  version: number;
}

export default function ProductsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await getSessionToken();
      console.log('Fetching products with token:', token ? 'Token exists' : 'No token');
      
      const response = await fetch('/api/products', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Products data:', data);
      
      if (data.success) {
        setProducts(data.data || []);
      } else {
        setError(data.message || 'Failed to fetch products');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while fetching products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleAddProduct = () => {
    setSelectedProduct(null);
    setIsModalOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleDeleteProduct = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        const token = await getSessionToken();
        const response = await fetch(`/api/products/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          fetchProducts(); // Refresh the list
        } else {
          const data = await response.json();
          alert(data.message || 'Failed to delete product');
        }
      } catch (error) {
        console.error('Error deleting product:', error);
        alert('An error occurred while deleting the product');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-gray-900">MSME Inventory Lite</h1>
              </div>
              <div className="ml-10 flex items-baseline space-x-4">
                <Link 
                  href="/dashboard" 
                  className="text-gray-900 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Dashboard
                </Link>
                <Link 
                  href="/products" 
                  className="text-gray-900 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium bg-gray-100"
                >
                  Products
                </Link>
              </div>
            </div>
            <div className="flex items-center">
              <div className="ml-3 relative">
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-gray-700">
                    {user?.email}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="text-sm font-medium text-gray-700 hover:text-gray-900"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Products</h1>
            {user?.role === 'owner' && (
              <Button onClick={handleAddProduct}>Add Product</Button>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <span className="ml-2 text-gray-600">Loading products...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => (
                <Card key={product.id} className="bg-white border-gray-200 hover:shadow-md transition-shadow duration-200">
                  <CardHeader>
                    <CardTitle className="text-gray-900">{product.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <p className="text-gray-700"><span className="font-medium">SKU:</span> {product.sku}</p>
                      <p className="text-gray-700"><span className="font-medium">Category:</span> {product.category}</p>
                      <p className="text-gray-700"><span className="font-medium">Quantity:</span> {product.quantity}</p>
                      <p className="text-gray-700"><span className="font-medium">Price:</span> ${product.unit_price.toFixed(2)}</p>
                    </div>
                    <div className="flex justify-end space-x-2 mt-4">
                      <Button variant="secondary" onClick={() => handleEditProduct(product)}>Edit</Button>
                      {user?.role === 'owner' && (
                        <Button variant="danger" onClick={() => handleDeleteProduct(product.id)}>Delete</Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedProduct ? 'Edit Product' : 'Add Product'}>
        <ProductForm product={selectedProduct} onFinished={() => {
          setIsModalOpen(false);
          fetchProducts();
        }} />
      </Modal>
    </div>
  );
}