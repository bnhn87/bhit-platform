import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { logUserCreated } from '../../../../lib/activityLogger';

/**
 * API Route: Create New User
 * POST /api/admin/users/create
 *
 * Creates a new user with email/password and sets up profile + permissions
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
    const { email, password, full_name, role, permissions, auth_token } = req.body;

    // Validate required fields
    if (!email || !password || !full_name || !role) {
      return res.status(400).json({
        error: 'Missing required fields: email, password, full_name, role'
      });
    }

    // Validate role
    if (!['admin', 'director', 'manager', 'installer', 'user'].includes(role)) {
      return res.status(400).json({
        error: 'Invalid role. Must be: admin, director, manager, installer, or user'
      });
    }

    // Get auth token from header or body
    const token = req.headers.authorization?.replace('Bearer ', '') || auth_token;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: No auth token provided' });
    }

    // Create regular client with user's token to verify their permissions
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

    // Verify user is authenticated and get their profile
    const { data: { user }, error: userError } = await userSupabase.auth.getUser();

    if (userError || !user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    const { data: profile, error: profileCheckError } = await userSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const userRole = profile?.role?.toLowerCase();
    if (profileCheckError || (userRole !== 'admin' && userRole !== 'director')) {
      return res.status(403).json({ error: 'Forbidden: Admin or Director access required' });
    }

    // Initialize Supabase Admin client (bypasses RLS)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service role key required
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Step 1: Setup default permissions based on role
    const defaultPermissions = {
      can_create_jobs: permissions?.can_create_jobs ?? (role !== 'user'),
      can_edit_jobs: permissions?.can_edit_jobs ?? (role !== 'user'),
      can_delete_jobs: permissions?.can_delete_jobs ?? ['admin', 'director'].includes(role.toLowerCase()),
      can_hard_delete_jobs: permissions?.can_hard_delete_jobs ?? ['admin', 'director'].includes(role.toLowerCase()),
      can_view_costs: permissions?.can_view_costs ?? ['admin', 'director', 'manager'].includes(role.toLowerCase()),
      can_edit_costs: permissions?.can_edit_costs ?? ['admin', 'director', 'manager'].includes(role.toLowerCase()),
      can_view_invoices: permissions?.can_view_invoices ?? ['admin', 'director', 'manager'].includes(role.toLowerCase()),
      can_create_invoices: permissions?.can_create_invoices ?? ['admin', 'director', 'manager'].includes(role.toLowerCase()),
      can_edit_invoices: permissions?.can_edit_invoices ?? ['admin', 'director', 'manager'].includes(role.toLowerCase()),
      can_manage_users: permissions?.can_manage_users ?? ['admin', 'director'].includes(role.toLowerCase()),
      can_edit_org_settings: permissions?.can_edit_org_settings ?? ['admin', 'director'].includes(role.toLowerCase()),
      can_view_reports: permissions?.can_view_reports ?? true,
      can_export_data: permissions?.can_export_data ?? ['admin', 'director', 'manager'].includes(role.toLowerCase())
    };

    // Step 2: Create auth.users entry with permissions in user_metadata
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name,
        role,
        permissions: defaultPermissions
      }
    });

    if (authError || !authUser?.user) {
      console.error('Auth user creation failed:', authError);
      return res.status(500).json({
        error: authError?.message || 'Failed to create auth user'
      });
    }

    // Step 3: Setup user profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authUser.user.id,
        email: email,
        role: role
      });

    if (profileError) {
      console.error('Profile setup failed:', profileError);

      // Rollback: Delete the auth user
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);

      return res.status(500).json({
        error: profileError.message || 'Failed to setup user profile'
      });
    }

    // Log activity
    await logUserCreated(authUser.user.id, email, role, user.id);

    return res.status(200).json({
      success: true,
      user: {
        id: authUser.user.id,
        email: authUser.user.email,
        full_name,
        role,
        created_at: authUser.user.created_at
      },
      message: 'User created successfully'
    });

  } catch (error: any) {
    console.error('User creation error:', error);
    return res.status(500).json({
      error: error?.message || 'Internal server error'
    });
  }
}
