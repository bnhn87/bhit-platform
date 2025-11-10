import type { NextApiRequest, NextApiResponse } from 'next';
import { PODService } from '../../../../lib/pod/pod.service';
import { supabase } from '../../../../lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { notes } = req.body;
    const updated = await PODService.approve(id as string, session.user.id, notes);

    return res.status(200).json({
      success: true,
      pod: updated,
      message: 'POD approved successfully'
    });
  } catch (error: unknown) {
    console.error('Approve POD error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      success: false,
      error: errorMessage || 'Failed to approve POD'
    });
  }
}
