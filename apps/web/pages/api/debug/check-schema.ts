import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get auth token
    const token = req.headers.authorization?.replace('Bearer ', '');

    let userId = null;
    if (token) {
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

      const { data: { user } } = await userSupabase.auth.getUser();
      userId = user?.id;
    }

    // Check profiles table structure
    const { data: allProfiles, error: allError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .limit(1);

    // Check if current user has a profile
    let userProfile = null;
    let userProfileError = null;
    if (userId) {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      userProfile = data;
      userProfileError = error;
    }

    // Count total profiles
    const { count } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    return res.status(200).json({
      current_user_id: userId || 'Not authenticated',
      profiles_table_exists: !allError,
      sample_profile_columns: allProfiles?.[0] ? Object.keys(allProfiles[0]) : null,
      total_profiles_count: count,
      current_user_profile: userProfile,
      current_user_profile_error: userProfileError?.message || null,
      has_role_column: allProfiles?.[0] ? 'role' in allProfiles[0] : null,
      has_account_id_column: allProfiles?.[0] ? 'account_id' in allProfiles[0] : null
    });

  } catch (error: any) {
    return res.status(500).json({
      error: error?.message || 'Unknown error'
    });
  }
}
