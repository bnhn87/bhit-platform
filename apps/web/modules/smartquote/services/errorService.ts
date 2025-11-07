/**
 * Enhanced Error Handling for SmartQuote
 * 
 * Provides centralized error tracking, user-friendly messages,
 * and recovery mechanisms for common failure scenarios.
 */

export enum ErrorCategory {
  PARSING = 'parsing',
  CALCULATION = 'calculation',
  DATABASE = 'database',
  VALIDATION = 'validation',
  API = 'api',
  NETWORK = 'network',
  UNKNOWN = 'unknown'
}

export interface SmartQuoteError {
  category: ErrorCategory;
  message: string;
  userMessage: string;
  originalError?: Error;
  timestamp: Date;
  recoverable: boolean;
  recoveryAction?: string;
}

export class ErrorHandler {
  private static errorLog: SmartQuoteError[] = [];
  private static maxLogSize = 100;

  /**
   * Handle an error and return a user-friendly SmartQuoteError
   */
  static handle(error: unknown, category: ErrorCategory, context?: string): SmartQuoteError {
    const timestamp = new Date();
    const originalError = error instanceof Error ? error : new Error(String(error));
    
    const smartError: SmartQuoteError = {
      category,
      message: originalError.message,
      userMessage: this.getUserMessage(category, originalError, context),
      originalError,
      timestamp,
      recoverable: this.isRecoverable(category, originalError),
      recoveryAction: this.getRecoveryAction(category, originalError)
    };

    // Log error (keep last 100)
    this.errorLog.push(smartError);
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }

    // Send to external logging service (if configured)
    this.sendToLogService(smartError);

    return smartError;
  }

  /**
   * Get user-friendly error message
   */
  private static getUserMessage(category: ErrorCategory, error: Error, context?: string): string {
    // Check for specific error patterns
    if (error.message.includes('API key')) {
      return 'AI service is not configured. Please contact your administrator.';
    }
    
    if (error.message.includes('fetch failed') || error.message.includes('NetworkError')) {
      return 'Network connection lost. Please check your internet and try again.';
    }

    if (error.message.includes('prepared_by') || error.message.includes('column')) {
      return 'Database structure issue detected. Please contact support with error code: DB-SCHEMA';
    }

    // Category-specific messages
    switch (category) {
      case ErrorCategory.PARSING:
        return `Failed to parse document${context ? ` (${context})` : ''}. Please ensure the document contains valid product information with codes and quantities.`;
      
      case ErrorCategory.CALCULATION:
        return 'Failed to calculate quote. Please check that all product details are valid and try again.';
      
      case ErrorCategory.DATABASE:
        return 'Failed to save quote. Your data is safe in your browser, but we couldn\'t sync to the server. Try again in a moment.';
      
      case ErrorCategory.VALIDATION:
        return `Validation failed${context ? `: ${context}` : ''}. Please check your input and try again.`;
      
      case ErrorCategory.API:
        return 'AI service temporarily unavailable. Please try again in a moment.';
      
      case ErrorCategory.NETWORK:
        return 'Network connection issue. Please check your internet connection and try again.';
      
      default:
        return `An unexpected error occurred${context ? ` (${context})` : ''}. Please try again or contact support if the problem persists.`;
    }
  }

  /**
   * Determine if error is recoverable
   */
  private static isRecoverable(category: ErrorCategory, error: Error): boolean {
    // Network and API errors are usually temporary
    if (category === ErrorCategory.NETWORK || category === ErrorCategory.API) {
      return true;
    }

    // Database errors may be recoverable (fallback to localStorage)
    if (category === ErrorCategory.DATABASE) {
      return true;
    }

    // Validation errors are recoverable (user can fix input)
    if (category === ErrorCategory.VALIDATION) {
      return true;
    }

    // Config/schema errors are not recoverable by user
    if (error.message.includes('API key') || error.message.includes('column')) {
      return false;
    }

    // Most other errors might be recoverable
    return true;
  }

  /**
   * Get suggested recovery action
   */
  private static getRecoveryAction(category: ErrorCategory, error: Error): string | undefined {
    if (error.message.includes('API key')) {
      return 'Contact your administrator to configure the AI service.';
    }

    if (error.message.includes('Network') || category === ErrorCategory.NETWORK) {
      return 'Check your internet connection and try again.';
    }

    if (category === ErrorCategory.DATABASE) {
      return 'Your quote is saved locally. Try saving again when connection is restored.';
    }

    if (category === ErrorCategory.VALIDATION) {
      return 'Please review and correct the highlighted fields.';
    }

    if (category === ErrorCategory.PARSING) {
      return 'Try uploading a different file format or check that the document contains product codes.';
    }

    return 'Please try again. If the problem persists, contact support.';
  }

  /**
   * Send error to external logging service
   */
  private static sendToLogService(error: SmartQuoteError): void {
    // Only log in production
    if (process.env.NODE_ENV !== 'production') {
      console.error('[SmartQuote Error]', {
        category: error.category,
        message: error.message,
        timestamp: error.timestamp,
        recoverable: error.recoverable
      });
      return;
    }

    // In production, send to logging service (Sentry, LogRocket, etc.)
    try {
      // Example: window.Sentry?.captureException(error.originalError);
      // Or send to custom endpoint
      console.error('[SmartQuote Error]', error);
    } catch {
      // Fail silently if logging service unavailable
    }
  }

  /**
   * Get recent error history (for debugging)
   */
  static getErrorLog(): SmartQuoteError[] {
    return [...this.errorLog];
  }

  /**
   * Clear error log
   */
  static clearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * Check if an error is a specific type
   */
  static isNetworkError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    return error.message.includes('fetch failed') || 
           error.message.includes('NetworkError') ||
           error.message.includes('Failed to fetch');
  }

  static isDatabaseError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    return error.message.includes('database') ||
           error.message.includes('supabase') ||
           error.message.includes('column') ||
           error.message.includes('relation');
  }

  static isValidationError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    return error.message.includes('validation') ||
           error.message.includes('required') ||
           error.message.includes('invalid');
  }
}

/**
 * Validation helpers
 */
export class QuoteValidator {
  static validateQuoteDetails(details: {
    client?: string;
    project?: string;
    quoteRef?: string;
  }): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!details.client || details.client.trim().length === 0) {
      errors.push('Client name is required');
    }

    if (!details.project || details.project.trim().length === 0) {
      errors.push('Project name is required');
    }

    if (details.quoteRef && details.quoteRef.length > 50) {
      errors.push('Quote reference is too long (max 50 characters)');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  static validateProduct(product: {
    productCode?: string;
    quantity?: number;
    timePerUnit?: number;
  }): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!product.productCode || product.productCode.trim().length === 0) {
      errors.push('Product code is required');
    }

    if (product.quantity === undefined || product.quantity <= 0) {
      errors.push('Quantity must be greater than 0');
    }

    if (product.timePerUnit !== undefined && product.timePerUnit < 0) {
      errors.push('Time per unit cannot be negative');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

/**
 * Retry helper for transient errors
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    delayMs?: number;
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): Promise<T> {
  const { maxRetries = 3, delayMs = 1000, onRetry } = options;

  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry if it's not a network/temporary error
      if (!ErrorHandler.isNetworkError(error) && attempt > 0) {
        throw lastError;
      }

      if (attempt < maxRetries - 1) {
        onRetry?.(attempt + 1, lastError);
        await new Promise(resolve => setTimeout(resolve, delayMs * (attempt + 1)));
      }
    }
  }

  throw lastError!;
}