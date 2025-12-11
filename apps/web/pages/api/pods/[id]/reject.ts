import type { NextApiRequest, NextApiResponse} from 'next';

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

    const { reason } = req.body;
    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason required' });
    }

    const updated = await PODService.reject(id as string, session.user.id, reason);

    return res.status(200).json({
      success: true,
      pod: updated,
      message: 'POD rejected'
    });
  } catch (error: any) {
    console.error('Reject POD error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to reject POD'
    });
  }
}
