import { createClient } from '@supabase/supabase-js';
import { NextApiRequest, NextApiResponse } from 'next';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Get the access token from cookies
    const cookies = req.headers.cookie || '';

    // Debug: show all cookies
    const cookieList = cookies.split(';').map(c => c.trim().split('=')[0]);

    const tokenMatch = cookies.match(/sb-[^-]+-auth-token=([^;]+)/);

    if (!tokenMatch) {
      return res.status(401).json({
        error: 'No auth token in cookies',
        availableCookies: cookieList,
        hint: 'Looking for pattern: sb-*-auth-token'
      });
    }

    // Parse the token JSON
    let token;
    try {
      const tokenData = JSON.parse(decodeURIComponent(tokenMatch[1]));
      token = tokenData.access_token || tokenData[0];
    } catch (e) {
      return res.status(401).json({ error: 'Could not parse auth token' });
    }

    if (!token) {
      return res.status(401).json({ error: 'No access token found' });
    }

    // Create client with user's token
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
      return res.status(401).json({ error: 'Unauthorized', details: userError });
    }

    // Get full user data with admin client
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(user.id);

    // Get profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    return res.status(200).json({
      user_id: user.id,
      email: user.email,
      role: profile?.role,
      user_metadata: user.user_metadata,
      permissions_from_token: user.user_metadata?.permissions,
      permissions_from_admin_api: authUser?.user?.user_metadata?.permissions,
      raw_user_meta_data: authUser?.user?.raw_user_meta_data
    });

  } catch (error: any) {
    console.error('Debug permissions error:', error);
    return res.status(500).json({
      error: error?.message || 'Internal server error'
    });
  }
}
