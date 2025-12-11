import type { NextApiRequest, NextApiResponse } from 'next';

import { PODService } from '../../../lib/pod/pod.service';
import { supabase } from '../../../lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get statistics
    const stats = await PODService.getStatistics();

    return res.status(200).json({
      success: true,
      statistics: stats
    });
  } catch (error: any) {
    console.error('Stats API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch statistics'
    });
  }
}
