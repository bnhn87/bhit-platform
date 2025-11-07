/**
 * Safe JSON parsing utilities with proper error handling
 */

export interface SafeJsonResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
}

/**
 * Safely parse JSON string with error handling
 * @param jsonString - The JSON string to parse
 * @param defaultValue - Optional default value to return on error
 * @returns Parsed data or default value
 */
export function safeJsonParse<T = unknown>(
  jsonString: string,
  defaultValue?: T
): T | undefined {
  try {
    return JSON.parse(jsonString) as T;
  } catch (error: unknown) {
    console.error('[safeJsonParse] Failed to parse JSON:', error);
    return defaultValue;
  }
}

/**
 * Safely parse JSON string with detailed result
 * @param jsonString - The JSON string to parse
 * @returns Result object with success status, data, or error
 */
export function safeJsonParseWithResult<T = unknown>(
  jsonString: string
): SafeJsonResult<T> {
  try {
    const data = JSON.parse(jsonString) as T;
    return { success: true, data };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}

/**
 * Safely parse JSON from localStorage
 * @param key - localStorage key
 * @param defaultValue - Optional default value to return on error or missing key
 * @returns Parsed data or default value
 */
export function safeLocalStorageParse<T = unknown>(
  key: string,
  defaultValue?: T
): T | undefined {
  if (typeof window === 'undefined') {
    return defaultValue;
  }

  try {
    const item = localStorage.getItem(key);
    if (!item) {
      return defaultValue;
    }
    return JSON.parse(item) as T;
  } catch (error: unknown) {
    console.error(`[safeLocalStorageParse] Failed to parse localStorage key "${key}":`, error);
    return defaultValue;
  }
}

/**
 * Safely stringify object to JSON
 * @param data - Data to stringify
 * @param defaultValue - Optional default value to return on error
 * @returns JSON string or default value
 */
export function safeJsonStringify(
  data: unknown,
  defaultValue: string = '{}'
): string {
  try {
    return JSON.stringify(data);
  } catch (error: unknown) {
    console.error('[safeJsonStringify] Failed to stringify data:', error);
    return defaultValue;
  }
}
