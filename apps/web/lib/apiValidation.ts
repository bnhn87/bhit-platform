/**
 * API Input Validation Schemas
 *
 * Centralized Zod validation schemas for API route inputs
 */

import { z } from 'zod';
import { NextApiRequest, NextApiResponse } from 'next';

/**
 * Common validation schemas
 */

// UUID validation
export const uuidSchema = z.string().uuid();

// Email validation
export const emailSchema = z.string().email().toLowerCase();

// Postcode validation (UK format)
export const postcodeSchema = z
  .string()
  .regex(/^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i, 'Invalid UK postcode format')
  .transform(s => s.toUpperCase().replace(/\s+/g, ' ').trim());

// Phone number validation (basic)
export const phoneSchema = z
  .string()
  .regex(/^[\d\s+()-]+$/, 'Invalid phone number format')
  .min(10)
  .max(20);

// Positive integer validation
export const positiveIntSchema = z.number().int().positive();

// Non-negative integer validation
export const nonNegativeIntSchema = z.number().int().nonnegative();

// Date string validation
export const dateStringSchema = z.string().datetime();

/**
 * Quote schemas
 */

export const ProductSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  code: z.string().optional(),
  quantity: positiveIntSchema,
  price: z.number().nonnegative().optional(),
  category: z.string().optional(),
});

export const QuoteSchema = z.object({
  products: z.array(ProductSchema).min(1, 'At least one product is required'),
  client_id: uuidSchema.optional(),
  created_at: dateStringSchema.optional(),
});

/**
 * Client schemas
 */

export const ClientAddressSchema = z.object({
  id: uuidSchema.optional(),
  client_id: uuidSchema.optional(),
  address_line1: z.string().min(1, 'Address line 1 is required'),
  address_line2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  postcode: postcodeSchema,
  country: z.string().default('UK'),
  type: z.enum(['billing', 'delivery', 'site', 'other']).optional(),
  is_primary: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

export const ClientSchema = z.object({
  id: uuidSchema.optional(),
  name: z.string().min(1, 'Name is required').max(255),
  company_name: z.string().optional(),
  email: emailSchema,
  phone: phoneSchema.optional(),
  is_active: z.boolean().default(true),
});

/**
 * Labour schemas
 */

export const ShiftSchema = z.object({
  id: uuidSchema.optional(),
  user_id: uuidSchema,
  job_id: uuidSchema.optional(),
  start_time: dateStringSchema,
  end_time: dateStringSchema,
  break_minutes: nonNegativeIntSchema.default(0),
  notes: z.string().optional(),
});

/**
 * Task schemas
 */

export const TaskSchema = z.object({
  id: uuidSchema.optional(),
  job_id: uuidSchema,
  title: z.string().min(1, 'Task title is required').max(500),
  description: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).default('pending'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assigned_to: uuidSchema.optional(),
  due_date: dateStringSchema.optional(),
  estimated_hours: z.number().positive().optional(),
});

/**
 * Helper function to validate request body against a schema
 * Returns validated data or sends error response
 */
export function validateRequestBody<T>(
  schema: z.ZodSchema<T>,
  req: NextApiRequest,
  res: NextApiResponse
): T | null {
  try {
    const validated = schema.parse(req.body);
    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
    } else {
      res.status(400).json({
        error: 'Invalid request body',
        message: 'Request body could not be parsed',
      });
    }
    return null;
  }
}

/**
 * Helper function to validate query parameters
 */
export function validateQuery<T>(
  schema: z.ZodSchema<T>,
  req: NextApiRequest,
  res: NextApiResponse
): T | null {
  try {
    const validated = schema.parse(req.query);
    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Invalid query parameters',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
    } else {
      res.status(400).json({
        error: 'Invalid query parameters',
      });
    }
    return null;
  }
}

/**
 * Safe parse utilities (doesn't send response)
 */

export function safeParseBody<T>(schema: z.ZodSchema<T>, body: unknown): {
  success: true;
  data: T
} | {
  success: false;
  errors: z.ZodError
} {
  const result = schema.safeParse(body);
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, errors: result.error };
  }
}
