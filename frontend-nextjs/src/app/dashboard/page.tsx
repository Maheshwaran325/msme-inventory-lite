'use client';

import { useAuth } from '../../lib/authContext';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

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
            <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 p-4 text-gray-900">
              <h2 className="text-2xl font-bold mb-4">Dashboard</h2>
              <p>Welcome to your inventory management dashboard!</p>
              <div className="mt-4">
                <h3 className="text-lg font-medium">User Information</h3>
                <p>ID: {user?.id}</p>
                <p>Email: {user?.email}</p>
                <p>Role: {user?.role}</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}