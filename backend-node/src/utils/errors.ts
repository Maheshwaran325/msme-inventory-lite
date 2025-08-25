import { Response } from 'express';

export interface ErrorDetails {
  resource?: string;
  id?: string;
  field?: string;
  expected_version?: number;
  actual_version?: number;
  allowed_types?: string[];
  max_size?: string;
  [key: string]: any;
}

export interface ApiError {
  code: string;
  message: string;
  details?: ErrorDetails;
}

export interface ApiErrorResponse {
  error: ApiError;
}

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: ErrorDetails;

  constructor(code: string, message: string, statusCode: number, details?: ErrorDetails) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'AppError';
  }
}

// Predefined error types
export const ErrorTypes = {
  // 400 Bad Request
  VALIDATION_ERROR: (message: string, details?: ErrorDetails) => 
    new AppError('VALIDATION_ERROR', message, 400, details),
  
  // 401 Unauthorized
  UNAUTHORIZED: (message: string = 'Authentication required') => 
    new AppError('UNAUTHORIZED', message, 401),
  
  // 403 Forbidden
  PERMISSION_DENIED: (message: string, details?: ErrorDetails) => 
    new AppError('PERMISSION_DENIED', message, 403, details),
  
  PERMISSION_EDIT_PRICE: (productId: string) => 
    new AppError('PERMISSION_EDIT_PRICE', 'Staff members cannot modify unit price', 403, {
      resource: 'product',
      id: productId,
      field: 'unit_price'
    }),
  
  // 404 Not Found
  NOT_FOUND: (resource: string, id: string) => 
    new AppError('NOT_FOUND', `${resource} not found`, 404, {
      resource: resource.toLowerCase(),
      id
    }),
  
  // 409 Conflict
  CONFLICT: (resource: string, id: string, expectedVersion: number, actualVersion: number) => 
    new AppError('CONFLICT', 'Stale update — product has changed', 409, {
      resource: resource.toLowerCase(),
      id,
      expected_version: expectedVersion,
      actual_version: actualVersion
    }),
  
  // 500 Internal Server Error
  INTERNAL_ERROR: (message: string = 'An unexpected error occurred') => 
    new AppError('INTERNAL_ERROR', message, 500),
  
  DATABASE_ERROR: (message: string) => 
    new AppError('DATABASE_ERROR', message, 500)
};

// Error response helper
export const sendErrorResponse = (res: Response, error: AppError | Error): void => {
  if (error instanceof AppError) {
    const response: ApiErrorResponse = {
      error: {
        code: error.code,
        message: error.message,
        ...(error.details && { details: error.details })
      }
    };
    
    res.status(error.statusCode).json(response);
  } else {
    // Handle unexpected errors
    const response: ApiErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred'
      }
    };
    
    res.status(500).json(response);
  }
};

// Supabase error mapper
export const mapSupabaseError = (error: any, resource: string = 'resource', id?: string): AppError => {
  // Handle common Supabase error codes
  if (error.code === 'PGRST116') {
    // No rows returned
    return ErrorTypes.NOT_FOUND(resource, id || 'unknown');
  }
  
  if (error.code === '23505') {
    // Unique constraint violation
    return ErrorTypes.VALIDATION_ERROR('Duplicate entry detected', {
      resource,
      constraint: 'unique'
    });
  }
  
  if (error.code === '23503') {
    // Foreign key constraint violation
    return ErrorTypes.VALIDATION_ERROR('Referenced record does not exist', {
      resource,
      constraint: 'foreign_key'
    });
  }
  
  if (error.code === '23502') {
    // Not null constraint violation
    return ErrorTypes.VALIDATION_ERROR('Required field is missing', {
      resource,
      constraint: 'not_null'
    });
  }
  
  // Default to internal error for unmapped errors
  return ErrorTypes.DATABASE_ERROR(error.message || 'Database operation failed');
};