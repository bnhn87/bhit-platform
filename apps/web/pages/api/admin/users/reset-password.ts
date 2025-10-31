import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

/**
 * API Route: Reset User Password
 * POST /api/admin/users/reset-password
 *
 * Allows admin to reset any user's password
 * Requires admin role
 */

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user_id, new_password } = req.body;

    // Validate required fields
    if (!user_id || !new_password) {
      return res.status(400).json({
        error: 'Missing required fields: user_id, new_password'
      });
    }

    // Validate password strength
    if (new_password.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters long'
      });
    }

    // Get auth token from header
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: No auth token provided' });
    }

    // Verify user is admin or director
    const userSupabase = createClient(
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

    const { data: { user }, error: userError } = await userSupabase.auth.getUser();

    if (userError || !user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    const { data: profile, error: profileError } = await userSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const userRole = profile?.role?.toLowerCase();
    if (profileError || (userRole !== 'admin' && userRole !== 'director')) {
      return res.status(403).json({ error: 'Forbidden: Admin or Director access required' });
    }

    // Initialize Supabase Admin client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Reset password using Admin API
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      user_id,
      { password: new_password }
    );

    if (error) {
      console.error('Password reset failed:', error);
      return res.status(500).json({
        error: error.message || 'Failed to reset password'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully',
      user_id: data.user.id
    });

  } catch (error: any) {
    console.error('Password reset error:', error);
    return res.status(500).json({
      error: error?.message || 'Internal server error'
    });
  }
}
