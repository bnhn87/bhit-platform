// Validation utilities for BHIT Work OS
import { ValidationError } from "./errors";
import { JobStatus, JOB_STATUSES } from "./jobs";
import { UserRole } from "./roles";

export type ValidationResult = {
  valid: boolean;
  errors: string[];
};

export type FieldValidation = {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: unknown) => string | null;
};

export type ValidationSchema = Record<string, FieldValidation>;

/**
 * Validate a single field
 */
export function validateField(
  value: unknown,
  validation: FieldValidation,
  fieldName: string
): string | null {
  // Required check
  if (validation.required && (value === undefined || value === null || value === '')) {
    return `${fieldName} is required`;
  }

  // Skip other validations if value is empty and not required
  if (!validation.required && (value === undefined || value === null || value === '')) {
    return null;
  }

  // String validations
  if (typeof value === 'string') {
    if (validation.minLength && value.length < validation.minLength) {
      return `${fieldName} must be at least ${validation.minLength} characters`;
    }

    if (validation.maxLength && value.length > validation.maxLength) {
      return `${fieldName} must be no more than ${validation.maxLength} characters`;
    }

    if (validation.pattern && !validation.pattern.test(value)) {
      return `${fieldName} format is invalid`;
    }
  }

  // Custom validation
  if (validation.custom) {
    return validation.custom(value);
  }

  return null;
}

/**
 * Validate an object against a schema
 */
export function validateObject(data: Record<string, unknown>, schema: ValidationSchema): ValidationResult {
  const errors: string[] = [];

  for (const [fieldName, validation] of Object.entries(schema)) {
    const error = validateField(data[fieldName], validation, fieldName);
    if (error) {
      errors.push(error);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Throw validation error if validation fails
 */
export function validateOrThrow(data: Record<string, unknown>, schema: ValidationSchema): void {
  const result = validateObject(data, schema);
  if (!result.valid) {
    throw new ValidationError(result.errors.join(', '));
  }
}

// Common validation patterns
export const VALIDATION_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\+?[\d\s\-\(\)]+$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  color: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
  url: /^https?:\/\/.+/,
};

// Common validation functions
export const VALIDATORS = {
  email: (value: unknown) => typeof value === 'string' && VALIDATION_PATTERNS.email.test(value) ? null : 'Invalid email format',

  phone: (value: unknown) => typeof value === 'string' && VALIDATION_PATTERNS.phone.test(value) ? null : 'Invalid phone format',
  
  uuid: (value: unknown) => typeof value === 'string' && VALIDATION_PATTERNS.uuid.test(value) ? null : 'Invalid UUID format',

  color: (value: unknown) => typeof value === 'string' && VALIDATION_PATTERNS.color.test(value) ? null : 'Invalid color format (must be hex)',

  url: (value: unknown) => typeof value === 'string' && VALIDATION_PATTERNS.url.test(value) ? null : 'Invalid URL format',

  jobStatus: (value: unknown) => typeof value === 'string' && JOB_STATUSES.includes(value as JobStatus) ? null : `Invalid job status. Must be one of: ${JOB_STATUSES.join(', ')}`,

  userRole: (value: unknown) => {
    const validRoles: UserRole[] = ['installer', 'supervisor', 'ops', 'director', 'admin', 'guest'];
    return typeof value === 'string' && validRoles.includes(value as UserRole) ? null : `Invalid user role. Must be one of: ${validRoles.join(', ')}`;
  },

  positiveNumber: (value: unknown) => typeof value === 'number' && value > 0 ? null : 'Must be a positive number',

  nonNegativeNumber: (value: unknown) => typeof value === 'number' && value >= 0 ? null : 'Must be a non-negative number',

  percentage: (value: unknown) => typeof value === 'number' && value >= 0 && value <= 100 ? null : 'Must be between 0 and 100',
  
  dateString: (value: unknown) => {
    if (typeof value !== 'string') return 'Invalid date format';
    const date = new Date(value);
    return !isNaN(date.getTime()) ? null : 'Invalid date format';
  },

  futureDate: (value: unknown) => {
    if (typeof value !== 'string') return 'Invalid date format';
    const date = new Date(value);
    return date > new Date() ? null : 'Date must be in the future';
  },

  pastDate: (value: unknown) => {
    if (typeof value !== 'string') return 'Invalid date format';
    const date = new Date(value);
    return date < new Date() ? null : 'Date must be in the past';
  }
};

// Predefined validation schemas for common entities

export const JOB_VALIDATION_SCHEMA: ValidationSchema = {
  title: {
    required: true,
    minLength: 1,
    maxLength: 255
  },
  client_name: {
    maxLength: 255
  },
  reference: {
    maxLength: 100
  },
  status: {
    custom: VALIDATORS.jobStatus
  },
  location_x: {
    custom: (value: unknown) => value !== null && typeof value !== 'number' ? 'Location X must be a number' : null
  },
  location_y: {
    custom: (value: unknown) => value !== null && typeof value !== 'number' ? 'Location Y must be a number' : null
  },
  created_by: {
    required: true,
    custom: VALIDATORS.uuid
  },
  account_id: {
    required: true,
    custom: VALIDATORS.uuid
  }
};

export const USER_VALIDATION_SCHEMA: ValidationSchema = {
  email: {
    required: true,
    custom: VALIDATORS.email
  },
  role: {
    custom: VALIDATORS.userRole
  }
};

export const QUOTE_VALIDATION_SCHEMA: ValidationSchema = {
  job_id: {
    required: true,
    custom: VALIDATORS.uuid
  },
  quoted_total: {
    required: true,
    custom: VALIDATORS.nonNegativeNumber
  },
  installer_days: {
    required: true,
    custom: VALIDATORS.nonNegativeNumber
  },
  supervisor_days: {
    required: true,
    custom: VALIDATORS.nonNegativeNumber
  },
  vehicle_days: {
    required: true,
    custom: VALIDATORS.nonNegativeNumber
  },
  waste_loads: {
    required: true,
    custom: VALIDATORS.nonNegativeNumber
  },
  materials_cost: {
    required: true,
    custom: VALIDATORS.nonNegativeNumber
  },
  misc_cost: {
    required: true,
    custom: VALIDATORS.nonNegativeNumber
  }
};

// Utility functions for form validation

/**
 * Get error message for a field from validation result
 */
export function getFieldError(fieldName: string, errors: string[]): string | null {
  const fieldError = errors.find(error => error.toLowerCase().includes(fieldName.toLowerCase()));
  return fieldError || null;
}

/**
 * Check if field has error
 */
export function hasFieldError(fieldName: string, errors: string[]): boolean {
  return getFieldError(fieldName, errors) !== null;
}

/**
 * Sanitize string input
 */
export function sanitizeString(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

/**
 * Sanitize object by trimming string values
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized = { ...obj };

  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      (sanitized as Record<string, unknown>)[key] = sanitizeString(sanitized[key] as string);
    }
  }

  return sanitized;
}