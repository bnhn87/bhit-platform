import { NextApiRequest, NextApiResponse } from 'next';

import { supabase } from '@/lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get jobs ready for invoicing
    const { data: jobs, error } = await supabase
      .from('v_invoiceable_jobs')
      .select('*')
      .order('reference');

    if (error) {
      throw error;
    }

    return res.status(200).json({
      success: true,
      data: jobs || []
    });

  } catch (error: unknown) {
    console.error('Error fetching invoiceable jobs:', error);
    return res.status(500).json({
      error: 'Failed to fetch jobs',
      details: (error as Error).message
    });
  }
}