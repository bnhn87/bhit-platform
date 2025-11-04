// API Route: Task Banner Tasks
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabaseClient';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { calculateTaskBrightness, formatDueTime } from '@/lib/taskBanner/brightness';
import type { TaskBannerItemWithBrightness, CreateTaskRequest, UpdateTaskRequest } from '@/lib/taskBanner/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return handleGet(req, res);
  } else if (req.method === 'POST') {
    return handlePost(req, res);
  } else if (req.method === 'PUT') {
    return handlePut(req, res);
  } else if (req.method === 'DELETE') {
    return handleDelete(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

// GET: Fetch active tasks for current user
async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Get current user from session
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user has banner enabled
    const { data: permission } = await supabaseAdmin
      .from('user_banner_permissions')
      .select('banner_enabled')
      .eq('user_id', user.id)
      .single();

    if (!permission?.banner_enabled) {
      return res.status(200).json({ success: true, tasks: [] });
    }

    // Get user role
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const userRole = (profile?.role || 'user').toLowerCase();

    // Build query based on role
    let query = supabaseAdmin
      .from('task_banner_items')
      .select('*')
      .neq('status', 'completed')
      .order('due_date', { ascending: true });

    // Filter by assignment based on user role (case-insensitive)
    if (userRole === 'director' || userRole === 'admin') {
      // Directors and admins see all + their specific tasks
      query = query.in('assigned_to', ['all', 'directors']);
    } else if (userRole === 'ops') {
      // Ops see all + managers
      query = query.in('assigned_to', ['all', 'managers']);
    } else {
      // Everyone else sees only 'all'
      query = query.eq('assigned_to', 'all');
    }

    const { data: tasks, error } = await query;

    if (error) {
      console.error('Error fetching tasks:', error);
      return res.status(500).json({ error: error.message });
    }

    // Calculate brightness and format due time
    const enhancedTasks: TaskBannerItemWithBrightness[] = (tasks || []).map(task => ({
      ...task,
      brightness: calculateTaskBrightness(new Date(task.due_date)),
      dueIn: formatDueTime(new Date(task.due_date)),
      saved: task.status === 'in_progress' // For the half-fade effect
    }));

    return res.status(200).json({ success: true, tasks: enhancedTasks });
  } catch (error) {
    console.error('Error in GET /api/task-banner/tasks:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// POST: Create new task (admin only)
async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user is admin/director
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const roleLower = profile?.role?.toLowerCase();
    if (!profile || !['director', 'admin'].includes(roleLower)) {
      return res.status(403).json({ error: 'Forbidden - Admin only' });
    }

    const taskData: CreateTaskRequest = req.body;

    // Validate required fields
    if (!taskData.title || !taskData.type || !taskData.frequency || !taskData.due_date || !taskData.navigation_route) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create task
    const { data: newTask, error } = await supabaseAdmin
      .from('task_banner_items')
      .insert({
        title: taskData.title.toUpperCase(),
        type: taskData.type,
        frequency: taskData.frequency,
        due_date: taskData.due_date,
        navigation_route: taskData.navigation_route,
        assigned_to: taskData.assigned_to || 'all',
        created_by: user.id,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating task:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({ success: true, task: newTask });
  } catch (error) {
    console.error('Error in POST /api/task-banner/tasks:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// PUT: Update task status or details
async function handlePut(req: NextApiRequest, res: NextApiResponse) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const updateData: UpdateTaskRequest = req.body;

    if (!updateData.id) {
      return res.status(400).json({ error: 'Task ID required' });
    }

    // Build update object (only include provided fields)
    const updates: any = {};
    if (updateData.title !== undefined) updates.title = updateData.title.toUpperCase();
    if (updateData.type !== undefined) updates.type = updateData.type;
    if (updateData.frequency !== undefined) updates.frequency = updateData.frequency;
    if (updateData.due_date !== undefined) updates.due_date = updateData.due_date;
    if (updateData.status !== undefined) updates.status = updateData.status;
    if (updateData.navigation_route !== undefined) updates.navigation_route = updateData.navigation_route;
    if (updateData.assigned_to !== undefined) updates.assigned_to = updateData.assigned_to;

    // Update task
    const { data: updatedTask, error } = await supabaseAdmin
      .from('task_banner_items')
      .update(updates)
      .eq('id', updateData.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating task:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ success: true, task: updatedTask });
  } catch (error) {
    console.error('Error in PUT /api/task-banner/tasks:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// DELETE: Delete task (admin only)
async function handleDelete(req: NextApiRequest, res: NextApiResponse) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user is admin/director
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const roleLower = profile?.role?.toLowerCase();
    if (!profile || !['director', 'admin'].includes(roleLower)) {
      return res.status(403).json({ error: 'Forbidden - Admin only' });
    }

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Task ID required' });
    }

    // Delete task
    const { error } = await supabaseAdmin
      .from('task_banner_items')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting task:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/task-banner/tasks:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
