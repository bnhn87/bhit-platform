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

    // Get PODs needing review
    const pods = await PODService.getReviewQueue();

    return res.status(200).json({
      success: true,
      pods,
      count: pods.length
    });
  } catch (error: unknown) {
    console.error('Review queue API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      success: false,
      error: errorMessage || 'Failed to fetch review queue'
    });
  }
}
