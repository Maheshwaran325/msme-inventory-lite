
'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md' 
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div 
        ref={modalRef}
        className={`relative w-full ${sizeClasses[size]} bg-white rounded-xl shadow-2xl border border-gray-200 transform transition-all duration-300 ease-out`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
          <h3 
            id="modal-title" 
            className="text-xl font-semibold text-gray-900 leading-tight"
          >
            {title}
          </h3>
          <button 
            onClick={onClose} 
            className="p-2 rounded-lg hover:bg-gray-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
            aria-label="Close modal"
            type="button"
          >
            <X className="w-5 h-5 text-gray-500 hover:text-gray-700 transition-colors" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 pt-4">
          <div className="text-gray-700">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export { Modal };
