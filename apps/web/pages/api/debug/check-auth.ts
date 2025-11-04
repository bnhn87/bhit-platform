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
      return res.status(401).json({
        error: 'No token',
        hasAuthHeader: !!req.headers.authorization
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
      return res.status(401).json({
        error: 'User error',
        userError: userError?.message,
        hasUser: !!user
      });
    }

    // Check if user profile exists in user_profiles
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email
      },
      profile: profile,
      profileError: profileError?.message,
      profileRole: profile?.role,
      profileRoleLowerCase: profile?.role?.toLowerCase(),
      isAdmin: profile?.role?.toLowerCase() === 'admin',
      isDirector: profile?.role?.toLowerCase() === 'director',
      hasAccess: ['admin', 'director'].includes(profile?.role?.toLowerCase())
    });

  } catch (error: any) {
    return res.status(500).json({
      error: error?.message || 'Internal server error',
      stack: error?.stack
    });
  }
}
