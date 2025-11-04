import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { logPermissionsUpdated } from '../../../../lib/activityLogger';

/**
 * API Route: Update User Permissions
 * POST /api/admin/users/update-permissions
 *
 * Updates user permissions in user_permissions table
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
    const { user_id, permissions } = req.body;

    if (!user_id || !permissions) {
      return res.status(400).json({ error: 'user_id and permissions are required' });
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

    // Create admin client for checking role and updating permissions
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

    // Build permissions object
    const permissionsData = {
      can_create_jobs: permissions.can_create_jobs ?? false,
      can_edit_jobs: permissions.can_edit_jobs ?? false,
      can_delete_jobs: permissions.can_delete_jobs ?? false,
      can_hard_delete_jobs: permissions.can_hard_delete_jobs ?? false,
      can_view_costs: permissions.can_view_costs ?? false,
      can_edit_costs: permissions.can_edit_costs ?? false,
      can_view_invoices: permissions.can_view_invoices ?? false,
      can_create_invoices: permissions.can_create_invoices ?? false,
      can_edit_invoices: permissions.can_edit_invoices ?? false,
      can_manage_users: permissions.can_manage_users ?? false,
      can_edit_org_settings: permissions.can_edit_org_settings ?? false,
      can_view_reports: permissions.can_view_reports ?? false,
      can_export_data: permissions.can_export_data ?? false
    };

    console.log('Updating permissions for user:', user_id, permissionsData);

    // Get current user to preserve existing metadata
    const { data: currentUserData, error: getUserError } = await adminClient.auth.admin.getUserById(user_id);

    if (getUserError) {
      console.error('Failed to get user:', getUserError);
      return res.status(500).json({ error: getUserError.message });
    }

    // Update user metadata with permissions (preserves existing metadata)
    const { data: updatedUser, error: updateError } = await adminClient.auth.admin.updateUserById(user_id, {
      user_metadata: {
        ...currentUserData.user.user_metadata,
        permissions: permissionsData
      }
    });

    if (updateError) {
      console.error('Failed to update user metadata:', updateError);
      return res.status(500).json({
        error: updateError.message
      });
    }

    console.log('Successfully updated permissions for user:', user_id);

    // Log activity
    await logPermissionsUpdated(user_id, currentUserData.user.email ?? 'unknown', user.id);

    return res.status(200).json({
      success: true,
      user_id: user_id,
      message: 'Permissions updated successfully'
    });

  } catch (error: unknown) {
    console.error('Update permissions error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}
