import { NextApiRequest, NextApiResponse } from 'next';

import { supabase } from '@/lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { data, error } = await supabase
      .from('construction_dashboard_summary')
      .select('*')
      .order('completion_percentage', { ascending: false });

    if (error) {
      throw error;
    }

    return res.status(200).json({
      success: true,
      data: data || []
    });

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return res.status(500).json({
      error: 'Failed to fetch dashboard data',
      details: (error as Error).message
    });
  }
}