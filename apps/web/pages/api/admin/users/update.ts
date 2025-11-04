import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * API Route: Update User
 * PATCH /api/admin/users/update
 *
 * Updates user details, role, and permissions
 * Requires admin or director role
 */

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user_id, full_name, role, permissions } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    // Get auth token from header
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: No auth token provided' });
    }

    // Create client with user's token
    const supabase = createClient(
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
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user is admin or director
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const userRole = profile?.role?.toLowerCase();
    if (profileError || (userRole !== 'admin' && userRole !== 'director')) {
      return res.status(403).json({ error: 'Forbidden: Admin or Director access required' });
    }

    // Build update object with only provided fields
    const updates: any = { updated_at: new Date().toISOString() };
    if (full_name) updates.full_name = full_name;
    if (role) updates.role = role;

    // Update user profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user_id);

    if (updateError) {
      console.error('User update failed:', updateError);
      return res.status(500).json({ error: updateError.message });
    }

    return res.status(200).json({
      success: true,
      user_id: user_id,
      message: 'User updated successfully'
    });

  } catch (error: any) {
    console.error('Update user error:', error);
    return res.status(500).json({
      error: error?.message || 'Internal server error'
    });
  }
}
