import { NextApiRequest, NextApiResponse } from 'next';

import { supabase } from '@/lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { startDate: _startDate, endDate: _endDate, resourceId } = req.query;

      let query = supabase
        .from('labour_calendar_summary')
        .select('*');

      if (resourceId) {
        query = query.eq('resource_id', resourceId);
      }

      const { data, error } = await query.order('resource_name');

      if (error) {
        throw error;
      }

      return res.status(200).json({
        success: true,
        data: data || []
      });

    } catch (error) {
      console.error('Error fetching calendar data:', error);
      return res.status(500).json({
        error: 'Failed to fetch calendar data',
        details: (error as Error).message
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}