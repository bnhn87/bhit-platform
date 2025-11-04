// Error handling utilities for BHIT Work OS
import React from 'react';

export class AppError extends Error {
  public code: string;
  public statusCode: number;
  public isOperational: boolean;

  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    statusCode: number = 500,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, field?: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
    if (field) {
      this.message = `${field}: ${message}`;
    }
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTHENTICATION_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 'AUTHORIZATION_ERROR', 403);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT_ERROR', 409);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 'RATE_LIMIT_ERROR', 429);
    this.name = 'RateLimitError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, originalError?: Error) {
    super(message, 'DATABASE_ERROR', 500);
    this.name = 'DatabaseError';
    if (originalError) {
      this.stack = originalError.stack;
    }
  }
}

export class ExternalServiceError extends AppError {
  public service: string;

  constructor(service: string, message: string, statusCode: number = 502) {
    super(`${service}: ${message}`, 'EXTERNAL_SERVICE_ERROR', statusCode);
    this.name = 'ExternalServiceError';
    this.service = service;
  }
}

// Error type guards
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

export function isAuthError(error: unknown): error is AuthenticationError | AuthorizationError {
  return error instanceof AuthenticationError || error instanceof AuthorizationError;
}

// Error formatting utilities
export function formatError(error: unknown): {
  message: string;
  code: string;
  statusCode: number;
  stack?: string;
} {
  if (isAppError(error)) {
    return {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    };
  }

  // Handle Supabase errors
  const errorObj = error as { code?: string; message?: string };
  if (errorObj?.code === 'PGRST116') {
    return {
      message: 'Resource not found',
      code: 'NOT_FOUND',
      statusCode: 404,
    };
  }

  if (errorObj?.code?.startsWith('23')) {
    return {
      message: 'Database constraint violation',
      code: 'CONSTRAINT_ERROR',
      statusCode: 400,
    };
  }

  // Default error format
  return {
    message: errorObj?.message || 'An unexpected error occurred',
    code: errorObj?.code || 'UNKNOWN_ERROR',
    statusCode: (errorObj as { statusCode?: number }).statusCode || 500,
    stack: process.env.NODE_ENV === 'development' ? (errorObj as { stack?: string }).stack : undefined,
  };
}

// Async error wrapper
export function asyncHandler<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error: unknown) {
      // Log the error
      console.error('Async handler error:', error);
      throw error;
    }
  };
}

// Error boundary helper for React components
export function withErrorBoundary<T extends Record<string, unknown>>(
  Component: React.ComponentType<T>,
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>
) {
  return function WrappedComponent(props: T) {
    try {
      return React.createElement(Component, props);
    } catch (error: unknown) {
      console.error('Component error:', error);
      
      if (fallback) {
        return React.createElement(fallback, {
          error: error as Error,
          retry: () => window.location.reload(),
        });
      }

      return React.createElement('div', {
        className: 'error-boundary p-4 border border-red-300 bg-red-50 text-red-800 rounded',
      }, 'Something went wrong. Please refresh the page.');
    }
  };
}

// Validation helpers
export function validateRequired(value: unknown, fieldName: string): void {
  if (value === undefined || value === null || value === '') {
    throw new ValidationError(`${fieldName} is required`);
  }
}

export function validateEmail(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError('Invalid email format', 'email');
  }
}

export function validateLength(
  value: string, 
  min: number, 
  max: number, 
  fieldName: string
): void {
  if (value.length < min) {
    throw new ValidationError(`${fieldName} must be at least ${min} characters`);
  }
  if (value.length > max) {
    throw new ValidationError(`${fieldName} must be no more than ${max} characters`);
  }
}

export function validateEnum<T extends string>(
  value: string,
  allowedValues: readonly T[],
  fieldName: string
): asserts value is T {
  if (!allowedValues.includes(value as T)) {
    throw new ValidationError(
      `${fieldName} must be one of: ${allowedValues.join(', ')}`
    );
  }
}

// Error reporting (placeholder for future integration with error tracking service)
export function reportError(error: unknown, context?: Record<string, unknown>): void {
  // In development, just log to console
  if (process.env.NODE_ENV === 'development') {
    console.error('Error reported:', error, context);
    return;
  }

  // In production, this would integrate with services like Sentry, Bugsnag, etc.
  // For now, just log to console
  console.error('Production error:', {
    error: formatError(error),
    context,
    timestamp: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
  });
}