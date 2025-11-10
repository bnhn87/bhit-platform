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
        error: 'No token provided',
        message: 'Please provide an Authorization header with Bearer token'
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
        error: 'No authenticated user',
        userError: userError?.message,
      });
    }

    // Check user_profiles table (the corrected table)
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    // Check users table (the old incorrect table)
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*')
      .eq('account_id', user.id)
      .maybeSingle();

    return res.status(200).json({
      success: true,
      authenticated_user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
      },
      user_profiles_table: {
        data: profileData,
        error: profileError?.message,
        role: profileData?.role,
        hasData: !!profileData,
      },
      users_table: {
        data: usersData,
        error: usersError?.message,
        role: usersData?.role,
        hasData: !!usersData,
      },
      expected_role: profileData?.role || 'guest',
      debug_info: {
        query_used_in_hook: "from('user_profiles').select('role').eq('id', user.id)",
        user_id: user.id,
        profile_exists: !!profileData,
        profile_role: profileData?.role,
      }
    });

  } catch (error: unknown) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}