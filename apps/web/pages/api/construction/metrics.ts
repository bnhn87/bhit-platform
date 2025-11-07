import { NextApiRequest, NextApiResponse } from 'next';

import { supabase } from '@/lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { jobId } = req.query;

  if (req.method === 'GET') {
    try {
      if (!jobId) {
        return res.status(400).json({ error: 'Job ID is required' });
      }

      const { data, error } = await supabase
        .from('construction_progress_metrics')
        .select('*')
        .eq('job_id', jobId)
        .order('recorded_at', { ascending: false })
        .limit(50);

      if (error) {
        throw error;
      }

      return res.status(200).json({
        success: true,
        data: data || []
      });

    } catch (error: unknown) {
      console.error('Error fetching metrics:', error);
      return res.status(500).json({
        error: 'Failed to fetch metrics',
        details: (error as Error).message
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const {
        job_id,
        metric_type,
        metric_value,
        target_value,
        unit,
        notes
      } = req.body;

      if (!job_id || !metric_type || metric_value === undefined) {
        return res.status(400).json({
          error: 'job_id, metric_type, and metric_value are required'
        });
      }

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { data, error } = await supabase
        .from('construction_progress_metrics')
        .insert({
          job_id,
          metric_type,
          metric_value,
          target_value,
          unit: unit || '%',
          notes,
          recorded_by: user.id,
          recorded_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return res.status(201).json({
        success: true,
        data
      });

    } catch (error: unknown) {
      console.error('Error creating metric:', error);
      return res.status(500).json({
        error: 'Failed to create metric',
        details: (error as Error).message
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}