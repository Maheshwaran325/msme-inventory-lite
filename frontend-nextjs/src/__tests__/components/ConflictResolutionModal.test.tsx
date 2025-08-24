import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConflictResolutionModal } from '../../components/ConflictResolutionModal';

const mockConflictData = {
  resource: 'product',
  id: '1',
  expected_version: 1,
  actual_version: 3
};

const mockClientData = {
  id: '1',
  name: 'Test Product',
  sku: 'TEST-001',
  category: 'Test Category',
  quantity: 10,
  unit_price: 9.99,
  version: 1
};

const mockOnResolve = jest.fn();
const mockOnClose = jest.fn();

describe('ConflictResolutionModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render conflict modal with correct information', () => {
    render(
      <ConflictResolutionModal
        isOpen={true}
        onClose={mockOnClose}
        conflictData={mockConflictData}
        clientData={mockClientData}
        onResolve={mockOnResolve}
      />
    );

    expect(screen.getByText('Conflict Resolution')).toBeInTheDocument();
    expect(screen.getByText('Stale update — product has changed')).toBeInTheDocument();
    expect(screen.getByText('Expected version: 1, Actual version: 3')).toBeInTheDocument();
  });

  it('should display client data correctly', () => {
    render(
      <ConflictResolutionModal
        isOpen={true}
        onClose={mockOnClose}
        conflictData={mockConflictData}
        clientData={mockClientData}
        onResolve={mockOnResolve}
      />
    );

    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('TEST-001')).toBeInTheDocument();
    expect(screen.getByText('Test Category')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('$9.99')).toBeInTheDocument();
  });

  it('should handle "Keep Mine" resolution', async () => {
    const user = userEvent.setup();
    
    render(
      <ConflictResolutionModal
        isOpen={true}
        onClose={mockOnClose}
        conflictData={mockConflictData}
        clientData={mockClientData}
        onResolve={mockOnResolve}
      />
    );

    await user.click(screen.getByRole('button', { name: /keep mine/i }));
    
    expect(mockOnResolve).toHaveBeenCalledWith('keep-mine');
  });

  it('should handle "Accept Remote" resolution', async () => {
    const user = userEvent.setup();
    
    render(
      <ConflictResolutionModal
        isOpen={true}
        onClose={mockOnClose}
        conflictData={mockConflictData}
        clientData={mockClientData}
        onResolve={mockOnResolve}
      />
    );

    await user.click(screen.getByRole('button', { name: /accept remote/i }));
    
    expect(mockOnResolve).toHaveBeenCalledWith('accept-remote');
  });

  it('should handle "Merge Manually" resolution with form data', async () => {
    const user = userEvent.setup();
    
    render(
      <ConflictResolutionModal
        isOpen={true}
        onClose={mockOnClose}
        conflictData={mockConflictData}
        clientData={mockClientData}
        onResolve={mockOnResolve}
      />
    );

    // Modify the merged data
    const nameInput = screen.getByDisplayValue('Test Product');
    await user.clear(nameInput);
    await user.type(nameInput, 'Merged Product');

    const quantityInput = screen.getByDisplayValue('10');
    await user.clear(quantityInput);
    await user.type(quantityInput, '25');

    await user.click(screen.getByRole('button', { name: /merge manually/i }));
    
    expect(mockOnResolve).toHaveBeenCalledWith('merge-manual', {
      name: 'Merged Product',
      sku: 'TEST-001',
      category: 'Test Category',
      quantity: 25,
      unit_price: 9.99
    });
  });

  it('should handle form input changes', async () => {
    const user = userEvent.setup();
    
    render(
      <ConflictResolutionModal
        isOpen={true}
        onClose={mockOnClose}
        conflictData={mockConflictData}
        clientData={mockClientData}
        onResolve={mockOnResolve}
      />
    );

    const nameInput = screen.getByDisplayValue('Test Product');
    await user.clear(nameInput);
    await user.type(nameInput, 'New Product Name');

    const priceInput = screen.getByDisplayValue('9.99');
    await user.clear(priceInput);
    await user.type(priceInput, '15.99');

    await user.click(screen.getByRole('button', { name: /merge manually/i }));
    
    expect(mockOnResolve).toHaveBeenCalledWith('merge-manual', {
      name: 'New Product Name',
      sku: 'TEST-001',
      category: 'Test Category',
      quantity: 10,
      unit_price: 15.99
    });
  });

  it('should call onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <ConflictResolutionModal
        isOpen={true}
        onClose={mockOnClose}
        conflictData={mockConflictData}
        clientData={mockClientData}
        onResolve={mockOnResolve}
      />
    );

    // Find and click the close button
    const closeButton = screen.getByRole('button', { name: /close/i }) || 
                       screen.getByLabelText('Close') ||
                       screen.getByText('×');
    
    await user.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should not render when isOpen is false', () => {
    render(
      <ConflictResolutionModal
        isOpen={false}
        onClose={mockOnClose}
        conflictData={mockConflictData}
        clientData={mockClientData}
        onResolve={mockOnResolve}
      />
    );

    expect(screen.queryByText('Conflict Resolution')).not.toBeInTheDocument();
  });

  it('should display all three resolution buttons', () => {
    render(
      <ConflictResolutionModal
        isOpen={true}
        onClose={mockOnClose}
        conflictData={mockConflictData}
        clientData={mockClientData}
        onResolve={mockOnResolve}
      />
    );

    expect(screen.getByRole('button', { name: /keep mine/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /accept remote/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /merge manually/i })).toBeInTheDocument();
  });

  it('should show manual merge form fields', () => {
    render(
      <ConflictResolutionModal
        isOpen={true}
        onClose={mockOnClose}
        conflictData={mockConflictData}
        clientData={mockClientData}
        onResolve={mockOnResolve}
      />
    );

    expect(screen.getByDisplayValue('Test Product')).toBeInTheDocument();
    expect(screen.getByDisplayValue('TEST-001')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Category')).toBeInTheDocument();
    expect(screen.getByDisplayValue('10')).toBeInTheDocument();
    expect(screen.getByDisplayValue('9.99')).toBeInTheDocument();
  });
});
