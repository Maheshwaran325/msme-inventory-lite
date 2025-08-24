'use client';

import { useState } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  unit_price: number;
  version: number;
}

interface ConflictResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflictData: {
    resource: string;
    id: string;
    expected_version?: number;
    actual_version?: number;
    field?: string;
  };
  clientData: Product;
  onResolve: (resolution: 'keep-mine' | 'accept-remote' | 'merge-manual', mergedData?: Partial<Product>) => void;
  isPermissionError?: boolean;
}

export function ConflictResolutionModal({ 
  isOpen, 
  onClose, 
  conflictData, 
  clientData, 
  onResolve,
  isPermissionError = false
}: ConflictResolutionModalProps) {
  const [mergedData, setMergedData] = useState<Partial<Product>>({
    name: clientData.name,
    sku: clientData.sku,
    category: clientData.category,
    quantity: clientData.quantity,
    unit_price: clientData.unit_price
  });

  const handleKeepMine = () => {
    onResolve('keep-mine');
  };

  const handleAcceptRemote = () => {
    onResolve('accept-remote');
  };

  const handleMergeManual = () => {
    onResolve('merge-manual', mergedData);
  };

  const handleInputChange = (field: keyof Product, value: string | number) => {
    setMergedData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isPermissionError ? "Permission Error" : "Conflict Resolution"}>
      <div className="space-y-4">
        <div className={`border rounded-md p-4 ${isPermissionError ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
          <p className={`font-medium ${isPermissionError ? 'text-red-800' : 'text-yellow-800'}`}>
            {isPermissionError 
              ? 'Permission denied — staff cannot modify unit price'
              : 'Stale update — product has changed'
            }
          </p>
          {!isPermissionError && conflictData.expected_version && conflictData.actual_version && (
            <p className="text-yellow-700 text-sm mt-1">
              Expected version: {conflictData.expected_version}, Actual version: {conflictData.actual_version}
            </p>
          )}
          {isPermissionError && conflictData.field && (
            <p className="text-red-700 text-sm mt-1">
              Field: {conflictData.field}
            </p>
          )}
        </div>

        <div className="border rounded-md p-4">
          <h3 className="font-medium text-gray-900 mb-2">Your Changes</h3>
          <div className="space-y-2 text-sm">
            <p><span className="font-medium">Name:</span> {clientData.name}</p>
            <p><span className="font-medium">SKU:</span> {clientData.sku}</p>
            <p><span className="font-medium">Category:</span> {clientData.category}</p>
            <p><span className="font-medium">Quantity:</span> {clientData.quantity}</p>
            <p><span className="font-medium">Price:</span> ${clientData.unit_price.toFixed(2)}</p>
          </div>
        </div>

        {!isPermissionError && (
          <div className="border rounded-md p-4">
            <h3 className="font-medium text-gray-900 mb-2">Manual Merge</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={mergedData.name || ''}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">SKU</label>
                <input
                  type="text"
                  value={mergedData.sku || ''}
                  onChange={(e) => handleInputChange('sku', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <input
                  type="text"
                  value={mergedData.category || ''}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Quantity</label>
                <input
                  type="number"
                  value={mergedData.quantity || 0}
                  onChange={(e) => handleInputChange('quantity', Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Unit Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={mergedData.unit_price || 0}
                  onChange={(e) => handleInputChange('unit_price', Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-3">
          {isPermissionError ? (
            <>
              <Button variant="secondary" onClick={handleAcceptRemote}>
                Remove Price Change
              </Button>
              <Button onClick={handleKeepMine}>
                Keep Other Changes
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={handleKeepMine}>
                Keep Mine
              </Button>
              <Button variant="secondary" onClick={handleAcceptRemote}>
                Accept Remote
              </Button>
              <Button onClick={handleMergeManual}>
                Merge Manually
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
