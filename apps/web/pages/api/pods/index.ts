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

    // Parse query parameters
    const {
      query,
      status,
      supplier_id,
      date_from,
      date_to,
      limit,
      offset
    } = req.query;

    const result = await PODService.search({
      query: query as string,
      status: status as any,
      supplier_id: supplier_id as string,
      date_from: date_from as string,
      date_to: date_to as string,
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0
    });

    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error: unknown) {
    console.error('PODs list API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      success: false,
      error: errorMessage || 'Failed to fetch PODs'
    });
  }
}
