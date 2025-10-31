import { createClient } from '@supabase/supabase-js';
import { NextApiRequest, NextApiResponse } from 'next';

import { logTaskCompleted } from '../../../../lib/activityLogger';

const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper to extract user ID from auth token
async function getUserIdFromRequest(req: NextApiRequest): Promise<string | null> {
  try {
    const cookies = req.headers.cookie || '';
    const tokenMatch = cookies.match(/sb-[^-]+-auth-token=([^;]+)/);

    if (!tokenMatch) return null;

    const tokenData = JSON.parse(decodeURIComponent(tokenMatch[1]));
    const token = tokenData.access_token || tokenData[0];

    if (!token) return null;

    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    const { data: { user } } = await userClient.auth.getUser();
    return user?.id || null;
  } catch (error) {
    return null;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id: taskId } = req.query;
  const {
    status,
    completed_qty,
    missing_notes,
    uplifted_qty,
    placed_qty,
    built_qty,
    missing_qty,
    damaged_qty,
    damage_notes
  } = req.body;

  if (!taskId || typeof taskId !== 'string') {
    return res.status(400).json({ error: 'Task ID is required' });
  }

  try {
    // Get the current task data before updating
    const { data: currentTask } = await supabaseServiceRole
      .from('generated_tasks')
      .select('status, title, job_id, total_qty, completed_qty')
      .eq('id', taskId)
      .single();

    const updateData: Record<string, unknown> = {};

    if (status !== undefined) updateData.status = status;
    if (completed_qty !== undefined) updateData.completed_qty = completed_qty;
    if (missing_notes !== undefined) updateData.missing_notes = missing_notes;
    if (uplifted_qty !== undefined) updateData.uplifted_qty = uplifted_qty;
    if (placed_qty !== undefined) updateData.placed_qty = placed_qty;
    if (built_qty !== undefined) updateData.built_qty = built_qty;
    if (missing_qty !== undefined) updateData.missing_qty = missing_qty;
    if (damaged_qty !== undefined) updateData.damaged_qty = damaged_qty;
    if (damage_notes !== undefined) updateData.damage_notes = damage_notes;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No update data provided' });
    }

    const { data, error } = await supabaseServiceRole
      .from('generated_tasks')
      .update(updateData)
      .eq('id', taskId)
      .select()
      .single();

    if (error) {
      console.error('Error updating task:', error);
      return res.status(500).json({ error: error.message });
    }

    // Log task completion if status changed to 'Completed' or if completed_qty matches total_qty
    const wasCompleted = currentTask?.status === 'Completed' ||
                        (currentTask?.completed_qty === currentTask?.total_qty && currentTask?.total_qty > 0);
    const isNowCompleted = (data as any).status === 'Completed' ||
                          ((data as any).completed_qty === (data as any).total_qty && (data as any).total_qty > 0);

    if (!wasCompleted && isNowCompleted) {
      const userId = await getUserIdFromRequest(req);
      const taskTitle = (data as any)?.title || 'Unknown Task';
      const jobId = (data as any)?.job_id;
      await logTaskCompleted(taskTitle, jobId, userId || undefined);
    }

    return res.status(200).json({ data });
  } catch (error) {
    console.error('Task update API error:', error);
    return res.status(500).json({ error: 'Failed to update task' });
  }
}