import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

/**
 * API Route: Initialize My Permissions
 * POST /api/admin/users/init-my-permissions
 *
 * One-time setup to add permissions to your user_metadata
 */

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
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

    const { data: { user }, error: userError } = await userClient.auth.getUser();

    if (userError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

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

    // Check user's role
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const userRole = profile?.role?.toLowerCase();

    // Set permissions based on role
    const permissions = {
      can_create_jobs: ['admin', 'director', 'manager', 'installer'].includes(userRole),
      can_edit_jobs: ['admin', 'director', 'manager', 'installer'].includes(userRole),
      can_delete_jobs: ['admin', 'director'].includes(userRole),
      can_view_costs: ['admin', 'director', 'manager'].includes(userRole),
      can_edit_costs: ['admin', 'director', 'manager'].includes(userRole),
      can_view_invoices: ['admin', 'director', 'manager'].includes(userRole),
      can_create_invoices: ['admin', 'director', 'manager'].includes(userRole),
      can_edit_invoices: ['admin', 'director', 'manager'].includes(userRole),
      can_manage_users: ['admin', 'director'].includes(userRole),
      can_edit_org_settings: ['admin', 'director'].includes(userRole),
      can_view_reports: true,
      can_export_data: ['admin', 'director', 'manager'].includes(userRole)
    };

    // Update user metadata
    const { data: updatedUser, error: updateError } = await adminClient.auth.admin.updateUserById(
      user.id,
      {
        user_metadata: {
          ...user.user_metadata,
          permissions
        }
      }
    );

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    return res.status(200).json({
      success: true,
      message: 'Permissions initialized successfully',
      permissions,
      user_id: user.id
    });

  } catch (error: unknown) {
    console.error('Init permissions error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}
