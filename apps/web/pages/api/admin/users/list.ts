import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import type { UserProfile, AuthUser } from '../../../../types/supabase-types';

/**
 * API Route: List Users
 * GET /api/admin/users/list
 *
 * Returns all users in the admin's account with permissions
 * Requires admin or director role
 */

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
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

    // Create admin client for data operations
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

    console.log('Auth check:', {
      userId: user.id,
      profile,
      profileError,
      role: profile?.role,
      roleLower: profile?.role?.toLowerCase()
    });

    const userRole = profile?.role?.toLowerCase();
    if (profileError || (userRole !== 'admin' && userRole !== 'director')) {
      console.log('Access denied:', { profileError, userRole });
      return res.status(403).json({ error: 'Forbidden: Admin or Director access required' });
    }

    // Get all users with their permissions using admin client
    const { data: profiles, error: profilesError } = await adminClient
      .from('profiles')
      .select(`
        id,
        email,
        role,
        created_at
      `)
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('Failed to fetch profiles:', profilesError);
      return res.status(500).json({ error: 'Failed to fetch profiles' });
    }

    // Get auth users data for last_sign_in_at, full_name, and permissions
    const { data: authUsers, error: authError } = await adminClient.auth.admin.listUsers();

    // Merge profiles with auth data and extract permissions from user_metadata
    const users = profiles?.map((profile: UserProfile) => {
      const authUser = authUsers?.users?.find((u) => u.id === profile.id);
      // Check if user is banned (inactive)
      const bannedUntil = (authUser as { banned_until?: string })?.banned_until;
      const isBanned = bannedUntil && new Date(bannedUntil) > new Date();

      // Extract permissions from auth user_metadata
      const perms = authUser?.user_metadata?.permissions || {};

      return {
        ...profile,
        // Flatten permissions into top-level fields
        can_create_jobs: perms.can_create_jobs ?? false,
        can_edit_jobs: perms.can_edit_jobs ?? false,
        can_delete_jobs: perms.can_delete_jobs ?? false,
        can_hard_delete_jobs: perms.can_hard_delete_jobs ?? false,
        can_view_costs: perms.can_view_costs ?? false,
        can_edit_costs: perms.can_edit_costs ?? false,
        can_view_invoices: perms.can_view_invoices ?? false,
        can_create_invoices: perms.can_create_invoices ?? false,
        can_edit_invoices: perms.can_edit_invoices ?? false,
        can_manage_users: perms.can_manage_users ?? false,
        can_edit_org_settings: perms.can_edit_org_settings ?? false,
        can_view_reports: perms.can_view_reports ?? false,
        can_export_data: perms.can_export_data ?? false,
        is_active: !isBanned,
        last_sign_in_at: authUser?.last_sign_in_at || null,
        full_name: authUser?.user_metadata?.full_name || profile.email
      };
    });

    return res.status(200).json({
      success: true,
      users: users || []
    });

  } catch (error: unknown) {
    console.error('List users error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}
