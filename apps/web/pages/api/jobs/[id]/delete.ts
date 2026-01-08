import { createClient } from '@supabase/supabase-js';
import { NextApiRequest, NextApiResponse } from 'next';

import { logJobDeleted } from '../../../../lib/activityLogger';
import { safeParseUrlEncodedJson } from '../../../../lib/safeParsing';

const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper to extract user ID from auth token
async function getUserIdFromRequest(req: NextApiRequest): Promise<string | null> {
  try {
    const cookies = req.headers.cookie || '';
    const tokenMatch = cookies.match(/sb-[^-]+-auth-token=([^;]+)/);

    if (!tokenMatch) return null;

    const tokenData = safeParseUrlEncodedJson<{ access_token?: string } | [string]>(tokenMatch[1]);
    if (!tokenData) return null;

    const token = (tokenData as { access_token?: string }).access_token || (tokenData as [string])[0];

    if (!token) return null;

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

    const { data: { user } } = await userClient.auth.getUser();
    return user?.id || null;
  } catch (error) {
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Job ID is required' });
  }

  try {

    // Verify user role directly from profiles table (SSOT)
    const userId = await getUserIdFromRequest(req);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: profile } = await supabaseServiceRole
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    const role = profile?.role;
    const canArchive = ['admin', 'director', 'ops', 'general_manager'].includes(role);

    if (!canArchive) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions to archive jobs' });
    }

    // Run the soft delete (archive)
    const { data, error } = await supabaseServiceRole
      .from('jobs')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .select();


    if (error) {
      console.error('Delete failed:', error);
      return res.status(500).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      console.error('No job found with ID:', id);
      return res.status(404).json({ error: 'Job not found' });
    }

    // Log the deletion activity
    const jobTitle = (data[0] as any)?.title || 'Unknown Job';
    await logJobDeleted(id, jobTitle, userId || undefined);

    return res.status(200).json({ success: true, job: data[0] });

  } catch (error) {
    console.error('Delete error:', error);
    return res.status(500).json({ error: 'Delete failed' });
  }
}