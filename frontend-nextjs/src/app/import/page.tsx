'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/authContext';
import { getSessionToken } from '../../lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '../../components/ui/Button';

type RowStatus = 'created' | 'updated' | 'skipped' | 'error';

interface ImportResult {
  row: number;
  sku: string;
  status: RowStatus;
  message?: string;
  data?: unknown;
  row_data?: {
    name: string;
    sku: string;
    category: string;
    quantity: string;
    unit_price: string;
    [k: string]: string;
  };
}

export default function ImportPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const [summary, setSummary] = useState<{ total_rows: number; created: number; updated: number; errors: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const handleLogout = async () => {
    const result = await logout();
    if (result.success) {
      router.push('/login');
    } else {
      console.error('Logout failed:', result.message);
    }
  };

  useEffect(() => {
    // Set loading to false once we've checked auth state
    setLoading(false);
    
    // Redirect to login if user is not authenticated
    if (user === null) {
      router.push('/login');
    }
  }, [user, router]);

  const handleUpload = async (inputFile?: File) => {
    const csvFile = inputFile ?? file;
    if (!csvFile) return;
    setUploading(true);
    setError(null);
    setResults(null);
    setSummary(null);

    try {
      const token = await getSessionToken();

      const formData = new FormData();
      formData.append('file', csvFile);

      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout
      const response = await fetch(`${apiBase}/import/csv`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        // If we get a 401, redirect to login
        if (response.status === 401) {
          await logout();
          router.push('/login');
          return;
        }
        
        // Try to parse error response as JSON
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error?.message || errorMessage;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (jsonError) {
          // If JSON parsing fails, check content type
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('text/html')) {
            errorMessage = 'Server error - API may be down or unreachable';
          } else {
            // If JSON parsing fails, use the status text
            errorMessage = response.statusText || errorMessage;
          }
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setResults(data.results || []);
        setSummary(data.summary || null);
      } else {
        setError(data.error?.message || 'Failed to import CSV');
      }
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        setError('Upload timed out. Please try again or check the server.');
      } else if (e instanceof Error) {
        setError(e.message || 'Upload failed');
      } else {
        setError('Upload failed');
      }
    } finally {
      setUploading(false);
    }
  };

  const failedRows = (results || []).filter(r => r.status === 'error' && r.row_data);

  const buildCSV = (rows: ImportResult[]) => {
    const header = ['name','sku','category','quantity','unit_price'];
    const lines = [header.join(',')];
    rows.forEach(r => {
      const rd = r.row_data!;
      const vals = [
        (rd.name ?? '').toString(),
        (rd.sku ?? '').toString(),
        (rd.category ?? '').toString(),
        (rd.quantity ?? '').toString(),
        (rd.unit_price ?? '').toString()
      ];
      // Quote fields with commas or quotes
      const escaped = vals.map(v => {
        if (/[",\n]/.test(v)) {
          return `"${v.replace(/"/g, '""')}"`;
        }
        return v;
      });
      lines.push(escaped.join(','));
    });
    return lines.join('\n');
  };

  const downloadFailedCSV = () => {
    if (!failedRows.length) return;
    const csv = buildCSV(failedRows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'failed-rows.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const reuploadFailed = async () => {
    if (!failedRows.length) return;
    const csv = buildCSV(failedRows);
    const blob = new Blob([csv], { type: 'text/csv' });
    const failedFile = new File([blob], 'failed-rows.csv', { type: 'text/csv' });
    await handleUpload(failedFile);
  };

  // Show loading spinner while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // If user is not authenticated or not an owner, don't render the page content
  if (!user || user.role !== 'owner') {
    return null;
  }

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
                  className="text-gray-900 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Products
                </Link>
                <Link
                  href="/import"
                  className="text-gray-900 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium bg-gray-100"
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
            <h1 className="text-2xl font-bold text-gray-900">CSV Import </h1>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <p className="text-sm text-gray-600 mb-4">
              Columns: name, sku, category, quantity, unit_price. 
            </p>

            <div className="border rounded p-4 space-y-4">
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
              />

              <div className="flex gap-2 flex-wrap">
                <Button
                  disabled={!file || uploading}
                  onClick={() => handleUpload()}
                  loading={uploading}
                >
                  {uploading ? 'Uploading...' : 'Upload CSV'}
                </Button>

                {failedRows.length > 0 && (
                  <>
                    <Button variant="secondary" onClick={downloadFailedCSV}>
                      Download failed rows
                    </Button>
                    <Button onClick={reuploadFailed}>
                      Re-upload failed rows
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          {summary && (
            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Import Summary</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="border rounded p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900">{summary.total_rows}</div>
                  <div className="text-sm text-gray-600">Total Rows</div>
                </div>
                <div className="border rounded p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{summary.created}</div>
                  <div className="text-sm text-gray-600">Created</div>
                </div>
                <div className="border rounded p-4 text-center">
                  <div className="text-2xl font-bold text-amber-600">{summary.updated}</div>
                  <div className="text-sm text-gray-600">Updated</div>
                </div>
                <div className="border rounded p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">{summary.errors}</div>
                  <div className="text-sm text-gray-600">Errors</div>
                </div>
              </div>
            </div>
          )}

{results && results.length > 0 && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Import Results</h2>
              <div className="overflow-x-auto text-gray-900">
                <table className="min-w-full text-left text-sm border-collapse">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-3 border border-gray-300 bg-gray-100 font-semibold">Row</th>
                      <th className="p-3 border border-gray-300 bg-gray-100 font-semibold">SKU</th>
                      <th className="p-3 border border-gray-300 bg-gray-100 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, idx) => (
                      <tr key={idx} className="odd:bg-white even:bg-gray-50 hover:bg-gray-100">
                        <td className="p-3 border border-gray-300 font-medium">{r.row}</td>
                        <td className="p-3 border border-gray-300">{r.sku}</td>
                        <td className="p-3 border border-gray-300">
                          <span className={
                            r.status === 'error' ? 'text-red-600 font-semibold' :
                            r.status === 'updated' ? 'text-amber-700 font-semibold' :
                            r.status === 'created' ? 'text-green-700 font-semibold' :
                            'text-gray-700 font-semibold'
                          }>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
