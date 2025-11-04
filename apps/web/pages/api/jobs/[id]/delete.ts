import { createClient } from '@supabase/supabase-js';
import { NextApiRequest, NextApiResponse } from 'next';

import { logJobDeleted } from '../../../../lib/activityLogger';
import { getUserIdFromRequest } from '../../../../lib/authTokenParser';

const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Job ID is required' });
  }

  try {
    // console.log(`🗑️ Simple delete for job: ${id}`);

    // Simple approach: just run the update and see if it works
    const { data, error } = await supabaseServiceRole
      .from('jobs')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .select();

    // console.log('Update result:', { data, error });

    if (error) {
      console.error('Delete failed:', error);
      return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }

    if (!data || data.length === 0) {
      console.error('No job found with ID:', id);
      return res.status(404).json({ error: 'Job not found' });
    }

    // Log the deletion activity
    const userId = await getUserIdFromRequest(req);
    const jobTitle = (data[0] as any)?.title || 'Unknown Job';
    await logJobDeleted(id, jobTitle, userId || undefined);

    // console.log(`✅ Job ${id} marked as deleted:`, data[0]);
    return res.status(200).json({ success: true, job: data[0] });

  } catch (error: unknown) {
    console.error('Delete error:', error);
    return res.status(500).json({ error: 'Delete failed' });
  }
}