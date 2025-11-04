/**
 * Safe Parsing Utilities
 *
 * Provides safe wrappers for parsing operations that can fail
 */

/**
 * Safely parse JSON with error handling
 * Returns parsed data or null on failure
 */
export function safeJsonParse<T = unknown>(jsonString: string): T | null {
  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.error('[safeJsonParse] Failed to parse JSON:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

/**
 * Safely parse JSON with default value
 * Returns parsed data or default value on failure
 */
export function safeJsonParseWithDefault<T>(jsonString: string, defaultValue: T): T {
  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.error('[safeJsonParseWithDefault] Failed to parse JSON, using default:', error instanceof Error ? error.message : String(error));
    return defaultValue;
  }
}

/**
 * Safely parse JSON and validate the result
 * Returns parsed data or null on failure or invalid result
 */
export function safeJsonParseWithValidation<T>(
  jsonString: string,
  validator: (data: unknown) => data is T
): T | null {
  try {
    const parsed = JSON.parse(jsonString);
    if (validator(parsed)) {
      return parsed;
    }
    console.error('[safeJsonParseWithValidation] Parsed data failed validation');
    return null;
  } catch (error) {
    console.error('[safeJsonParseWithValidation] Failed to parse JSON:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

/**
 * Safely parse an integer from a string
 * Returns the parsed number or null if invalid
 */
export function safeParseInt(value: string | null | undefined): number | null {
  if (value == null || value === '') {
    return null;
  }

  const parsed = parseInt(value, 10);

  if (isNaN(parsed)) {
    return null;
  }

  return parsed;
}

/**
 * Safely parse an integer with a default value
 * Returns the parsed number or default value if invalid
 */
export function safeParseIntWithDefault(
  value: string | null | undefined,
  defaultValue: number
): number {
  const parsed = safeParseInt(value);
  return parsed !== null ? parsed : defaultValue;
}

/**
 * Safely parse an integer with min/max bounds
 * Returns the parsed number clamped to bounds, or null if invalid
 */
export function safeParseIntWithBounds(
  value: string | null | undefined,
  min: number,
  max: number
): number | null {
  const parsed = safeParseInt(value);

  if (parsed === null) {
    return null;
  }

  return Math.max(min, Math.min(max, parsed));
}

/**
 * Safely parse a float from a string
 * Returns the parsed number or null if invalid
 */
export function safeParseFloat(value: string | null | undefined): number | null {
  if (value == null || value === '') {
    return null;
  }

  const parsed = parseFloat(value);

  if (isNaN(parsed)) {
    return null;
  }

  return parsed;
}

/**
 * Safely parse a float with a default value
 * Returns the parsed number or default value if invalid
 */
export function safeParseFloatWithDefault(
  value: string | null | undefined,
  defaultValue: number
): number {
  const parsed = safeParseFloat(value);
  return parsed !== null ? parsed : defaultValue;
}

/**
 * Safely parse a boolean from various inputs
 * Accepts: "true", "false", "1", "0", "yes", "no", true, false
 */
export function safeParseBoolean(value: string | boolean | null | undefined): boolean | null {
  if (value == null) {
    return null;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = String(value).toLowerCase().trim();

  if (['true', '1', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['false', '0', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return null;
}

/**
 * Safely parse a boolean with a default value
 */
export function safeParseBooleanWithDefault(
  value: string | boolean | null | undefined,
  defaultValue: boolean
): boolean {
  const parsed = safeParseBoolean(value);
  return parsed !== null ? parsed : defaultValue;
}

/**
 * Safely decode URI component
 * Returns decoded string or original string on failure
 */
export function safeDecodeURIComponent(encoded: string): string {
  try {
    return decodeURIComponent(encoded);
  } catch (error) {
    console.error('[safeDecodeURIComponent] Failed to decode:', error instanceof Error ? error.message : String(error));
    return encoded;
  }
}

/**
 * Safely parse URL-encoded JSON token
 * Common pattern: JSON.parse(decodeURIComponent(token))
 */
export function safeParseUrlEncodedJson<T = unknown>(encoded: string): T | null {
  try {
    const decoded = decodeURIComponent(encoded);
    return JSON.parse(decoded) as T;
  } catch (error) {
    console.error('[safeParseUrlEncodedJson] Failed to parse URL-encoded JSON:', error instanceof Error ? error.message : String(error));
    return null;
  }
}
