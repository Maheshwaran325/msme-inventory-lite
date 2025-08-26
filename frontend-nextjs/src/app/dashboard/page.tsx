'use client';

import { useAuth } from '../../lib/authContext';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getSessionToken } from '../../lib/supabaseClient';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [kpis, setKpis] = useState<{ totalItems: number; totalStockValue: number; lowStockCount: number } | null>(null);
  const [kpiLoading, setKpiLoading] = useState(true);
  const [kpiError, setKpiError] = useState<string | null>(null);

  const [categoryData, setCategoryData] = useState<Array<{ category: string; stockValue: number }>>([]);
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const handleLogout = async () => {
    const result = await logout();
    if (result.success) {
      router.push('/login');
    } else {
      console.error('Logout failed:', result.message);
    }
  };

  useEffect(() => {
    const fetchKpis = async () => {
      try {
        setKpiLoading(true);
        setKpiError(null);
        const token = await getSessionToken();
        const res = await fetch('/api/dashboard', {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
          },
        });
        if (!res.ok) {
          if (res.status === 401) {
            await logout();
            router.push('/login');
            return;
          }
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error?.message || `HTTP error: ${res.status}`);
        }
        const data = await res.json();
        if (data?.success !== false && data?.data) {
          setKpis({
            totalItems: data.data.totalItems ?? 0,
            totalStockValue: data.data.totalStockValue ?? 0,
            lowStockCount: data.data.lowStockCount ?? 0,
          });
        } else {
          setKpiError(data?.error?.message || 'Failed to load KPIs');
        }
      } catch (e) {
        setKpiError(e instanceof Error ? e.message : 'Failed to load KPIs');
      } finally {
        setKpiLoading(false);
      }
    };

    fetchKpis();
  }, [logout, router]);

  useEffect(() => {
    const fetchCategoryAgg = async () => {
      try {
        setCategoryLoading(true);
        setCategoryError(null);
        const token = await getSessionToken();
        const res = await fetch('/api/dashboard/stock-by-category', {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
          },
        });
        if (!res.ok) {
          if (res.status === 401) {
            await logout();
            router.push('/login');
            return;
          }
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error?.message || `HTTP error: ${res.status}`);
        }
        const json = await res.json();
        if (json?.success !== false && Array.isArray(json?.data)) {
          setCategoryData(json.data);
        } else {
          setCategoryError(json?.error?.message || 'Failed to load category chart');
        }
      } catch (e) {
        setCategoryError(e instanceof Error ? e.message : 'Failed to load category chart');
      } finally {
        setCategoryLoading(false);
      }
    };

    fetchCategoryAgg();
  }, [logout, router]);
  return (
    <ProtectedRoute>
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
                    className="text-gray-900 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
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
            {/* KPIs */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-4 text-gray-900">Key Metrics</h2>
              {kpiError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                  {kpiError}
                </div>
              )}
              {kpiLoading ? (
                <div className="flex items-center text-gray-700">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mr-2"></div>
                  Loading KPIs...
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white border rounded p-4">
                    <div className="text-sm text-gray-600">Total Items</div>
                    <div className="text-3xl font-bold text-gray-900">
                      {kpis?.totalItems ?? 0}
                    </div>
                  </div>
                  <div className="bg-white border rounded p-4">
                    <div className="text-sm text-gray-600">Total Stock Value</div>
                    <div className="text-3xl font-bold text-gray-900">
                      ${Number(kpis?.totalStockValue ?? 0).toFixed(2)}
                    </div>
                  </div>
                  <div className="bg-white border rounded p-4">
                    <div className="text-sm text-gray-600">Low Stock Count</div>
                    <div className="text-3xl font-bold text-gray-900">
                      {kpis?.lowStockCount ?? 0}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Stock Value by Category */}
            <div className="mt-8">
              <h2 className="text-2xl font-bold mb-4 text-gray-900">Stock Value by Category</h2>
              {categoryError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                  {categoryError}
                </div>
              )}
              {categoryLoading ? (
                <div className="flex items-center text-gray-700">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mr-2"></div>
                  Loading chart...
                </div>
              ) : (
                <div className="bg-white border rounded p-4">
                  {categoryData.length === 0 ? (
                    <div className="text-gray-600 text-sm">No data available</div>
                  ) : (
                    <CategoryBarChart data={categoryData} />
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}

function CategoryBarChart({ data }: { data: Array<{ category: string; stockValue: number }> }) {
  const max = Math.max(0, ...data.map(d => d.stockValue));
  return (
    <div className="space-y-3">
      {data.map((d) => {
        const widthPct = max > 0 ? Math.max(2, Math.round((d.stockValue / max) * 100)) : 0;
        return (
          <div key={d.category}>
            <div className="flex justify-between text-sm text-gray-700 mb-1">
              <span className="font-medium">{d.category}</span>
              <span>${Number(d.stockValue).toFixed(2)}</span>
            </div>
            <div className="w-full bg-gray-100 h-3 rounded">
              <div
                className="h-3 bg-blue-500 rounded"
                style={{ width: `${widthPct}%` }}
                title={`$${Number(d.stockValue).toFixed(2)}`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}