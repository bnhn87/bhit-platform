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
        .from('construction_alerts')
        .select('*')
        .eq('job_id', jobId)
        .in('status', ['open', 'in_progress'])
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return res.status(200).json({
        success: true,
        data: data || []
      });

    } catch (error: unknown) {
      console.error('Error fetching alerts:', error);
      return res.status(500).json({
        error: 'Failed to fetch alerts',
        details: (error as Error).message
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const {
        job_id,
        alert_type,
        severity,
        title,
        description,
        action_required,
        assigned_to,
        due_date
      } = req.body;

      if (!job_id || !alert_type || !title || !description) {
        return res.status(400).json({
          error: 'job_id, alert_type, title, and description are required'
        });
      }

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { data, error } = await supabase
        .from('construction_alerts')
        .insert({
          job_id,
          alert_type,
          severity: severity || 'medium',
          title,
          description,
          action_required,
          assigned_to,
          due_date,
          created_by: user.id,
          status: 'open'
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
      console.error('Error creating alert:', error);
      return res.status(500).json({
        error: 'Failed to create alert',
        details: (error as Error).message
      });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const { alertId, status, resolution_notes } = req.body;

      if (!alertId || !status) {
        return res.status(400).json({
          error: 'alertId and status are required'
        });
      }

      const updateData: {
        status: string;
        updated_at: string;
        resolved_at?: string;
        resolution_notes?: string;
      } = {
        status,
        updated_at: new Date().toISOString()
      };

      if (status === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
        updateData.resolution_notes = resolution_notes;
      }

      const { data, error } = await supabase
        .from('construction_alerts')
        .update(updateData)
        .eq('id', alertId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return res.status(200).json({
        success: true,
        data
      });

    } catch (error: unknown) {
      console.error('Error updating alert:', error);
      return res.status(500).json({
        error: 'Failed to update alert',
        details: (error as Error).message
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}