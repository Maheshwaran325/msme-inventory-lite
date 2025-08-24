
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className = '', 
    variant = 'primary', 
    size = 'md',
    loading = false,
    disabled,
    children,
    ...props 
  }, ref) => {
    
    const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed';

    const sizeClasses = {
      sm: 'h-8 px-3 text-xs rounded-md',
      md: 'h-10 px-4 py-2 text-sm rounded-md',
      lg: 'h-12 px-6 py-3 text-base rounded-lg',
    };

    const variantClasses = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500 shadow-sm hover:shadow-md',
      secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus-visible:ring-gray-500 border border-gray-300',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 shadow-sm hover:shadow-md',
      outline: 'bg-transparent text-gray-700 hover:bg-gray-50 focus-visible:ring-gray-500 border border-gray-300',
      ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus-visible:ring-gray-500',
    };

    const isDisabled = disabled || loading;

    return (
      <button
        className={`
          ${baseClasses} 
          ${sizeClasses[size]} 
          ${variantClasses[variant]} 
          ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}
          ${className}
        `.trim()}
        ref={ref}
        disabled={isDisabled}
        {...props}
      >
        {loading && (
          <svg 
            className="animate-spin -ml-1 mr-2 h-4 w-4" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
