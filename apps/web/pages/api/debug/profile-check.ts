import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token' });
    }

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

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return res.status(200).json({ step: 'auth', error: userError?.message });
    }

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return res.status(200).json({
      step: 'profile_check',
      userId: user.id,
      userEmail: user.email,
      profile: profile,
      profileError: profileError?.message || null,
      role: profile?.role,
      roleLower: profile?.role?.toLowerCase(),
      isAdmin: profile?.role?.toLowerCase() === 'admin',
      isDirector: profile?.role?.toLowerCase() === 'director',
      hasAccess: ['admin', 'director'].includes(profile?.role?.toLowerCase())
    });

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
