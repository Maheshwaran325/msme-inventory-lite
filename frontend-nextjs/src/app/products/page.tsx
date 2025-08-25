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
import { OfflineControls } from '../../components/OfflineControls';
import { enqueueEdit, isSimulatedOffline } from '../../lib/offlineQueue';

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

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Debounced filters to avoid firing requests on every keystroke
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [debouncedCategory, setDebouncedCategory] = useState<string>('All');

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setDebouncedCategory(selectedCategory);
    }, 300);
    return () => clearTimeout(handle);
  }, [searchQuery, selectedCategory]);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  const handleLogout = async () => {
    const result = await logout();
    if (result.success) {
      router.push('/login');
    } else {
      console.error('Logout failed:', result.message);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = await getSessionToken();
      
      const params = new URLSearchParams();
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      if (debouncedCategory && debouncedCategory !== 'All') params.set('category', debouncedCategory);
      params.set('limit', String(pageSize));
      params.set('offset', String((page - 1) * pageSize));

      const response = await fetch(`/api/products?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
            
      if (!response.ok) {
        // If we get a 401, redirect to login
        if (response.status === 401) {
          await logout();
          router.push('/login');
          return;
        }
        
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setProducts(data.data || []);
        setTotalCount(typeof data.count === 'number' ? data.count : null);
      } else {
        setError(data.error?.message || 'Failed to fetch products');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setError(error instanceof Error ? error.message : 'An error occurred while fetching products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Reset to first page when filters change
    setPage(1);
  }, [debouncedSearch, debouncedCategory]);

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, debouncedCategory, page]);

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
        if (isSimulatedOffline()) {
          await enqueueEdit({ url: `/api/products/${id}`, method: 'DELETE', body: null });
          alert('Delete queued (offline). It will sync when back online.');
          return;
        }
        const response = await fetch(`/api/products/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (response.ok) fetchProducts(); else {
          const data = await response.json();
          alert(data.error?.message || 'Failed to delete product');
        }
      } catch (error) {
        console.error('Error deleting product:', error);
        // Queue if network failed
        await enqueueEdit({ url: `/api/products/${id}`, method: 'DELETE', body: null });
        alert('Network error — delete queued for retry.');
      }
    }
  };

  // Derived: unique categories (with 'All' at start)
  const categories: string[] = ['All', ...Array.from(new Set(products.map(p => p.category).filter(Boolean))).sort()];

  // Exact name match (case-insensitive) + category filter
  const filteredProducts = products.filter(p => {
    const nameMatches = !searchQuery.trim()
      ? true
      : p.name.trim().toLowerCase() === searchQuery.trim().toLowerCase();
    const categoryMatches = selectedCategory === 'All' ? true : p.category === selectedCategory;
    return nameMatches && categoryMatches;
  });

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
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
                
                    <Link
                      href="/import"
                      className="text-gray-900 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
                    >
                      Import CSV
                    </Link>
                 
                </div>
            </div>
            <div className="flex items-center">
              <div className="ml-3 relative">
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-gray-700">
                    {user?.email} ({user?.role})
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
          <div className="mb-4"><OfflineControls /></div>

          {/* Search + Category Filters */}
          <div className="bg-white border rounded p-4 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="w-full md:w-1/2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Search by name (exact)</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type exact product name"
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-gray-700"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={clearFilters}>Clear</Button>
              </div>
            </div>

            <div className="mt-4">
              <div className="text-sm text-gray-700 mb-2">Filter by category</div>
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => {
                  const active = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition
                        ${active 
                          ? 'bg-blue-600 text-white border-blue-600' 
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>
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
            <>
              <div className="text-sm text-gray-600 mb-3">
                Showing {products.length} of {totalCount ?? products.length} products
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProducts.map((product) => (
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
                        <p className="text-gray-500 text-xs"><span className="font-medium">Version:</span> {product.version}</p>
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
              {/* Pagination controls */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-600">
                  Page {page}
                </div>
                <div className="space-x-2">
                  <Button
                    variant="secondary"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1 || loading}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={loading || (totalCount !== null && page * pageSize >= totalCount)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
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