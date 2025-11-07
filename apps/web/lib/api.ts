// Core API utilities for the BHIT Work OS application
export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string;
};

export type ApiError = {
  message: string;
  code?: string;
  status?: number;
  details?: Record<string, unknown>;
};

/**
 * Generic API request wrapper with error handling
 */
export async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const url = endpoint.startsWith('/') ? `${baseUrl}${endpoint}` : endpoint;

    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, defaultOptions);
    
    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    
    let data: unknown;
    if (isJson) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const errorData = data as { message?: string; code?: string } | string;
      const errorMessage = typeof errorData === 'object' && errorData.message
        ? errorData.message
        : typeof errorData === 'string'
        ? errorData
        : `HTTP ${response.status}: ${response.statusText}`;
      const errorCode = typeof errorData === 'object' && errorData.code
        ? errorData.code
        : response.status.toString();

      return {
        success: false,
        error: errorMessage,
        code: errorCode,
      };
    }

    // If the response data already has success/error structure, use it
    if (typeof data === 'object' && data !== null && 'success' in data) {
      return data as ApiResponse<T>;
    }

    // Otherwise wrap the data
    return {
      success: true,
      data: data as T,
    };
  } catch (error: unknown) {
    // API Request Error
    const errorMessage = error instanceof Error ? error.message : 'Network error occurred';
    return {
      success: false,
      error: errorMessage,
      code: 'NETWORK_ERROR',
    };
  }
}

/**
 * GET request helper
 */
export async function apiGet<T = unknown>(endpoint: string): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, { method: 'GET' });
}

/**
 * POST request helper
 */
export async function apiPost<T = unknown>(
  endpoint: string,
  data?: unknown
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * PUT request helper
 */
export async function apiPut<T = unknown>(
  endpoint: string,
  data?: unknown
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * PATCH request helper
 */
export async function apiPatch<T = unknown>(
  endpoint: string,
  data?: unknown
): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, {
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * DELETE request helper
 */
export async function apiDelete<T = unknown>(endpoint: string): Promise<ApiResponse<T>> {
  return apiRequest<T>(endpoint, { method: 'DELETE' });
}

/**
 * Upload file helper
 */
export async function uploadFile<T = unknown>(
  endpoint: string,
  file: File,
  additionalData?: Record<string, string>
): Promise<ApiResponse<T>> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }

    return apiRequest<T>(endpoint, {
      method: 'POST',
      body: formData,
      headers: {}, // Let the browser set Content-Type for FormData
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'File upload failed';
    return {
      success: false,
      error: errorMessage,
      code: 'UPLOAD_ERROR',
    };
  }
}

/**
 * API error handler for Next.js API routes
 */
export function handleApiError(error: unknown): ApiResponse {
  // API Error
  
  if (error instanceof Error) {
    return {
      success: false,
      error: error.message,
      code: (error as Error & { code?: string }).code || 'API_ERROR',
    };
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const err = error as { message: string; code?: string };
    return {
      success: false,
      error: err.message,
      code: err.code || 'API_ERROR',
    };
  }
  
  return {
    success: false,
    error: 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR',
  };
}

/**
 * API success response helper
 */
export function apiSuccess<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
  };
}

/**
 * API error response helper
 */
export function apiError(error: string, code?: string): ApiResponse {
  return {
    success: false,
    error,
    code,
  };
}

/**
 * Validate required fields
 */
export function validateRequiredFields(
  data: Record<string, unknown>,
  requiredFields: string[]
): { valid: boolean; missing?: string[] } {
  const missing: string[] = [];
  
  requiredFields.forEach((field) => {
    if (!data || data[field] === undefined || data[field] === null || data[field] === '') {
      missing.push(field);
    }
  });
  
  return {
    valid: missing.length === 0,
    missing: missing.length > 0 ? missing : undefined,
  };
}

/**
 * Retry helper for API calls
 */
export async function withRetry<T>(
  fn: () => Promise<ApiResponse<T>>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<ApiResponse<T>> {
  let lastError: ApiResponse<T> | Error | unknown;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      
      // If successful or it's a client error (4xx), don't retry
      if (result.success || (result.code && !result.code.startsWith('5'))) {
        return result;
      }
      
      lastError = result;
    } catch (error: unknown) {
      lastError = error;
    }
    
    // Don't delay after the last attempt
    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
    }
  }
  
  const getErrorMessage = (err: unknown): string => {
    if (err && typeof err === 'object' && 'error' in err) {
      return (err as { error: string }).error;
    }
    if (err instanceof Error) {
      return err.message;
    }
    if (err && typeof err === 'object' && 'message' in err) {
      return (err as { message: string }).message;
    }
    return 'Max retries exceeded';
  };

  const getErrorCode = (err: unknown): string => {
    if (err && typeof err === 'object' && 'code' in err) {
      return (err as { code: string }).code;
    }
    return 'MAX_RETRIES_EXCEEDED';
  };

  return {
    success: false,
    error: getErrorMessage(lastError),
    code: getErrorCode(lastError),
  };
}