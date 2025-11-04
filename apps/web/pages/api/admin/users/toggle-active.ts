import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

/**
 * API Route: Toggle User Active Status
 * POST /api/admin/users/toggle-active
 *
 * Enables or disables a user account using Supabase Auth
 * Requires admin or director role
 */

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user_id, is_active } = req.body;

    if (!user_id || typeof is_active !== 'boolean') {
      return res.status(400).json({ error: 'user_id and is_active are required' });
    }

    // Get auth token from header
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: No auth token provided' });
    }

    // Create client with user's token for auth check
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

    // Get current user
    const { data: { user }, error: userError } = await userClient.auth.getUser();

    if (userError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Create admin client for checking role and updating user
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Check if user is admin or director using admin client
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const userRole = profile?.role?.toLowerCase();
    if (profileError || (userRole !== 'admin' && userRole !== 'director')) {
      return res.status(403).json({ error: 'Forbidden: Admin or Director access required' });
    }

    // Use Supabase Auth Admin API to update user status
    // Note: Supabase uses "banned" status, not "active"
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      user_id,
      {
        ban_duration: is_active ? 'none' : '876000h' // ~100 years if inactive
      }
    );

    if (updateError) {
      console.error('Failed to toggle user status:', updateError);
      return res.status(500).json({ error: updateError.message });
    }

    return res.status(200).json({
      success: true,
      user_id: user_id,
      is_active: is_active,
      message: `User ${is_active ? 'activated' : 'deactivated'} successfully`
    });

  } catch (error: unknown) {
    console.error('Toggle user status error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}
