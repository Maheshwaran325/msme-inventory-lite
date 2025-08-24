import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductForm } from '../../components/ProductForm';
import { AuthProvider } from '../../lib/authContext';

// Mock the auth context
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  role: 'owner'
};

const mockAuthContext = {
  user: mockUser,
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  loading: false,
};

jest.mock('../../lib/authContext', () => ({
  useAuth: () => mockAuthContext,
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('../../lib/supabaseClient', () => ({
  getSessionToken: jest.fn(() => 'mock-token'),
}));

const renderWithAuth = (component: React.ReactElement) => {
  return render(
    <AuthProvider>
      {component}
    </AuthProvider>
  );
};

describe('ProductForm', () => {
  const mockProduct = {
    id: '1',
    name: 'Test Product',
    sku: 'TEST-001',
    category: 'Test Category',
    quantity: 10,
    unit_price: 9.99,
    version: 1
  };

  const mockOnFinished = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  describe('Conflict Resolution Modal', () => {
    it('should show conflict modal when server returns 409 CONFLICT', async () => {
      const user = userEvent.setup();
      
      // Mock fetch to return 409 conflict
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({
          error: {
            code: 'CONFLICT',
            message: 'Stale update — product has changed',
            details: {
              resource: 'product',
              id: '1',
              expected_version: 1,
              actual_version: 3
            }
          }
        })
      });

      renderWithAuth(
        <ProductForm product={mockProduct} onFinished={mockOnFinished} />
      );

      // Fill form
      await user.type(screen.getByLabelText(/name/i), 'Updated Product');
      await user.type(screen.getByLabelText(/sku/i), 'TEST-001');
      await user.type(screen.getByLabelText(/category/i), 'Updated Category');
      await user.type(screen.getByLabelText(/quantity/i), '15');
      await user.type(screen.getByLabelText(/unit price/i), '12.99');

      // Submit form
      await user.click(screen.getByRole('button', { name: /save/i }));

      // Wait for conflict modal to appear
      await waitFor(() => {
        expect(screen.getByText('Conflict Resolution')).toBeInTheDocument();
      });

      // Check conflict details
      expect(screen.getByText('Stale update — product has changed')).toBeInTheDocument();
      expect(screen.getByText(/Expected version: 1, Actual version: 3/)).toBeInTheDocument();
    });

    it('should show permission error when staff tries to modify unit price', async () => {
      const user = userEvent.setup();
      
      // Mock staff user
      mockAuthContext.user.role = 'staff';
      
      // Mock fetch to return 403 permission error
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          error: {
            code: 'PERMISSION_EDIT_PRICE',
            message: 'Staff members cannot modify unit price',
            details: {
              resource: 'product',
              id: '1',
              field: 'unit_price'
            }
          }
        })
      });

      renderWithAuth(
        <ProductForm product={mockProduct} onFinished={mockOnFinished} />
      );

      // Fill form
      await user.type(screen.getByLabelText(/name/i), 'Updated Product');
      await user.type(screen.getByLabelText(/quantity/i), '15');
      await user.type(screen.getByLabelText(/unit price/i), '12.99');

      // Submit form
      await user.click(screen.getByRole('button', { name: /save/i }));

      // Wait for error message
      await waitFor(() => {
        expect(screen.getByText('Staff members cannot modify unit price')).toBeInTheDocument();
      });
    });

    it('should handle "Keep Mine" resolution', async () => {
      const user = userEvent.setup();
      
      // Mock initial conflict
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 409,
          json: async () => ({
            error: {
              code: 'CONFLICT',
              message: 'Stale update — product has changed',
              details: {
                resource: 'product',
                id: '1',
                expected_version: 1,
                actual_version: 3
              }
            }
          })
        })
        // Mock successful resolution
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: [{ ...mockProduct, version: 4 }]
          })
        });

      renderWithAuth(
        <ProductForm product={mockProduct} onFinished={mockOnFinished} />
      );

      // Fill and submit form to trigger conflict
      await user.type(screen.getByLabelText(/name/i), 'Updated Product');
      await user.click(screen.getByRole('button', { name: /save/i }));

      // Wait for conflict modal
      await waitFor(() => {
        expect(screen.getByText('Conflict Resolution')).toBeInTheDocument();
      });

      // Click "Keep Mine"
      await user.click(screen.getByRole('button', { name: /keep mine/i }));

      // Verify onFinished was called
      await waitFor(() => {
        expect(mockOnFinished).toHaveBeenCalled();
      });
    });

    it('should handle "Accept Remote" resolution', async () => {
      const user = userEvent.setup();
      
      // Mock initial conflict
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 409,
          json: async () => ({
            error: {
              code: 'CONFLICT',
              message: 'Stale update — product has changed',
              details: {
                resource: 'product',
                id: '1',
                expected_version: 1,
                actual_version: 3
              }
            }
          })
        })
        // Mock fetch current product data
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: { ...mockProduct, version: 3, name: 'Remote Updated Product' }
          })
        });

      renderWithAuth(
        <ProductForm product={mockProduct} onFinished={mockOnFinished} />
      );

      // Fill and submit form to trigger conflict
      await user.type(screen.getByLabelText(/name/i), 'Updated Product');
      await user.click(screen.getByRole('button', { name: /save/i }));

      // Wait for conflict modal
      await waitFor(() => {
        expect(screen.getByText('Conflict Resolution')).toBeInTheDocument();
      });

      // Click "Accept Remote"
      await user.click(screen.getByRole('button', { name: /accept remote/i }));

      // Verify form was updated with remote data
      await waitFor(() => {
        expect(screen.getByDisplayValue('Remote Updated Product')).toBeInTheDocument();
      });
    });

    it('should handle "Merge Manually" resolution', async () => {
      const user = userEvent.setup();
      
      // Mock initial conflict
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 409,
          json: async () => ({
            error: {
              code: 'CONFLICT',
              message: 'Stale update — product has changed',
              details: {
                resource: 'product',
                id: '1',
                expected_version: 1,
                actual_version: 3
              }
            }
          })
        })
        // Mock successful merge
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: [{ ...mockProduct, version: 4, name: 'Merged Product' }]
          })
        });

      renderWithAuth(
        <ProductForm product={mockProduct} onFinished={mockOnFinished} />
      );

      // Fill and submit form to trigger conflict
      await user.type(screen.getByLabelText(/name/i), 'Updated Product');
      await user.click(screen.getByRole('button', { name: /save/i }));

      // Wait for conflict modal
      await waitFor(() => {
        expect(screen.getByText('Conflict Resolution')).toBeInTheDocument();
      });

      // Modify merged data
      await user.clear(screen.getByDisplayValue('Updated Product'));
      await user.type(screen.getByDisplayValue('Updated Product'), 'Merged Product');

      // Click "Merge Manually"
      await user.click(screen.getByRole('button', { name: /merge manually/i }));

      // Verify onFinished was called
      await waitFor(() => {
        expect(mockOnFinished).toHaveBeenCalled();
      });
    });
  });

  describe('Role-based Constraints', () => {
    it('should disable unit price field for staff users', () => {
      mockAuthContext.user.role = 'staff';
      
      renderWithAuth(
        <ProductForm product={mockProduct} onFinished={mockOnFinished} />
      );

      const unitPriceField = screen.getByLabelText(/unit price/i);
      expect(unitPriceField).toBeDisabled();
      expect(unitPriceField).toHaveClass('bg-gray-100', 'cursor-not-allowed');
    });

    it('should show read-only indicator for staff users', () => {
      mockAuthContext.user.role = 'staff';
      
      renderWithAuth(
        <ProductForm product={mockProduct} onFinished={mockOnFinished} />
      );

      expect(screen.getByText('(Read-only for staff)')).toBeInTheDocument();
    });

    it('should allow unit price modification for owner users', () => {
      mockAuthContext.user.role = 'owner';
      
      renderWithAuth(
        <ProductForm product={mockProduct} onFinished={mockOnFinished} />
      );

      const unitPriceField = screen.getByLabelText(/unit price/i);
      expect(unitPriceField).not.toBeDisabled();
      expect(unitPriceField).not.toHaveClass('bg-gray-100', 'cursor-not-allowed');
    });
  });

  describe('Form Validation', () => {
    it('should show validation errors for required fields', async () => {
      const user = userEvent.setup();
      
      renderWithAuth(
        <ProductForm product={null} onFinished={mockOnFinished} />
      );

      // Try to submit empty form
      await user.click(screen.getByRole('button', { name: /save/i }));

      // Check that form validation prevents submission
      expect(screen.getByLabelText(/name/i)).toBeRequired();
      expect(screen.getByLabelText(/sku/i)).toBeRequired();
    });

    it('should successfully submit form with valid data', async () => {
      const user = userEvent.setup();
      
      // Mock successful submission
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: [mockProduct]
        })
      });

      renderWithAuth(
        <ProductForm product={null} onFinished={mockOnFinished} />
      );

      // Fill form with valid data
      await user.type(screen.getByLabelText(/name/i), 'New Product');
      await user.type(screen.getByLabelText(/sku/i), 'NEW-001');
      await user.type(screen.getByLabelText(/category/i), 'New Category');
      await user.type(screen.getByLabelText(/quantity/i), '20');
      await user.type(screen.getByLabelText(/unit price/i), '15.99');

      // Submit form
      await user.click(screen.getByRole('button', { name: /save/i }));

      // Verify onFinished was called
      await waitFor(() => {
        expect(mockOnFinished).toHaveBeenCalled();
      });
    });
  });
});
