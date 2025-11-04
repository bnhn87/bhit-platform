/**
 * Utility for safely parsing auth tokens from request cookies
 */

import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest } from 'next';

interface TokenData {
  access_token?: string;
  [key: number]: string;
}

/**
 * Safely parse auth token from request cookies
 * @param req - Next.js API request
 * @returns Parsed token data or null if invalid
 */
export function safeParseAuthToken(req: NextApiRequest): TokenData | null {
  try {
    const cookies = req.headers.cookie || '';
    const tokenMatch = cookies.match(/sb-[^-]+-auth-token=([^;]+)/);

    if (!tokenMatch) {
      return null;
    }

    try {
      const tokenData = JSON.parse(decodeURIComponent(tokenMatch[1])) as TokenData;
      return tokenData;
    } catch (parseError) {
      console.error('[safeParseAuthToken] Failed to parse auth token:', parseError);
      return null;
    }
  } catch (error: unknown) {
    console.error('[safeParseAuthToken] Error extracting token:', error);
    return null;
  }
}

/**
 * Extract user ID from request using auth token
 * @param req - Next.js API request
 * @returns User ID or null if authentication fails
 */
export async function getUserIdFromRequest(req: NextApiRequest): Promise<string | null> {
  try {
    const tokenData = safeParseAuthToken(req);
    if (!tokenData) {
      return null;
    }

    const token = tokenData.access_token || tokenData[0];
    if (!token) {
      return null;
    }

    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    const { data: { user } } = await userClient.auth.getUser();
    return user?.id || null;
  } catch (error: unknown) {
    console.error('[getUserIdFromRequest] Error getting user ID:', error);
    return null;
  }
}
