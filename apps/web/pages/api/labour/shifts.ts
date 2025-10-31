import { NextApiRequest, NextApiResponse } from 'next';

import { supabase } from '@/lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { startDate, endDate, resourceId, jobId } = req.query;

      let query = supabase
        .from('labour_shifts')
        .select(`
          *,
          labour_resources (name, resource_type),
          jobs (reference, location)
        `);

      if (startDate) {
        query = query.gte('shift_date', startDate);
      }
      if (endDate) {
        query = query.lte('shift_date', endDate);
      }
      if (resourceId) {
        query = query.eq('resource_id', resourceId);
      }
      if (jobId) {
        query = query.eq('job_id', jobId);
      }

      const { data, error } = await query
        .order('shift_date')
        .order('start_time');

      if (error) {
        throw error;
      }

      return res.status(200).json({
        success: true,
        data: data || []
      });

    } catch (error) {
      console.error('Error fetching shifts:', error);
      return res.status(500).json({
        error: 'Failed to fetch shifts',
        details: (error as Error).message
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const {
        resource_id,
        job_id,
        shift_date,
        start_time,
        end_time,
        shift_type,
        break_duration,
        rate_per_hour,
        notes
      } = req.body;

      if (!resource_id || !shift_date || !start_time || !end_time) {
        return res.status(400).json({
          error: 'resource_id, shift_date, start_time, and end_time are required'
        });
      }

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Calculate total hours and cost
      const startDateTime = new Date(`2000-01-01T${start_time}`);
      const endDateTime = new Date(`2000-01-01T${end_time}`);
      const totalMinutes = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60);
      const hoursWorked = (totalMinutes - (break_duration || 0)) / 60;
      const totalCost = hoursWorked * (rate_per_hour || 0);

      const { data, error } = await supabase
        .from('labour_shifts')
        .insert({
          resource_id,
          job_id,
          shift_date,
          start_time,
          end_time,
          shift_type: shift_type || 'regular',
          break_duration: break_duration || 0,
          rate_per_hour,
          hours_worked: hoursWorked,
          total_cost: totalCost,
          notes,
          created_by: user.id,
          status: 'scheduled'
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

    } catch (error) {
      console.error('Error creating shift:', error);
      return res.status(500).json({
        error: 'Failed to create shift',
        details: (error as Error).message
      });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const { shiftId } = req.query;
      const updates = req.body;

      if (!shiftId) {
        return res.status(400).json({ error: 'Shift ID is required' });
      }

      // If updating times, recalculate hours and cost
      if (updates.start_time || updates.end_time || updates.break_duration || updates.rate_per_hour) {
        const { data: currentShift } = await supabase
          .from('labour_shifts')
          .select('start_time, end_time, break_duration, rate_per_hour')
          .eq('id', shiftId)
          .single();

        if (currentShift) {
          const startTime = updates.start_time || currentShift.start_time;
          const endTime = updates.end_time || currentShift.end_time;
          const breakDuration = updates.break_duration !== undefined ? updates.break_duration : currentShift.break_duration;
          const ratePerHour = updates.rate_per_hour !== undefined ? updates.rate_per_hour : currentShift.rate_per_hour;

          const startDateTime = new Date(`2000-01-01T${startTime}`);
          const endDateTime = new Date(`2000-01-01T${endTime}`);
          const totalMinutes = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60);
          const hoursWorked = (totalMinutes - breakDuration) / 60;
          const totalCost = hoursWorked * ratePerHour;

          updates.hours_worked = hoursWorked;
          updates.total_cost = totalCost;
        }
      }

      updates.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('labour_shifts')
        .update(updates)
        .eq('id', shiftId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return res.status(200).json({
        success: true,
        data
      });

    } catch (error) {
      console.error('Error updating shift:', error);
      return res.status(500).json({
        error: 'Failed to update shift',
        details: (error as Error).message
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}