/**
 * API Authentication Utilities
 *
 * Provides centralized authentication and authorization for API routes
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Create admin client for auth verification
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface AuthenticatedUser {
  id: string;
  email?: string;
  role?: string;
}

/**
 * Extract authentication token from request headers
 */
export function extractToken(req: NextApiRequest): string | null {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return null;
  }

  // Support both "Bearer token" and raw token formats
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.replace('Bearer ', '');
  }

  return authHeader;
}

/**
 * Verify user authentication and return user data
 * Returns null if authentication fails
 */
export async function verifyAuth(req: NextApiRequest): Promise<AuthenticatedUser | null> {
  const token = extractToken(req);

  if (!token) {
    return null;
  }

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      role: user.user_metadata?.role || user.app_metadata?.role,
    };
  } catch (error) {
    console.error('[apiAuth] Error verifying token:', error);
    return null;
  }
}

/**
 * Middleware to require authentication on an API route
 * Usage: const user = await requireAuth(req, res);
 *
 * Returns the authenticated user or sends 401 response and returns null
 */
export async function requireAuth(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<AuthenticatedUser | null> {
  const user = await verifyAuth(req);

  if (!user) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required. Please provide a valid authorization token.',
    });
    return null;
  }

  return user;
}

/**
 * Middleware to require specific role(s) for an API route
 * Usage: const user = await requireRole(req, res, ['admin', 'manager']);
 */
export async function requireRole(
  req: NextApiRequest,
  res: NextApiResponse,
  allowedRoles: string[]
): Promise<AuthenticatedUser | null> {
  const user = await requireAuth(req, res);

  if (!user) {
    return null; // requireAuth already sent 401 response
  }

  if (user.role && allowedRoles.includes(user.role)) {
    return user;
  }

  res.status(403).json({
    error: 'Forbidden',
    message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
  });
  return null;
}

/**
 * Helper to get user ID from request (for backward compatibility)
 * Returns null if not authenticated
 */
export async function getUserIdFromRequest(req: NextApiRequest): Promise<string | null> {
  const user = await verifyAuth(req);
  return user?.id || null;
}

/**
 * Check if a request is authenticated without sending error responses
 * Useful for optional authentication
 */
export async function isAuthenticated(req: NextApiRequest): Promise<boolean> {
  const user = await verifyAuth(req);
  return user !== null;
}
