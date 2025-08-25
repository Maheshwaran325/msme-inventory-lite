'use client';

import { useAuth } from '../lib/authContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/login');
      setIsChecking(false);
      return;
    }
    setIsChecking(false);
  }, [user, loading, router]);

  // Show loading spinner while checking auth state
  if (loading || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Render children if user is authenticated
  if (!user) return null;
  return <>{children}</>;
}