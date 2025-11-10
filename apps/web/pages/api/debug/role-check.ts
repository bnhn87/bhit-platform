// Diagnostic API to check role in both tables
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabaseClient';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No auth header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Auth failed', authError });
    }

    // Check users table
    const { data: usersData, error: usersError } = await (supabaseAdmin
      .from('users') as any)
      .select('role')
      .eq('account_id', user.id)
      .maybeSingle();

    // Check profiles table
    const { data: profilesData, error: profilesError } = await (supabaseAdmin
      .from('profiles') as any)
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    return res.status(200).json({
      userId: user.id,
      email: user.email,
      usersTable: {
        role: usersData?.role,
        roleLowercase: usersData?.role?.toLowerCase(),
        error: usersError?.message
      },
      profilesTable: {
        role: profilesData?.role,
        roleLowercase: profilesData?.role?.toLowerCase(),
        error: profilesError?.message
      },
      analysis: {
        usersHasDirector: usersData?.role?.toLowerCase() === 'director',
        profilesHasDirector: profilesData?.role?.toLowerCase() === 'director',
        usersHasAdmin: usersData?.role?.toLowerCase() === 'admin',
        profilesHasAdmin: profilesData?.role?.toLowerCase() === 'admin'
      }
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal error', details: (error as Error).message });
  }
}
