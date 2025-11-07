import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Get auth token from header
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(200).json({
        authenticated: false,
        error: 'No auth token provided',
        hint: 'Make sure you are logged in'
      });
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
      return res.status(200).json({
        authenticated: false,
        error: userError?.message || 'No user',
        token_provided: !!token
      });
    }

    // Try to get profile with RLS
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // Also try with service role (bypasses RLS)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: profileAdmin, error: profileAdminError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return res.status(200).json({
      authenticated: true,
      user_id: user.id,
      user_email: user.email,

      // Profile with RLS
      profile: profile,
      profile_error: profileError?.message || null,
      profile_details: profileError?.details || null,
      profile_hint: profileError?.hint || null,

      // Profile without RLS (admin)
      profile_admin: profileAdmin,
      profile_admin_error: profileAdminError?.message || null,

      // Environment check
      has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    });

  } catch (error: unknown) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}
